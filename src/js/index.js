import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import JustShare from './just-share.js'
import Notes from './notes.js'

let scene = undefined;

/* Vlog util */

let preview = null;
let startButton = null;
let stopButton = null;
let status = null;
let downloadLink = null;

let ffmpeg;
let mediaRecorder;
let recordedBlobs = [];
let mediaStream;
let ffmpegWorking = false;

// --- Initialization ---

async function loadFFmpeg() {
  status.textContent = 'Loading ffmpeg-core.js...';
  try {
    ffmpeg = FFmpeg.createFFmpeg({
      log: true, // Enable logging for debugging
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
      // Use the same version core as the main library
    });
    await ffmpeg.load();
    status.textContent = 'FFmpeg loaded. Ready to record.';
    startButton.disabled = false;
  } catch (error) {
    console.error("Error loading ffmpeg:", error);
    status.textContent = 'Error loading FFmpeg. Check console and COOP/COEP headers.';
    alert('Failed to load FFmpeg. Ensure your server sends COOP/COEP headers and you are using HTTPS or localhost.');
  }
}

// --- Webcam and Recording Logic ---
async function startRecording() {
	if (ffmpegWorking) {
		status.textContent = 'FFmpeg is currently processing. Please wait.';
		return;
	}
	recordedBlobs = [];
	actualMimeType = ''; // Reset actual mime type
	downloadLink.style.display = 'none';
	downloadLink.href = '#';
	preview.style.display = 'block';

	try {
		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1280 }, height: { ideal: 720 } },
			audio: true
		});

		const videoTrack = mediaStream.getVideoTracks()[0];
		const settings = videoTrack.getSettings();
		console.log("Actual Video Track Settings:", settings); // Good for debugging

		preview.srcObject = mediaStream;
		preview.captureStream = preview.captureStream || preview.mozCaptureStream;

		// --- Get mimeType options ---
		const options = getSupportedMimeTypeOptions();

		// --- Instantiate MediaRecorder ---
		if (options) {
			// A specific mimeType was supported
			mediaRecorder = new MediaRecorder(mediaStream, options);
		} else {
			// No specific type supported, let the browser choose its default
			mediaRecorder = new MediaRecorder(mediaStream);
		}

		// --- Crucial: Get the *actual* mimeType being used ---
		actualMimeType = mediaRecorder.mimeType;
		if (!actualMimeType) {
			// Fallback if browser doesn't report mimeType immediately (rare)
			actualMimeType = options ? options.mimeType : 'video/mp4'; // Guess MP4 if default
			console.warn(`MediaRecorder.mimeType was empty, falling back to: ${actualMimeType}`);
		}
		console.log(`MediaRecorder active with mimeType: ${actualMimeType}`);

		mediaRecorder.ondataavailable = (event) => {
			if (event.data && event.data.size > 0) recordedBlobs.push(event.data);
		};
		mediaRecorder.onstop = handleStop; // handleStop will now use global 'actualMimeType'
		mediaRecorder.start();

		console.log('MediaRecorder started', mediaRecorder);
		status.textContent = 'Recording... (Audio & Video)';
		startButton.disabled = true;
		stopButton.disabled = false;

	} catch (err) {
		console.error("Error starting recording:", err);
		// Check specifically for OverconstrainedError which can happen if exact constraints fail
		if (err.name === 'OverconstrainedError') {
			status.textContent = `Error: Requested resolution/settings not supported by camera. (${err.message})`;
		} else {
			status.textContent = `Error starting recording: ${err.message}. Check permissions.`;
		}
		preview.style.display = 'none';
		if (mediaStream) cleanupStream();
		else preview.srcObject = null;
		startButton.disabled = false;
		stopButton.disabled = true;
		actualMimeType = ''; // Clear mime type on error
	}
}


function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    stopButton.disabled = true;
    status.textContent = 'Stopping recording, preparing for processing...';
    preview.style.display = 'none';
  }
}

