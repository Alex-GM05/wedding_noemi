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