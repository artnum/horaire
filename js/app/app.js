import l10n from '../lib/l10n.js'
import RouterHandler from './router.js'
import help from '../lib/help.js'
import { AccessAPI } from '../JAPI/content/Access.js'
import Privilege from '../JAPI/Privilege.js'
import KAPerson from '../data/person.js'

class AppEventSystem {
  constructor() {
    this.listeners = new Map()
    this.channel = new BroadcastChannel('KaalEventSystem')
    this.channel.onmessage = (event) => {
      this.emit(event.data.type, event.data.payload)
    }
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set())
    }
    this.listeners.get(eventName).add(callback)
    return () => this.off(eventName, callback)
  }

  off(eventName, callback) {
    const listeners = this.listeners.get(eventName)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.listeners.delete(eventName)
      }
    }
  }

  emit(eventName, data = {}) {
    const listeners = this.listeners.get(eventName)
    if (listeners) {
      for (const callback of listeners) {
        callback(data)
      }
    }
  }

  emitApp(eventName, data = {}) {
    this.emit(eventName, data)
    this.channel.postMessage({ type: eventName, payload: data })
  }
}

const COLOR_THEME_STORAGE_KEY = 'kaal-color-theme'
const COLOR_THEME_LINK_ID = 'ka-color-theme'

export default class App {
  #currentUiNode = null
  #availableThemes = []

  constructor(parentNode) {
    this.parentNode = parentNode
    this.events = new AppEventSystem()
    this.errorBoxes = new Map()
    this.access = new Privilege(new AccessAPI())
    this.init()
    this.events.on('navigate', (_) => this.clearBlockError())
    
  }

