// Configuración GitHub
const GITHUB_USERNAME = 'Alex-GM05';
const GITHUB_REPO = 'wedding_noemi';
const GITHUB_FOLDER = 'wedding-images';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${encodeURIComponent(GITHUB_FOLDER)}`;
const GITHUB_TOKEN = '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'; // Usará el secret WEDDING_TOKEN

let photos = [];
let stream = null;
let refreshInterval;

// Elementos del DOM
const elements = {
    cameraBtn: document.getElementById('cameraBtn'),
    galleryBtn: document.getElementById('galleryBtn'),
    viewPhotosBtn: document.getElementById('viewPhotosBtn'),
    mainButtons: document.getElementById('mainButtons'),
    gallery: document.getElementById('gallery'),
    backFromGalleryBtn: document.getElementById('backFromGalleryBtn'),
    photoGrid: document.getElementById('photoGrid'),
    cameraModal: document.getElementById('cameraModal'),
    cameraPreview: document.getElementById('cameraPreview'),
    captureBtn: document.getElementById('captureBtn'),
    photoCanvas: document.getElementById('photoCanvas'),
    uploadModal: document.getElementById('uploadModal'),
    fileInput: document.getElementById('fileInput'),
    uploadPreview: document.getElementById('uploadPreview'),
    submitUpload: document.getElementById('submitUpload')
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadPhotos();
});

// Event Listeners
function setupEventListeners() {
    elements.cameraBtn.addEventListener('click', openCamera);
    elements.galleryBtn.addEventListener('click', () => elements.uploadModal.style.display = 'flex');
    elements.viewPhotosBtn.addEventListener('click', showGallery);
    elements.backFromGalleryBtn.addEventListener('click', hideGallery);
    
    document.querySelector('#cameraModal .close-btn').addEventListener('click', closeCamera);
    elements.captureBtn.addEventListener('click', capturePhoto);
    
    document.querySelector('#uploadModal .close-btn').addEventListener('click', () => elements.uploadModal.style.display = 'none');
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.submitUpload.addEventListener('click', uploadPhoto);
}

// Cargar fotos desde GitHub
async function loadPhotos() {
    try {
        showLoading(elements.viewPhotosBtn, true);
        
        const response = await fetch(GITHUB_API, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            // Si la carpeta no existe aún, crear un array vacío
            if (response.status === 404) {
                photos = [];
                updateGallery();
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const files = await response.json();
        
        // Filtrar solo archivos de imagen
        photos = files
            .filter(file => file.type === "file" && /\.(jpg|jpeg|png|webp)$/i.test(file.name))
            .map(file => ({
                id: file.sha,
                url: file.download_url,
                name: file.name,
                timestamp: new Date(file.commit.author.date).getTime()
            }));
        
        updateGallery();
        
    } catch (error) {
        console.error("Error cargando fotos:", error);
        // Cargar desde localStorage si hay error
        const localPhotos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
        photos = localPhotos.filter(photo => !photo.id.startsWith('local_'));
        updateGallery();
        
        if (navigator.onLine) {
            showNotification("Error al cargar fotos desde GitHub");
        }
    } finally {
        showLoading(elements.viewPhotosBtn, false);
    }
}

// Subir foto a GitHub
async function uploadToGitHub(imageData, fileName) {
    try {
        // Verificar conexión
        if (!navigator.onLine) {
            throw new Error("No hay conexión a internet");
        }
        
        // Convertir data URL a Blob
        const blob = await fetch(imageData).then(res => res.blob());
        
        // Optimizar imagen
        const optimizedBlob = await compressImage(blob);
        const base64data = await blobToBase64(optimizedBlob);
        const content = base64data.split(',')[1]; // Remover el prefijo
        
        // Configurar el commit
        const commitMessage = `Añadir foto de boda: ${fileName}`;
        
        const response = await fetch(`${GITHUB_API}/${encodeURIComponent(fileName)}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: commitMessage,
                content: content,
                branch: 'main'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al subir la imagen');
        }
        
        // Recargar las fotos después de subir
        await loadPhotos();
        return true;
        
    } catch (error) {
        console.error("Error subiendo a GitHub:", error);
        
        // Guardar localmente solo si es error de conexión
        if (!navigator.onLine || error.message.includes("No hay conexión")) {
            const localPhoto = {
                id: `local_${Date.now()}`,
                url: imageData,
                name: fileName,
                timestamp: Date.now()
            };
            
            const localPhotos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
            localPhotos.push(localPhoto);
            localStorage.setItem('weddingPhotos', JSON.stringify(localPhotos));
            
            photos.unshift(localPhoto);
            updateGallery();
            
            showNotification("Foto guardada localmente. Se subirá a GitHub cuando recuperes conexión.");
            return false;
        }
        
        showNotification("Error al subir la foto: " + error.message);
        throw error;
    }
}

// Convertir Blob a Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Optimizar/Comprimir imagen
async function compressImage(blob, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Redimensionar si es muy grande (máximo 1200px)
            const MAX_SIZE = 1200;
            let width = img.width;
            let height = img.height;
            
            if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                (compressedBlob) => resolve(compressedBlob || blob),
                'image/jpeg',
                quality
            );
        };
        
        img.onerror = () => resolve(blob);
    });
}

