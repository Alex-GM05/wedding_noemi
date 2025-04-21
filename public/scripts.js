// Configuración - ¡REEMPLAZA ESTOS VALORES!
const DRIVE_API = "https://script.google.com/macros/s/AKfycbzGXsmG0nZKEeJ901IPX-H31XC_kWZiEtUN8EoOoZXyWQXmxKWYATFT8TCVtNfdaDF7yw/exec";
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

// Funciones de la cámara
function openCamera() {
    cameraModal.style.display = 'flex';
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            cameraPreview.srcObject = stream;
        })
        .catch(err => {
            console.error("Error en cámara:", err);
            alert("No se pudo acceder a la cámara");
            closeCamera();
        });
}

function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    cameraModal.style.display = 'none';
}

function capturePhoto() {
    const context = photoCanvas.getContext('2d');
    photoCanvas.width = cameraPreview.videoWidth;
    photoCanvas.height = cameraPreview.videoHeight;
    context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
    const imageData = photoCanvas.toDataURL('image/jpeg', 0.8);
    uploadToDrive(imageData);
    closeCamera();
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

// Subida de archivos
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || !file.type.match('image.*')) return;
    
    const reader = new FileReader();
    reader.onload = e => {
        uploadPreview.src = e.target.result;
        uploadPreview.style.display = 'block';
        submitUpload.disabled = false;
    };
    reader.readAsDataURL(file);
}

async function uploadPhoto() {
    if (!uploadPreview.src || submitUpload.disabled) return;
    await uploadToDrive(uploadPreview.src);
    uploadModal.style.display = 'none';
    uploadPreview.src = '';
    uploadPreview.style.display = 'none';
    submitUpload.disabled = true;
    fileInput.value = '';
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