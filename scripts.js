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
  
  const uploadButton = document.getElementById('upload-button');
  const fileInput = document.getElementById('file-input');
  const gallery = document.getElementById('gallery');
  
  uploadButton.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = storage.ref(`images/${fileName}`);
    await storageRef.put(file);
  
    const url = await storageRef.getDownloadURL();
  
    await firestore.collection('images').add({
      url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  
    addImageToGallery(url);
  });
  
  function addImageToGallery(url) {
    const col = document.createElement('div');
    col.className = 'col';
    const img = document.createElement('img');
    img.src = url;
    img.className = 'img-fluid rounded';
    col.appendChild(img);
    gallery.prepend(col);
  }
  
  async function loadImages() {
    const snapshot = await firestore.collection('images').orderBy('createdAt', 'desc').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      addImageToGallery(data.url);
    });
  }
  
  loadImages();
  