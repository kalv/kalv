class JustShare {

	constructor() {
    this.client = new WebTorrent();
    this.fileInput = document.getElementById('fileInput');
    this.seedButton = document.getElementById('seedButton');
    this.seedingInfo = document.getElementById('seedingInfo');
    this.magnetInput = document.getElementById('magnetInput');
    this.downloadButton = document.getElementById('downloadButton');
    this.downloadInfo = document.getElementById('downloadInfo');
    this.downloadedContent = document.getElementById('downloadedContent');

		this.selectedFile = null;

		// --- Seeding Logic ---
    this.fileInput.addEventListener('change', () => {
        this.selectedFile = this.fileInput.files[0];
        this.seedButton.disabled = !this.selectedFile;
        if (this.selectedFile) {
            this.seedingInfo.innerHTML = `Selected: ${this.selectedFile.name}`;
        } else {
            this.seedingInfo.innerHTML = '';
        }
    });

		seedButton.addEventListener('click', () => {
  	    if (!this.selectedFile) return;
  	    this.seedButton.disabled = true;
  	    this.seedingInfo.innerHTML = 'Starting seed...';

  	    // Use public WebTorrent trackers (you can add more)
				// updated from https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all_ws.txt
  	    const trackers = [
          'wss://tracker.webtorrent.dev',
					'wss://tracker.btorrent.xyz',
  	    ];

  	    this.client.seed(this.selectedFile, { announce: trackers }, (torrent) => {
  	        console.log('Client is seeding:', torrent.infoHash);
  	        this.seedingInfo.innerHTML = `
  	            <p><strong>Seeding File:</strong> ${torrent.name}</p>
  	            <p><strong>Magnet URI:</strong> <input type='text' value='${torrent.magnetURI}' size='60' readonly onclick='this.select();'></p>
  	            <p>Copy and share the Magnet URI above.</p>
  	            <p>Status: <span id="seedStatus">Seeding... 0 peers</span></p>
  	        `;

  	        const statusElem = document.getElementById('seedStatus');
  	         setInterval(() => {
               console.log("updating peers");
  	             if (statusElem) {
  	                statusElem.textContent = `Seeding... ${torrent.numPeers} peers`;
  	             }
  	         }, 2000); // Update peer count periodically
  	    });
  	});

		// --- Downloading Logic ---
		downloadButton.addEventListener('click', () => {
			const magnetURI = this.magnetInput.value.trim();
      console.log(magnetURI);
			if (magnetURI == undefined) {
				alert('Please enter a Magnet URI or Info Hash.');
				return;
			}
			this.downloadButton.disabled = true;
			this.downloadInfo.innerHTML = `Adding torrent: ${magnetURI} ...`;
			this.downloadedContent.innerHTML = ''; // Clear previous downloads

			this.client.add(magnetURI, (torrent) => {
				this.downloadInfo.innerHTML = `
										<p><strong>Downloading:</strong> ${torrent.name || 'Fetching metadata...'}</p>
										<p>Status: <span id="dlStatus">Connecting... 0 peers</span></p>
										<p>Progress: <span id="dlProgress">0%</span></p>
										<p>Download Speed: <span id="dlSpeed">0 B/s</span></p>
								`;

				const statusElem = document.getElementById('dlStatus');
				const progressElem = document.getElementById('dlProgress');
				const speedElem = document.getElementById('dlSpeed');

				torrent.on('metadata', () => {
					downloadInfo.querySelector('strong').textContent = `Downloading: ${torrent.name}`;
				});

				torrent.on('download', (bytes) => {
					if (statusElem) statusElem.textContent = `Downloading... ${torrent.numPeers} peers`;
					if (progressElem) progressElem.textContent = `${(torrent.progress * 100).toFixed(1)}%`;
					if (speedElem) speedElem.textContent = `${this.formatBytes(torrent.downloadSpeed)}/s`;
				});

				torrent.on('done', () => {
					console.log('Torrent download finished');
					if (statusElem) statusElem.textContent = `Finished! ${torrent.numPeers} peers`;
					if (progressElem) progressElem.textContent = '100%';
					if (speedElem) speedElem.textContent = '0 B/s';

					// Append files to the page (display links)
					torrent.files.forEach((file) => {
						file.getBlobURL((err, url) => {
							if (err) return console.error(err);
							const a = document.createElement('a');
							a.href = url;
							a.download = file.name;
							a.textContent = `Download ${file.name}`;
							downloadedContent.appendChild(a);
							downloadedContent.appendChild(document.createElement('br'));
						});
					});
				});

				torrent.on('error', (err) => {
					console.error("Torrent error:", err);
					if (statusElem) statusElem.textContent = `Error: ${err.message}`;
					this.downloadButton.disabled = false;
				});
			});
		});

    // handle torrent client errors
    this.client.on('error', (err) => {
        console.error('WebTorrent client error:', err);
        // Potentially disable buttons or show a global error state
        this.seedButton.disabled = true;
        this.downloadButton.disabled = true;
    });

	}

  // Helper function to format bytes
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

}

export default JustShare;
