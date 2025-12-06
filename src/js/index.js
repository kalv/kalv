import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import JustShare from "./just-share.js";
import Notes from "./notes.js";
import Bubbles from "./bubbles.js";
import DroppableImageTarget from "./DroppableImageTarget.js";
import IndexedDBBackupRestore from "./IndexedDBBackupRestore.js";
import SnowflakeRenderer from "./SnowflakeRenderer.js";
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
      "Waiting for delivery of a car from the commonwealth to one address, one man. me Kalvir Sandhu."
    );

    const snowflakeAnimation = new SnowflakeRenderer(100, "#e0f2ff");
    snowflakeAnimation.start();

    const base64String =
      "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";

    const binaryString = atob(base64String);
    const length = binaryString.length;
    const uint8Array = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    // 2. Define the MIME type for AVIF
    const avifMimeType = "image/avif";

    // 3. Create the Blob
    const avifBlob = new Blob([uint8Array], { type: avifMimeType });

    // 4. Create the Object URL for embedding
    const objectUrl = URL.createObjectURL(avifBlob);

    // 5. Embed the image
    document.getElementById("profile-pic").src = objectUrl;

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

    // Start the repeating update process once location is secure
    startUpdateLoop();
  }
}

// Function to handle geolocation errors
function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
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
      console.error("Geolocation is not supported by this browser.");
    }
  } else {
    // If location is known, simply redraw the canvas with the current time
    // NOTE: The drawSunLine() function (from the previous step) must be defined
    // and accept latitude and longitude as arguments.
    drawSunLine(currentLocation.latitude, currentLocation.longitude);
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