// Funciones de la cámara
async function openCamera() {
    try {
        elements.cameraModal.style.display = 'flex';
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false 
        });
        
        elements.cameraPreview.srcObject = stream;
        
        await new Promise((resolve) => {
            elements.cameraPreview.onloadedmetadata = resolve;
        });
        
    } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        alert(`Error al acceder a la cámara: ${err.message}`);
        closeCamera();
    }
}

function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    elements.cameraModal.style.display = 'none';
}

function capturePhoto() {
    try {
        const context = elements.photoCanvas.getContext('2d');
        elements.photoCanvas.width = elements.cameraPreview.videoWidth;
        elements.photoCanvas.height = elements.cameraPreview.videoHeight;
        
        context.translate(elements.photoCanvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(elements.cameraPreview, 0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
        
        const imageData = elements.photoCanvas.toDataURL('image/jpeg', 0.85);
        const fileName = `wedding-${Date.now()}.jpg`;
        uploadToGitHub(imageData, fileName);
        
    } catch (error) {
        console.error("Error al capturar foto:", error);
        alert("Error al tomar la foto: " + error.message);
    } finally {
        closeCamera();
    }
}

// Galería
function showGallery() {
    elements.mainButtons.style.display = 'none';
    elements.gallery.style.display = 'block';
    startAutoRefresh();
}

function hideGallery() {
    elements.gallery.style.display = 'none';
    elements.mainButtons.style.display = 'flex';
    stopAutoRefresh();
}

function updateGallery() {
    elements.photoGrid.innerHTML = '';
    
    if (photos.length === 0) {
        elements.photoGrid.innerHTML = '<p class="no-photos">¡Sé el primero en subir una foto!</p>';
        return;
    }
    
    // Ordenar por fecha (más recientes primero)
    photos.sort((a, b) => b.timestamp - a.timestamp);
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = 'Foto de la boda';
        img.loading = 'lazy';
        img.onerror = () => {
            img.src = 'https://via.placeholder.com/200x200?text=Error+al+cargar';
        };
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = '↓';
        downloadBtn.title = 'Descargar foto';
        downloadBtn.addEventListener('click', () => downloadPhoto(photo.url, photo.name || `wedding-photo-${photo.id}.jpg`));
        
        photoItem.appendChild(img);
        photoItem.appendChild(downloadBtn);
        elements.photoGrid.appendChild(photoItem);
    });
}

// Auto-refresco
function startAutoRefresh() {
    stopAutoRefresh();
    refreshInterval = setInterval(loadPhotos, 30000); // Actualizar cada 30 segundos
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Subida de archivos
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert("Por favor, selecciona una imagen (JPEG, PNG o WEBP)");
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es muy grande (máximo 5MB)");
        return;
    }
    
    const reader = new FileReader();
    
    reader.onloadstart = () => {
        elements.submitUpload.disabled = true;
        elements.uploadPreview.style.display = 'none';
    };
    
    reader.onload = (e) => {
        elements.uploadPreview.src = e.target.result;
        elements.uploadPreview.style.display = 'block';
        elements.submitUpload.disabled = false;
    };
    
    reader.onerror = () => {
        alert("Error al leer el archivo");
        elements.submitUpload.disabled = true;
    };
    
    reader.readAsDataURL(file);
}

async function uploadPhoto() {
    if (!elements.uploadPreview.src || elements.submitUpload.disabled) return;
    
    try {
        const fileName = `wedding-upload-${Date.now()}.jpg`;
        await uploadToGitHub(elements.uploadPreview.src, fileName);
        
        elements.uploadModal.style.display = 'none';
        elements.uploadPreview.src = '';
        elements.uploadPreview.style.display = 'none';
        elements.submitUpload.disabled = true;
        elements.fileInput.value = '';
        
    } catch (error) {
        console.error("Error al subir foto:", error);
        alert("Error al subir la foto: " + error.message);
    }
}

// Función para mostrar notificaciones
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Utilidades
function showLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = '<span class="loading"></span> Procesando...';
    } else {
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

// Sincronizar fotos locales con GitHub
async function syncLocalPhotos() {
    if (!navigator.onLine) return;
    
    const localPhotos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
    const photosToRemove = [];
    
    for (const photo of localPhotos) {
        if (photo.id.startsWith('local_')) {
            try {
                const success = await uploadToGitHub(photo.url, photo.name || `wedding-${Date.now()}.jpg`);
                if (success) {
                    photosToRemove.push(photo.id);
                }
            } catch (error) {
                console.error("Error sincronizando foto local:", error);
            }
        }
    }
    
    if (photosToRemove.length > 0) {
        localStorage.setItem('weddingPhotos', 
            JSON.stringify(localPhotos.filter(p => !photosToRemove.includes(p.id))));
        
        showNotification(`${photosToRemove.length} fotos locales sincronizadas con GitHub`);
    }
}

// Llamar al cargar y periódicamente
setInterval(syncLocalPhotos, 60000); // Cada 60 segundos
document.addEventListener('DOMContentLoaded', syncLocalPhotos);

function downloadPhoto(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Inicializar textos originales de botones
document.querySelectorAll('.btn').forEach(btn => {
    btn.dataset.originalText = btn.textContent;
});