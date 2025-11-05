import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import JustShare from "./just-share.js";
import Notes from "./notes.js";
import Bubbles from "./bubbles.js";
import DroppableImageTarget from "./DroppableImageTarget.js";
import IndexedDBBackupRestore from "./IndexedDBBackupRestore.js";
import * as SunCalc from "suncalc";

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
  status.textContent = "Loading ffmpeg-core.js...";
  try {
    ffmpeg = FFmpeg.createFFmpeg({
      log: true, // Enable logging for debugging
      corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
      // Use the same version core as the main library
    });
    await ffmpeg.load();
    status.textContent = "FFmpeg loaded. Ready to record.";
    startButton.disabled = false;
  } catch (error) {
    console.error("Error loading ffmpeg:", error);
    status.textContent =
      "Error loading FFmpeg. Check console and COOP/COEP headers.";
    alert(
      "Failed to load FFmpeg. Ensure your server sends COOP/COEP headers and you are using HTTPS or localhost."
    );
  }
}

// --- Webcam and Recording Logic ---
async function startRecording() {
  if (ffmpegWorking) {
    status.textContent = "FFmpeg is currently processing. Please wait.";
    return;
  }
  recordedBlobs = [];
  actualMimeType = ""; // Reset actual mime type
  downloadLink.style.display = "none";
  downloadLink.href = "#";
  preview.style.display = "block";

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
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
      actualMimeType = options ? options.mimeType : "video/mp4"; // Guess MP4 if default
      console.warn(
        `MediaRecorder.mimeType was empty, falling back to: ${actualMimeType}`
      );
    }
    console.log(`MediaRecorder active with mimeType: ${actualMimeType}`);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordedBlobs.push(event.data);
    };
    mediaRecorder.onstop = handleStop; // handleStop will now use global 'actualMimeType'
    mediaRecorder.start();

    console.log("MediaRecorder started", mediaRecorder);
    status.textContent = "Recording... (Audio & Video)";
    startButton.disabled = true;
    stopButton.disabled = false;
  } catch (err) {
    console.error("Error starting recording:", err);
    // Check specifically for OverconstrainedError which can happen if exact constraints fail
    if (err.name === "OverconstrainedError") {
      status.textContent = `Error: Requested resolution/settings not supported by camera. (${err.message})`;
    } else {
      status.textContent = `Error starting recording: ${err.message}. Check permissions.`;
    }
    preview.style.display = "none";
    if (mediaStream) cleanupStream();
    else preview.srcObject = null;
    startButton.disabled = false;
    stopButton.disabled = true;
    actualMimeType = ""; // Clear mime type on error
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    stopButton.disabled = true;
    status.textContent = "Stopping recording, preparing for processing...";
    preview.style.display = "none";
  }
}

