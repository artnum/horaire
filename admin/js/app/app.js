import l10n from './$script/src/lib/l10n.js'
import RouterHandler from './$script/admin/app/router.js'
import help from '../../../js/lib/help.js'
import { AccessAPI } from '../../../js/JAPI/content/Access.js'
import Privilege from '../../../js/JAPI/Privilege.js'

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

export default class App {
  constructor(parentNode) {
    this.parentNode = parentNode
    this.events = new AppEventSystem()
    this.errorBoxes = new Map()
    this.access = new Privilege(new AccessAPI())
    this.init()
    this.events.on('navigate', (_) => this.clearBlockError())
  }

  setupRoute() {
    RouterHandler.installRoute('open', (action) => {
      const parts = action.split('.')
      const object = parts.shift()
      const id = parts.shift()
      if (!object) return
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
          case 'UserUI':
          case 'QuoteUI':
            this.main.classList.add('with-navigation')
            import(`./$script/admin/ui/${object}.js`).then((module) => {
              const ui = new module['default'](this, this.main, this.navigation)
              ui.init().then((_) => {
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
              iframe.src = `${new URL(window.location).toString()}/${object}.html`
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
              const url = new URL(window.location)
              url.hash = ''
              const iframe = document.createElement('IFRAME')
              iframe.classList.add('ka-main-iframe')
              iframe.src = `${url.toString()}/offre.html?doc=${id}`
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
        { level: 32, node: `open:time`, label: 'Temps', nodeid: 'time' },
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
      company.classList.add('company', 'button')
      company.innerHTML = KAAL.title
      this.appendModule(company)

      buttons.forEach((e) => {
        if (parseInt(e.level) >= parseInt(this.loggedUser.level)) {
          let div = document.createElement('DIV')
          div.classList.add('button')

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
