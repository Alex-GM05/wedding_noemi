/*
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Autenticación anónima
auth.signInAnonymously().catch(console.error);

// Elementos del DOM
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const viewPhotosBtn = document.getElementById("viewPhotosBtn");
const backFromGalleryBtn = document.getElementById("backFromGalleryBtn");

const cameraModal = document.getElementById("cameraModal");
const uploadModal = document.getElementById("uploadModal");
const closeBtns = document.querySelectorAll(".close-btn");

const video = document.getElementById("cameraPreview");
const canvas = document.getElementById("photoCanvas");
const captureBtn = document.getElementById("captureBtn");

const fileInput = document.getElementById("fileInput");
const uploadPreview = document.getElementById("uploadPreview");
const submitUpload = document.getElementById("submitUpload");

const gallery = document.getElementById("gallery");
const photoGrid = document.getElementById("photoGrid");
const mainButtons = document.getElementById("mainButtons");

// Modal
function openModal(modal) {
  modal.style.display = "flex";
}

function closeModal(modal) {
  modal.style.display = "none";
  if (modal === cameraModal) stopCamera();
  if (modal === uploadModal) {
    uploadPreview.style.display = "none";
    submitUpload.disabled = true;
  }
}

// Cámara
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (error) {
    showNotification("Error al acceder a la cámara.");
    console.error(error);
  }
}

function stopCamera() {
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}

captureBtn.addEventListener("click", () => {
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    if (blob) {
      uploadImage(blob);
      closeModal(cameraModal);
    }
  }, "image/jpeg");
});

// Subir desde galería
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      uploadPreview.src = e.target.result;
      uploadPreview.style.display = "block";
      submitUpload.disabled = false;
    };
    reader.readAsDataURL(file);
  }
});

submitUpload.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) {
    uploadImage(file);
    closeModal(uploadModal);
  }
});

// Subida a Firebase Storage
function uploadImage(file) {
  const filename = `photos/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;
  const ref = storage.ref().child(filename);

  const uploadTask = ref.put(file);
  showNotification("Subiendo foto...");

  uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
    .then(url => {
      return db.collection("photos").add({
        url,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      showNotification("Foto subida exitosamente.");
      loadPhotos();
    })
    .catch(error => {
      console.error("Error al subir la imagen:", error);
      showNotification("Error al subir la imagen.");
    });
}

// Galería
function loadPhotos() {
  photoGrid.innerHTML = '<div class="loading-gallery">Cargando fotos...</div>';
  db.collection("photos").orderBy("timestamp", "desc").get()
    .then(snapshot => {
      photoGrid.innerHTML = "";
      if (snapshot.empty) {
        photoGrid.innerHTML = '<div class="no-photos">Aún no hay fotos.</div>';
      } else {
        snapshot.forEach(doc => {
          const { url } = doc.data();
          const photoItem = document.createElement("div");
          photoItem.className = "photo-item";
          photoItem.innerHTML = `
            <img src="${url}" alt="Foto de boda">
            <a href="${url}" download class="download-btn" title="Descargar">⬇️</a>
          `;
          photoGrid.appendChild(photoItem);
        });
      }
    })
    .catch(error => {
      console.error("Error al cargar las fotos:", error);
      photoGrid.innerHTML = '<div class="error-gallery">Error al cargar las fotos.</div>';
    });
}

// Notificación
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

// Botones
cameraBtn.addEventListener("click", () => {
  openModal(cameraModal);
  startCamera();
});

galleryBtn.addEventListener("click", () => {
  openModal(uploadModal);
});

viewPhotosBtn.addEventListener("click", () => {
  mainButtons.style.display = "none";
  gallery.style.display = "block";
  loadPhotos();
});

backFromGalleryBtn.addEventListener("click", () => {
  gallery.style.display = "none";
  mainButtons.style.display = "flex";
});

closeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    closeModal(btn.closest(".modal"));
  });
});
*/
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

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initAuth();
});

