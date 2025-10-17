import format from '../../../../js/lib/format'
import Placement from '../../../../js/lib/WidgetBase/Placement'

export default class Tab {
  #tabHeader
  #placeHolders
  #currentTab
  #defaultTab
  #minHeight
  constructor(options = {}) {
    this.#minHeight = 0
    this.#tabHeader = new Map()
    this.#placeHolders = new Map()
    this.#currentTab = null
    this.#defaultTab = null
    this.container = document.createElement('DIV')
    this.container.classList.add('tab', 'tab-container')
    this.container.innerHTML = `
      <div role="tablist" class="tab-header"></div >
      <div class="tab-content"></div>
    `
    this.container.addEventListener('click', (event) =>
      this.handleClickButtonEvent(event),
    )
    this.container.addEventListener('contextmenu', (event) => {
      if (options.ctxmenu && typeof options.ctxmenu === 'function') {
        event.preventDefault()
        const target = event.target.closest('[data-action]')
        if (!target) {
          return
        }

        const form = this.container.querySelector(
          `form[data-name="${target.dataset.action}"]`,
        )
        options.ctxmenu(target, form).then((x) => {
          if (x.length === 0) {
            return
          }
          const menu = document.createElement('DIV')
          menu.classList.add('tab-menu-context')
          x = x.map((e) => {
            const entry = document.createElement('DIV')
            entry.classList.add('tab-menu-item')
            entry.innerHTML = e.label
            menu.appendChild(entry)
            entry.addEventListener('click', (event) => {
              e.action(form)
              Placement.removeNode(menu)
            })
          })
          document.body.appendChild(menu)
          Placement.init()
          Placement.place(target, menu)
        })
      }
    })
  }

  destroy() {
    this.container.removeEventListener('click', (event) =>
      this.handleClickButtonEvent(event),
    )
    this.#tabHeader.clear()
    this.#placeHolders.clear()
    this.#currentTab = null
    this.#defaultTab = null
    if (this.container && this.container.parentNode) {
      window.requestAnimationFrame(() => {
        this.container.remove()
        this.container = null
      })
    }
  }

  /**
   * Set the default tab, if there is no tab open, open this one. If
   * this one is not created, it will be open when created
   *
   * @param {string} name Name of the default tab
   */
  setDefaultTab(name) {
    this.#defaultTab = name
  }

  getDefaultTab() {
    const tabs = this.#defaultTab.split('|')
    for (let i = 0; i < tabs.length; i++) {
      if (this.#tabHeader.has(tabs[i])) {
        return tabs[i]
      }
    }
    return tabs[0]
  }

  /**
   * @param {MouseEvent} event The event
   */
  handleClickButtonEvent(event) {
    const node = event.target.closest('[data-action]')
    if (!node) {
      return
    }
    this.showTab(node.dataset.action)
  }

