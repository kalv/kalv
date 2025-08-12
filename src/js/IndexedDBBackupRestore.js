/**
 * IndexedDBBackupRestore Class
 * Provides methods to backup and restore data from specified IndexedDB databases.
 * Handles conversion of File/Blob objects to Base64 for JSON serialization
 * and vice-versa during restoration. Skips items with a 'timestamp' property during restore.
 */
class IndexedDBBackupRestore {
    /**
     * @param {string[]} dbNames - An array of IndexedDB database names to manage.
     */
    constructor(dbNames) {
        if (!Array.isArray(dbNames) || dbNames.some(name => typeof name !== 'string')) {
            throw new Error("dbNames must be an array of strings.");
        }
        this.dbNames = dbNames;
        this.dbConnections = {}; // Stores open IndexedDB connections
    }

    /**
     * Helper method to open an IndexedDB connection.
     * Handles onupgradeneeded to create object stores if they don't exist.
     * @param {string} dbName - The name of the IndexedDB database.
     * @param {number} [version] - The version of the database. If higher than current, onupgradeneeded fires.
     * @param {string[]} [objectStoreNames=[]] - Array of object store names to ensure existence during upgrade.
     * @returns {Promise<IDBDatabase>} A promise that resolves with the opened IDBDatabase object.
     */
    async _openDB(dbName, version, objectStoreNames = []) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                objectStoreNames.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        console.log(`Creating object store: ${storeName} in ${dbName}`);
                        // Default keyPath 'id' and autoIncrement; adjust as needed for specific schemas.
                        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    }
                });
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                this.dbConnections[dbName] = db; // Store the connection
                resolve(db);
            };

            request.onerror = (event) => {
                debugger;
                reject(`Error opening DB ${dbName}: ${event.target.errorCode}`);
            };
        });
    }

    /**
     * Helper method to convert a Blob or File object to a Base64 string.
     * @param {Blob|File} file - The Blob or File object to convert.
     * @returns {Promise<string>} A promise that resolves with the Base64 string.
     */
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Helper method to convert a Base64 string back to a Blob object.
     * @param {string} base64 - The Base64 string (including data URL prefix).
     * @param {string} mimeType - The MIME type of the original file (e.g., 'image/png').
     * @returns {Blob|null} A Blob object, or null if conversion fails.
     */
    _base64ToBlob(base64, mimeType) {
        try {
            const byteString = atob(base64.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeType });
        } catch (e) {
            console.error("Error converting base64 to blob:", e);
            return null;
        }
    }

    /**
     * Backs up all specified IndexedDB databases into a JSON string.
     * Converts File/Blob objects to Base64 for JSON serialization.
     * @returns {Promise<string>} A promise that resolves with the JSON string of the backup data.
     */
    async backup() {
        const backupData = {};

        for (const dbName of this.dbNames) {
            try {
                const db = await this._openDB(dbName);
                backupData[dbName] = {};

                const objectStoreNames = Array.from(db.objectStoreNames);

                for (const storeName of objectStoreNames) {
                    backupData[dbName][storeName] = [];
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.openCursor();

                    await new Promise((resolve, reject) => {
                        request.onsuccess = async (event) => {
                            const cursor = event.target.result;
                            if (cursor) {
                                let item = { ...cursor.value };

                                for (const key in item) {
                                    if (item[key] instanceof Blob || item[key] instanceof File) {
                                        try {
                                            const base64 = await this._fileToBase64(item[key]);
                                            item[key] = {
                                                _indexedDB_file_data: true,
                                                data: base64,
                                                type: item[key].type,
                                                name: item[key].name || 'unnamed_file'
                                            };
                                        } catch (e) {
                                            console.error(`Error converting file to base64 for key '${key}':`, e);
                                            item[key] = null;
                                        }
                                    }
                                }
                                backupData[dbName][storeName].push(item);
                                cursor.continue();
                            } else {
                                resolve();
                            }
                        };

                        request.onerror = (event) => {
                            reject(`Error reading object store ${storeName}: ${event.target.errorCode}`);
                        };
                    });
                }
            } catch (error) {
                console.error(`Error during backup of ${dbName}:`, error);
                throw new Error(`Backup failed for ${dbName}: ${error.message}`);
            }
        }
        return JSON.stringify(backupData, null, 2);
    }

    /**
     * Restores data to IndexedDB databases from a JSON string.
     * Converts Base64 strings back to Blob objects.
     * Skips items that have a 'timestamp' property.
     * @param {string} jsonString - The JSON string containing the backup data.
     * @returns {Promise<void>} A promise that resolves when restoration is complete.
     */
    async restore(jsonString) {
        let parsedData;
        try {
            parsedData = JSON.parse(jsonString);
        } catch (e) {
            throw new Error('Invalid JSON string provided for restoration.');
        }

        for (const dbName in parsedData) {
            if (parsedData.hasOwnProperty(dbName)) {
                const dbStoresData = parsedData[dbName];
                const objectStoreNames = Object.keys(dbStoresData);

                try {
                    const db = await this._openDB(dbName, 1, objectStoreNames);

                    for (const storeName of objectStoreNames) {
                        const itemsToRestore = dbStoresData[storeName];
                        if (!itemsToRestore || itemsToRestore.length === 0) continue;

                        if (!db.objectStoreNames.contains(storeName)) {
                            console.warn(`Object store '${storeName}' not found in '${dbName}'. Skipping restore for this store.`);
                            continue;
                        }

                        const transaction = db.transaction(storeName, 'readwrite');
                        const store = transaction.objectStore(storeName);

                        for (let item of itemsToRestore) {
                            //if (item.hasOwnProperty('timestamp')) {
                            //    console.warn(`Skipping item with timestamp during restore in ${dbName}.${storeName}:`, item);
                            //    continue;
                            //}

                            for (const key in item) {
                                if (item[key] && typeof item[key] === 'object' && item[key]._indexedDB_file_data) {
                                    try {
                                        item[key] = this._base64ToBlob(item[key].data, item[key].type);
                                        if (!item[key]) {
                                            console.warn(`Failed to convert base64 to Blob for key: '${key}'. Setting to null.`);
                                        }
                                    } catch (e) {
                                        console.error(`Error converting base64 to Blob for key '${key}':`, e);
                                        item[key] = null;
                                    }
                                }
                            }

                            try {
                                await new Promise((resolve, reject) => {
                                    const putRequest = store.put(item);
                                    putRequest.onsuccess = () => resolve();
                                    putRequest.onerror = (event) => reject(event.target.errorCode);
                                });
                            } catch (e) {
                                console.error(`Error putting item into ${dbName}.${storeName}:`, e);
                                throw new Error(`Restoration failed for an item in ${dbName}.${storeName}.`);
                            }
                        }

                        await new Promise((resolve) => {
                            transaction.oncomplete = () => resolve();
                            transaction.onerror = (event) => {
                                console.error(`Transaction error for ${dbName}.${storeName}:`, event.target.errorCode);
                                resolve(); // Resolve even on error to continue with other stores/DBs
                            };
                        });
                    }
                } catch (error) {
                    console.error(`Error during restore of ${dbName}:`, error);
                    throw new Error(`Restoration failed for ${dbName}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Closes all currently open IndexedDB connections managed by this instance.
     * This is important to release database locks.
     */
    closeConnections() {
        for (const dbName in this.dbConnections) {
            if (this.dbConnections.hasOwnProperty(dbName) && this.dbConnections[dbName]) {
                this.dbConnections[dbName].close();
                delete this.dbConnections[dbName];
                console.log(`Closed connection to ${dbName}`);
            }
        }
    }
}

export default IndexedDBBackupRestore;
