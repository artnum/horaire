import format from '../format.js'

export default class html {
  static node(tag, content, attributes = [], classes = [], style = {}) {
    const n = document.createElement(tag)
    if (!Array.isArray(content)) {
      content = [content]
    }
    for (let i = 0; i < content.length; i++) {
      if (
        content[i] === '' ||
        content[i] === undefined ||
        content[i] === null
      ) {
        // do nothing
      } else if (content[i] instanceof HTMLElement) {
        n.appendChild(content[i])
      } else if (content[i]?.getDomNode) {
        n.appendChild(content[i].getDomNode())
      } else if (content[i]?.getNode) {
        n.appendChild(content[i].getNode())
      } else {
        const txt = document.createTextNode(format.escape(content[i]))
        n.appendChild(txt)
      }
    }

    for (let i = 0; i < attributes.length; i++) {
      n.setAttribute(attributes[i][0], attributes[i][1])
    }

    n.classList.add(...classes)
    Object.assign(n.style, style)
    n.append = html.#append.bind(n)
    return n
  }

  static #append() {
    const add = (_) => {
      for (let i = 0; i < arguments.length; i++) {
        this.appendChild(arguments[i])
      }
    }

    if (this.isConnnected) {
      window.requestAnimationFrame((_) => add())
    } else {
      add()
    }

    return this
  }
}