  /**
   * Base URL for css/color-theme/ (resolved from the current page location).
   * Admin lives under admin/, so themes are one level up at ../css/color-theme/.
   */
  #colorThemeBaseUrl() {
    return new URL('../css/color-theme/', window.location.href)
  }

  #colorThemeListUrl() {
    return new URL('list.php', this.#colorThemeBaseUrl())
  }

  #colorThemeStylesheetUrl(themeId) {
    return new URL(`${encodeURIComponent(themeId)}.css`, this.#colorThemeBaseUrl())
  }

  getStoredColorTheme() {
    try {
      return localStorage.getItem(COLOR_THEME_STORAGE_KEY) || ''
    } catch (_) {
      return ''
    }
  }

  /**
   * Apply a color theme by injecting/updating a stylesheet link after existing CSS
   * so CSS variables override the default color.css import/symlink.
   */
  applyColorTheme(themeId) {
    if (!themeId) { return }
    let link = document.getElementById(COLOR_THEME_LINK_ID)
    if (!link) {
      link = document.createElement('link')
      link.id = COLOR_THEME_LINK_ID
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    const href = this.#colorThemeStylesheetUrl(themeId).href
    if (link.getAttribute('href') !== href) {
      link.href = href
    }
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, themeId)
    } catch (_) {
      /* ignore quota / private mode */
    }
    const select = this.status?.querySelector('select[name="color-theme"]')
    if (select && select.value !== themeId) {
      select.value = themeId
    }
  }

  /**
   * Dynamically list themes from css/color-theme/ via list.php.
   * @returns {Promise<Array<{id: string, label: string, file: string}>>}
   */
  listColorThemes() {
    return fetch(this.#colorThemeListUrl().href, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Impossible de lister les thèmes')
        }
        return response.json()
      })
      .then((payload) => {
        const themes = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
        this.#availableThemes = themes.filter((t) => t?.id)
        return this.#availableThemes
      })
  }

  setupColorThemeSelector() {
    const stored = this.getStoredColorTheme()
    if (stored) {
      this.applyColorTheme(stored)
    }

    const container = this.status?.querySelector('.theme')
    if (!container) { return }

    this.listColorThemes()
      .then((themes) => {
        if (!themes.length) {
          container.innerHTML = ''
          return
        }

        let current = this.getStoredColorTheme()
        if (current && !themes.some((t) => t.id === current)) {
          current = themes[0].id
          this.applyColorTheme(current)
        }

        const label = document.createElement('LABEL')
        label.classList.add('theme-label')
        label.htmlFor = 'ka-color-theme-select'
        label.textContent = 'Thème'

        const select = document.createElement('SELECT')
        select.id = 'ka-color-theme-select'
        select.name = 'color-theme'
        select.setAttribute('aria-label', 'Thème de couleur')

        themes.forEach((theme) => {
          const option = document.createElement('OPTION')
          option.value = theme.id
          option.textContent = theme.label || theme.id
          select.appendChild(option)
        })

        if (current) {
          select.value = current
        } else {
          // No preference yet: leave server default (color.css symlink) until the
          // user picks a theme; show first option as placeholder selection only.
          select.value = themes[0].id
        }

        select.addEventListener('change', () => {
          this.applyColorTheme(select.value)
        })

        container.replaceChildren(label, select)
      })
      .catch(() => {
        container.innerHTML = ''
      })
  }

  setupRoute() {
    RouterHandler.installRoute('open', (action) => {
      const parts = action.split('.')
      const object = parts.shift()
      const id = parts.shift()
      if (!object) return
      if (this.#currentUiNode && this.#currentUiNode.destroy) {
        this.#currentUiNode.destroy()
      }
      this.#currentUiNode = null
      this.main.classList.remove('with-navigation')

      this.events.emit('close')
      this.clearBlockError()
      Promise.all([
        this.clearContent(),
        this.clearNavigation(),
        this.clearMainAction(),
      ]).then(() => {
        this.parentNode.classList.add('pageview', object)
        this.parentNode.classList.remove(this.currentObject)
        this.currentObject = object
        switch (object) {
          case 'TimeUI':
          case 'UserUI':
          case 'QuoteUI':
            this.main.classList.add('with-navigation')
            import(`../ui/${object}.js`).then((module) => {
              const ui = new module['default'](this, this.main, this.navigation)
              ui.init().then((_) => {
                this.#currentUiNode = ui
                Promise.all([
                  ui.main().then((node) => {
                    if (node) {
                      this.appendContent(node)
                    }
                  }),
                  ui.navigation().then((node) => {
                    if (node) {
                      this.appendNavigation(node)
                    }
                  }),
                ]).then((_) => {
                  ui.run()
                })
              })
            })
            break
          default:
            ;(() => {
              const iframe = document.createElement('IFRAME')
              iframe.classList.add('ka-main-iframe')
              iframe.src = new URL(`${object}.html`, window.location).href
              this.appendContent(iframe)
              iframe.focus()
            })()
            break
          case 'home':
            window.location.reload()
            break
          case 'exit':
            this.events.emitApp('logout')
            break
          case 'kairos':
            ;(() => {
              const iframe = document.createElement('IFRAME')
              iframe.classList.add('ka-main-iframe')
              iframe.src = KAAL.kairos.url
              this.appendContent(iframe)
              iframe.focus()
            })()
            break

          case 'offer':
            ;(() => {
              const iframe = document.createElement('IFRAME')
              iframe.classList.add('ka-main-iframe')
              iframe.src = new URL(`offre.html?doc=${encodeURIComponent(id)}`, window.location).href
              this.appendContent(iframe)
              iframe.focus()
            })()
            break
        }
      })
    })
    window.addEventListener('message', (event) => {
      if (event.data.type === 'route') {
        RouterHandler.executeRoute(event.data.action)
      }
    })
  }

  setupChannels() {
    const fetchChannel = new BroadcastChannel('fetch-channel')
    /*let DownTiming = 0
    let WarningSet = false*/
    fetchChannel.onmessage = (message) => {
      switch (message.data) {
        case 'bexio-down':
          this.setStatus(l10n.t('Bexio indisponible'))
        /* DownTiming = performance.now()
         if (WarningSet) { return }
         WarningSet = true
         return window.requestAnimationFrame(() => document.body.classList.add('bexio-down'))*/
        case 'bexio-up':
          this.clearStatus()
        /*if (performance.now() - DownTiming < 10000) { return }
        if (!WarningSet) { return }
        WarningSet = false
        return  window.requestAnimationFrame(() => document.body.classList.remove('bexio-down'))*/
      }
    }
  }

  setupWindowHandler() {
    window.addEventListener('hashchange', (event) => {
      const hash = window.location.hash
      if (!hash.substring(1)) {
        return
      }
      RouterHandler.executeRoute(`open:${hash.substring(1)}`)
    })

    window.AppAppendChild = (node) => {
      this.main.appendChild(node)
    }
  }

  _runEvent(eventType, event) {
    if (this.eventsListsHandler.has(eventType)) {
      this.eventsListsHandler.get(eventType)(event)
    }
  }

  setEventHandler(evenType, callback) {
    this.eventsListsHandler.set(evenType, callback)
  }

  setupEventHandler(rootNode) {
    this.eventsListsHandler = new Map()
    rootNode.addEventListener(
      'click',
      (event) => this._runEvent('click', event),
      { capture: true },
    )
  }

  init() {
    help.installHelp()
    this.setupRoute()
    this.setupChannels()
    this.setupWindowHandler()

    this.root = document.createElement('div')
    this.root.classList.add('ka-main-content')

    this.setupEventHandler(this.root)

    this.main = document.createElement('SECTION')
    this.main.classList.add('ka-main')

    this.mainAction = document.createElement('DIV')
    this.mainAction.classList.add('ka-main-action')

    this.navigation = document.createElement('SECTION')
    this.navigation.classList.add('ka-main-nav')

    this.status = document.createElement('SECTION')
    this.status.classList.add('ka-status')
    this.status.innerHTML = `
            <div class="message"></div>
            <div class="user"></div>
            <div class="theme"></div>
            <div class="info"></div>
        `

    this.module = document.createElement('SECTION')
    this.module.classList.add('ka-module')

    this.root.appendChild(this.module)
    this.root.appendChild(this.navigation)
    this.root.appendChild(this.main)
    this.root.appendChild(this.mainAction)
    this.root.appendChild(this.status)

    this.parentNode.appendChild(this.root)

    this.setupColorThemeSelector()
    
    window.addEventListener('start-fetch', e => {
        this.startLoading()
    })

    window.addEventListener('stop-fetch', e => {
        this.stopLoading()
    })
    this.events.on('logout', (_) => this.logout())
  }

  logout() {
    const klogin = new KLogin(KAAL.getBase())
    klogin.logout().then(() => {
      RouterHandler.executeRoute('open:home')
    })
  }

  run() {
    this.clearBlockError()
    Promise.all([
      this.clearContent(),
      this.clearModule(),
      this.clearNavigation(),
      this.clearMainAction(),
    ]).then(() => {
      let buttons = [
        {
          level: 128,
          callback: () => {
            RouterHandler.executeRoute('open:QuoteUI')
          },
          node: `offre.html`,
          label: 'Offre',
          nodeid: 'quote',
        },
        { level: 128, node: `open:project`, label: 'Projets', nodeid: 'prj' },
        //{ level: 64, node: `process.html`, label: 'Processus' },
        {
          level: 16,
          callback: () => {
            RouterHandler.executeRoute('open:UserUI')
          },
          node: `open:user`,
          label: 'Utilisateurs',
          nodeid: 'user',
        },
        //{ level: 32, node: `open:time`, label: 'Temps', nodeid: 'time' },
        {
            level: 32,
            callback: () => {
                RouterHandler.executeRoute('open:TimeUI')
            },
            node: 'open:time',
            label: 'Temps',
            nodeid: 'time', 
        },
        { level: 32, node: `open:bill`, label: 'Facture', nodeid: 'bill' },
        { level: 32, node: 'open:debt', label: 'Débiteur', nodeid: 'debitor' },
        { level: 128, node: `open:item`, label: 'Matériels', nodeid: 'items' },
        {
          level: 128,
          node: 'open:kairos',
          label: 'Planification',
          nodeid: 'plan',
        },
        //{ level: 128, node: `view-gantt.html`, label: 'Vue général' },
        { level: 32, node: 'open:car', label: 'Véhicule', nodeid: 'car' },
        { level: 256, node: 'open:exit', label: 'Déconnexion', nodeid: 'exit' },
      ]
      buttons = buttons.filter((e) => {
        return KAAL.nodes.indexOf(e.nodeid) !== -1
      })

      const company = document.createElement('div')
      company.classList.add('company', 'button', 'module-button')
      company.innerHTML = KAAL.title
      this.appendModule(company)

      buttons.forEach((e) => {
        if (parseInt(e.level) >= parseInt(this.loggedUser.level)) {
          let div = document.createElement('DIV')
          div.classList.add('button', 'module-button', e.nodeid)

          if (e.callback) {
            div.addEventListener('click', e.callback)
            div.innerHTML = `<a>${e.label}</a>`
          } else {
            let link = document.createElement('A')
            link.setAttribute('href', e.node)
            link.addEventListener('click', (event) => {
              event.preventDefault()
              RouterHandler.executeRoute(e.node)
            })
            link.appendChild(document.createTextNode(e.label))
            div.appendChild(link)
          }
          this.appendModule(div)
        }
      })
    })
  }

  login() {
    return new Promise((resolve, reject) => {
      const klogin = new KLogin(KAAL.getBase())
      new Promise((resolve) => {
        klogin
          .isLogged()
          .then((x) => {
            klogin
              .getUser()
              .then((userid) => {
                return KAPerson.load(userid)
              })
              .then((user) => {
                resolve(user)
              })
          })
          .catch((e) => {
            resolve(false)
          })
      }).then((logged) => {
        if (logged) {
          this.loggedUser = logged
          this.setUser(this.loggedUser.username)
          return resolve(this.loggedUser)
        }

        const loginForm = document.createElement('FORM')
        loginForm.innerHTML = `
                    <label for="username">Utilisateur : <input type="text" name="username" class="darkbg"></label><br>
                    <label for="password">Mot de passe : <input type="password" name="password" class="darkbg"></label><br>
                    <button type="submit">Authentifier</button>
                `
        this.appendContent(loginForm)

        loginForm.addEventListener('submit', (event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          klogin
            .getUserid(data.get('username'))
            .then((userid) => {
              return klogin.login(userid, data.get('password'))
            })
            .then(() => {
              return klogin.getUser()
            })
            .then((userid) => {
              return KAPerson.load(userid)
            })
            .then((user) => {
              this.loggedUser = user
              this.setUser(this.loggedUser.username)
              this.clearContent()
              return resolve(this.loggedUser)
            })
            .catch(() => {
              alert(l10n.t('Autentification échouée'))
            })
        })
      })
    })
  }

  appendModule(node) {
    this.module.appendChild(node)
    return Promise.resolve(this)
  }

  clearModule() {
    this.module.innerHTML = ''
    return Promise.resolve(this)
  }
 
  startLoading() {
    this.status.querySelector('.info').classList.add('loading_in_progress')
  }

  stopLoading() {
    this.status.querySelector('.info').classList.remove('loading_in_progress')
  }

  clearStatus() {
    this.status.querySelector('.message').innerHTML = ''
  }
  setStatus(status) {
    this.clearStatus()
    const node = this.status.querySelector('.message')
    if (status instanceof HTMLElement) {
      node.appendChild(status)
    } else {
      const div = document.createElement('DIV')
      div.innerHTML = status
      node.appendChild(div)
    }
    return Promise.resolve(this)
  }

  clearUser() {
    this.status.querySelector('.user').innerHTML = ''
  }
  setUser(user) {
    const node = this.status.querySelector('.user')
    node.innerHTML = l10n.t('Authentifiée comme {}', user)
  }

  appendNavigation(node) {
    this.navigation.appendChild(node)
    return Promise.resolve(this)
  }

  removeFromNavigation(selector) {
    const node = this.navigation.querySelector(selector)
    if (node) {
      node.remove()
    }
    return Promise.resolve(this)
  }

  getNavigationNode(selector) {
    return Promise.resolve(this.navigation.querySelector(selector))
  }

  clearNavigation() {
    this.navigation.innerHTML = ''
    return Promise.resolve(this)
  }

  /**
   * @param node {HTMLElement}
   * @return Promise<App>
   */
  appendContent(node) {
    node.classList.add('ka-content')
    this.main.appendChild(node)
    return Promise.resolve(this)
  }

  clearContent() {
    this.main.replaceChildren()
    //    for (let n = this.main.firstChild; n && n != this.mainAction; n = this.main.firstChild) {
    //    n.remove()
    //}
    return Promise.resolve(this)
  }

  /**
   * @param node {HTMLElement}
   * @return Promise<App>
   */
  setContent(node) {
    this.clearContent()
    this.appendContent(node)
    return Promise.resolve(this)
  }

  clearMainAction() {
    this.mainAction.innerHTML = ''
    return Promise.resolve()
  }

  /**
   *
   * @param {string} name
   * @param {Function} action
   */
  addMainAction(name, action) {
    const node = document.createElement('DIV')
    node.classList.add('main-action-item')
    node.innerHTML = name
    this.mainAction.appendChild(node)
    node.addEventListener('click', (event) => action(event.currentTarget))
  }

  /**
   * @param {Number} currentState
   * @param {Array} names
   * @param {Funciton} action
   */
  addMainActionWithState(currentState, names, action) {
    const node = document.createElement('DIV')
    node.classList.add('main-action-item', 'item-with-state')
    node.innerHTML = names[currentState]
    this.mainAction.appendChild(node)
    node.addEventListener('click', (event) => {
      action(event.currentTarget)
        .then((nextState) => {
          node.innerHTML = names[nextState]
        })
        .catch((e) => {
          console.log(e)
        })
    })
  }

  getContentNode() {
    return this.main
  }

  getNavigationNode() {
    return this.navigation
  }

  /**
   * @param block {HTMLElement}
   */
  setBlockError(error, block) {
    if (this.errorBoxes.has(block)) {
      return
    }

    block.classList.add('error')
    const node = document.createElement('DIV')
    node.classList.add('error-box')
    node.innerHTML = `<span class="message">${error.message}</span>`
    const box = block.getBoundingClientRect()

    Object.assign(node.style, {
      position: 'fixed',
      top: `${box.top}px`,
      left: `${box.left}px`,
      minWidth: `${box.width}px`,
      minHeight: `${box.height}px`,
      maxWidth: `${box.width}px`,
      maxHeight: `${box.height}px`,
      zIndex: 99999,
    })
    this.errorBoxes.set(block, node)
    document.body.appendChild(node)
  }

  clearBlockError() {
    this.errorBoxes.forEach((node) => node.remove())
    this.errorBoxes.clear()
  }

  showError(error) {
    console.group('--- Error ${error.message} ---')
    try {
      error.stack.split('\n').map((line) => {
        console.log(line)
      })
    } catch (_) {
      console.log(error)
    }
    console.groupEnd()
  }

  static getInstance() {
    return new App()
  }
}
