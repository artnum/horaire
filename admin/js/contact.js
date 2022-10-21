/* eslint-env browser */
/* global HClient */

/* SADDR contact */
import {createPopper} from '../../node_modules/@popperjs/core/dist/esm/popper.js'

const ContactAttributes = {
  person: [
    'displayname',
    'givenname',
    'sn',
    'postaladdress',
    'postalcode',
    'l',
    'mail',
    'mobile',
    'telephonenumber'
  ],
  organization: [
    'displayname',
    'o',
    'givenname',
    'sn',
    'postaladdress',
    'postalcode',
    'l',
    'mail',
    'mobile',
    'telephonenumber'
  ]
}

export class SAddrList {
  constructor (ref) {
    this.generation = 0
    this.domNode = document.createElement('DIV')
    this.domNode.setAttribute('tabindex', '-1')
    this.domNode.classList.add('addressList')
    this.reference = ref
    this.reference.setAttribute('autocomplete', 'off')
    window.requestAnimationFrame(
      () => this.reference.parentNode.insertBefore(this.domNode, this.reference.nextElementSibling)
    )
    this.popper = createPopper(this.reference, this.domNode, {placement: 'bottom-start', strategy: 'fixed'})
    this.domNode.addEventListener('click', this.handleEvents.bind(this))
    this.eventTarget = new EventTarget()
  }

  next () {
    if (!this.current) {
      this.current = this.domNode.firstElementChild.dataset.uid
      window.requestAnimationFrame(() => { this.domNode.firstElementChild.setAttribute('selected', '1') })
    } else {
      for (let j = this.domNode.firstElementChild; j; j = j.nextElementSibling) {
        if (j.dataset.uid === this.current) {
          window.requestAnimationFrame(() => { j.removeAttribute('selected') })
          if (j.nextElementSibling) {
            this.current = j.nextElementSibling.dataset.uid
            window.requestAnimationFrame(() => { j.nextElementSibling.setAttribute('selected', '1') })
          } else {
            this.current = this.domNode.firstElementChild.dataset.uid
            window.requestAnimationFrame(() => { this.domNode.firstElementChild.setAttribute('selected', '1') })
          }
          return
        }
      }
    }
  }

  previous () {
  }

  show () {
    window.requestAnimationFrame(() => { this.domNode.innerHTML = '' })
    this.domNode.setAttribute('data-show', '')
  }

  hide () {
    this.domNode.removeAttribute('data-show')
  }

  handleEvents (event) {
    switch (event.type) {
      case 'click':
        let node = event.target
        while (node !== this.domNode) {
          if (node.nodeName === 'ADDRESS') {
            this.selectAddress(node)
            break
          }
          node = node.parentNode
        }
        break
    }
  }

  selectAddress (node) {
    this.hide()
    this.eventTarget.dispatchEvent(new CustomEvent('select', {detail: {html: node, object: JSON.parse(node.dataset.contact)}}))
  }

  addEventListener (type, listener, options) {
    this.eventTarget.addEventListener(type, listener, options)
  }

  showList (list) {
    return new Promise((resolve, reject) => {
      if (list.length <= 0) {
        this.hide()
        resolve()
        return
      }
      this.show()

      for (let i = 0; i < list.length; i++) {
        let found = false
        for (let j = this.domNode.firstChild; j; j = j.nextElementSibling) {
          if (j.dataset.uid === list[i].uid) { found = true; break }
        }
        if (!found) {
          list[i].toHtml().then((html) => {
            html.dataset.contact = JSON.stringify(list[i].contact)
            window.requestAnimationFrame(() => this.domNode.appendChild(html))
          })
        }
      }

      resolve()
    })
  }
}

export class FContact {
  constructor (node, prefix) {
    this.node = node
    this.prefix = prefix
  }

