class DotCanvas {
	/**
	 * @param {HTMLCanvasElement} canvasElement - The canvas DOM element.
	 * @param {number} maxDots - The maximum number of dots before resetting.
	 * @param {number} dotRadius - The radius of each dot.
	 */
	constructor(canvasElement, maxDots = 100, dotRadius = 2) {
		this.canvas = canvasElement;
		this.ctx = this.canvas.getContext('2d');
		this.maxDots = maxDots;
		this.dotRadius = dotRadius;

		this.dots = [];
		this.lines = [];
		this.dotCount = 0;
		this.lineTimeout = null;

		// Bind event handlers to the class instance
		this.setCanvasSize = this.setCanvasSize.bind(this);
		this.animate = this.animate.bind(this);
		this.addRandomLine = this.addRandomLine.bind(this);
	}

	/**
	 * Initializes the canvas and starts the animation.
	 */
	init() {
		this.setCanvasSize(); // Set initial canvas size
		window.addEventListener('resize', this.setCanvasSize); // Listen for resize events
		this.startLineGeneration(); // Begin generating lines
		this.animate(); // Start the animation loop
	}

	/**
	 * Sets the canvas dimensions based on the window size.
	 * Clears and redraws all elements to prevent visual artifacts on resize.
	 */
	setCanvasSize() {
		this.canvas.width = window.innerWidth * 0.8; // 80% of window width
		this.canvas.height = window.innerHeight * 0.7; // 70% of window height
		this.clearCanvas();
		this.drawAllElements();
	}

	/**
	 * Generates a random hexadecimal color string.
	 * @returns {string} A random hex color (e.g., '#RRGGBB').
	 */
	getRandomColor() {
		const letters = '0123456789ABCDEF';
		let color = '#';
		for (let i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return "#ffffff";
	}

	/**
	 * Clears the entire canvas.
	 */
	clearCanvas() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	/**
	 * Draws a single dot on the canvas.
	 * @param {object} dot - The dot object containing x, y, radius, and color properties.
	 */
	drawDot(dot) {
		this.ctx.beginPath();
		this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
		this.ctx.fillStyle = dot.color;
		this.ctx.fill();
		this.ctx.closePath();
	}

	/**
	 * Draws a line between two specified dot objects.
	 * @param {object} dot1 - The first dot object.
	 * @param {object} dot2 - The second dot object.
	 * @param {string} color - The color of the line.
	 */
	drawLine(dot1, dot2, color) {
		this.ctx.beginPath();
		this.ctx.moveTo(dot1.x, dot1.y);
		this.ctx.lineTo(dot2.x, dot2.y);
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 1.5; // Slightly thicker lines
		this.ctx.stroke();
		this.ctx.closePath();
	}

	/**
	 * Adds a new random dot to the collection.
	 * Resets the canvas and dot count if `maxDots` is reached.
	 */
	addRandomDot() {
		if (this.dotCount <= this.maxDots) {

			//this.clearCanvas(); // Clear canvas immediately on reset
			//

			const x = Math.random() * this.canvas.width;
			const y = Math.random() * this.canvas.height;
			const color = this.getRandomColor();
			this.dots.push({ x, y, radius: this.dotRadius, color });
			this.dotCount++;
		}

		if (this.dotCount == 10) {
			clearTimeout(this.lineTimeout);
			this.startLineGeneration();
		}

	}

	/**
	 * Adds a line connecting two random existing dots.
	 * Schedules the next line generation.
	 */
	addRandomLine() {
		if (this.lines.length > 20) {
			this.lines = [];
		}
		const randomIndex1 = Math.floor(Math.random() * this.dots.length);
		let randomIndex2 = Math.floor(Math.random() * this.dots.length);

		// Ensure the two indices are different
		while (randomIndex1 === randomIndex2) {
			randomIndex2 = Math.floor(Math.random() * this.dots.length);
		}

		const dot1 = this.dots[randomIndex1];
		const dot2 = this.dots[randomIndex2];
		const lineColor = this.getRandomColor(); // Lines can have different colors

		this.lines.push({ dot1, dot2, color: lineColor });

		this.scheduleNextLine();
	}

	/**
	 * Schedules the next `addRandomLine` call with a random delay.
	 */
	scheduleNextLine() {
		const randomDelay = Math.random() * (1000 - 200) + 200;
		this.lineTimeout = setTimeout(this.addRandomLine, randomDelay);
	}

	/**
	 * Starts the continuous generation of lines.
	 */
	startLineGeneration() {
		this.scheduleNextLine();
	}

	/**
	 * Draws all currently stored dots and lines on the canvas.
	 */
	drawAllElements() {
		// Draw all dots
		this.dots.forEach(dot => this.drawDot(dot));
		// Draw all lines
		this.lines.forEach(line => this.drawLine(line.dot1, line.dot2, line.color));
	}

	/**
	 * The main animation loop. Clears the canvas, adds a new dot,
	 * and redraws all elements. Uses `requestAnimationFrame` for smooth animation.
	 */
	animate() {
		this.clearCanvas();
		this.addRandomDot(); // Add a new dot in each frame
		this.drawAllElements(); // Redraw all existing dots and lines

		requestAnimationFrame(this.animate);
	}
}
export default DotCanvas;
