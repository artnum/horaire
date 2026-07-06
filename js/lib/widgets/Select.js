import KaalEvents from '../Events.js'
import i18n from '../i18n.js'
import Placement from '../WidgetBase/Placement.js'
import html from '../WidgetBase/html.js'

function debounce(func, wait) {
  let timeout

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
function throttle(func, wait) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= wait) {
      lastCall = now
      func(...args)
    }
  }
}

export class SelectAnchor {
  #node
  #value
  constructor(label, value) {
    this.#value = value
    this.#node = document.createElement('SELECT')
    this.#node.setAttribute('multiple', true)
    this.#node.classList.add('kaal-select-anchor')

    this.#node.append(
      html.node('option', label, [
        ['value', value],
        ['selected', ''],
      ]),
    )

    this.#node.addEventListener('pointerdown', (event) => {
      event.preventDefault()
    })
    this.#node.addEventListener('click', (event) => {
      event.preventDefault()
      const node = event.target

      const s = new Select(10, true)
      s.setSelectCallback((values) => {
        const nodes = values.map((v) =>
          html.node('OPTION', v.label, [['value', v.value]]),
        )
        node.replaceChildren(...nodes)
      })

      s.load()
    })
  }

  getDomNode() {
    return this.#node
  }
}

export class Select {
  #node
  #currentY
  #move
  #inSearch
  #vnode
  #searchVnode
  #displayCount
  #displayPositionStart
  #searchNode
  #mutliselect
  #selectedValue
  #scrollBeginTimeout
  #selectCallback
  #loadCallback
  constructor(displayCount = 10, multiselect = false, placement = 'bottom') {
    this.#selectedValue = []
    this.#mutliselect = multiselect
    this.#inSearch = false
    this.#currentY = 0
    this.#displayPositionStart = 0
    this.#displayCount = displayCount
    this.#vnode = []
    this.#searchVnode = []
    this.#searchNode = document.createElement('INPUT')
    this.#node = document.createElement('DIV')
    this.#node.classList.add('kaal-select')
    this.#node.innerHTML = `
      <div style="grid-area: 1 / 1 / 2 / 3" class="kaal-select-searchbox"></div>
      <div style="grid-area: 2 / 2 / 2 / 3" class="kaal-select-scrollbar">
        <div>&nbsp;</div>
      </div>
      <div style="grid-area: 2 / 1 / 2 / 2" class="kaal-select-items"></div>`
    this.#node.firstElementChild.replaceChildren(this.#searchNode)
    window.requestAnimationFrame((_) => document.body.appendChild(this.#node))
    Placement.modal(placement, this.#node)
    this.#node.addEventListener('pointerdown', (event) =>
      this.#scrollStart(event),
    )
    this.#searchNode.addEventListener('keyup', (event) => {
      const value = event.target.value
      if (value.length === 0) {
        this.#inSearch = false
        this.#searchVnode = []
        this.#renderContent()
        return
      }
      this.search(value)
    })
    this.#node.addEventListener('click', (event) => {
      if (this.#move) {
        this.#scrollEnd()
      }
      this.select(event.target)
    })
    this.#node.addEventListener('pointerup', (event) => this.#scrollEnd())
    this.#node.addEventListener('pointerleave', (event) => this.#scrollEnd())
    this.#node.addEventListener('pointermove', (event) => this.#scroll(event))
    this.#node.addEventListener('wheel', (event) => this.#relativeScroll(event))
  }

  #scrollStart(event) {
    /* timeout to keep things smooth : when clicking to select, sometime mouse
     * drift and scroll instead of select.
     */
    this.#scrollBeginTimeout = setTimeout(() => {
      if (event && event.clientY) {
        this.#currentY = event.clientY
      }
      this.#move = true
    }, 100)
  }
  #scrollEnd() {
    if (this.#scrollBeginTimeout) {
      clearTimeout(this.#scrollBeginTimeout)
      this.#scrollBeginTimeout = null
    }
    this.#move = false
  }
  #relativeScroll(event) {
    if (event.deltaY === 0) {
      return
    }
    if (event.deltaY > 0) {
      this.#scrollUp()
    } else {
      this.#scrollDown()
    }
  }
  #scroll(event) {
    if (!this.#move) {
      return
    }
    if (this.#currentY > event.clientY) {
      this.#scrollUp()
    } else {
      this.#scrollDown()
    }
    this.#currentY = event.clientY
  }
  #scrollDown() {
    if (this.#displayPositionStart <= 0) {
      return
    }
    this.#displayPositionStart--
    this.#renderContent()
  }

  #scrollUp() {
    const nodeArray = this.#inSearch ? this.#searchVnode : this.#vnode
    if (
      nodeArray.length - this.#displayCount - 1 <
      this.#displayPositionStart
    ) {
      return
    }
    this.#displayPositionStart++
    this.#renderContent()
  }

  #renderContent() {
    new Promise((resolve) => {
      window.requestAnimationFrame((_) => {
        resolve([window.innerHeight])
      })
    }).then((windowheight) => {
      const nodes = (this.#inSearch ? this.#searchVnode : this.#vnode)
        .slice(
          this.#displayPositionStart,
          this.#displayCount + this.#displayPositionStart,
        )
        .map((vnode) => {
          if (vnode.dom !== null) {
            if (
              this.#selectedValue.filter((v) => v.value === vnode.value)
                .length > 0
            ) {
              vnode.dom.classList.add('selected')
            } else {
              vnode.dom.classList.remove('selected')
            }
            return vnode.dom
          }
          vnode.dom = document.createElement('DIV')
          vnode.dom.classList.add('kaal-select-item')
          vnode.dom.dataset.value = vnode.value
          vnode.dom.innerHTML = vnode.label
          return vnode.dom
        })

      const prog =
        this.#displayPositionStart /
        ((this.#inSearch ? this.#searchVnode.length : this.#vnode.length) -
          this.#displayCount)
      const scrollbar = this.#node.children[1].firstElementChild
      new Promise((resolve) =>
        window.requestAnimationFrame((_) => {
          this.#node.lastElementChild.replaceChildren(...nodes)
          resolve([
            scrollbar.parentNode.getBoundingClientRect(),
            scrollbar.getBoundingClientRect(),
            this.#node.getBoundingClientRect(),
            window.innerHeight,
          ])
        }),
      ).then(([scrollbox, scrollthingy]) =>
        window.requestAnimationFrame((_) => {
          this.#node.getElementsByTagName('INPUT')[0].focus()
          scrollbar.style.transform = `translateY(${Math.floor(prog * (scrollbox.height - scrollthingy.height))}px)`
        }),
      )
    })
  }

  select(node) {
    node = node.closest('.kaal-select-item')
    const nodes = this.#inSearch ? this.#searchVnode : this.#vnode
    const list = this.#node.lastElementChild.children
    const value = (() => {
      for (let i = 0; i < list.length; i++) {
        if (list[i] === node) {
          return nodes[i + this.#displayPositionStart]
        }
      }
    })()
    if (!value) {
      return
    }
    if (!this.#mutliselect) {
      this.#selectedValue = []
    }
    if (!this.#selectedValue.includes(value)) {
      this.#selectedValue.push(value)
    } else {
      this.#selectedValue = this.#selectedValue.filter((v) => v !== value.value)
    }
    if (this.#selectCallback) {
      this.#selectCallback(this.#selectedValue)
    }
    if (!this.#mutliselect) {
      this.close()
    } else {
      this.#renderContent()
    }
  }

  close() {
    Placement.removeNode(this.#node)
  }

  search(value) {
    if (!this.#inSearch) {
      this.#displayPositionStart = 0
    }
    this.#inSearch = true
    value = new i18n(value)
      .match_ascii()
      .toLowerCase()
      .split(' ')
      .filter((v) => v !== '')
    const prevSize = this.#searchVnode.length
    this.#searchVnode = this.#vnode.filter((n) => {
      return (
        n.search.filter((v) =>
          value.some((v2) => {
            return v.match(new RegExp(`.*${v2}.*`, 'gi'))
          }),
        ).length === value.length
      )
    })
    if (prevSize > this.#searchVnode.length) {
      this.#displayPositionStart = 0
    }
    this.#renderContent()
  }

  load() {
    if (!this.#loadCallback || typeof this.#loadCallback !== 'function') {
      return
    }
    this.#loadCallback().then((values) => {
      for (let i = 0; i < values[i]; i++) {
        this.#vnode.push({
          label: values[i].label,
          value: values[i].value,
          order: values[i]?.order || 0,
          search: values[i].label.toLowerCase().split(' '),
          dom: null,
        })
      }
      this.#vnode.sort((a, b) => {
        if (!a.order && !b.order) {
          return 0
        }
        if (!a.order && b.order) {
          return -1
        }
        if (a.order && !b.order) {
          return 1
        }
        return a.order - b.order
      })
      this.#renderContent()
    })
  }

  setSelectCallback(cb) {
    this.#selectCallback = cb
  }

  setLoadCallback(cb) {
    this.#loadCallback = cb
  }
}
