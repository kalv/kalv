class Notes {
  constructor() {
    this.textarea = document.getElementById('noteTextarea');
    this.dbName = 'kalvNotesDB';
    this.storeName = 'savedText';
    this.request = indexedDB.open(this.dbName, 2);
		this.db = null;

    this.request.onerror = function(event) {
      console.log(`Error opening database: ${event.target.errorCode}`);
    };

    this.request.onsuccess = function(event) {
      this.db = event.target.result;
      console.log('Database connected successfully.');
      this.loadSavedText(); // Load any previously saved text
    }.bind(this);

//FIX: THis is not working
		this.request.onupgradeneeded = function(event) {
			console.log("this is being fired");
		  this.db = event.target.result;
		  // Create an object store if it doesn't exist
		  if (!this.db.objectStoreNames.contains(this.storeName)) {
		    this.db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
		    console.log('Object store created.');
		  }
		}.bind(this);

    this.textarea.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) { // Check if Enter key was pressed without Shift
        event.preventDefault(); // Prevent the default newline behavior
        const textToSave = this.textarea.value.trim();
        if (textToSave) {
          this.saveTextToDB(textToSave);
          this.textarea.value = "";
        } else {
          console.log('Nothing to save.');
        }
      }
    }.bind(this));
    const clearDb = document.getElementById("clearNotes");
    clearDb.addEventListener("click", function(e) {
      e.preventDefault();
      this.clearDb();
      return false;
    }.bind(this));
  }// end-constructor

  clearDb() {
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    objectStore.clear();
    this.loadSavedText();
  }

  saveTextToDB(text) {
    if (!this.db) {
      console.log('Database not initialized yet.');
      return;
    }

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const addRequest = objectStore.add({ text: text, timestamp: Date.now() });

    addRequest.onsuccess = function(event) {
      console.log('Text saved to IndexedDB.');
			this.loadSavedText();
    }.bind(this);

    addRequest.onerror = function(event) {
      console.log(`Error saving text: ${event.target.errorCode}`);
    };
  }

	loadSavedText() {
	  if (!this.db) return;
		const previousNotes = document.getElementById('previousNotes');
	  const transaction = this.db.transaction([this.storeName], 'readonly');
	  const objectStore = transaction.objectStore(this.storeName);
	  const getAllRequest = objectStore.getAll(); // Get all stored items
	
	  getAllRequest.onsuccess = function(event) {
	    const results = event.target.result;
	    if (results && results.length > 0) {
				const notes = results.map(item => {
					const div = document.createElement('div');
					div.textContent = item.text;
					return div;
				});

				previousNotes.innerHTML = ""
				previousNotes.append(...notes);

	      console.log('Saved texts loaded.');
	    } else {
        previousNotes.innerHTML = ""
	      console.log('No saved text found.');
	    }
	  };
	
	  getAllRequest.onerror = function(event) {
	    console.log(`Error loading text: ${event.target.errorCode}`);
	  };
	}

}
export default Notes;
