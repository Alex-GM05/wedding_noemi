// Configuración - ¡REEMPLAZA ESTOS VALORES!
const DRIVE_API = "https://script.google.com/macros/s/AKfycbzmBtt_rPglZN1AARRLwG8ZLK5V93dQ_OfhoWse6WIzMLdQxCeWEJsD0w74Iwml-vj-OA/exec";
const API_TOKEN = "weddingNJ2025";
let photos = [];
let stream = null;
let refreshInterval;

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

// Modificar loadPhotos()
async function loadPhotos() {
  try {
    showLoading(viewPhotosBtn, true);
    const response = await fetch(`${DRIVE_API}?action=getPhotos&token=${API_TOKEN}&nocache=${Date.now()}`);
    const data = await response.json();
    
    if (data.success) {
      photos = data.photos;
      updateGallery();
      startAutoRefresh(); // Iniciar auto-actualización
    }
  } catch (error) {
    console.error("Error:", error);
    photos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
    updateGallery();
  } finally {
    showLoading(viewPhotosBtn, false);
  }
}

// Función para auto-actualizar
function startAutoRefresh() {
  // Limpiar intervalo anterior
  if (refreshInterval) clearInterval(refreshInterval);
  
  // Actualizar cada 10 segundos
  refreshInterval = setInterval(() => {
    if (document.getElementById('gallery').style.display === 'block') {
      fetch(`${DRIVE_API}?action=getPhotos&token=${API_TOKEN}&nocache=${Date.now()}`)
        .then(response => response.json())
        .then(data => {
          if (data.success && JSON.stringify(data.photos) !== JSON.stringify(photos)) {
            photos = data.photos;
            updateGallery();
          }
        });
    }
  }, 10000); // 10 segundos
}

// Detener al salir de la galería
function hideGallery() {
  gallery.style.display = 'none';
  mainButtons.style.display = 'flex';
  if (refreshInterval) clearInterval(refreshInterval);
}

async function uploadToDrive(imageData) {
    try {
      showLoading(submitUpload, true);
      
      const blob = await (await fetch(imageData)).blob();
      const formData = new FormData();
      formData.append('file', blob);
      
      // Agregar parámetro de cache busting
      const response = await fetch(`${DRIVE_API}?action=upload&token=${API_TOKEN}&nocache=${Date.now()}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Forzar recarga de todas las fotos
        await loadPhotos();
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

// Función para abrir la cámara (versión mejorada)
async function openCamera() {
    try {
        cameraModal.style.display = 'flex';
        
        // Detener cualquier stream previo
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Configuración optimizada para móviles
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraPreview.srcObject = stream;
        
        // Esperar a que el video esté listo
        await new Promise((resolve) => {
            cameraPreview.onloadedmetadata = resolve;
        });
        
    } catch (err) {
        console.error("Error en cámara:", err);
        alert(`Error al acceder a la cámara: ${err.message}`);
        closeCamera();
        
        // Fallback para dispositivos iOS
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            alert("En iOS, asegúrate de usar Safari y haber dado permisos de cámara.");
        }
    }
}

// Función para capturar foto (versión mejorada)
function capturePhoto() {
    try {
        if (!stream) throw new Error("No hay señal de cámara");
        
        const context = photoCanvas.getContext('2d');
        photoCanvas.width = cameraPreview.videoWidth;
        photoCanvas.height = cameraPreview.videoHeight;
        
        // Espejo horizontal para vista más natural
        context.translate(photoCanvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
        
        // Convertir a JPG con calidad del 85%
        const imageData = photoCanvas.toDataURL('image/jpeg', 0.85);
        uploadToDrive(imageData);
        
    } catch (error) {
        console.error("Error al capturar:", error);
        alert("Error al tomar la foto: " + error.message);
    } finally {
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

// Galería
function showGallery() {
    mainButtons.style.display = 'none';
    gallery.style.display = 'block';
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

// Función mejorada para selección de archivos
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert("Por favor, selecciona una imagen (JPEG, PNG o WEBP)");
        return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es muy grande (máximo 5MB)");
        return;
    }
    
    const reader = new FileReader();
    
    reader.onloadstart = () => {
        submitUpload.disabled = true;
        uploadPreview.style.display = 'none';
    };
    
    reader.onload = (e) => {
        uploadPreview.src = e.target.result;
        uploadPreview.style.display = 'block';
        submitUpload.disabled = false;
    };
    
    reader.onerror = () => {
        alert("Error al leer el archivo");
        submitUpload.disabled = true;
    };
    
    reader.readAsDataURL(file);
}

// Función mejorada para subir foto
async function uploadPhoto() {
    if (!uploadPreview.src || submitUpload.disabled) return;
    
    try {
        showLoading(submitUpload, true);
        
        // Optimizar imagen antes de subir
        const optimizedImage = await optimizeImage(uploadPreview.src);
        await uploadToDrive(optimizedImage);
        
        // Resetear el formulario
        fileInput.value = '';
        uploadPreview.src = '';
        uploadPreview.style.display = 'none';
        submitUpload.disabled = true;
        uploadModal.style.display = 'none';
        
    } catch (error) {
        console.error("Error al subir:", error);
        alert("Error al subir la foto: " + error.message);
    } finally {
        showLoading(submitUpload, false);
    }
}

// Nueva función para optimizar imágenes
async function optimizeImage(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = dataUrl;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Tamaño máximo de 1000px en el lado más largo
            const MAX_DIMENSION = 1000;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_DIMENSION) {
                    height *= MAX_DIMENSION / width;
                    width = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    width *= MAX_DIMENSION / height;
                    height = MAX_DIMENSION;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a JPG con calidad del 80%
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        img.onerror = () => resolve(dataUrl); // Fallback si hay error
    });
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