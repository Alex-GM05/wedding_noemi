// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD1aQZuIhcg7H4nzrA9cR-g_aFML98Tfwg",
  authDomain: "wedding-noemi-a30fe.firebaseapp.com",
  projectId: "wedding-noemi-a30fe",
  storageBucket: "wedding-noemi-a30fe.firebasestorage.app",
  messagingSenderId: "540796399199",
  appId: "1:540796399199:web:ad88e3323aea8fa6ea35ea"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Variables de estado
let cameraStream = null;

// Elementos del DOM
const elements = {
  cameraBtn: document.getElementById("cameraBtn"),
  galleryBtn: document.getElementById("galleryBtn"),
  viewPhotosBtn: document.getElementById("viewPhotosBtn"),
  backFromGalleryBtn: document.getElementById("backFromGalleryBtn"),
  cameraModal: document.getElementById("cameraModal"),
  uploadModal: document.getElementById("uploadModal"),
  cameraPreview: document.getElementById("cameraPreview"),
  photoCanvas: document.getElementById("photoCanvas"),
  captureBtn: document.getElementById("captureBtn"),
  fileInput: document.getElementById("fileInput"),
  uploadPreview: document.getElementById("uploadPreview"),
  submitUpload: document.getElementById("submitUpload"),
  gallery: document.getElementById("gallery"),
  photoGrid: document.getElementById("photoGrid"),
  mainButtons: document.getElementById("mainButtons")
};

// Función para mostrar notificaciones
function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Funciones de la cámara
async function startCamera() {
  try {
    elements.cameraModal.style.display = "flex";
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };
    
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.cameraPreview.srcObject = cameraStream;
    
    await new Promise((resolve) => {
      elements.cameraPreview.onloadedmetadata = resolve;
    });
    
    await elements.cameraPreview.play().catch(e => {
      console.error("Error al reproducir video:", e);
      throw new Error("No se pudo iniciar la cámara");
    });
    
  } catch (error) {
    console.error("Error al acceder a la cámara:", error);
    showNotification("Por favor permite el acceso a la cámara");
    closeCamera();
    
    if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
      try {
        const fallbackConstraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        elements.cameraPreview.srcObject = cameraStream;
        await elements.cameraPreview.play();
      } catch (fallbackError) {
        console.error("Error con cámara frontal:", fallbackError);
      }
    }
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (elements.cameraPreview.srcObject) {
    elements.cameraPreview.srcObject = null;
  }
}

function closeCamera() {
  stopCamera();
  elements.cameraModal.style.display = "none";
}

// Funciones para subir imágenes
async function uploadImage(fileBlob, fileName) {
  showNotification("Subiendo foto...");
  
  try {
    // Verificar conexión a internet
    if (!navigator.onLine) {
      throw new Error("No hay conexión a internet");
    }

    const filePath = `photos/${Date.now()}_${fileName.replace(/[^a-z0-9.]/gi, '_')}`;
    const storageRef = storage.ref(filePath);
    
    const metadata = {
      contentType: fileBlob.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000'
    };
    
    // Mostrar progreso de subida
    const uploadTask = storageRef.put(fileBlob, metadata);
    
    // Esperar a que complete la subida
    const snapshot = await uploadTask;
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    // Verificar que la URL se obtuvo correctamente
    if (!downloadURL) {
      throw new Error("No se pudo obtener la URL de descarga");
    }
    
    // Guardar en Firestore
    await db.collection('photos').add({
      url: downloadURL,
      fileName: fileName,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      uploadedBy: auth.currentUser?.uid || 'anonymous'
    });
    
    showNotification("¡Foto subida con éxito!");
    return true;
    
  } catch (error) {
    console.error("Error al subir:", error);
    
    // Solo guardar localmente si es un error de red o de Firebase
    if (error.code === 'storage/retry-limit-exceeded' || 
        error.code === 'storage/network-request-failed' ||
        error.message === 'No hay conexión a internet') {
        
      const localPhoto = {
        id: `local_${Date.now()}`,
        url: URL.createObjectURL(fileBlob),
        fileName: fileName,
        timestamp: Date.now()
      };
      
      const localPhotos = JSON.parse(localStorage.getItem('localPhotos')) || [];
      localPhotos.push(localPhoto);
      localStorage.setItem('localPhotos', JSON.stringify(localPhotos));
      
      showNotification("Foto guardada localmente. Se subirá cuando tengas conexión.");
      return false;
    } else {
      showNotification("Error al subir la foto: " + (error.message || error));
      return false;
    }
  }
}

// Funciones de la galería
async function loadPhotos() {
  elements.photoGrid.innerHTML = '<div class="loading-gallery">Cargando fotos...</div>';
  
  try {
    const querySnapshot = await db.collection("photos").orderBy("timestamp", "desc").get();
    renderPhotos(querySnapshot);
    
    const localPhotos = JSON.parse(localStorage.getItem('localPhotos')) || [];
    if (localPhotos.length > 0) {
      renderLocalPhotos(localPhotos);
    }
  } catch (error) {
    console.error("Error cargando fotos:", error);
    elements.photoGrid.innerHTML = '<div class="error-gallery">Error al cargar las fotos</div>';
  }
}

