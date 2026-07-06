export default class Rules {
  #serverTime;
  #localTime;
  #config;
  constructor(config) {
    this.#config = config;
  }

  #getServerTime() {
    return new Promise((resolve, reject) => {
      const datetime1 = new Date();
      fetch("$time")
        .then((response) => {
          return response.json();
        })
        .then((timing) => {
          const datetime2 = new Date();
          datetime2.setTime(
            datetime2.getTime() -
              (datetime2.getTime() - datetime1.getTime()) / 2,
          );
          this.#localTime = datetime2;
          this.#serverTime = new Date(timing.datetime);
          resolve(this.#serverTime);
        });
    });
  }

  /**
   * Should be precise for precision of a second
   */
  getCurrentDate() {
    const now = new Date();
    const realNow = new Date(this.#serverTime);
    realNow.setTime(
      realNow.getTime() + (now.getTime() - this.#localTime.getTime()),
    );
    return realNow;
  }

  checkLimits(what) {
    return new Promise((resolve, reject) => {
      this.#getServerTime();
      switch (what) {
        case "time-late-day" /* how long can edit/add time */:
          this.#getServerTime().then((datetime) => {
            const date = arguments[1];
            console.log(this.getCurrentDate().toString());
            date.setTime(
              this.getCurrentDate().getTime() -
                (this.#config.limits.lateDay - 1) * 86400000,
            );
            if (date.getDay() == 0) {
              date.setTime(date.getTime() - 3 * 86400000);
            } else if (date.getDay() == 6) {
              date.setTime(date.getTime() - 2 * 86400000);
            }
            console.log(date.toString());
            resolve(date);
          });
          break;
      }
    });
  }
}