  /**
   * @param {string} name Name of the tab
   */
  removeTab(name) {
    if (name instanceof HTMLElement) {
      name = name.dataset.name || name.dataset.action
    }
    if (!this.#tabHeader.has(name)) {
      return
    }
    const element = this.#tabHeader.get(name).element
    this.#tabHeader.delete(name)
    if (this.#currentTab === element) {
      if (this.#defaultTab) {
        const dt = this.getDefaultTab()
        if (this.#tabHeader.has(dt)) {
          this.showTab(dt)
        }
      } else {
        this.showTab(this.#tabHeader.keys().next().value)
      }
    }
    window.requestAnimationFrame(() => {
      this.container.querySelector(`[data-action="${name}"]`)?.remove()
      element.remove()
    })
  }

  /**
   * Add a placeholder, a non-existant element but that show in the tab
   * header. This allows to have Promise based loading and not having
   * each tab appear async (thus modifying the interface as the user
   * sees it (I hate when I am about to click on something and everything
   * moves because some promises resolved and triggered a new layaout)).
   * So create placeholders and then replace them with real button
   * when the async is done.
   *
   * @param {string}       name    Name of the tab
   * @param {string}       label   The label to display
   * @param {Number}       order   The order of the element
   */
  addPlaceholderTab(name, label, order) {
    const button = document.createElement('DIV')
    button.classList.add('tab-button', 'tab-button-placeholder')
    button.style.order = order
    button.innerHTML = label
    button.dataset.action = name
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-selected', 'false')
    this.#placeHolders.set(name, {
      p: new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          this.container.querySelector('.tab-header').appendChild(button)
          resolve()
        })
      }),
      button,
    })
  }

  /**
   * @param {string}       name    Name of the tab
   * @param {string}       label   The label to display
   * @param {HTMLElement}  element Node
   * @param {Number}       order   The order of the element
   */
  addTab(name, label, element, order = 0) {
    let button = null
    if (this.#placeHolders.has(name)) {
      const pholder = this.#placeHolders.get(name)
      button = pholder.button
      pholder.p.then((_) => {
        window.requestAnimationFrame(() => {
          button.classList.remove('tab-button-placeholder')
          button.style.order = order
        })
      })
      this.#placeHolders.delete(name)
    } else {
      button = document.createElement('DIV')
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-selected', 'false')
      button.classList.add('tab-button')
      button.style.order = order
      button.innerHTML = format.escape(label)
      button.dataset.action = name
    }

    element.dataset.name = name
    element.setAttribute('role', 'tabpanel')
    window.requestAnimationFrame(() => {
      if (element.parentNode) {
        element.remove()
      }
      element.style.display = 'none'
      this.container.querySelector('.tab-content').appendChild(element)
      if (!button.parentNode) {
        this.container.querySelector('.tab-header').appendChild(button)
      }
    })
    this.#tabHeader.set(name, { label, element, button })

    if (!this.#currentTab) {
      if (this.#defaultTab) {
        const dt = this.getDefaultTab()
        if (this.#tabHeader.has(dt)) {
          this.showTab(dt)
        }
      } else {
        if (this.#tabHeader.size > 0) {
          this.showTab(this.#tabHeader.keys().next().value)
        }
      }
    }
  }

  /**
   * @param {string} name Element to show
   */
  showTab(name) {
    if (!this.#tabHeader.has(name)) {
      return
    }
    if (this.#currentTab) {
      const hideTab = this.#currentTab
      if (this.#tabHeader.has(hideTab.dataset.name)) {
        this.#tabHeader
          .get(hideTab.dataset.name)
          .button.setAttribute('aria-selected', 'false')
      }
      window.requestAnimationFrame(() => {
        this.container
          .querySelector(`[data-action="${hideTab.dataset.name}"]`)
          .classList.remove('active')
        hideTab.style.display = 'none'
      })
    }
    this.#currentTab = this.#tabHeader.get(name).element
    if (this.#currentTab) {
      const showTab = this.#currentTab
      this.#tabHeader
        .get(showTab.dataset.name)
        .button.setAttribute('aria-selected', 'true')
      new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          this.container
            .querySelector(`[data-action="${name}"]`)
            .classList.add('active')
          showTab.style.display = ''
          resolve(this.container.getBoundingClientRect())
        })
      }).then((rect) => {
        if (this.#minHeight < rect.height) {
          this.#minHeight = rect.height
          window.requestAnimationFrame((_) => {
            this.container.style.minHeight = `${this.#minHeight}px`
          })
        }
      })
    }
  }

  getTabs() {
    if (this.#tabHeader.length == 0) {
      return []
    }
    return Array.from(this.#tabHeader.entries()).map((e) => {
      return { name: e[0], content: e[1] }
    })
  }

  /**
   * @param {String} name
   */
  getTab(name) {
    return { name, content: this.#tabHeader.get(name).content }
  }

  /**
   * @param {String} name
   */
  setTabError(name) {
    if (this.#tabHeader.has(name)) {
      const tab = this.#tabHeader.get(name)
      window.requestAnimationFrame((_) => tab.button.classList.add('error'))
    }
  }

  resetErrors() {
    Array.from(this.#tabHeader.entries()).map((e) => {
      window.requestAnimationFrame((_) => {
        e[1].button.classList.remove('error')
      })
    })
  }
}