  * getNodes (node = null) {
    if (node === null) { node = this.node }

    for (node = node.firstElementChild; node; node = node.nextElementSibling) {
      if (node.dataset.cloned) { continue; }
      if (node.children.length > 0) {
        yield * this.getNodes(node)
      }

      let nodeName = node.getAttribute('id')
      if (!nodeName) { nodeName = node.getAttribute('name') }
      if (!nodeName) { nodeName = node.getAttribute('for') }
      if (!nodeName) { continue }

      const name = /([a-zA-Z0-9]):([^[\]]*)(?:\[([0-9]*)\])?/.exec(nodeName)
      if (name === null) { continue }
      if (name[1] !== this.prefix) { continue }

      yield {dom: node, name: name[2], count: name[3] ? parseInt(name[3]) : 0}
    }
  }

  * setType (type) {
    const gNode = this.getNodes(this.node)
    for (let node = gNode.next().value; node; node = gNode.next().value) {
      if (ContactAttributes[type].indexOf(node.name) === -1 &&
          Object.keys(ContactAttributes).indexOf(node.name) === -1) {
        window.requestAnimationFrame(() => { node.dom.style.display = 'none' })
      } else {
        if (node.dom.style.display === 'none') {
          window.requestAnimationFrame(() => { node.dom.style.display = '' })
        }
      }
      yield node
    }
  }

  save () {
    if (!this.node.dataset.id) { return }
    const gNode = this.getNodes(this.node)
    for (let node = gNode.next().value; node; node = gNode.next().value) {
      console.log(node)
    }
  }

  apply (contact) {
    const attrs = ContactAttributes[contact.type]
    if (attrs === undefined) { return }

    if (contact.uid) {
      this.node.dataset.id = contact.uid
    } else {
      this.node.dataset.id = contact.IDent
    }

    const gNode = this.getNodes(this.node)
    for (let node = gNode.next().value; node; node = gNode.next().value) {
      node.dom.classList.remove('modified')
      if (contact[node.name]) {
        switch (node.dom.nodeName) {
          case 'INPUT':
            switch (node.dom.type.toLowerCase()) {
              case 'text':
                if (Array.isArray(contact[node.name])) {
                  let currentNode = node.dom
                  for (let i = 0; i < contact[node.name].length; i++) {
                    currentNode.value = contact[node.name][i]
                    currentNode.dataset.value = contact[node.name][i]
                    if (!currentNode.nextElementSibling) {
                      let newNode = currentNode.cloneNode()
                      newNode.value = ''
                      newNode.dataset.value = ''
                      newNode.dataset.cloned = true
                      currentNode.parentNode.appendChild(newNode)
                      currentNode = newNode
                      continue
                    } 
                    if (currentNode.nextElementSibling.nodeName !== 'INPUT') {
                      let newNode = currentNode.cloneNode()
                      newNode.value = ''
                      newNode.dataset.value = ''
                      newNode.dataset.cloned = true
                      currentNode.parentNode.insertBefore(newNode, currentNode.nextElementSibling)
                      currentNode = newNode
                      continue
                    }
                    if (currentNode.nextElementSibling.getAttribute('name') !== currentNode.getAttribute('name')) {
                      let newNode = currentNode.cloneNode()
                      newNode.value = ''
                      newNode.dataset.value = ''
                      newNode.dataset.cloned = true
                      currentNode.parentNode.insertBefore(newNode, currentNode.nextElementSibling)
                      currentNode = newNode
                      continue
                    }
                    currentNode = currentNode.nextElementSibling
                  }
                } else {
                  if (node.count === 0) {
                    node.dom.value = contact[node.name]
                    node.dom.dataset.value = node.dom.value
                  }
                }
                break
              case 'radio':
              case 'checkbox':
                if (node.name === 'type') {
                  node.dom.disabled = true
                }
                node.dom.dataset.value = contact[node.name]
                if (node.dom.value === contact[node.name]) {
                  node.dom.checked = true
                } else {
                  node.dom.checked = false
                }
            }
            break
          case 'TEXTAREA':
            node.dom.value = contact[node.name]
            node.dom.dataset.value = node.dom.value
            break
        }
      } 
    }
  }

  clear () {
    const gNode = this.getNodes(this.node)
    delete this.node.dataset.id
    for (let node = gNode.next(); node.value; node = gNode.next()) {
      let domNode = node.value.dom
      switch (domNode.nodeName) {
        case 'INPUT':
          switch (domNode.type.toLowerCase()) {
            default:
            case 'text': domNode.value = ''; break
            case 'radio': domNode.checked = false; break
          }
          break
        case 'TEXTAREA':
          domNode.value = ''
          break
      }
    }
  }
}