// Configurar event listeners
function setupEventListeners() {
    // Botones principales
    elements.cameraBtn.addEventListener('click', openCameraModal);
    elements.galleryBtn.addEventListener('click', openUploadModal);
    elements.viewPhotosBtn.addEventListener('click', showGallery);
    elements.backFromGalleryBtn.addEventListener('click', hideGallery);
    
    // Cámara
    document.querySelector('#cameraModal .close-btn').addEventListener('click', closeCameraModal);
    elements.captureBtn.addEventListener('click', capturePhoto);
    
    // Galería
    document.querySelector('#uploadModal .close-btn').addEventListener('click', closeUploadModal);
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.submitUpload.addEventListener('click', uploadSelectedFile);
}

// Autenticación
function initAuth() {
    auth.signInAnonymously()
        .catch(error => console.error("Error de autenticación:", error));
}

// Cámara - Versión corregida para móviles
async function openCameraModal() {
    try {
        elements.cameraModal.style.display = "flex";
        
        // Detener cámara previa si existe
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        
        // Configuración para priorizar cámara trasera en móviles
        const constraints = {
            video: {
                facingMode: 'environment', // Priorizar cámara trasera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraPreview.srcObject = cameraStream;
        
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        showNotification("No se pudo acceder a la cámara");
        closeCameraModal();
        
        // Fallback: intentar con cámara frontal si la trasera falla
        if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
            try {
                const fallbackConstraints = {
                    video: {
                        facingMode: 'user', // Intentar con cámara frontal
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };
                
                cameraStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                elements.cameraPreview.srcObject = cameraStream;
                elements.cameraModal.style.display = "flex";
            } catch (fallbackError) {
                console.error("Error con cámara frontal:", fallbackError);
            }
        }
    }
}

function closeCameraModal() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        elements.cameraPreview.srcObject = null;
    }
    elements.cameraModal.style.display = "none";
}

function capturePhoto() {
    try {
        const context = elements.photoCanvas.getContext('2d');
        elements.photoCanvas.width = elements.cameraPreview.videoWidth;
        elements.photoCanvas.height = elements.cameraPreview.videoHeight;
        
        // Espejo para vista más natural (solo en cámara frontal)
        if (cameraStream && cameraStream.getVideoTracks()[0].getSettings().facingMode === 'user') {
            context.translate(elements.photoCanvas.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(elements.cameraPreview, 0, 0, elements.photoCanvas.width, elements.photoCanvas.height);
        
        // Convertir a blob y subir
        elements.photoCanvas.toBlob(blob => {
            if (blob) {
                uploadImage(blob, `foto-${Date.now()}.jpg`);
                closeCameraModal();
            }
        }, 'image/jpeg', 0.85);
        
    } catch (error) {
        console.error("Error al capturar foto:", error);
        showNotification("Error al tomar la foto");
    }
}

// Galería de archivos
function openUploadModal() {
    elements.uploadModal.style.display = "flex";
    elements.uploadPreview.style.display = "none";
    elements.submitUpload.disabled = true;
    elements.fileInput.value = '';
}

function closeUploadModal() {
    elements.uploadModal.style.display = "none";
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification("Solo se permiten imágenes JPEG, PNG o WEBP");
        return;
    }
    
    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
        showNotification("La imagen es muy grande (máximo 5MB)");
        return;
    }
    
    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.uploadPreview.src = e.target.result;
        elements.uploadPreview.style.display = "block";
        elements.submitUpload.disabled = false;
    };
    reader.readAsDataURL(file);
}

function uploadSelectedFile() {
    const file = elements.fileInput.files[0];
    if (file) {
        uploadImage(file, file.name || `foto-${Date.now()}.jpg`);
        closeUploadModal();
    }
}

