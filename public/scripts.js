// Importaciones para Firebase v9 Modular
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD1aQZuIhcg7H4nzrA9cR-g_aFML98Tfwg",
  authDomain: "wedding-noemi-a30fe.firebaseapp.com",
  projectId: "wedding-noemi-a30fe",
  storageBucket: "wedding-noemi-a30fe.appspot.com",
  messagingSenderId: "540796399199",
  appId: "1:540796399199:web:ad88e3323aea8fa6ea35ea"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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

// Funciones de la cámara (corregidas para móviles)
async function startCamera() {
  try {
    elements.cameraModal.style.display = "flex";
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    // Configuración para priorizar cámara trasera
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };
    
    // Solicitar permisos de cámara
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.cameraPreview.srcObject = cameraStream;
    
    // Esperar a que el video esté listo
    await new Promise((resolve) => {
      elements.cameraPreview.onloadedmetadata = resolve;
    });
    
    // Reproducir el stream de video
    await elements.cameraPreview.play().catch(e => {
      console.error("Error al reproducir video:", e);
      throw new Error("No se pudo iniciar la cámara");
    });
    
  } catch (error) {
    console.error("Error al acceder a la cámara:", error);
    showNotification("Por favor permite el acceso a la cámara");
    closeCamera();
    
    // Intentar con cámara frontal si la trasera falla
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

// Funciones para subir imágenes (con manejo CORS)
async function uploadImage(fileBlob, fileName) {
  showNotification("Subiendo foto...");
  
  try {
    // Crear referencia única para el archivo
    const filePath = `photos/${Date.now()}_${fileName.replace(/[^a-z0-9.]/gi, '_')}`;
    const storageRef = ref(storage, filePath);
    
    // Configurar metadatos
    const metadata = {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000'
    };
    
    // Subir el archivo
    const snapshot = await uploadBytes(storageRef, fileBlob, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Guardar metadatos en Firestore
    await db.collection('photos').add({
      url: downloadURL,
      fileName: fileName,
      timestamp: new Date(),
      uploadedBy: auth.currentUser?.uid || 'anonymous'
    });
    
    showNotification("¡Foto subida con éxito!");
    return true;
    
  } catch (error) {
    console.error("Error al subir:", error);
    
    // Fallback a localStorage
    const localPhoto = {
      id: `local_${Date.now()}`,
      url: URL.createObjectURL(fileBlob),
      fileName: fileName,
      timestamp: Date.now()
    };
    
    const localPhotos = JSON.parse(localStorage.getItem('localPhotos')) || [];
    localPhotos.push(localPhoto);
    localStorage.setItem('localPhotos', JSON.stringify(localPhotos));
    
    showNotification("Foto guardada localmente");
    return false;
  }
}

// Funciones de la galería
async function loadPhotos() {
  elements.photoGrid.innerHTML = '<div class="loading-gallery">Cargando fotos...</div>';
  
  try {
    const querySnapshot = await db.collection("photos").orderBy("timestamp", "desc").get();
    renderPhotos(querySnapshot);
    
    // Cargar fotos locales si hay
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
  // Botones principales
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
  
  // Cámara
  elements.captureBtn.addEventListener('click', () => {
    const context = elements.photoCanvas.getContext('2d');
    elements.photoCanvas.width = elements.cameraPreview.videoWidth;
    elements.photoCanvas.height = elements.cameraPreview.videoHeight;
    
    // Aplicar efecto espejo si es cámara frontal
    if (cameraStream && cameraStream.getVideoTracks()[0].getSettings().facingMode === 'user') {
      context.translate(elements.photoCanvas.width, 0);
      context.scale(-1, 1);
    }
    
    context.drawImage(elements.cameraPreview, 0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
    
    // Convertir a blob y subir
    elements.photoCanvas.toBlob(blob => {
      if (blob) {
        uploadImage(blob, `foto-${Date.now()}.jpg`);
        closeCamera();
      }
    }, 'image/jpeg', 0.85);
  });
  
  // Galería
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
  
  // Modales
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      closeModal(modal);
    });
  });
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Autenticación anónima
    await signInAnonymously(auth);
    
    // Configurar event listeners
    setupEventListeners();
    
    // Precargar recursos
    new Image().src = 'placeholder.jpg';
    
    console.log("Aplicación inicializada correctamente");
  } catch (error) {
    console.error("Error inicializando la aplicación:", error);
    showNotification("Error al iniciar la aplicación");
  }
});

// Función para abrir modales
function openModal(modal) {
  modal.style.display = "flex";
}

// Función para cerrar modales
function closeModal(modal) {
  modal.style.display = "none";
  if (modal === elements.cameraModal) stopCamera();
  if (modal === elements.uploadModal) {
    elements.uploadPreview.style.display = "none";
    elements.submitUpload.disabled = true;
    elements.fileInput.value = '';
  }
}