export class SContact {
  constructor (contact) {
    this.contact = contact
    this.toHtml().then((html) => { this.HTML = html })
  }

  getId () {
    return this.contact.uid
  }

  toHtml () {
    return new Promise((resolve, reject) => {
      if (this.HTML) { resolve(this.HTML) }
      let c = this.contact
      if (c.type === undefined) { reject(new Error('TypeError contact is undefined')); return }
      if (ContactAttributes[c.type] === undefined) { reject(new Error('Unknown contact type')); return }

      let html = ''
      ContactAttributes[c.type].forEach((k) => {
        if (c[k]) {
          if (Array.isArray(c[k])) {
            let ul = ''
            c[k].forEach((i) => {
              ul += `<li>${i}</li>`
            })
            html += `<ul class="${k}">${ul}</ul>`
          } else {
            html += `<span class="${k}">${c[k]}</span>`
          }
        }
      })

      let h = document.createElement('ADDRESS')
      h.classList.add(c.type, 'selectable')
      h.innerHTML = html
      h.dataset.uid = this.getId()
      resolve(h)
    })
  }
}

export class SContactStore {
  constructor (url) {
    this.url = this.getAbsoluteUrl(url)
  }

  getAbsoluteUrl (url) {
    if (!this.a) { this.a = document.createElement('a') }
    this.a.href = url
    return this.a.href
  }

  update (id, content) {
    return new Promise((resolve, reject) => {
      let parts = id.split('/', 2)
      if (parts.length === 2) { id = parts[1] }
      let url = new URL(`${this.url}/${id}`)
      fetch(url, {method: 'HEAD'}).then(response => {
        if (!response.ok) { resolve(false); return }
        fetch(url, {method: 'PUT', body: JSON.stringify(content)}).then(response => {
          if (!response.ok) { resolve(false); return }
          response.json().then(result => {
            if (result.length === 1) {
              if (result.data[0].success) {
                resolve(true)
                return
              }
            }
            resolve(false)
          })
        })
      })
    })
  }

  create (content) {
    return new Promise((resolve, reject) => {
      let url = new URL(`${this.url}/`)
      fetch(url, {method: 'POST', body: JSON.stringify(content)}).then(response => {
        if (!response.ok) { resolve(null); return; }
        response.json().then(result => {
          if (result.length === 1) {
            if (result.data[0].success) {
              resolve(result.data[0].IDent)
              return
            }
          }
          resolve(null)
        })
      })
    })
  }

  get (id) {
    return new Promise((resolve, reject) => {
      let parts = id.split('/', 2)
      if (parts.length === 2) { id = parts[1] }
      let url = new URL(`${this.url}/${id}`)
      fetch(url, KAAL.fetchOpts).then(response => {
        if (!response.ok) { resolve(null); return }
        response.json().then(json => {
          if (json.length <= 0) { resolve(null); return }
          if (Array.isArray(json.data)) {
            json.data = json.data[0]
          }
          resolve(json.data)
        }, _ => resolve(null))
      })
    })
  }
  
  search (term, params = {}) {
    const searchOn = ['o', 'sn', 'givenname']
    return new Promise((resolve, reject) => {
      let url = new URL(this.url)
      url.searchParams.append('search._or', '1')
      let terms = term.split(' ')
      for (let t of terms) {
        if (t.length <= 0) { continue }
        for (let k of searchOn) {
          url.searchParams.append(`search.${k}`, `*${t}*`)
        }
      }
      url.searchParams.append('limit', KAAL.search.liveLimit)
      fetch(url, KAAL.fetchOpts)
        .then((response) => {
          if (response.ok) {
            return response.json()
          } else {
            return Promise((resolve, reject) => resolve({success: true, length: 0, data: null}))
          }
        })
        .then((json) => {
          if (json.length === undefined || json.length <= 0) { resolve([]); return }
          let res = []
          for (let i = 0; i < json.length; i++) {
            let c = new SContact(json.data[i])
            res.push(c)
          }
          resolve(res)
        })
    })
  }
}