async function handleStop() {
  console.log("Recorder stopped. Blobs recorded:", recordedBlobs.length);
  if (recordedBlobs.length === 0) {
    status.textContent = "No data recorded.";
    startButton.disabled = false; // Re-enable start
    cleanupStream();
    return;
  }

  status.textContent = "Processing video with ffmpeg... Please wait.";
  ffmpegWorking = true;
  startButton.disabled = true; // Disable start during processing
  stopButton.disabled = true; // Keep stop disabled

  try {
    // 1. Combine Blobs
    // Determine the mimeType used by the recorder
    const mimeType = mediaRecorder.mimeType || "video/webm"; // Fallback guess
    const superBlob = new Blob(recordedBlobs, { type: mimeType });

    // Extract file extension (heuristic)
    let inputFilename = "input.webm"; // Default guess
    if (mimeType.includes("mp4")) inputFilename = "input.mp4";
    else if (mimeType.includes("quicktime")) inputFilename = "input.mov";

    // 2. Write Blob to ffmpeg's virtual file system
    const inputData = await FFmpeg.fetchFile(superBlob);
    ffmpeg.FS("writeFile", inputFilename, inputData);
    console.log(
      `Wrote ${inputFilename} to ffmpeg FS (${inputData.length} bytes)`
    );

    // 3. Run ffmpeg command
    // -i input.webm : Input file
    // -vf "scale=-1:720": Scale video height to 720p, maintain aspect ratio
    // -c:v libx264: Encode video using H.264 codec (good for MP4)
    // -preset ultrafast: Faster encoding, lower quality/compression. Good for browser.
    // -crf 23: Constant Rate Factor (quality, lower=better, 18-28 is common)
    // -an: No audio (remove if you recorded audio and want it)
    // output.mp4: Output filename
    const ffmpegCommand = [
      "-i",
      inputFilename,
      "-vf",
      "hflip,scale=trunc(iw*480/ih/2)*2:480",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      //'-crf', '23',
      "-b:v",
      "2000k",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "output.mp4",
    ];
    console.log("Running ffmpeg command:", ffmpegCommand.join(" "));
    await ffmpeg.run(...ffmpegCommand);
    console.log("FFmpeg processing finished.");

    // 4. Read the processed file
    const outputData = ffmpeg.FS("readFile", "output.mp4");
    console.log(`Read output.mp4 from ffmpeg FS (${outputData.length} bytes)`);

    // 5. Create Download Link
    const outputBlob = new Blob([outputData.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(outputBlob);
    downloadLink.href = url;
    downloadLink.style.display = "block"; // Show download link
    status.textContent = "Processing complete. Video ready for download!";

    // 6. Cleanup ffmpeg FS
    ffmpeg.FS("unlink", inputFilename);
    ffmpeg.FS("unlink", "output.mp4");
  } catch (error) {
    console.error("Error during ffmpeg processing:", error);
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
let actualMimeType = ""; // Use this in handleStop

function getSupportedMimeTypeOptions() {
  const typesToTest = [
    // Prioritize WebM with Opus if available (common elsewhere)
    { mimeType: "video/webm;codecs=vp9,opus" },
    { mimeType: "video/webm;codecs=vp8,opus" },
    // Check MP4 with common codecs
    { mimeType: "video/mp4;codecs=h264,aac" },
    // Check generic container types (less specific)
    { mimeType: "video/webm" },
    { mimeType: "video/mp4" }, // Generic MP4 - Might work on iOS
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
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    preview.srcObject = null; // Clear preview
    console.log("MediaStream tracks stopped.");
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
    this.scene.background = new THREE.Color(0xffffff);

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
    window.addEventListener("resize", this.resize, false);
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
      this.cube.rotation.x = treble * 0.5;
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
  addObject(object) {
    this.scene.add(object);
  }

  //Example method to remove an object after instantiation.
  removeObject(object) {
    this.scene.remove(object);
  }

  async initAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      source.connect(this.analyser);
      /* Need to move to three.js animate or pulling the data from the dataArray to the x y down below */
      //visualize();
    } catch (err) {
      console.error("Error accessing microphone:", err);
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
    this.infoDiv = document.getElementById("info");
    console.log("NORT initialized");
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
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
            child.material = new THREE.MeshStandardMaterial({
              color: 0x808080,
            });
          }
        });
        this.scene.add(object);
        this.loadedObject = object; // Store the object
        console.log("loaded up the object");
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("An error happened: " + error);
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
    window.addEventListener("resize", () => this.onWindowResize(), false);
  }

  onWindowResize() {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
  }
}
/* ========= */
class DrawingApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvas.addEventListener("pointerdown", this.startDrawing.bind(this));
    this.canvas.addEventListener("pointerup", this.stopDrawing.bind(this));

    this.saveLink = document.getElementById("board-save-link");
    this.saveLink.addEventListener("click", this.handleSave.bind(this));

    this.previousPosition = {
      x: 0,
      y: 0,
    };
    this.draw = this.draw.bind(this);
  }

  draw(event) {
    const position = { x: event.offsetX, y: event.offsetY };
    this.drawLine(this.previousPosition, position);
    this.previousPosition = position;
  }

  startDrawing(event) {
    this.canvas.addEventListener("pointermove", this.draw);
    this.canvas.setPointerCapture(event.pointerId);
    this.previousPosition = {
      x: event.offsetX,
      y: event.offsetY,
    };
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

class T2V {
  constructor() {
    document.getElementById("t2v-form").addEventListener(
      "submit",
      function (e) {
        e.preventDefault();

        this.say();

        return false;
      }.bind(this)
    );
  }

  say() {
    const text = document.getElementById("t2v-text-to-speak").value;

    // https://caniuse.com/?search=SpeechSynthesisUtterance
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  }
}

class ReadPost {
  constructor() {
    document
      .getElementById("read-post")
      .addEventListener("click", function (e) {
        const postContent = document.getElementById("post-content");
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
    this.clock.innerHTML =
      "⧋ " +
      this.currentInterval +
      "::" +
      this.lastMarker +
      "::" +
      this.previousMarker;

    // work out next mars interval
    this.previousMarker = this.lastMarker;
    this.lastMarker = this.currentInterval;
    this.currentInterval = getRandomInt(1, 60);

    // fire next sun mars ping
    setTimeout(this.start.bind(this), this.currentInterval * 1000);
  }
}

const DB_NAMES = ["kalvNotesDB", "windowImage"];

function showMessage(message, type = "info") {
  const messageBox = document.getElementById("messageBox");
  messageBox.textContent = message;
}

class InitKalv {
  constructor() {
    console.log(
      "Waiting for delivery of a car, house, money, medals and a lady from the commonwealth to one address, one man. me Kalvir Sandhu."
    );

    const nort = document.getElementById("nort");
    if (nort !== null) {
      const app = new ObjLoaderApp("nort", "/models/bedroom.obj");
    }

    const readPost = document.getElementById("read-post");
    if (readPost !== null) {
      new ReadPost();
    }

    const deltos = document.getElementById("deltos");
    if (deltos !== null) {
      console.log("Loading Deltos");

      const notes = document.getElementById("notes");
      if (notes !== null) {
        new Notes();
      }

      new Bubbles("playPauseButton", "bubblesMessage", "playIcon", "pauseIcon");

      new DroppableImageTarget("imageWindow");

      const backupRestore = new IndexedDBBackupRestore(DB_NAMES);
      document
        .getElementById("backupBtn")
        .addEventListener("click", async () => {
          try {
            showMessage("Saving backup disk...", "info");
            const json = await backupRestore.backup();
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "kalvdotcouk-disk-1.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showMessage("Disk downloaded successfully!", "success");
          } catch (error) {
            console.error("Disk save failed:", error);
            showMessage(`Disk save failed: ${error.message}.`, "error");
          } finally {
            backupRestore.closeConnections();
          }
        });

      // Event listener for the "Upload & Restore" button
      document
        .getElementById("restoreBtn")
        .addEventListener("click", async () => {
          const fileInput = document.getElementById("uploadFile");
          const file = fileInput.files[0];

          if (!file) {
            showMessage("Please select a kalv disk to upload.", "error");
            return;
          }

          showMessage("Loading disk...", "info");
          const reader = new FileReader();
          reader.onload = async (e) => {
            const jsonString = e.target.result;
            try {
              await backupRestore.restore(jsonString);
              showMessage("Loaded!", "success");
            } catch (error) {
              console.error("Loading failed:", error);
              showMessage(`Loading failed: ${error.message}.`, "error");
            } finally {
              backupRestore.closeConnections();
            }
          };
          reader.onerror = (error) => {
            console.error("File reading error:", error);
            showMessage(
              "Error reading file. Check console for errors.",
              "error"
            );
          };
          reader.readAsText(file);
        });

      // Important: Close connections when the page is unloaded to prevent pending requests
      window.addEventListener("beforeunload", () => {
        backupRestore.closeConnections();
      });
    }
  }
}

/* Sun Time */
// Configuration
const CANVAS_WIDTH = 400;
const PADDING = 20; // Padding inside the canvas for labels and dot visibility
const PIXELS_PER_DEGREE = 3; // Base scaling factor (pixels per degree)

function drawSunLine(latitude, longitude) {
  const now = new Date();

  // 1. Calculate Sun Times and Altitudes
  const times = SunCalc.getTimes(now, latitude, longitude);

  if (!times.solarNoon || !times.nadir) {
    document.getElementById("statusMessage").textContent =
      "Cannot determine full range (Polar region).";
    document.getElementById("statusMessage").className = "status below";
    return;
  }

  const maxPos = SunCalc.getPosition(times.solarNoon, latitude, longitude);
  const minPos = SunCalc.getPosition(times.nadir, latitude, longitude);
  const currentPos = SunCalc.getPosition(now, latitude, longitude);

  const maxAltitudeDeg = maxPos.altitude * (180 / Math.PI);
  const minAltitudeDeg = minPos.altitude * (180 / Math.PI);
  const currentAltitudeDeg = currentPos.altitude * (180 / Math.PI);

  // --- Update Info Display ---
  document.getElementById("coords").textContent = `${latitude.toFixed(
    4
  )}°, ${longitude.toFixed(4)}°`;
  document.getElementById("sunAlt").textContent = `${currentAltitudeDeg.toFixed(
    2
  )}°`;
  document.getElementById("maxAlt").textContent = `${maxAltitudeDeg.toFixed(
    2
  )}°`;
  document.getElementById("minAlt").textContent = `${minAltitudeDeg.toFixed(
    2
  )}°`;

  const statusMsg = document.getElementById("statusMessage");
  statusMsg.classList.remove("above", "below");

  if (currentAltitudeDeg > 0) {
    statusMsg.textContent = "The sun is above the horizon (Daytime).";
    statusMsg.classList.add("above");
  } else {
    statusMsg.textContent = "The sun is below the horizon (Night/Twilight).";
    statusMsg.classList.add("below");
  }

  // --- Dynamic Canvas Height and Horizon Calculation ---

  const rangeAboveZero = Math.max(0, maxAltitudeDeg);
  const rangeBelowZero = Math.abs(Math.min(0, minAltitudeDeg));

  // Calculate height based on how many pixels per degree we want
  const heightAboveHorizon = rangeAboveZero * PIXELS_PER_DEGREE;
  const heightBelowHorizon = rangeBelowZero * PIXELS_PER_DEGREE;

  // Total canvas height must accommodate the max-to-min range + padding
  const CANVAS_HEIGHT = heightAboveHorizon + heightBelowHorizon + 2 * PADDING;

  const canvas = document.getElementById("sunCanvas");
  const ctx = canvas.getContext("2d");

  // Dynamically set canvas height
  canvas.height = CANVAS_HEIGHT;

  // The Y position of the Horizon (0 degrees) is simply PADDING + the calculated height above zero
  // Since Y increases downward, a positive altitude draws towards the top (low Y values).
  const horizonY = PADDING + heightAboveHorizon;
  const centerX = CANVAS_WIDTH / 2;

  // Clear the canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Draw Horizon Line (0 degrees) - This is the line drawn "from the middle"
  ctx.beginPath();
  ctx.strokeStyle = "#00008B"; // Dark Blue for Horizon
  ctx.lineWidth = 2;
  ctx.moveTo(0, horizonY);
  ctx.lineTo(CANVAS_WIDTH, horizonY);
  ctx.stroke();

  // 2. Draw Daily Min and Max Altitude Markers

  const maxY = PADDING; // Max altitude is at the top (low Y)
  const minY = CANVAS_HEIGHT - PADDING; // Min altitude is at the bottom (high Y)

  // Draw and Label Max Alt (Top)
  ctx.beginPath();
  ctx.strokeStyle = "#FFD700";
  ctx.setLineDash([5, 5]);
  ctx.moveTo(centerX - 10, maxY);
  ctx.lineTo(centerX + 10, maxY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#ff8c00";
  ctx.textAlign = "left";
  ctx.fillText(`Max: ${maxAltitudeDeg.toFixed(1)}°`, PADDING, maxY + 15);

  // Draw and Label Min Alt (Bottom)
  ctx.beginPath();
  ctx.strokeStyle = "#4682B4";
  ctx.setLineDash([5, 5]);
  ctx.moveTo(centerX - 10, minY);
  ctx.lineTo(centerX + 10, minY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#8b0000";
  ctx.fillText(`Min: ${minAltitudeDeg.toFixed(1)}°`, PADDING, minY - 5);

  // 3. Draw Current Sun Dot and Altitude Line

  // Current Y position: distance from the horizon
  // Vertical Shift = Current Altitude * PIXELS_PER_DEGREE
  const verticalShift = currentAltitudeDeg * PIXELS_PER_DEGREE;

  // Current Y = Horizon Y - Vertical Shift (subtract because Y-axis is inverted)
  const currentY = horizonY - verticalShift;

  // Draw the altitude line (Vertical)
  ctx.beginPath();
  ctx.strokeStyle = currentAltitudeDeg > 0 ? "#FFA500" : "#4682B4";
  ctx.lineWidth = 3;
  ctx.moveTo(centerX, horizonY); // Start at the horizon (0°)
  ctx.lineTo(centerX, currentY); // End at the current scaled position
  ctx.stroke();

  // Draw a circle at the current sun's scaled position
  ctx.beginPath();
  ctx.arc(centerX, currentY, 8, 0, 2 * Math.PI);
  ctx.fillStyle = currentAltitudeDeg > 0 ? "#FFA500" : "#4682B4";
  ctx.fill();

  // 4. Draw Current Altitude Text next to the dot
  ctx.font = "14px Arial";
  ctx.fillStyle = "#333";
  const textY = currentY < horizonY ? currentY - 10 : currentY + 20;
  ctx.fillText(`${currentAltitudeDeg.toFixed(2)}°`, centerX + 15, textY);
}

// --- Geolocation Logic (Remains the same) ---
// Set the desired update interval in milliseconds (5 seconds = 5000ms)
const UPDATE_INTERVAL = 5000;
let currentLocation = null; // Variable to store the coordinates once found

// Function to handle successful geolocation
function success(pos) {
  // Only store location if it's the first time, or if accuracy improves significantly (optional)
  if (!currentLocation) {
    currentLocation = pos.coords;
    document.getElementById("statusMessage").textContent =
      "Location found. Initializing visualization...";

    // Start the repeating update process once location is secure
    startUpdateLoop();
  }
}

// Function to handle geolocation errors
function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
  document.getElementById(
    "statusMessage"
  ).innerHTML = `**Error:** Could not get location. <br>(${err.message}).<br>Try checking browser settings.`;
  document.getElementById("statusMessage").className = "status below";
}

// 1. Core function to retrieve location and draw
function fetchLocationAndDraw() {
  // If location is not yet known, try to get it
  if (!currentLocation) {
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    if (navigator.geolocation) {
      // This is a non-blocking request and will call 'success' when done.
      navigator.geolocation.getCurrentPosition(success, error, options);
    } else {
      document.getElementById("statusMessage").innerHTML =
        "Geolocation is not supported by this browser.";
      document.getElementById("statusMessage").className = "status below";
    }
  } else {
    // If location is known, simply redraw the canvas with the current time
    // NOTE: The drawSunLine() function (from the previous step) must be defined
    // and accept latitude and longitude as arguments.
    drawSunLine(currentLocation.latitude, currentLocation.longitude);
    document.getElementById("statusMessage").textContent =
      "Visualization updated automatically.";
  }
}

// 2. Function to start the repeating loop
function startUpdateLoop() {
  // Call the function immediately upon starting
  fetchLocationAndDraw();

  // Set up the interval timer to repeat the function every 5 seconds
  setInterval(fetchLocationAndDraw, UPDATE_INTERVAL);

  // We only need to call fetchLocationAndDraw here. The first successful
  // run will populate 'currentLocation' and the subsequent calls will
  // skip the heavy geolocation step and go straight to drawing.
}

// 3. Kick off the whole process by trying to get the location.
fetchLocationAndDraw();

/* Built by Kalvir Sandhu */
document.addEventListener("DOMContentLoaded", () => {
  // load the site
  fetch("https://kalv-public-api.vercel.app/ping")
    .then((response) => {
      // check if white-box
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Access:", data.response);
      document.getElementById("black-box").style.display = "block";
      new InitKalv();
    })
    .catch((error) => {
      document.getElementById("dot-to-dot").style.display = "block";
      console.error("There has been a problem with public access:", error);
      // You can add logic here to send an alert or log this failure.
    });

  // end deltos
});
