import Placement from "./WidgetBase/Placement.js";

let HelpDisplay = null;
export default class help {
  /**
   * @param {string} topic
   * @param {string} item
   * @param {string} value
   */
  static setCache(topic, item, value) {
    sessionStorage.setItem(`KAHelp/${topic}:${item}`, value);
  }

  static getCache(topic, item) {
    return Promise.resolve(sessionStorage.getItem(`KAHelp/${topic}:${item}`));
  }

  static clearCache() {
    for (let i = 0; i < sessionStorage.length; i++) {
      if (sessionStorage.key(i).startsWith("KAHelp/")) {
        sessionStorage.removeItem(sessionStorage.key(i));
      }
    }
  }

  static show(event) {
    if (HelpDisplay) {
      help.hide();
    }
    if (!event.target.dataset?.helpSubject) {
      return;
    }
    const subject = event.target.dataset.helpSubject;
    if (subject.indexOf(".") === -1) {
      return;
    }
    const node = event.target;
    const [topic, item] = subject.split(".", 2);
    event.stopPropagation();
    event.preventDefault();

    /* fetch and display help */
    (() => {
      return new Promise((resolve, reject) => {
        help.getCache(topic, item).then((content) => {
          if (content !== null) {
            return resolve(content);
          }
          fetch(`../help/${help.language}/${topic}/${item}.html`)
            .then((response) => {
              return response.text();
            })
            .then((content) => {
              help.setCache(topic, item, content);
              return resolve(content);
            })
            .catch((e) => {
              reject(e);
            });
        });
      });
    })()
      .then((content) => {
        const helpTooltip = document.createElement("DIV");
        helpTooltip.innerHTML = content;
        helpTooltip.style.visibility = "hidden";
        helpTooltip.classList.add("ka-help");
        helpTooltip.setAttribute("role", "tooltip");
        document.body.appendChild(helpTooltip);
        HelpDisplay = helpTooltip;
        Placement.place(node, HelpDisplay);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  static hide(event) {
    if (HelpDisplay) {
      HelpDisplay.remove();
    }
    HelpDisplay = null;
  }

  static installHelp() {
    help.languages = navigator.languages
      .map((l) => {
        const p = l.split("-");
        return p.shift();
      })
      .filter((e, i, a) => i === a.indexOf(e));
    fetch("../help/available.json")
      .then((response) => {
        return response.json();
      })
      .then((availableLanguages) => {
        for (let l of help.languages) {
          if (availableLanguages.indexOf(l) !== -1) {
            help.language = l;
            break;
          }
        }

        window.addEventListener("mouseover", help.show, { capture: true });
        window.addEventListener("mouseout", help.hide, { capture: true });
        window.addEventListener("beforeunload", help.hide);
        window.addEventListener("blur", help.hide);
      });
  }

  static createNode(subject) {
    const node = document.createElement("span");
    node.innerHTML = " 🛈 ";
    node.classList.add("ka-help-anchor");
    node.dataset.helpSubject = subject;
    return node;
  }
  static get(subjet) {
    const node = help.createNode(subjet);

    return node.outerHTML;
  }
}