// Subida a Firebase Storage - Versión mejorada para móviles
function uploadImage(fileBlob, fileName) {
    showNotification("Subiendo foto...");
    
    // Crear referencia única para el archivo
    const filePath = `wedding-photos/${Date.now()}_${fileName}`;
    const fileRef = storage.ref().child(filePath);
    
    // Configurar metadatos
    const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
            uploadedBy: auth.currentUser?.uid || 'anonymous',
            device: isMobile() ? 'mobile' : 'desktop'
        }
    };
    
    // Subir el archivo
    const uploadTask = fileRef.put(fileBlob, metadata);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Opcional: Mostrar progreso
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Progreso: ${Math.round(progress)}%`);
        },
        (error) => {
            console.error("Error al subir:", error);
            showNotification("Error al subir la foto");
            
            // Guardar localmente si hay error de conexión
            if (error.code === 'storage/retry-limit-exceeded') {
                savePhotoLocally(fileBlob, fileName);
            }
        },
        () => {
            // Subida completada
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Guardar metadatos en Firestore
                return db.collection('weddingPhotos').add({
                    url: downloadURL,
                    fileName: fileName,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    uploadedBy: auth.currentUser?.uid || 'anonymous'
                });
            }).then(() => {
                showNotification("¡Foto subida con éxito!");
                if (elements.gallery.style.display === "block") {
                    loadPhotos();
                }
            }).catch(error => {
                console.error("Error guardando metadatos:", error);
                showNotification("Error al guardar la foto");
            });
        }
    );
}

// Guardar foto localmente (fallback)
function savePhotoLocally(fileBlob, fileName) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const localPhotos = JSON.parse(localStorage.getItem('localWeddingPhotos')) || [];
        localPhotos.push({
            id: `local_${Date.now()}`,
            url: e.target.result,
            fileName: fileName,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('localWeddingPhotos', JSON.stringify(localPhotos));
        showNotification("Foto guardada localmente. Se subirá cuando haya conexión.");
    };
    reader.readAsDataURL(fileBlob);
}

// Galería de fotos
function showGallery() {
    elements.mainButtons.style.display = "none";
    elements.gallery.style.display = "block";
    loadPhotos();
}

function hideGallery() {
    elements.gallery.style.display = "none";
    elements.mainButtons.style.display = "flex";
}

function loadPhotos() {
    elements.photoGrid.innerHTML = '<div class="loading-gallery">Cargando fotos...</div>';
    
    // Cargar fotos de Firebase
    db.collection("weddingPhotos")
        .orderBy("timestamp", "desc")
        .get()
        .then((querySnapshot) => {
            renderPhotos(querySnapshot);
            
            // Cargar fotos locales si hay
            const localPhotos = JSON.parse(localStorage.getItem('localWeddingPhotos')) || [];
            if (localPhotos.length > 0) {
                renderLocalPhotos(localPhotos);
            }
        })
        .catch((error) => {
            console.error("Error cargando fotos:", error);
            elements.photoGrid.innerHTML = '<div class="error-gallery">Error al cargar las fotos</div>';
            
            // Mostrar fotos locales si hay error
            const localPhotos = JSON.parse(localStorage.getItem('localWeddingPhotos')) || [];
            if (localPhotos.length > 0) {
                renderLocalPhotos(localPhotos);
            }
        });
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
                <img src="${url}" alt="Foto de boda" loading="lazy">
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

// Notificaciones
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

// Helper functions
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Sincronizar fotos locales cuando haya conexión
function syncLocalPhotos() {
    if (!navigator.onLine) return;
    
    const localPhotos = JSON.parse(localStorage.getItem('localWeddingPhotos')) || [];
    if (localPhotos.length === 0) return;
    
    localPhotos.forEach(photo => {
        fetch(photo.url)
            .then(res => res.blob())
            .then(blob => {
                uploadImage(blob, photo.fileName || `local-${Date.now()}.jpg`);
            })
            .catch(error => {
                console.error("Error sincronizando foto local:", error);
            });
    });
    
    localStorage.removeItem('localWeddingPhotos');
}

// Verificar conexión periódicamente
setInterval(syncLocalPhotos, 30000); // Cada 30 segundos
window.addEventListener('online', syncLocalPhotos);