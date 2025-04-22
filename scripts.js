// Configuración
const DRIVE_API = "https://script.google.com/macros/s/AKfycbz3IRQ8tgF8ijP7Wu9Xyrb4t6alcbSjwyyHpT5ucwuxKHZ9zs9eoN_EQRebvFh2GGAbVA/exec";
const API_TOKEN = "weddingNJ2025";
const DRIVE_FOLDER_ID = "1_hfqG2ys36SKUWzoFMP-O6oGD4WkUVfP";

let photos = [];
let stream = null;
let lastUpdateTime = 0;
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

// Cargar fotos desde Drive
async function loadPhotos() {
    try {
        showLoading(elements.viewPhotosBtn, true);
        const response = await fetch(`${DRIVE_API}?action=getPhotos&token=${API_TOKEN}&folderId=${DRIVE_FOLDER_ID}&lastUpdate=${lastUpdateTime}`);
        const data = await response.json();
        
        if (data.success) {
            if (data.lastUpdate > lastUpdateTime) {
                lastUpdateTime = data.lastUpdate;
                photos = data.photos.map(photo => ({
                    ...photo,
                    url: `https://lh3.googleusercontent.com/d/${photo.id}=w1000`
                }));
                updateGallery();
                
                if (elements.gallery.style.display === 'block') {
                    showNotification("¡Nuevas fotos disponibles!");
                }
            }
        } else {
            throw new Error(data.message || "Error al cargar fotos");
        }
    } catch (error) {
        console.error("Error:", error);
        photos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
        updateGallery();
    } finally {
        showLoading(elements.viewPhotosBtn, false);
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

// Subir foto a Drive
async function uploadToDrive(imageData) {
    try {
        showLoading(elements.submitUpload, true);
        
        // 1. Convertir a Blob
        const blob = await (await fetch(imageData)).blob();
        
        // 2. Optimizar imagen (reducir tamaño)
        const optimizedBlob = await compressImage(blob);
        
        // 3. Crear FormData
        const formData = new FormData();
        formData.append('file', optimizedBlob, `boda_${Date.now()}.jpg`);
        
        // 4. Configurar opciones de fetch
        const options = {
            method: 'POST',
            body: formData,
            // No incluir headers 'Content-Type' para FormData
            mode: 'no-cors' // Solo si persisten errores CORS
        };
        
        // 5. Subir a Drive
        const response = await fetch(`${DRIVE_API}?action=upload&token=${API_TOKEN}&folderId=${DRIVE_FOLDER_ID}`, options);
        
        // Verificar respuesta aunque sea no-cors
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        // 6. Forzar recarga de fotos
        await loadPhotos();
        return true;
        
    } catch (error) {
        console.error("Error subiendo a Drive:", error);
        
        // Fallback a localStorage
        const localPhoto = {
            id: `local_${Date.now()}`,
            url: imageData,
            timestamp: Date.now()
        };
        
        photos.unshift(localPhoto);
        localStorage.setItem('weddingPhotos', JSON.stringify(photos));
        updateGallery();
        
        // Mostrar alerta específica
        alert("Foto guardada localmente. Se subirá a Drive cuando recuperes conexión.");
        return false;
    } finally {
        showLoading(elements.submitUpload, false);
    }
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
        uploadToDrive(imageData);
        
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
        downloadBtn.addEventListener('click', () => downloadPhoto(photo.url, `boda_${photo.id}.jpg`));
        
        photoItem.appendChild(img);
        photoItem.appendChild(downloadBtn);
        elements.photoGrid.appendChild(photoItem);
    });
}

// Auto-refresco
function startAutoRefresh() {
    stopAutoRefresh();
    refreshInterval = setInterval(loadPhotos, 10000); // Actualizar cada 10 segundos
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
        await uploadToDrive(elements.uploadPreview.src);
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

// Nueva función para sincronizar fotos locales
async function syncLocalPhotos() {
    const localPhotos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
    
    for (const photo of localPhotos) {
      if (photo.id.startsWith('local_')) {
        const success = await uploadToDrive(photo.url);
        if (success) {
          // Eliminar del localStorage si se subió correctamente
          localStorage.setItem('weddingPhotos', JSON.stringify(localPhotos.filter(p => p.id !== photo.id)))
        }
      }
    }
  }
  
  // Llamar al cargar y periódicamente
  setInterval(syncLocalPhotos, 30000); // Cada 30 segundos
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