// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD1aQZuIhcg7H4nzrA9cR-g_aFML98Tfwg",
    authDomain: "wedding-noemi-a30fe.firebaseapp.com",
    projectId: "wedding-noemi-a30fe",
    storageBucket: "wedding-noemi-a30fe.appspot.com",
    messagingSenderId: "540796399199",
    appId: "1:540796399199:web:ad88e3323aea8fa6ea35ea"
  };
  
  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);
  const storage = firebase.storage();
  const firestore = firebase.firestore();
  
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
  
  // Variables de estado
  let stream = null;
  
  // Inicialización
  document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      checkAuth();
  });
  
  // Configurar event listeners
  function setupEventListeners() {
      // Botones principales
      elements.cameraBtn.addEventListener('click', openCamera);
      elements.galleryBtn.addEventListener('click', openGallery);
      elements.viewPhotosBtn.addEventListener('click', showGallery);
      elements.backFromGalleryBtn.addEventListener('click', hideGallery);
      
      // Cámara
      document.querySelector('#cameraModal .close-btn').addEventListener('click', closeCamera);
      elements.captureBtn.addEventListener('click', capturePhoto);
      
      // Galería
      document.querySelector('#uploadModal .close-btn').addEventListener('click', closeGallery);
      elements.fileInput.addEventListener('change', handleFileSelect);
      elements.submitUpload.addEventListener('click', uploadPhoto);
  }
  
  // Verificar autenticación (opcional)
  function checkAuth() {
      firebase.auth().onAuthStateChanged(user => {
          if (!user) {
              // Autenticación anónima si lo prefieres
              firebase.auth().signInAnonymously()
                  .catch(error => console.error("Error de autenticación:", error));
          }
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
          
          // Espejo para vista más natural
          context.translate(elements.photoCanvas.width, 0);
          context.scale(-1, 1);
          context.drawImage(elements.cameraPreview, 0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
          
          // Convertir a blob y subir
          elements.photoCanvas.toBlob(blob => {
              uploadImage(blob, `foto-${Date.now()}.jpg`);
          }, 'image/jpeg', 0.85);
          
          closeCamera();
          
      } catch (error) {
          console.error("Error al capturar foto:", error);
          alert("Error al tomar la foto: " + error.message);
      }
  }
  
  // Funciones de galería
  function openGallery() {
      elements.uploadModal.style.display = 'flex';
      elements.uploadPreview.style.display = 'none';
      elements.submitUpload.disabled = true;
      elements.fileInput.value = '';
  }
  
  function closeGallery() {
      elements.uploadModal.style.display = 'none';
  }
  
  function handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
          alert("Por favor, selecciona una imagen (JPEG, PNG o WEBP)");
          return;
      }
      
      // Validar tamaño
      if (file.size > 5 * 1024 * 1024) {
          alert("La imagen es muy grande (máximo 5MB)");
          return;
      }
      
      // Mostrar vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
          elements.uploadPreview.src = e.target.result;
          elements.uploadPreview.style.display = 'block';
          elements.submitUpload.disabled = false;
      };
      reader.readAsDataURL(file);
  }
  
  function uploadPhoto() {
      const file = elements.fileInput.files[0];
      if (file) {
          uploadImage(file, file.name);
          closeGallery();
      }
  }
  
  // Subir imagen a Firebase
  function uploadImage(blobOrFile, fileName) {
      showNotification("Subiendo foto...");
      
      const id = Date.now();
      const storageRef = storage.ref().child(`wedding-photos/${id}-${fileName}`);
      const uploadTask = storageRef.put(blobOrFile);
      
      uploadTask.on('state_changed',
          (snapshot) => {
              // Progreso de la subida (opcional)
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Progreso: ' + progress + '%');
          },
          (error) => {
              console.error("Error al subir:", error);
              showNotification("Error al subir la foto 😢");
          },
          () => {
              // Subida completada
              uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                  // Guardar metadatos en Firestore
                  firestore.collection('weddingPhotos').add({
                      url: downloadURL,
                      fileName: fileName,
                      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                      uploadedBy: firebase.auth().currentUser?.uid || 'anonymous'
                  });
                  
                  showNotification("¡Foto subida con éxito! 💖");
                  if (elements.gallery.style.display === 'block') {
                      loadGallery();
                  }
              });
          }
      );
  }
  
  // Galería de fotos
  function showGallery() {
      elements.mainButtons.style.display = 'none';
      elements.gallery.style.display = 'block';
      loadGallery();
  }
  
  function hideGallery() {
      elements.gallery.style.display = 'none';
      elements.mainButtons.style.display = 'flex';
  }
  
  function loadGallery() {
      elements.photoGrid.innerHTML = '<div class="loading-gallery">Cargando fotos...</div>';
      
      firestore.collection('weddingPhotos')
          .orderBy('timestamp', 'desc')
          .get()
          .then((querySnapshot) => {
              elements.photoGrid.innerHTML = '';
              
              if (querySnapshot.empty) {
                  elements.photoGrid.innerHTML = '<p class="no-photos">Aún no hay fotos subidas. ¡Sé el primero!</p>';
                  return;
              }
              
              querySnapshot.forEach((doc) => {
                  const photo = doc.data();
                  const photoItem = document.createElement('div');
                  photoItem.className = 'photo-item';
                  
                  const img = document.createElement('img');
                  img.src = photo.url;
                  img.alt = 'Foto de la boda';
                  img.loading = 'lazy';
                  
                  const downloadBtn = document.createElement('a');
                  downloadBtn.className = 'download-btn';
                  downloadBtn.href = photo.url;
                  downloadBtn.download = photo.fileName || `foto-${doc.id}.jpg`;
                  downloadBtn.title = 'Descargar foto';
                  downloadBtn.innerHTML = '⬇️';
                  
                  photoItem.appendChild(img);
                  photoItem.appendChild(downloadBtn);
                  elements.photoGrid.appendChild(photoItem);
              });
          })
          .catch((error) => {
              console.error("Error cargando galería:", error);
              elements.photoGrid.innerHTML = '<p class="error-gallery">Error al cargar las fotos. Intenta recargar la página.</p>';
          });
  }
  
  // Notificaciones
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
  
  // Verificar compatibilidad
  function checkCompatibility() {
      if (!navigator.mediaDevices || !window.FileReader) {
          alert("Tu navegador no soporta todas las funciones necesarias para esta aplicación.");
          return false;
      }
      return true;
  }
  
  // Inicializar comprobación de compatibilidad
  document.addEventListener('DOMContentLoaded', checkCompatibility);