class RotatingDate {
  constructor(date) {
    this.date = date;
    const day = this.date.getDate();
    const month = this.date.getMonth() + 1;
    const year = this.date.getFullYear();
    // Create an array of individual digits
    this.dateArray = [
      ...String(day).padStart(2, '0'),
      ...String(month).padStart(2, '0'),
      ...String(year)
    ].map(Number);
    this.divElement = document.getElementById('rotating-date');
    this.currentIndex = 0;
    this.intervalId = null;
  }

  // A method to start the rotation
  startRotation() {
    this.updateDisplay();
    this.intervalId = setInterval(() => {
      this.rotateNumbers();
      this.updateDisplay();
    }, 1000);
  }

  // A method to stop the rotation
  stopRotation() {
    clearInterval(this.intervalId);
  }

  // A method to rotate the numbers in the array
  rotateNumbers() {
    const firstElement = this.dateArray.shift();
    this.dateArray.push(firstElement);
  }

  // A method to get the current date string
  getCurrentDateString() {
    return this.dateArray.join(' ');
  }

  // A method to update the display
  updateDisplay() {
    if (this.divElement) {
      this.divElement.textContent = this.getCurrentDateString();
    }
  }
}

export default RotatingDate;