async function handleStop() {
  console.log('Recorder stopped. Blobs recorded:', recordedBlobs.length);
  if (recordedBlobs.length === 0) {
    status.textContent = 'No data recorded.';
    startButton.disabled = false; // Re-enable start
    cleanupStream();
    return;
  }

  status.textContent = 'Processing video with ffmpeg... Please wait.';
  ffmpegWorking = true;
  startButton.disabled = true; // Disable start during processing
  stopButton.disabled = true; // Keep stop disabled

  try {
    // 1. Combine Blobs
    // Determine the mimeType used by the recorder
    const mimeType = mediaRecorder.mimeType || 'video/webm'; // Fallback guess
    const superBlob = new Blob(recordedBlobs, { type: mimeType });

    // Extract file extension (heuristic)
    let inputFilename = 'input.webm'; // Default guess
    if (mimeType.includes('mp4')) inputFilename = 'input.mp4';
    else if (mimeType.includes('quicktime')) inputFilename = 'input.mov';

    // 2. Write Blob to ffmpeg's virtual file system
    const inputData = await FFmpeg.fetchFile(superBlob);
    ffmpeg.FS('writeFile', inputFilename, inputData);
    console.log(`Wrote ${inputFilename} to ffmpeg FS (${inputData.length} bytes)`);

    // 3. Run ffmpeg command
    // -i input.webm : Input file
    // -vf "scale=-1:720": Scale video height to 720p, maintain aspect ratio
    // -c:v libx264: Encode video using H.264 codec (good for MP4)
    // -preset ultrafast: Faster encoding, lower quality/compression. Good for browser.
    // -crf 23: Constant Rate Factor (quality, lower=better, 18-28 is common)
    // -an: No audio (remove if you recorded audio and want it)
    // output.mp4: Output filename
    const ffmpegCommand = [
      '-i', inputFilename,
      '-vf', 'hflip,scale=trunc(iw*480/ih/2)*2:480',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      //'-crf', '23',
      '-b:v', '2000k', 
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ];
    console.log('Running ffmpeg command:', ffmpegCommand.join(' '));
    await ffmpeg.run(...ffmpegCommand);
    console.log('FFmpeg processing finished.');

    // 4. Read the processed file
    const outputData = ffmpeg.FS('readFile', 'output.mp4');
    console.log(`Read output.mp4 from ffmpeg FS (${outputData.length} bytes)`);

    // 5. Create Download Link
    const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(outputBlob);
    downloadLink.href = url;
    downloadLink.style.display = 'block'; // Show download link
    status.textContent = 'Processing complete. Video ready for download!';

    // 6. Cleanup ffmpeg FS
    ffmpeg.FS('unlink', inputFilename);
    ffmpeg.FS('unlink', 'output.mp4');

  } catch (error) {
    console.error('Error during ffmpeg processing:', error);
    status.textContent = `Error processing video: ${error.message || error}`;
  } finally {
    ffmpegWorking = false;
    cleanupStream(); // Stop webcam tracks
    startButton.disabled = false; // Re-enable start button
    stopButton.disabled = true; // Keep stop disabled until next recording
  }
}

// --- Utility Functions ---
// Variable to store the actual mimeType chosen by MediaRecorder
let actualMimeType = ''; // Use this in handleStop

function getSupportedMimeTypeOptions() {
	const typesToTest = [
		// Prioritize WebM with Opus if available (common elsewhere)
		{ mimeType: "video/webm;codecs=vp9,opus" },
		{ mimeType: "video/webm;codecs=vp8,opus" },
		// Check MP4 with common codecs
		{ mimeType: "video/mp4;codecs=h264,aac" },
		// Check generic container types (less specific)
		{ mimeType: "video/webm" },
		{ mimeType: "video/mp4" } // Generic MP4 - Might work on iOS
	];

	for (const typeInfo of typesToTest) {
		if (MediaRecorder.isTypeSupported(typeInfo.mimeType)) {
			console.log(`Found supported specific mimeType: ${typeInfo.mimeType}`);
			return typeInfo; // Return the whole object { mimeType: "..." }
		}
	}

	console.warn("No specific mimeType found. Will let browser choose default.");
	return null; // Indicate that no specific preference was supported
}

function cleanupStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
    preview.srcObject = null; // Clear preview
    console.log('MediaStream tracks stopped.');
  }
}
/* ========= */

class ThreeJsLoop {

  constructor(canvasId) {
    this.initAudio();

    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas with ID "${canvasId}" not found.`);
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xffffff );

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    // Resizing the canvas if the window resizes - Not sure if I need this.
    this.animate = this.animate.bind(this); // Bind 'this' to animate function
    this.resize = this.resize.bind(this); // Bind 'this' to resize function
    window.addEventListener('resize', this.resize, false);
    this.resize(); // Initial resize

    this.setupScene();
    this.animate();
  }

  setupScene() {
    // Override this method to add objects to the scene
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const material = new THREE.MeshBasicMaterial({ color: "#03fcdf" });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }); // Black color
    this.line = new THREE.LineSegments(edges, lineMaterial);
    this.scene.add(this.line);

    this.camera.position.z = 5;
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.update();
    this.renderer.render(this.scene, this.camera);
  }

  update() {
    const { bass, treble } = this.calculateBassTreble();

    // Override this method to update objects in the scene
    if (this.cube) {
      //this.cube.rotation.x += 0.01;
      //this.line.rotation.x += 0.01;
      this.cube.rotation.x = treble * 0.5
      this.line.rotation.x = treble * 0.5;

      //this.cube.rotation.y += 0.01;
      //this.line.rotation.y += 0.01;
      this.cube.rotation.y = bass * 0.05;
      this.line.rotation.y = bass * 0.05;

    }
  }

  resize() {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  // Example method to add an object after instantiation.
  addObject(object){
    this.scene.add(object);
  }

  //Example method to remove an object after instantiation.
  removeObject(object){
    this.scene.remove(object);
  }

  async initAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      source.connect(this.analyser);
      /* Need to move to three.js animate or pulling the data from the dataArray to the x y down below */
      //visualize();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  }

  getFrequencyData() {
    if (!this.analyser) return;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  calculateBassTreble() {
    const data = this.getFrequencyData();
    if (!data) return { bass: 0, treble: 0 };

    let bassSum = 0;
    let trebleSum = 0;
    const bassEnd = Math.floor(data.length * 0.1); // Adjust for bass frequency range
    const trebleStart = Math.floor(data.length * 0.8); // Adjust for treble frequency range

    for (let i = 0; i < bassEnd; i++) {
      bassSum += data[i];
    }

    for (let i = trebleStart; i < data.length; i++) {
      trebleSum += data[i];
    }

    const bass = bassSum / bassEnd;
    const treble = trebleSum / (data.length - trebleStart);
    return { bass, treble };
  }
}

class ObjLoaderApp {
  constructor(containerId, objFilePath) {
    this.container = document.getElementById(containerId);
    this.objFilePath = objFilePath;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.loadedObject = null; // Store the loaded object
    this.init();
    this.infoDiv = document.getElementById('info');
    console.log("NORT initialized");
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.z = 5;

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.loadObj();
    this.animate();
    this.setupEventListeners();
  }

  loadObj() {
    const loader = new OBJLoader();
    loader.load(
      this.objFilePath,
      (object) => {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
          }
        });
        this.scene.add(object);
        this.loadedObject = object; // Store the object
        console.log("loaded up the object");
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        console.error('An error happened: ' + error);
      }
    );
  }

  animate() {
    const animateFunction = () => {
      requestAnimationFrame(animateFunction);

      this.controls.update();

      this.renderer.render(this.scene, this.camera);
    };
    animateFunction();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
}
/* ========= */
class DrawingApp {
	constructor(canvas) {
		this.canvas = canvas;
		this.context = canvas.getContext("2d");
		this.canvas.addEventListener("pointerdown", this.startDrawing.bind(this));
		this.canvas.addEventListener("pointerup", this.stopDrawing.bind(this));

		this.saveLink = document.getElementById("board-save-link")
		this.saveLink.addEventListener("click", this.handleSave.bind(this));

		this.previousPosition = {
			x: 0, y: 0
		};
		this.draw = this.draw.bind(this);
	}

	draw(event) {
		const position = { x: event.offsetX, y: event.offsetY};
		this.drawLine(
			this.previousPosition,
			position
		);
		this.previousPosition = position;
	}

	startDrawing(event) {
		this.canvas.addEventListener("pointermove", this.draw);
		this.canvas.setPointerCapture(event.pointerId);
		this.previousPosition = {
			x: event.offsetX,
			y: event.offsetY
		}
	}

	stopDrawing() {
		this.canvas.removeEventListener("pointermove", this.draw);
		this.canvas.releasePointerCapture(event.pointerId);
	}

	drawLine(from, to) {
		this.context.beginPath();
		this.context.strokeStyle = "blue";
		this.context.moveTo(from.x, from.y);
		this.context.lineTo(to.x, to.y);
		this.context.stroke();
		this.context.closePath();
	}

	handleSave() {
		const image = this.canvas.toDataURL("image/webp");	
		this.saveLink.href = image;
	}
}

class T2V{
  constructor() {
    document.getElementById('t2v-form').addEventListener('submit', function(e) {
      e.preventDefault();

      this.say();

      return false;
    }.bind(this));
  }

  say() {
    const text = document.getElementById('t2v-text-to-speak').value;

    // https://caniuse.com/?search=SpeechSynthesisUtterance
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  }
}

class ReadPost {
  constructor() {
    document.getElementById('read-post').addEventListener('click', function(e) {
      const postContent = document.getElementById('post-content');
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(postContent.innerText);
      synth.speak(utterance);
    });
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/* Mars Clock */
class Clock {
	constructor(clock) {
		this.clock = clock;
    //this.currentPst = document.getElementById("current-pst-time");
    this.currentInterval = 1;
    this.lastMarker = " - o";
    this.previousMarker = "";
    setInterval(this.startCurrentPst.bind(this), 1000);

    setTimeout(this.start.bind(this), this.currentInterval * 1000);
  }

  startCurrentPst() {
    //this.currentPst.innerHTML = new Date().toLocaleString('en', {timeZone: 'America/Vancouver'});
  }

  start() {
    // render
    this.clock.innerHTML = "⧋ " +this.currentInterval + "::" + this.lastMarker + "::" + this.previousMarker;

    // work out next mars interval
    this.previousMarker = this.lastMarker;
    this.lastMarker = this.currentInterval;
    this.currentInterval = getRandomInt(1,60);

    // fire next sun mars ping
    setTimeout(this.start.bind(this), this.currentInterval * 1000);

  }
}

/* Built by Kalv */
document.addEventListener("DOMContentLoaded", () => {
	const canvas = document.getElementById("drawing-app");
	if (canvas !== null) {
		new DrawingApp(canvas);
	}

  const box = document.getElementById("t2v");
  if (box !== null) {
    new T2V();
  }
  
  const readPost = document.getElementById("read-post");
  if (readPost !== null) {
    new ReadPost();
  }

  const clock = document.getElementById("clock");
  if (clock !== null) {
    new Clock(clock);
  }

  const nort = document.getElementById("nort");
  if (nort !== null) {
    const app = new ObjLoaderApp('nort', '/models/bedroom.obj');
  }

  const vlog = document.getElementById("vlog");
  if (vlog !== null) {
    console.log("starting up vlog");
    // --- Load ---
    //window.addEventListener('load', loadFFmpeg); 
    preview = document.getElementById('preview');
    startButton = document.getElementById('startButton');
    stopButton = document.getElementById('stopButton');
    status = document.getElementById('status');
    downloadLink = document.getElementById('downloadLink');

    loadFFmpeg();

    startButton.addEventListener('click', startRecording);
    stopButton.addEventListener('click', stopRecording);
  }
  const justShare = document.getElementById("just-share");
  if (justShare !== null) {
    new JustShare();
  }

  const visualizer = document.getElementById("visualizer");
  if (visualizer !== null) {
    const myLoop = new ThreeJsLoop('visualizer');

  }

  const notes = document.getElementById("notes");
  if (notes !== null) {
    new Notes();
  }

});
