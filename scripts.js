// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
const firebaseConfig = {
  apiKey: "AIzaSyD1aQZuIhcg7H4nzrA9cR-g_aFML98Tfwg",
  authDomain: "wedding-noemi-a30fe.firebaseapp.com",
  projectId: "wedding-noemi-a30fe",
  storageBucket: "wedding-noemi-a30fe.firebasestorage.app",
  messagingSenderId: "540796399199",
  appId: "1:540796399199:web:ad88e3323aea8fa6ea35ea"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const firestore = firebase.firestore();

// Elementos
const cameraBtn = document.getElementById('cameraBtn');
const galleryBtn = document.getElementById('galleryBtn');
const viewPhotosBtn = document.getElementById('viewPhotosBtn');
const backFromGalleryBtn = document.getElementById('backFromGalleryBtn');

const cameraModal = document.getElementById('cameraModal');
const uploadModal = document.getElementById('uploadModal');
const fileInput = document.getElementById('fileInput');
const uploadPreview = document.getElementById('uploadPreview');
const submitUpload = document.getElementById('submitUpload');
const cameraPreview = document.getElementById('cameraPreview');
const photoCanvas = document.getElementById('photoCanvas');
const captureBtn = document.getElementById('captureBtn');
const gallery = document.getElementById('gallery');
const mainButtons = document.getElementById('mainButtons');
const photoGrid = document.getElementById('photoGrid');

// Modal abrir/cerrar
document.querySelectorAll('.close-btn').forEach(btn =>
    btn.addEventListener('click', () => {
        cameraModal.style.display = 'none';
        uploadModal.style.display = 'none';
        stopCamera();
    })
);

// Cámara
cameraBtn.addEventListener('click', async () => {
    cameraModal.style.display = 'flex';
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraPreview.srcObject = stream;
});

function stopCamera() {
    const stream = cameraPreview.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraPreview.srcObject = null;
    }
}

// Captura de foto
captureBtn.addEventListener('click', () => {
    const ctx = photoCanvas.getContext('2d');
    photoCanvas.width = cameraPreview.videoWidth;
    photoCanvas.height = cameraPreview.videoHeight;
    ctx.drawImage(cameraPreview, 0, 0);
    photoCanvas.toBlob(uploadImage, 'image/jpeg');
    cameraModal.style.display = 'none';
    stopCamera();
});

// Galería
galleryBtn.addEventListener('click', () => {
    uploadModal.style.display = 'flex';
    fileInput.value = '';
    uploadPreview.style.display = 'none';
    submitUpload.disabled = true;
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            uploadPreview.src = e.target.result;
            uploadPreview.style.display = 'block';
            submitUpload.disabled = false;
        };
        reader.readAsDataURL(file);
    }
});

submitUpload.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) uploadImage(file);
    uploadModal.style.display = 'none';
});

// Subir imagen
function uploadImage(blobOrFile) {
    const id = Date.now();
    const ref = storage.ref().child(`boda/${id}.jpg`);
    ref.put(blobOrFile).then(() => {
        ref.getDownloadURL().then(url => {
            firestore.collection('fotos').add({ url, timestamp: id });
            showNotification("Foto subida con éxito 💖");
        });
    });
}

// Ver galería
viewPhotosBtn.addEventListener('click', () => {
    mainButtons.style.display = 'none';
    gallery.style.display = 'block';
    loadGallery();
});

backFromGalleryBtn.addEventListener('click', () => {
    gallery.style.display = 'none';
    mainButtons.style.display = 'flex';
});

// Cargar galería
function loadGallery() {
    photoGrid.innerHTML = '';
    firestore.collection('fotos').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        photoGrid.innerHTML = '';
        if (snapshot.empty) {
            photoGrid.innerHTML = '<p class="no-photos">Aún no hay fotos 😢</p>';
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.classList.add('photo-item');
            div.innerHTML = `
                <img src="${data.url}" alt="Recuerdo">
                <a class="download-btn" href="${data.url}" download title="Descargar">⬇️</a>
            `;
            photoGrid.appendChild(div);
        });
    });
}

// Notificaciones
function showNotification(message) {
    const note = document.createElement('div');
    note.className = 'notification';
    note.textContent = message;
    document.body.appendChild(note);
    setTimeout(() => {
        note.classList.add('fade-out');
        setTimeout(() => note.remove(), 500);
    }, 3000);
}
