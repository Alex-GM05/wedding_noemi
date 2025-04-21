// Configuración - ¡REEMPLAZA ESTOS VALORES!
const DRIVE_API = "https://script.google.com/macros/s/AKfycbx-XY1WCGMR2gJ_PdYgiRGcxmbfQi_v84xkJFL89cVT5l6DqFuB4LBUk6__F8Y1gIsghw/exec";
const API_TOKEN = "weddingNJ2025";
let photos = [];
let stream = null;

// Elementos del DOM
const cameraBtn = document.getElementById('cameraBtn');
const galleryBtn = document.getElementById('galleryBtn');
const viewPhotosBtn = document.getElementById('viewPhotosBtn');
const mainButtons = document.getElementById('mainButtons');
const gallery = document.getElementById('gallery');
const backFromGalleryBtn = document.getElementById('backFromGalleryBtn');
const photoGrid = document.getElementById('photoGrid');
const cameraModal = document.getElementById('cameraModal');
const cameraPreview = document.getElementById('cameraPreview');
const captureBtn = document.getElementById('captureBtn');
const photoCanvas = document.getElementById('photoCanvas');
const closeCameraModal = document.querySelector('#cameraModal .close-btn');
const uploadModal = document.getElementById('uploadModal');
const fileInput = document.getElementById('fileInput');
const uploadPreview = document.getElementById('uploadPreview');
const submitUpload = document.getElementById('submitUpload');
const closeUploadModal = document.querySelector('#uploadModal .close-btn');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    cameraBtn.addEventListener('click', openCamera);
    galleryBtn.addEventListener('click', () => uploadModal.style.display = 'flex');
    viewPhotosBtn.addEventListener('click', showGallery);
    backFromGalleryBtn.addEventListener('click', hideGallery);
    
    closeCameraModal.addEventListener('click', closeCamera);
    captureBtn.addEventListener('click', capturePhoto);
    
    closeUploadModal.addEventListener('click', () => uploadModal.style.display = 'none');
    fileInput.addEventListener('change', handleFileSelect);
    submitUpload.addEventListener('click', uploadPhoto);
}

// Cargar fotos desde Drive
async function loadPhotos() {
    try {
        showLoading(viewPhotosBtn, true);
        const response = await fetch(`${DRIVE_API}?action=getPhotos&token=${API_TOKEN}`);
        const data = await response.json();
        
        if (data.success) {
            photos = data.photos;
            updateGallery();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error("Error:", error);
        photos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
        updateGallery();
    } finally {
        showLoading(viewPhotosBtn, false);
    }
}

// Subir foto a Drive
async function uploadToDrive(imageData) {
    try {
        showLoading(submitUpload, true);
        
        const blob = await (await fetch(imageData)).blob();
        const formData = new FormData();
        formData.append('file', blob);
        
        const response = await fetch(`${DRIVE_API}?action=upload&token=${API_TOKEN}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            photos.unshift({ 
                id: result.fileId, 
                url: result.url 
            });
            updateGallery();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error subiendo:", error);
        // Fallback a localStorage
        photos.unshift({ 
            url: imageData, 
            id: `local_${Date.now()}` 
        });
        localStorage.setItem('weddingPhotos', JSON.stringify(photos));
        updateGallery();
    } finally {
        showLoading(submitUpload, false);
    }
}

// Función para abrir la cámara (actualizada)
async function openCamera() {
    try {
        cameraModal.style.display = 'flex';
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false 
        });
        cameraPreview.srcObject = stream;
    } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        alert("No se pudo acceder a la cámara. Asegúrate de haber dado los permisos necesarios.");
        closeCamera();
    }
}
function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    cameraModal.style.display = 'none';
}

// Función para capturar foto (actualizada)
function capturePhoto() {
    try {
        const context = photoCanvas.getContext('2d');
        photoCanvas.width = cameraPreview.videoWidth;
        photoCanvas.height = cameraPreview.videoHeight;
        
        // Voltea la imagen para que coincida con la vista previa
        context.translate(photoCanvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
        
        const imageData = photoCanvas.toDataURL('image/jpeg', 0.85);
        savePhoto(imageData);
        closeCamera();
    } catch (error) {
        console.error("Error al capturar foto:", error);
        alert("Error al tomar la foto. Intenta nuevamente.");
    }
}

// Galería
function showGallery() {
    mainButtons.style.display = 'none';
    gallery.style.display = 'block';
}

function hideGallery() {
    gallery.style.display = 'none';
    mainButtons.style.display = 'flex';
}

function updateGallery() {
    photoGrid.innerHTML = '';
    
    if (photos.length === 0) {
        photoGrid.innerHTML = '<p class="no-photos">¡Sé el primero en subir una foto!</p>';
        return;
    }
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.url}" loading="lazy" alt="Foto de la boda">
            <button class="download-btn" onclick="downloadPhoto('${photo.url}', 'boda_${photo.id}.jpg')">
                ↓
            </button>
        `;
        photoGrid.appendChild(photoItem);
    });
}

// Función para manejar la selección de archivos (actualizada)
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || !file.type.match('image.*')) {
        alert("Por favor, selecciona un archivo de imagen válido (JPEG, PNG)");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadPreview.src = e.target.result;
        uploadPreview.style.display = 'block';
        submitUpload.disabled = false;
        
        // Ajustar tamaño si es muy grande
        if (file.size > 2 * 1024 * 1024) { // 2MB
            alert("La imagen es muy grande. Se comprimirá automáticamente.");
        }
    };
    reader.readAsDataURL(file);
}

// Función para subir foto (actualizada)
async function uploadPhoto() {
    if (!uploadPreview.src || submitUpload.disabled) return;

    try {
        showLoading(submitUpload, true);
        
        // Crear blob optimizado
        const blob = await dataURLToBlob(uploadPreview.src);
        const optimizedBlob = await compressImage(blob);
        
        await savePhoto(uploadPreview.src);
        
        // Resetear formulario
        uploadModal.style.display = 'none';
        uploadPreview.src = '';
        uploadPreview.style.display = 'none';
        submitUpload.disabled = true;
        fileInput.value = '';
    } catch (error) {
        console.error("Error al subir foto:", error);
        alert("Error al subir la foto. Intenta con una imagen más pequeña.");
    } finally {
        showLoading(submitUpload, false);
    }
}

// Helper para comprimir imágenes
async function compressImage(blob, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Tamaño máximo 1000px en el lado más largo
            const MAX_SIZE = 1000;
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
            
            canvas.toBlob((compressedBlob) => {
                resolve(compressedBlob || blob);
            }, 'image/jpeg', quality);
        };
    });
}

// Helper para convertir DataURL a Blob
function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

// Utilidades
function showLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = '<span class="loading"></span> Procesando...';
    } else {
        button.textContent = button.dataset.originalText;
    }
}

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