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
  
  // Variables globales
  let currentUser = null;
  let photos = [];
  let photosListener = null;
  let stream = null;
  
  // Referencias a elementos del DOM
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
  
  // Inicialización de la aplicación
  document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupEventListeners();
  });
  
  // Autenticación
  async function initAuth() {
    try {
      await auth.signInAnonymously();
      currentUser = auth.currentUser;
      initPhotoListener();
    } catch (error) {
      console.error("Error de autenticación:", error);
      loadFromLocalStorage();
    }
  }
  
  // Configura el listener en tiempo real
  function initPhotoListener() {
    if (photosListener) photosListener(); // Cancelar listener anterior
    
    photosListener = db.collection('wedding_photos')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        if (!snapshot.empty) {
          photos = snapshot.docs.map(doc => ({
            id: doc.id,
            url: doc.data().url,
            uploader: doc.data().uploaderName || 'Invitado'
          }));
          updateGallery();
          saveToLocalStorage();
        }
      }, error => {
        console.error("Error en listener:", error);
        loadFromLocalStorage();
      });
  }
  
  // Manejo de localStorage
  function saveToLocalStorage() {
    localStorage.setItem('weddingPhotosBackup', JSON.stringify(photos));
  }
  
  function loadFromLocalStorage() {
    const backup = localStorage.getItem('weddingPhotosBackup');
    if (backup) {
      photos = JSON.parse(backup);
      updateGallery();
    } else {
      photoGrid.innerHTML = '<p class="no-photos">No hay fotos disponibles. Intenta recargar.</p>';
    }
  }
  
  // Event Listeners
  function setupEventListeners() {
    // Botones principales
    cameraBtn.addEventListener('click', openCamera);
    galleryBtn.addEventListener('click', () => uploadModal.style.display = 'flex');
    viewPhotosBtn.addEventListener('click', showGallery);
    backFromGalleryBtn.addEventListener('click', hideGallery);
    
    // Cámara
    closeCameraModal.addEventListener('click', closeCamera);
    captureBtn.addEventListener('click', capturePhoto);
    
    // Galería
    closeUploadModal.addEventListener('click', () => uploadModal.style.display = 'none');
    fileInput.addEventListener('change', handleFileSelect);
    submitUpload.addEventListener('click', uploadPhoto);
  }
  
  // Funciones de la cámara
  function openCamera() {
    cameraModal.style.display = 'flex';
    
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' },
      audio: false 
    }).then(s => {
      stream = s;
      cameraPreview.srcObject = stream;
    }).catch(err => {
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
    savePhoto(imageData);
    closeCamera();
  }
  
  // Funciones de galería
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
        <span class="uploader">${photo.uploader}</span>
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
    
    try {
      showLoading(submitUpload, true);
      await savePhoto(uploadPreview.src);
      
      // Resetear formulario
      uploadPreview.src = '';
      uploadPreview.style.display = 'none';
      submitUpload.disabled = true;
      fileInput.value = '';
      uploadModal.style.display = 'none';
    } catch (error) {
      console.error("Error subiendo foto:", error);
      alert("Error al subir la foto");
    } finally {
      showLoading(submitUpload, false);
    }
  }
  
  // Guardar foto en Firebase
  async function savePhoto(imageData) {
    try {
      // Convertir a blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Validar tamaño
      if (blob.size > 5_000_000) {
        throw new Error("La imagen es muy grande (máximo 5MB)");
      }
      
      // Subir a Storage
      const filePath = `wedding_photos/${currentUser?.uid || 'anonymous'}_${Date.now()}.jpg`;
      const storageRef = storage.ref(filePath);
      await storageRef.put(blob);
      
      // Obtener URL
      const downloadURL = await storageRef.getDownloadURL();
      
      // Guardar en Firestore
      await db.collection('wedding_photos').add({
        url: downloadURL,
        uploaderId: currentUser?.uid || 'anonymous',
        uploaderName: 'Invitado',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        size: blob.size,
        type: blob.type
      });
      
    } catch (error) {
      console.error("Error en savePhoto:", error);
      throw error;
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