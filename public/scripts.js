// Configuración de Firebase (reemplaza con tus datos)
const firebaseConfig = {
    apiKey: "AIzaSyBocQomHOEBjv9YfrUpxO7nzcdpoUHmlFU",
    authDomain: "wedding-noemi.firebaseapp.com",
    projectId: "wedding-noemi",
    storageBucket: "wedding-noemi.firebasestorage.app",
    messagingSenderId: "837025714645",
    appId: "1:837025714645:web:828094899032e3c8516d5c"  
  };
  

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

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

// Variables
let stream = null;
let currentUser = null;
let photos = [];
let isLoading = false;

// Event listeners
cameraBtn.addEventListener('click', openCamera);
galleryBtn.addEventListener('click', () => uploadModal.style.display = 'flex');
viewPhotosBtn.addEventListener('click', showGallery);
backFromGalleryBtn.addEventListener('click', () => {
    gallery.style.display = 'none';
    mainButtons.style.display = 'flex';
});

closeCameraModal.addEventListener('click', closeCamera);
closeUploadModal.addEventListener('click', () => uploadModal.style.display = 'none');

captureBtn.addEventListener('click', capturePhoto);
fileInput.addEventListener('change', handleFileSelect);
submitUpload.addEventListener('click', uploadPhoto);

// Funciones
async function initApp() {
    try {
        // Autenticación anónima
        await auth.signInAnonymously();
        currentUser = auth.currentUser;
        await loadPhotos();
    } catch (error) {
        console.error("Error de autenticación:", error);
        // Fallback a localStorage
        photos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
        updateGallery();
    }
}

async function loadPhotos() {
    try {
      showLoading(true);
      const snapshot = await db.collection('weddingPhotos')
        .orderBy('timestamp', 'desc')
        .limit(50) // Limitar para mejor performance
        .get();
        
      if(snapshot.empty) {
        photos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
      } else {
        photos = snapshot.docs.map(doc => ({
          url: doc.data().url,
          id: doc.id
        }));
      }
      
      updateGallery();
    } catch (error) {
      console.error("Error cargando fotos:", error);
      photos = JSON.parse(localStorage.getItem('weddingPhotos')) || [];
    } finally {
      showLoading(false);
    }
}

function showLoading(loading) {
    const buttons = [submitUpload, captureBtn, viewPhotosBtn];
    buttons.forEach(btn => {
      if(btn) {
        btn.disabled = loading;
        btn.innerHTML = loading ? 
          '<span class="loading"></span> Procesando...' : 
          btn.textContent;
      }
    });
}

async function openCamera() {
    cameraModal.style.display = 'flex';
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' },
            audio: false 
        });
        cameraPreview.srcObject = stream;
    } catch (err) {
        console.error("Error al acceder a la cámara: ", err);
        alert("No se pudo acceder a la cámara. Por favor, asegúrate de dar los permisos necesarios.");
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

function capturePhoto() {
    const context = photoCanvas.getContext('2d');
    photoCanvas.width = cameraPreview.videoWidth;
    photoCanvas.height = cameraPreview.videoHeight;
    context.drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
    
    // Convertir a imagen y guardar
    const imageData = photoCanvas.toDataURL('image/jpeg', 0.8);
    savePhoto(imageData);
    
    closeCamera();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.match('image.*')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadPreview.src = e.target.result;
            uploadPreview.style.display = 'block';
            submitUpload.disabled = false;
        }
        
        reader.readAsDataURL(file);
    }
}

async function uploadPhoto() {
    if (!uploadPreview.src || isLoading) return;
    
    try {
        showLoading(submitUpload, true);
        await savePhoto(uploadPreview.src);
        
        // Resetear el formulario
        uploadModal.style.display = 'none';
        uploadPreview.src = '';
        uploadPreview.style.display = 'none';
        submitUpload.disabled = true;
        fileInput.value = '';
    } catch (error) {
        console.error("Error subiendo foto:", error);
        alert("Puedes revisar la foto en galeria");
    } finally {
        showLoading(submitUpload, false);
    }
}

async function savePhoto(imageData) {
    try {
      showLoading(true);
      
      // 1. Convertir a blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // 2. Crear referencia única
      const filename = `photos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const storageRef = storage.ref(filename);
      
      // 3. Subir con observable de progreso
      const uploadTask = storageRef.put(blob);
      
      // Escuchar eventos
      uploadTask.on('state_changed',
        (snapshot) => {
          // Opcional: mostrar progreso
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Subiendo: ${progress}%`);
        },
        (error) => {
          console.error("Error de subida:", error);
          showLoading(false);
        },
        async () => {
          // 4. Obtener URL al completar
          const url = await uploadTask.snapshot.ref.getDownloadURL();
          
          // 5. Guardar en Firestore
          await db.collection('weddingPhotos').add({
            url: url,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser?.uid || 'anonymous'
          });
          
          // 6. Actualizar UI
          photos.unshift({ url: url, id: filename });
          updateGallery();
          showLoading(false);
        }
      );
      
    } catch (error) {
      console.error("Error completo:", error);
      showLoading(false);
      // Fallback a localStorage
      const localId = `local_${Date.now()}`;
      photos.unshift({ url: imageData, id: localId });
      localStorage.setItem('weddingPhotos', JSON.stringify(photos));
      updateGallery();
    }
  }

function showGallery() {
    if (isLoading) return;
    
    mainButtons.style.display = 'none';
    gallery.style.display = 'block';
    
    if (photos.length === 0) {
        loadPhotos();
    } else {
        updateGallery();
    }
}

function updateGallery() {
    photoGrid.innerHTML = '';
    
    if (photos.length === 0) {
        photoGrid.innerHTML = '<p>No hay fotos todavía. ¡Sube las primeras!</p>';
        return;
    }
    
    photos.forEach((photo) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = `Foto de la boda`;
        img.loading = 'lazy';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = '&#x2193;';
        downloadBtn.title = 'Descargar foto';
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadPhoto(photo.url, `boda_noemi_juanjose_${photo.id}.jpg`);
        });
        
        photoItem.appendChild(img);
        photoItem.appendChild(downloadBtn);
        photoGrid.appendChild(photoItem);
    });
}

function downloadPhoto(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Inicializa la app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);