function renderPhotos(querySnapshot) {
  if (querySnapshot.empty) {
    elements.photoGrid.innerHTML = '<div class="no-photos">Aún no hay fotos subidas</div>';
    return;
  }
  
  let photosHTML = '';
  querySnapshot.forEach((doc) => {
    const { url, fileName } = doc.data();
    photosHTML += `
      <div class="photo-item">
        <img src="${url}" alt="Foto de boda" loading="lazy" crossorigin="anonymous">
        <a href="${url}" download="${fileName || 'foto-boda.jpg'}" class="download-btn" title="Descargar">⬇️</a>
      </div>
    `;
  });
  
  elements.photoGrid.innerHTML = photosHTML;
}

function renderLocalPhotos(localPhotos) {
  let localHTML = '';
  localPhotos.forEach(photo => {
    localHTML += `
      <div class="photo-item local-photo">
        <img src="${photo.url}" alt="Foto local" loading="lazy">
        <span class="local-badge">Local</span>
        <a href="${photo.url}" download="${photo.fileName || 'foto-local.jpg'}" class="download-btn" title="Descargar">⬇️</a>
      </div>
    `;
  });
  
  elements.photoGrid.insertAdjacentHTML('beforeend', localHTML);
}

// Event Listeners
function setupEventListeners() {
  elements.cameraBtn.addEventListener('click', async () => {
    openModal(elements.cameraModal);
    await startCamera();
  });
  
  elements.galleryBtn.addEventListener('click', () => {
    openModal(elements.uploadModal);
  });
  
  elements.viewPhotosBtn.addEventListener('click', () => {
    elements.mainButtons.style.display = "none";
    elements.gallery.style.display = "block";
    loadPhotos();
  });
  
  elements.backFromGalleryBtn.addEventListener('click', () => {
    elements.gallery.style.display = "none";
    elements.mainButtons.style.display = "flex";
  });
  
  elements.captureBtn.addEventListener('click', () => {
    const context = elements.photoCanvas.getContext('2d');
    elements.photoCanvas.width = elements.cameraPreview.videoWidth;
    elements.photoCanvas.height = elements.cameraPreview.videoHeight;
    
    if (cameraStream && cameraStream.getVideoTracks()[0].getSettings().facingMode === 'user') {
      context.translate(elements.photoCanvas.width, 0);
      context.scale(-1, 1);
    }
    
    context.drawImage(elements.cameraPreview, 0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
    
    elements.photoCanvas.toBlob(blob => {
      if (blob) {
        uploadImage(blob, `foto-${Date.now()}.jpg`);
        closeCamera();
      }
    }, 'image/jpeg', 0.85);
  });
  
  elements.fileInput.addEventListener('change', () => {
    const file = elements.fileInput.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showNotification("Solo se permiten imágenes JPEG, PNG o WEBP");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        showNotification("La imagen es muy grande (máximo 5MB)");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = e => {
        elements.uploadPreview.src = e.target.result;
        elements.uploadPreview.style.display = "block";
        elements.submitUpload.disabled = false;
      };
      reader.readAsDataURL(file);
    }
  });
  
  elements.submitUpload.addEventListener('click', () => {
    const file = elements.fileInput.files[0];
    if (file) {
      uploadImage(file, file.name || `foto-${Date.now()}.jpg`);
      closeModal(elements.uploadModal);
    }
  });
  
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      closeModal(modal);
    });
  });
}

// Verificar y subir fotos locales al recuperar conexión
function checkLocalPhotos() {
  window.addEventListener('online', async () => {
    const localPhotos = JSON.parse(localStorage.getItem('localPhotos')) || [];
    if (localPhotos.length > 0) {
      showNotification("Intentando subir fotos guardadas localmente...");
      
      for (let i = 0; i < localPhotos.length; i++) {
        const photo = localPhotos[i];
        try {
          // Convertir la URL a Blob
          const response = await fetch(photo.url);
          const blob = await response.blob();
          
          // Intentar subir
          const success = await uploadImage(blob, photo.fileName);
          if (success) {
            // Eliminar del localStorage si se subió correctamente
            localPhotos.splice(i, 1);
            i--; // Ajustar el índice después de eliminar
            localStorage.setItem('localPhotos', JSON.stringify(localPhotos));
          }
        } catch (error) {
          console.error("Error al subir foto local:", error);
        }
      }
    }
  });
}

// Llamar a esta función en la inicialización
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.signInAnonymously();
    setupEventListeners();
    checkLocalPhotos(); // <-- Añadir esta línea
    new Image().src = 'placeholder.jpg';
    console.log("Aplicación inicializada correctamente");
  } catch (error) {
    console.error("Error inicializando la aplicación:", error);
    showNotification("Error al iniciar la aplicación");
  }
});

function openModal(modal) {
  modal.style.display = "flex";
}

function closeModal(modal) {
  modal.style.display = "none";
  if (modal === elements.cameraModal) stopCamera();
  if (modal === elements.uploadModal) {
    elements.uploadPreview.style.display = "none";
    elements.submitUpload.disabled = true;
    elements.fileInput.value = '';
  }
}