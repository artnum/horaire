const SecondInAnHour = 3600;
const SecondInAMinute = 60;
const MinuteInAHour = 60;

export default class FormatHour {
  #time;
  /**
   * @param {Number} time Time in SECOND
   */
  constructor(time) {
    this.#time = time;
  }

  toString() {
    let time = this.#time / SecondInAnHour;
    let hour = Math.floor(this.#time / SecondInAnHour);
    let minutes = Math.round((time - hour) * SecondInAMinute);

    return `${String(hour).padStart(2, "0")}h${String(minutes).padStart(2, 0)}`;
  }
}
