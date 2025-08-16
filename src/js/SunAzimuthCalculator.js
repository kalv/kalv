class SunAzimuthCalculator {
	constructor(azimuthDisplayId) {
		// Initialize DOM elements
		this.azimuthDisplay = document.getElementById(azimuthDisplayId);

		// Start the process of getting location and calculating azimuth
		this.init();
	}

	/**
	 * Converts degrees to radians.
	 * @param {number} degrees - Angle in degrees.
	 * @returns {number} Angle in radians.
	 */
	toRadians(degrees) {
		return degrees * (Math.PI / 180);
	}

	/**
	 * Converts radians to degrees.
	 * @param {number} radians - Angle in radians.
	 * @returns {number} Angle in degrees.
	 */
	toDegrees(radians) {
		return radians * (180 / Math.PI);
	}

	/**
	 * Calculates the Julian Date for a given Date object.
	 * @param {Date} date - The JavaScript Date object (UTC is used).
	 * @returns {number} The Julian Date.
	 */
	calculateJulianDate(date) {
		const year = date.getUTCFullYear();
		const month = date.getUTCMonth() + 1; // getUTCMonth is 0-indexed
		const day = date.getUTCDate();
		const hour = date.getUTCHours();
		const minute = date.getUTCMinutes();
		const second = date.getUTCSeconds();

		let a = Math.floor((14 - month) / 12);
		let y = year + 4800 - a;
		let m = month + 12 * a - 3;

		let JD = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
		JD += (hour / 24) + (minute / 1440) + (second / 86400);

		return JD;
	}

	/**
	 * Calculates the Sun's Azimuth and Elevation (Altitude) based on location and time.
	 * @param {number} latitude - Latitude in degrees.
	 * @param {number} longitude - Longitude in degrees.
	 * @param {Date} date - Current Date and Time object (UTC is used for calculations).
	 * @returns {{azimuth: number, elevation: number}} Object containing azimuth and elevation in degrees.
	 */
	calculateSunPosition(latitude, longitude, date) {
		const JD = this.calculateJulianDate(date);
		const T = (JD - 2451545.0) / 36525; // Julian Century

		// Geometric Mean Longitude of the Sun (L0) in degrees
		let L0 = (280.46646 + 36000.76983 * T + 0.000302 * Math.pow(T, 2)) % 360;
		if (L0 < 0) L0 += 360;

		// Geometric Mean Anomaly of the Sun (M) in degrees
		let M = (357.52911 + 35999.05029 * T - 0.0001537 * Math.pow(T, 2)) % 360;
		if (M < 0) M += 360;
		const M_rad = this.toRadians(M);

		// Eccentricity of Earth Orbit (e)
		const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * Math.pow(T, 2);

		// Sun Equation of Center (C) in degrees
		const C = (1.914602 - 0.004817 * T - 0.000014 * Math.pow(T, 2)) * Math.sin(M_rad) +
			(0.019993 - 0.000101 * T) * Math.sin(2 * M_rad) +
			0.000289 * Math.sin(3 * M_rad);

		// Sun True Longitude (Ls) in degrees
		const Ls = L0 + C;
		const Ls_rad = this.toRadians(Ls);

		// Apparent Longitude of the Sun (Omega) in degrees
		const Omega = Ls - 0.00569 - 0.00478 * Math.sin(this.toRadians(125.04 - 1934.136 * T));
		const Omega_rad = this.toRadians(Omega);

		// Mean Obliquity of the Ecliptic (epsilon0) in degrees
		const epsilon0 = 23.439291 - 0.0130042 * T - 0.00000016 * Math.pow(T, 2) + 0.000000504 * Math.pow(T, 3);

		// Obliquity of the Ecliptic (epsilon) in degrees
		const epsilon = epsilon0 + 0.00256 * Math.cos(this.toRadians(125.04 - 1934.136 * T));
		const epsilon_rad = this.toRadians(epsilon);

		// Sun Declination (delta) in radians
		const delta_rad = Math.asin(Math.sin(epsilon_rad) * Math.sin(Ls_rad));
		const delta = this.toDegrees(delta_rad);

		// Greenwich Mean Sidereal Time (GMST) in degrees
		let GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * Math.pow(T, 2) - Math.pow(T, 3) / 38710000;
		GMST %= 360;
		if (GMST < 0) GMST += 360;

		// Local Mean Sidereal Time (LMST) in degrees
		const LMST = GMST + longitude;
		const LMST_rad = this.toRadians(LMST);

		// Sun Right Ascension (RA) in radians
		const RA_rad = Math.atan2(Math.cos(epsilon_rad) * Math.sin(Ls_rad), Math.cos(Ls_rad));
		let RA = this.toDegrees(RA_rad);
		if (RA < 0) RA += 360;

		// Hour Angle (HA) in degrees
		let HA = LMST - RA;
		if (HA > 180) HA -= 360;
		else if (HA < -180) HA += 360;
		const HA_rad = this.toRadians(HA);

		const latitude_rad = this.toRadians(latitude);

		// Calculate Elevation (Altitude)
		const sin_h = Math.sin(latitude_rad) * Math.sin(delta_rad) +
			Math.cos(latitude_rad) * Math.cos(delta_rad) * Math.cos(HA_rad);
		const h_rad = Math.asin(sin_h);
		const elevation = this.toDegrees(h_rad);

		// Calculate Azimuth (from North, clockwise)
		const Y = Math.sin(HA_rad);
		const X = Math.cos(HA_rad) * Math.sin(latitude_rad) - Math.tan(delta_rad) * Math.cos(latitude_rad);
		let azimuth_rad = Math.atan2(Y, X);
		azimuth_rad = azimuth_rad + Math.PI; // Adjust to be from North, clockwise 0 to 2PI

		let azimuth = this.toDegrees(azimuth_rad);
		azimuth = (azimuth + 360) % 360; // Ensure azimuth is 0-360 degrees

		return { azimuth: azimuth, elevation: elevation };
	}

	/**
	 * Handles successful geolocation retrieval.
	 * @param {GeolocationPosition} position - The geolocation position object.
	 */
	handleGeolocationSuccess(position) {
		const lat = position.coords.latitude;
		const lon = position.coords.longitude;
		const now = new Date(); // Get current date and time


		// Calculate sun position using the class method
		const sunPos = this.calculateSunPosition(lat, lon, now);
		console.log(sunPos);

		// Update the display
		this.azimuthDisplay.textContent = "⧋ " + sunPos.azimuth.toFixed(2);

	}

	/**
	 * Handles geolocation errors.
	 * @param {GeolocationPositionError} error - The geolocation error object.
	 */
	handleGeolocationError(error) {
		let errorMessage = 'Unable to retrieve your location.';
		switch (error.code) {
			case error.PERMISSION_DENIED:
				errorMessage = 'Location permission denied. Please enable location services for this site.';
				break;
			case error.POSITION_UNAVAILABLE:
				errorMessage = 'Location information is unavailable.';
				break;
			case error.TIMEOUT:
				errorMessage = 'The request to get user location timed out.';
				break;
			case error.UNKNOWN_ERROR:
				errorMessage = 'An unknown error occurred.';
				break;
		}
	}

	/**
	 * Initializes the geolocation request.
	 */
	init() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				this.handleGeolocationSuccess.bind(this), // Bind 'this' to the class instance
				this.handleGeolocationError.bind(this),   // Bind 'this' to the class instance
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				}
			);
		} else {
			console.log("ERROR: Can't obtain lat/lng location");
		}
	}
}
export default SunAzimuthCalculator;
