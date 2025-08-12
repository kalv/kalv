class Bubbles {
	/**
	 * @param {string} buttonId - The ID of the play/pause button element.
	 * @param {string} messageId - The ID of the message display element.
	 * @param {string} playIconId - The ID of the play SVG icon element.
	 * @param {string} pauseIconId - The ID of the pause SVG icon element.
	 */
	constructor(buttonId, messageId, playIconId, pauseIconId) {
		this.audioContext = null;
		this.isPlaying = false;
		this.timeoutId = null; // Will store the ID of the setTimeout
		this.currentChannel = 'left'; // 'left' or 'right'
		this.soundDuration = 0.4; // Duration of each individual sine wave pulse in seconds


		// Get DOM elements
		this.playPauseButton = document.getElementById(buttonId);
		this.playIcon = document.getElementById(playIconId);
		this.pauseIcon = document.getElementById(pauseIconId);
		this.messageDiv = document.getElementById(messageId);

		// Bind event listener
		this.playPauseButton.addEventListener('click', () => this.togglePlayPause());

		// Initial UI state
		this.updateButtonState();
		this.updateMessage('Click "Go Diving" to start bubbling sounds');
	}

	/**
	 * Initializes the Web Audio API AudioContext.
	 * This is typically called on the first user interaction.
	 */
	initAudioContext() {
		if (!this.audioContext || this.audioContext.state === 'closed') {
			this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
			// Attempt to resume audio context if it's suspended (common in some browsers)
			if (this.audioContext.state === 'suspended') {
				this.audioContext.resume().then(() => {
					console.log('AudioContext resumed successfully');
				}).catch(e => console.error('Error resuming AudioContext:', e));
			}
		}
	}

	/**
	 * Plays a single sine wave sound instance.
	 * This includes setting a random frequency and alternating the stereo pan.
	 * After playing, it schedules the next sound with a dynamic delay.
	 */
	playSineWaveInstance() {
		// Ensure audio context is initialized and active before playing
		if (!this.audioContext || this.audioContext.state === 'closed') {
			this.initAudioContext();
		}

		if (this.audioContext.state === 'suspended') {
			this.audioContext.resume().then(() => {
				// If resumed, try playing again
				this._createAndPlaySound();
			}).catch(e => console.error('Failed to resume audio context:', e));
		} else {
			this._createAndPlaySound();
		}

		// Schedule the next sound if still playing
		if (this.isPlaying) {
			// Generate a random delay for the *next* sound.
			// Ensure the delay is at least as long as the sound duration
			// to prevent overlapping and allow for a small gap.
			const minDelay = this.soundDuration * 200; // Convert to milliseconds
			const maxDelay = 200; // Max delay of 1 second (e.g., between 400ms and 1000ms)
			const nextLoopDelay = Math.random() * (maxDelay - minDelay) + minDelay;

			this.timeoutId = setTimeout(() => this.playSineWaveInstance(), nextLoopDelay);
		}
	}

	/**
	 * Private helper method to create and connect audio nodes for a single sound.
	 */
	_createAndPlaySound() {
		const oscillator = this.audioContext.createOscillator();
		oscillator.type = 'sine';

		const gainNode = this.audioContext.createGain();
		gainNode.gain.value = 0.3; // Moderate volume

		const pannerNode = this.audioContext.createStereoPanner();

		// Random frequency between 20Hz and 100Hz
		const frequency = Math.random() * (100 - 20) + 20;
		oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

		// Alternate pan: -1 (left) or 1 (right)
		const panValue = (this.currentChannel === 'left') ? -1 : 1;
		pannerNode.pan.setValueAtTime(panValue, this.audioContext.currentTime);
		this.currentChannel = (this.currentChannel === 'left') ? 'right' : 'left'; // Toggle for next sound

		// Connect nodes: oscillator -> panner -> gain -> destination
		oscillator.connect(pannerNode);
		pannerNode.connect(gainNode);
		gainNode.connect(this.audioContext.destination);

		// Start and stop the oscillator after a short duration
		oscillator.start(this.audioContext.currentTime);
		//oscillator.stop(this.audioContext.currentTime + this.soundDuration);
		oscillator.stop(this.audioContext.currentTime + Math.random() * (0.4 - 0.1) + 0.1);

		// Clean up nodes after they finish playing
		oscillator.onended = () => {
			oscillator.disconnect();
			pannerNode.disconnect();
			gainNode.disconnect();
		};

		this.updateMessage(`Bubbling ${frequency.toFixed(2)} on ${panValue === -1 ? '<<' : '>>'}.`);
	}

	/**
	 * Starts the continuous looping of sine waves.
	 */
	startLoop() {
		this.isPlaying = true;
		this.updateButtonState();

		// Play the first sound immediately, which will then schedule subsequent sounds
		this.playSineWaveInstance();
	}

	/**
	 * Stops the continuous looping of sine waves and closes the AudioContext.
	 */
	stopLoop() {
		this.isPlaying = false;
		this.updateButtonState();

		clearTimeout(this.timeoutId); // Clear any pending setTimeout
		this.updateMessage('Sound stopped.');

		// Close the audio context to release system resources
		if (this.audioContext && this.audioContext.state !== 'closed') {
			this.audioContext.close().then(() => {
				console.log('AudioContext closed successfully');
				this.audioContext = null; // Reset context reference
			}).catch(e => console.error('Error closing AudioContext:', e));
		}
	}

	/**
	 * Toggles the play/pause state of the sine wave player.
	 */
	togglePlayPause() {
		this.initAudioContext(); // Always try to initialize/resume on user interaction

		if (this.isPlaying) {
			this.stopLoop();
		} else {
			this.startLoop();
		}
	}

	/**
	 * Updates the text and icon of the play/pause button based on the playing state.
	 */
	updateButtonState() {
		if (this.isPlaying) {
			this.playPauseButton.textContent = 'Get to air';
		} else {
			this.playPauseButton.textContent = 'Go diving';
		}
	}

	/**
	 * Updates the message display area.
	 * @param {string} message - The message to display.
	 */
	updateMessage(message) {
		this.messageDiv.textContent = message;
	}

}

export default Bubbles;

