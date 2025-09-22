import { JAPI } from "./JAPI.js";

const NS = "Time";

export default class TimeAPI extends JAPI {
  constructor() {
    super();
  }

  /**
   * @param {Number} month
   * @param {Number|null}  year
   */
  getMyMonth(month, year = null) {
    if (year == null) {
      year = new Date().getFullYear();
    }
    return this.API.exec(NS, "getMyMonth", { month, year });
  }

  getMyWritableDays() {
    return this.API.exec(NS, "getMyWritableDays");
  }
}
