import KaalEvents from "../Events.js";
import Kolor from "../WidgetBase/Kolor.js";
import FormatHour from "../FormatHour.js";
import DateTime from "../DateTime.js";

class GlobalView {
  #structure;
  /**
   * @param {MonthlyTimesheet} parent
   * @param {Date} date
   */
  constructor(parent, date) {
    this.selectedDate = date || new Date();
    this.parent = parent;
    this.currentMonth = {};
  }

  nextDate() {
    this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
    this.render();
    new KaalEvents().exec(this.parent, "request", {
      date: this.selectedDate.toString(),
    });
  }

  previousDate() {
    this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
    this.render();
    new KaalEvents().exec(this.parent, "request", {
      date: this.selectedDate.toString(),
    });
  }

  _renderData() {
    return new Promise((resolve) => {
      /* queue an animation frame, so it will be after the frames of the
       * structure building calls ensuring that the whole structure is available */
      new Promise((resolve) => {
        window.requestAnimationFrame((_) => resolve());
      }).then((_) => {
        let month_time = 0;
        const weeks_times = {};
        for (const day in this.parent.currentMonth) {
          const values = this.parent.currentMonth[day];
          let time = 0;
          for (let i = 0; i < values.length; i++) {
            time += values[i].value;
          }
          month_time += time;

          const week = new DateTime(new Date(values[0].day)).isoWeekNumber();
          if (weeks_times[week]) {
            weeks_times[week] += time;
          } else {
            weeks_times[week] = time;
          }
          const hour = new FormatHour(time);
          window.requestAnimationFrame(
            (_) =>
              (this.#structure.querySelector(
                `[data-date="${day}"] .time`,
              ).innerHTML = hour),
          );
        }
        for (const w in weeks_times) {
          console.log(w);
          const time = new FormatHour(weeks_times[w]);
          window.requestAnimationFrame((_) => {
            this.#structure.querySelector(
              `[data-week="${w}"] .week-time`,
            ).innerHTML = time;
          });
        }

        this.parent.setSubtitle(new FormatHour(month_time));
        return resolve();
      });
    });
  }

  _renderCalContent() {
    return new Promise((resolve) => {
      this.parent.datasource.getMyWritableDays().then((days) => {
        const events = new KaalEvents();

        const dayMapping = ["6", "0", "1", "2", "3", "4", "5"];
        const day0 = new Date(this.selectedDate);
        day0.setDate(1);
        const day30 = new Date(this.selectedDate);
        day30.setMonth(this.selectedDate.getMonth() + 1);
        day30.setDate(0);

        let currentDay = day0.getDay();
        let row = 0;
        const week = new DateTime(day0).isoWeekNumber();

        days.writable = days.writable
          .map((date) => new Date(date))
          .filter((date) => {
            if (date.getFullYear() != day0.getFullYear()) {
              return 0;
            }
            if (
              date.getMonth() != day0.getMonth() &&
              date.getMonth() != day30.getMonth()
            ) {
              return 0;
            }
            return 1;
          })
          .map((date) => date.getDate());
        for (let j = 0; j < parseInt(dayMapping[currentDay]); j++) {
          const rnode = this.#structure.querySelector(`.row-${row}`);
          const cell = rnode.querySelector(`.column-${j}`);
          window.requestAnimationFrame(() => {
            cell.classList.add("empty");
          });
        }
        const n = this.#structure.querySelector(`.week-${row}`);
        n.dataset.week = week;
        if (n) {
          window.requestAnimationFrame(() => {
            n.innerHTML = `<div class="week">Semaine ${week}</div><div class="week-time"></div>`;
          });
        }

        let i = 0;
        for (i = 1; i <= day30.getDate(); i++) {
          const rnode = this.#structure.querySelector(`.row-${row}`);
          const cell = rnode.querySelector(
            `.column-${dayMapping[currentDay % 7]}`,
          );
          const day = i;
          const is_writable = days.writable.includes(day);
          window.requestAnimationFrame(() => {
            cell.innerHTML = `<div class="day">${day}</div><div class="time"></div>`;
            cell.dataset.date = day;
            cell.setAttribute("tabindex", 0);
            cell.classList.remove("empty");
            if (is_writable) {
              cell.classList.add("writable");
            } else {
              cell.classList.remove("writable");
            }
          });
          events.set(cell, "click", (event) => {
            const date = new Date(this.selectedDate);
            date.setDate(event.target.dataset.date);
            this.parent.load("day-view", date, is_writable);
          });

          if (currentDay % 7 == 0 && day < day30.getDate()) {
            row++;
            const week = new DateTime(
              day0.getTime() + 86400000 * i,
            ).isoWeekNumber();
            const n = this.#structure.querySelector(`.week-${row}`);
            if (n) {
              n.dataset.week = week;
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
        resolve();
      });
    });
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
    return new Promise((resolve) => {
      const calStructure = this._renderCalStructure();
      this._renderCalContent().then((_) => {
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
        this.parent.setContent(calStructure);
        return resolve();
      });
    });
  }
}

class DayView {
  constructor(parent, date, writable = false) {
    this.parent = parent;
    this.date = date;
    this.root = document.createElement("div");
    this.writable = writable;
  }
  render() {
    const date = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(this.date);

    const title = document.createElement("SPAN");
    title.innerHTML = date;
    this.parent.setTitle(date);

    this.parent.setContent(this.root);

    const close = document.createElement("DIV");
    close.classList.add("icon");

    new KaalEvents().set(close, "click", (_) =>
      this.parent.load("global-view", this.date).then((parent) => {
        parent.currentLoaded._renderData();
      }),
    );
    this.parent.setAction([], [close]);
    this._renderData();
    return Promise.resolve();
  }

  _renderEntry(entry) {
    const entryNode = document.createElement("DIV");
    const bgcolor = new Kolor(
      entry.travail.id ? entry.travail.status.color : entry.status.color,
    );
    entryNode.innerHTML = `
      <div style="background-color: ${bgcolor}; color: ${bgcolor.foreground()};">${entry.project.reference}</div>
      <div>${entry.project.name}</div>
      <div>${new FormatHour(entry.value)}</div>
      <div>${entry.travail.reference || ""}</div>
    `;
    return entryNode;
  }
  _renderAddEntry() {
    const entryNode = document.createElement("DIV");
    entryNode.innerHTML = `<div class="add">Ajouter</div>`;
    return entryNode;
  }

  _renderData() {
    const dayData = this.parent.currentMonth[this.date.getDate()];
    if (!dayData && !this.writable) {
      return;
    }
    const totalTime = !dayData
      ? 0
      : dayData.reduce((acc, entry) => acc + entry.value, 0);
    const nodes = !dayData
      ? []
      : dayData.map((entry) => this._renderEntry(entry));
    if (this.writable) {
      nodes.push(this._renderAddEntry());
    }
    window.requestAnimationFrame((_) => this.root.replaceChildren(...nodes));
    this.parent.setSubtitle(new FormatHour(totalTime));
    return Promise.resolve();
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
  #parentNode;
  constructor(attachTo, datasource = null) {
    this.datasource = datasource;
    this.#parentNode = attachTo;
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
      this.#parentNode.replaceChildren(
        this.areas.leftAction,
        this.areas.title,
        this.areas.rightAction,
        this.areas.subtitle,
        this.areas.content,
        this.areas.bottom,
      );
      this.#parentNode.classList.add("calendar-container");
    });

    this.displayDateTime();
    this.dateHourIntervalId = window.setInterval(
      this.displayDateTime.bind(this),
      1000,
    );
    new KaalEvents().set(this, "request", (event) => {
      if (!this.datasource) {
        return;
      }
      const date = new Date(event.data.date);
      this.datasource
        .getMyMonth(date.getMonth() + 1, date.getFullYear())
        .then((values) => {
          this.setData(values);
        });
    });
  }

  load(what) {
    return new Promise((resolve) => {
      if (what === this.#loaded) {
        return resolve(this);
      }
      new Promise((resolve) => {
        switch (what) {
          case "global-view":
          default:
            const globalview = new GlobalView(
              this,
              arguments[1] || new Date(),
            );
            globalview.render().then((_) => {
              this.currentLoaded = globalview;
              resolve();
            });
            break;
          case "day-view":
            const args = Array.from(arguments);
            args.shift();
            const dayview = new DayView(this, ...args);
            dayview.render().then((_) => {
              this.currentLoaded = dayview;
              resolve();
            });
            break;
        }
        this.#loaded = what;
      }).then((_) => {
        return resolve(this);
      });
    });
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

  setSubtitle(...nodes) {
    return this.setAny("subtitle", nodes);
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
    window.requestAnimationFrame((_) =>
      this.#parentNode.classList.remove("calendar-container"),
    );
    window.clearInterval(this.dateHourIntervalId);
  }

  /**
   * @param {Array} values
   */
  setData(values = null) {
    console.log("run setData");
    this.currentMonth = {};
    for (let i = 0; i < values.length; i++) {
      const date = new Date(values[i].day);
      if (!this.currentMonth[date.getDate()]) {
        this.currentMonth[date.getDate()] = [];
      }
      this.currentMonth[date.getDate()].push(values[i]);
    }
    this.currentLoaded._renderData();
  }
}
