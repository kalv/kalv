class DroppableImageTarget {
  constructor(divId) {
    this.div = document.getElementById(divId);
    if (!this.div) {
      console.error(`Element with ID '${divId}' not found.`);
      return;
    }
    this.dbName = 'windowImage';
    this.dbVersion = 1;
    this.db = null;

    this.initDatabase().then(() => {
      this.loadExistingImage();
    });
    this.setupEventListeners();
  }

  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.errorCode);
        reject('Error opening database');
      };

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        this.db.createObjectStore('images', { keyPath: 'id' });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('Database opened successfully.');
        resolve();
      };
    });
  }

  setupEventListeners() {
    this.div.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.div.style.backgroundColor = '#f0f0f0';
    });

    this.div.addEventListener('dragleave', () => {
      this.div.style.backgroundColor = '';
    });

    this.div.addEventListener('drop', (event) => {
      event.preventDefault();
      this.div.style.backgroundColor = '';

      const files = event.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        const file = files[0];
        this.storeImage(file);
      }
    });
  }

  storeImage(file) {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target.result;
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');

      // Clear existing images before adding a new one
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        console.log('Previous images cleared.');

        const imageObject = {
          id: 'current-image', // Use a fixed ID to ensure only one image is stored
          name: file.name,
          data: imageData,
          timestamp: new Date()
        };

        const addRequest = store.add(imageObject);

        addRequest.onsuccess = () => {
          console.log('Image stored successfully!');
          this.displayImage(imageData);
        };

        addRequest.onerror = (event) => {
          console.error('Error storing image:', event.target.error);
        };
      };

      clearRequest.onerror = (event) => {
        console.error('Error clearing object store:', event.target.error);
      };
    };
    reader.readAsDataURL(file);
  }

  loadExistingImage() {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }

    const transaction = this.db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const request = store.get('current-image');

    request.onsuccess = (event) => {
      const imageObject = event.target.result;
      if (imageObject) {
        console.log('Existing image loaded from database.');
        this.displayImage(imageObject.data);
      } else {
        console.log('No existing image found.');
      }
    };

    request.onerror = (event) => {
      console.error('Error loading image:', event.target.error);
    };
  }

  displayImage(dataUrl) {
    this.div.innerHTML = ''; // Clear previous content
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    this.div.appendChild(img);
  }
}

// Example usage:
// Assuming you have a div with the id "drop-target" in your HTML
// new DroppableImageTarget('drop-target');

export default DroppableImageTarget;
