class SnowflakeRenderer {
  /**
   * @param {number} count The number of snowflakes to generate.
   * @param {string} color The color of the snowflakes (e.g., '#ffffff').
   */
  constructor(count = 50, color = "#ffffff") {
    this.snowflakeCount = count;
    this.color = color;
    this.iframe = null;
    this.flakes = [];
    this.animationFrameId = null;
    this.isRunning = false;

    // Binds the 'update' method to the instance so it can be used as a callback
    this.update = this.update.bind(this);
  }

  /**
   * Creates and configures the iframe and its content.
   */
  _createIframe() {
    if (this.iframe) return;

    // 1. Create the iframe element
    this.iframe = document.createElement("iframe");

    // 2. Configure iframe styling and attributes
    this.iframe.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 9999; /* Ensure it's on top of other content */
            pointer-events: none; /* Allows clicks to pass through to the main window */
            background: transparent;
        `;
    this.iframe.setAttribute("scrolling", "no");
    this.iframe.setAttribute("aria-hidden", "true");

    // 3. Append the iframe to the body
    document.body.appendChild(this.iframe);

    // 4. Get the iframe's content document
    this.iframeDoc = this.iframe.contentWindow.document;

    // 5. Apply base styles to the iframe's body to ensure full screen coverage
    this.iframeDoc.body.style.cssText = `
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: transparent;
        `;

    // 6. Generate the initial snowflakes
    this._generateSnowflakes();
  }

  /**
   * Generates a single unique snowflake object.
   * @returns {object} The snowflake configuration.
   */
  _createSnowflake() {
    const size = Math.random() * 15 + 22; // Size between 2px and 7px
    const speed = Math.random() * 0.5 + 0.1; // Speed between 0.1 and 0.6 units/frame
    const wind = Math.random() * 0.5 - 0.25; // Horizontal sway

    // Create the DOM element for the snowflake
    const flakeEl = this.iframeDoc.createElement("div");
    flakeEl.textContent = "*"; // Simple character for a 'snowflake'

    flakeEl.style.cssText = `
            position: absolute;
            color: ${this.color};
            font-size: ${size}px;
            width: ${size}px;
            height: ${size}px;
            line-height: 1;
            text-align: center;
            top: ${-size}px; /* Start just above the viewport */
            left: ${
              Math.random() * 100
            }%; /* Random horizontal start position */
            opacity: ${Math.random() * 0.7 + 0.3};
            pointer-events: none;
            user-select: none;
            transform: scale(${Math.random() * 0.5 + 0.5}); /* Unique scale */
        `;

    // Append to the iframe body
    this.iframeDoc.body.appendChild(flakeEl);

    return {
      element: flakeEl,
      x: parseFloat(flakeEl.style.left),
      y: -size, // Current vertical position (percent or pixel is fine, use pixel for y)
      speed: speed,
      wind: wind,
      size: size,
      initialOffset: Math.random() * 100, // For unique sway pattern
    };
  }

  /**
   * Generates all snowflakes and adds them to the 'flakes' array.
   */
  _generateSnowflakes() {
    for (let i = 0; i < this.snowflakeCount; i++) {
      const flake = this._createSnowflake();
      // To start them dispersed across the screen, not all at the top:
      flake.y = Math.random() * this.iframe.offsetHeight;
      flake.element.style.top = `${flake.y}px`;
      this.flakes.push(flake);
    }
  }

  /**
   * The main animation loop function.
   */
  update() {
    if (!this.isRunning || !this.iframe) return;

    const windowHeight = this.iframe.offsetHeight;
    const windowWidth = this.iframe.offsetWidth;
    const time = Date.now() / 1000; // Time in seconds for sine wave

    this.flakes.forEach((flake) => {
      // 1. Update Y position (falling)
      flake.y += flake.speed;

      // 2. Update X position (wind/sway)
      // Use a sine wave for smooth, unique horizontal movement
      flake.x += flake.wind + Math.sin(time + flake.initialOffset) * 0.1;

      // 3. Reset snowflake if it falls off the bottom
      if (flake.y > windowHeight) {
        flake.y = -flake.size; // Reset to the top
        flake.x = Math.random() * windowWidth; // Random horizontal position
      }

      // 4. Reset snowflake if it moves too far horizontally (optional, keeps them on screen)
      if (flake.x < -flake.size || flake.x > windowWidth) {
        flake.x = Math.random() * windowWidth;
      }

      // 5. Apply the new position to the element
      flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px)`;
    });

    // Request the next frame
    this.animationFrameId = requestAnimationFrame(this.update);
  }

  /**
   * Starts the snowflake animation.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._createIframe();
    this.animationFrameId = requestAnimationFrame(this.update);
    console.log("Snowflake animation started.");
  }

  /**
   * Stops the snowflake animation and removes the iframe.
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    cancelAnimationFrame(this.animationFrameId);

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.flakes = [];
    console.log("Snowflake animation stopped.");
  }
}

export default SnowflakeRenderer;

// --- USAGE EXAMPLE ---
// 1. Create an instance of the class
// const snowflakeAnimation = new SnowflakeRenderer(100, '#e0f2ff');

// 2. Start the animation
// snowflakeAnimation.start();

// 3. To stop the animation later:
// setTimeout(() => {
//    snowflakeAnimation.stop();
// }, 30000); // Stop after 30 seconds

// The script is complete and ready to be run in a browser's console or as a JS file.
