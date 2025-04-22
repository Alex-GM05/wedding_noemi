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
  const auth = firebase.auth();
  
  // Autenticación anónima
  auth.signInAnonymously().catch(err => {
    console.error("Error de autenticación:", err);
  });
  
  // Elementos del DOM
  const cameraBtn = document.getElementById('cameraBtn');
  const galleryBtn = document.getElementById('galleryBtn');
  const viewPhotosBtn = document.getElementById('viewPhotosBtn');
  const fileInput = document.getElementById('fileInput');
  const video = document.getElementById('cameraPreview');
  const captureBtn = document.getElementById('captureBtn');
  const canvas = document.getElementById('photoCanvas');
  const gallery = document.getElementById('photoGallery');
  const backBtn = document.getElementById('backBtn');
  const photoGrid = document.getElementById('photoGrid');
  
  // Abrir cámara
  cameraBtn.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    document.getElementById('cameraSection').style.display = 'block';
  });
  
  // Capturar y subir foto desde la cámara
  captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
    canvas.toBlob(blob => {
      const fileName = `camera_${Date.now()}.jpg`;
      uploadImage(blob, fileName);
    }, 'image/jpeg', 0.9);
  
    video.srcObject.getTracks().forEach(track => track.stop());
    document.getElementById('cameraSection').style.display = 'none';
  });
  
  // Abrir selector de galería
  galleryBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Subir foto desde galería
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const fileName = `gallery_${Date.now()}_${file.name}`;
    uploadImage(file, fileName);
  });
  
  // Subir imagen a Firebase Storage y registrar en Firestore
  function uploadImage(file, fileName) {
    const ref = storage.ref().child(`photos/${fileName}`);
    ref.put(file).then(async snapshot => {
      const url = await snapshot.ref.getDownloadURL();
      await firestore.collection('photos').add({
        url,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        uploadedBy: auth.currentUser?.uid || 'anonymous'
      });
      alert("Foto subida con éxito");
    }).catch(err => {
      console.error("Error al subir imagen:", err);
      alert("Error al subir la imagen");
    });
  }
  
  // Mostrar galería de fotos
  viewPhotosBtn.addEventListener('click', loadPhotos);
  backBtn.addEventListener('click', () => {
    gallery.style.display = 'none';
  });
  
  function loadPhotos() {
    photoGrid.innerHTML = "Cargando fotos...";
    firestore.collection('photos')
      .orderBy('timestamp', 'desc')
      .get()
      .then(snapshot => {
        photoGrid.innerHTML = "";
        if (snapshot.empty) {
          photoGrid.innerHTML = "<p>No hay fotos aún.</p>";
          return;
        }
  
        snapshot.forEach(doc => {
          const data = doc.data();
          const img = document.createElement('img');
          img.src = data.url;
          img.className = "photo-item";
          photoGrid.appendChild(img);
        });
  
        gallery.style.display = 'block';
      })
      .catch(err => {
        console.error("Error cargando fotos:", err);
        photoGrid.innerHTML = "<p>Error al cargar las fotos</p>";
      });
  }
  