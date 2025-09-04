import KaalEvents from "../Events.js";

// Returns the ISO week of the date.
const getWeek = function (d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
};

class GlobalView {
  #structure;
  /**
   * @param {MonthlyTimesheet} parent
   * @param {Date} date
   */
  constructor(parent, date) {
    this.selectedDate = date || new Date();
    this.parent = parent;
    /* novembre 2026 */
    //this.selectedDate.setMonth(this.selectedDate.getMonth() + 14);

    this.selectedDate.setMonth(this.selectedDate.getMonth() + 3);
  }

  nextDate() {
    this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
    this.render();
  }

  previousDate() {
    this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
    this.render();
  }

  _renderCalContent() {
    const events = new KaalEvents();

    const dayMapping = ["6", "0", "1", "2", "3", "4", "5"];
    const day0 = new Date(this.selectedDate);
    day0.setDate(1);
    const day30 = new Date(this.selectedDate);
    day30.setMonth(this.selectedDate.getMonth() + 1);
    day30.setDate(0);

    let currentDay = day0.getDay();
    let row = 0;
    const week = getWeek(day0);

    for (let j = 0; j < parseInt(dayMapping[currentDay]); j++) {
      const rnode = this.#structure.querySelector(`.row-${row}`);
      const cell = rnode.querySelector(`.column-${j}`);
      window.requestAnimationFrame(() => {
        cell.classList.add("empty");
      });
    }
    const n = this.#structure.querySelector(`.week-${row}`);
    if (n) {
      window.requestAnimationFrame(() => {
        n.innerHTML = `Semaine ${week}`;
      });
    }

    let i = 0;
    for (i = 1; i <= day30.getDate(); i++) {
      const rnode = this.#structure.querySelector(`.row-${row}`);
      const cell = rnode.querySelector(
        `.column-${dayMapping[currentDay % 7]}`,
      );

      const day = i;
      window.requestAnimationFrame(() => {
        cell.innerHTML = `<div class="day">${day}</div>`;
        cell.setAttribute("tabindex", 0);
        cell.classList.remove("empty");
      });
      events.set(cell, "click", (event) => {
        this.parent.load("day-view");
      });

      if (currentDay % 7 == 0 && day < day30.getDate()) {
        row++;
        const week = getWeek(day0.getTime() + 86400000 * i);
        const n = this.#structure.querySelector(`.week-${row}`);
        if (n) {
          window.requestAnimationFrame(() => {
            n.innerHTML = `<div class="week">Semaine ${week}</div><div class="week-time"></div>`;
            n.classList.remove("empty");
          });
        }
      }
      currentDay++;
    }
    for (;;) {
      const rnode = this.#structure.querySelector(`.row-${row}`);
      if (!rnode) {
        break;
      }
      const cell = rnode.querySelector(
        `.column-${dayMapping[currentDay % 7]}`,
      );
      cell.classList.add("empty");
      if (currentDay % 7 == 0) {
        row++;
        const n = this.#structure.querySelector(`.week-${row}`);
        if (n) {
          window.requestAnimationFrame(() => {
            n.classList.add("empty");
          });
        }
      }
      currentDay++;
    }
  }

  _renderCalStructure() {
    if (this.#structure) {
      return this.#structure;
    }
    const calStructure = document.createElement("DIV");
    calStructure.classList.add("calendar");

    const weekday = document.createElement("div");
    weekday.classList.add("weekday");
    calStructure.appendChild(weekday);
    weekday.innerHTML =
      "<span>Lundi</span><span>Mardi</span><span>Mercredi</span><span>Jeudi</span><span>Vendredi</span><span>Samedi</span><span>Dimanche</span>";
    for (let i = 0; i < 6; i++) {
      const prerow = document.createElement("DIV");
      prerow.classList.add(`week-${i}`, "week-prerow");
      calStructure.appendChild(prerow);
      const row = document.createElement("DIV");
      row.classList.add("row", `row-${i}`);
      for (let j = 0; j < 7; j++) {
        const cell = document.createElement("DIV");
        cell.classList.add("cell", `column-${j}`);
        row.appendChild(cell);
      }
      calStructure.appendChild(row);
    }
    this.#structure = calStructure;
    return calStructure;
  }

  render() {
    this.parent.setContent(this._renderCalStructure());
    this._renderCalContent();

    const date = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(this.selectedDate);

    const title = document.createElement("SPAN");
    title.innerHTML = date;
    this.parent.setTitle(date);

    const next = document.createElement("DIV");
    const previous = document.createElement("DIV");

    next.classList.add("icon");
    previous.classList.add("icon");

    const events = new KaalEvents();
    events.set(next, "click", (_) => this.nextDate());
    events.set(previous, "click", (_) => this.previousDate());

    this.parent.setAction([previous], [next]);
  }
}

class DayView {
  constructor(parent, day) {
    this.parent = parent;
  }
  render() {
    this.parent.setContent(document.createElement("div"));
  }
}
class DayModifyView {}

class SelectView {
  /**
   * @param {MonthlyTimesheet} parent
   */
  constructor(parent) {}
}

export default class MonthlyTimesheet {
  #loaded;
  constructor(attachTo) {
    this.areas = {
      title: document.createElement("div"),
      subtitle: document.createElement("div"),
      leftAction: document.createElement("div"),
      rightAction: document.createElement("div"),
      content: document.createElement("div"),
      bottom: document.createElement("div"),
    };

    for (const prop in this.areas) {
      this.areas[prop].classList.add(`monthly-sheet-${prop}`, "area");
    }

    window.requestAnimationFrame(() => {
      attachTo.replaceChildren(
        this.areas.leftAction,
        this.areas.title,
        this.areas.rightAction,
        this.areas.subtitle,
        this.areas.content,
        this.areas.bottom,
      );
    });
    attachTo.classList.add("calendar-container");
    this.load("global-view");

    this.displayDateTime();
    this.dateHourIntervalId = window.setInterval(
      this.displayDateTime.bind(this),
      1000,
    );
  }

  load(what) {
    if (what === this.#loaded) {
      return;
    }
    switch (what) {
      case "global-view":
      default:
        const globalview = new GlobalView(this, new Date());
        globalview.render();
        break;
      case "day-view":
        const dayview = new DayView(this);
        dayview.render();
        break;
    }
    this.#loaded = what;
  }

  setAny(what, ...nodes) {
    if (!this.areas[what]) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        this.areas[what].replaceChildren(...nodes);
        resolve();
      });
    });
  }
  /**
   * @param {Array[HTMLElement]} node
   */
  setTitle(...nodes) {
    return this.setAny("title", nodes);
  }

  setContent(...nodes) {
    return this.setAny("content", ...nodes);
  }

  setAction(leftNodes, rightNodes) {
    return new Promise((resolve) => {
      Promise.all([
        this.setAny("leftAction", ...leftNodes),
        this.setAny("rightAction", ...rightNodes),
      ]).then((_) => resolve());
    });
  }

  displayDateTime() {
    const node = this.areas.bottom;
    const now = new Date();

    const dateString = `${now.getDate()}.${now.getMonth()}.${now.getFullYear()}`;
    const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const dateTimeContent = `<span class="date">${dateString}</span><span class="time">${timeString}</span>`;

    window.requestAnimationFrame(() => {
      node.innerHTML = dateTimeContent;
    });
  }

  destroy() {
    window.clearInterval(this.dateHourIntervalId);
  }
}
