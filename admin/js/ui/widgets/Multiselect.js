
import DataAPI from "../../../../js/JAPI/DataAPI.js";
import SchemaModel from "../../../../js/JAPI/SchemaModel.js";
import help from "../../../../js/lib/help.js";
import Placement from "../../../../js/lib/WidgetBase/Placement.js"

export default class Multiselect {
  /**
   * @param api {DataAPI} 
   */
  constructor(appContext, api, name = '') {
    this.api = api
    this.container = document.createElement('FORM')
    this.container.name = name
    this.container.classList.add('multiselect')
    this.container.addEventListener('click', event => this.handleClickEvent(event))
    this.events = []
    this.context = appContext
  }

  /**
   * @param {string} name
   */
  setName(name) {
    this.container.name = name
  }

  /**
   * @param event {string}
   * @param listener {function}
   */
  addEventListener(event, listener) {
    this.events.push({ event, listener })
  }

  /**
   * @param event {Event}
   */
  handleChangeEvent(event) {
    this.events.forEach(e => {
      switch (e.event) {
        case 'change': e.listener(event.target.checked); break
      }
    })
  }


  handleClickEvent(event) {
    if (event.target.nodeName === 'INPUT') { return }
    const node = event.target.closest('.multiselect-item')
    if (!node) { return }
    const input = node.querySelector('input')
    if (!input) { return }
    input.checked = !input.checked
    if (input.checked) {
      if (!node.dataset.infer) {
        return
      }
      this.setSelected(node.dataset.infer.split(',').map(v => { return { id: v } }))
    }
  }

  /**
   * @param event {Event}
   */
  handleAddNewEntrySubmit(event) {
    event.preventDefault()
    const node = event.currentTarget

    const formData = new FormData(node)

    const newElement = {
      name: formData.get('name'),
      description: formData.get('description')
    }

    if (newElement.name.length <= 0) { throw new Error('Error') }

    this.api.save(newElement)
      .then(item => {
        const newNode = this._renderNode(item)
        this.container.insertBefore(newNode, this.container.lastElementChild)
        this.context.events.emit('close')
      })
      .catch(error => {
        throw error
      })
  }

  /**
   * @param event {Event}
   */
  handleAddNewEntry(event) {
    const node = event.currentTarget
    const popup = document.createElement('form')
    popup.classList.add('multiselect-add-new', 'multiselect-form', 'floating-form')
    popup.innerHTML = `
      <label><span class="label">Nom</span><input type="text" name="name"></label>
      <label><span class="label">Description</span><input type="text" name="name"></label>
      <button type="submit">Ajouter</button><button type="reset">Annuler</button>
    `
    this.context.events.on('close', _ => window.requestAnimationFrame(() => popup.remove()))
    popup.addEventListener('reset', _ => this.context.events.emit('close'))
    popup.addEventListener('submit', event => this.handleAddNewEntrySubmit(event))
    popup.style.visibility = 'hidden'
    document.body.appendChild(popup)
    Placement.place(node, popup)
  }


  /**
   * @param content {object}
   * @return {HTMLElement}
   */
  _renderNode(content) {
    const node = document.createElement('DIV')
    node.dataset.id = content.id
    if (content.infer) {
      node.dataset.infer = content.infer.join(',')
    }
    node.classList.add('multiselect-item')
    node.innerHTML = `
      <span class="check"><input type="checkbox"></span>
      <span class="name">${SchemaModel.toString(content.name)}${content.help ? help.get(content.help) : ''}</span>
      <span class="description">${SchemaModel.toString(content.description) ?? ''}</span>
    `
    return node
  }
  /**
   * @return {Promise<HTMLElement>}
   */
  render() {
    return new Promise((resolve, reject) => {
      this.api.list()
        .then(items => {
          items
            .filter(item => item.name && item.name.length > 0)
            .sort((a, b) => {
              if ((a.order || a.order === 0) && (b.order || b.order === 0)) {
                return a.order - b.order
              }
              return a.name.localeCompare(b.name)
            })
            .map(item => {
              return this._renderNode(item)
            })
            .forEach(itemNode => {
              this.container.appendChild(itemNode)
              this.container.addEventListener('change', event => this.handleChangeEvent(event))
            })
          if (this.api.isWritable()) {
            const addNewEntry = document.createElement('DIV')
            addNewEntry.classList.add('multiselect-item', 'multiselect-item-add-new')
            addNewEntry.innerHTML = `
            <span class="check">+</span>
            <span class="name">Ajouter</span>
            <span class="description"></span>
          `
            addNewEntry.addEventListener('click', event => this.handleAddNewEntry(event))
            this.container.appendChild(addNewEntry)
          }
          resolve(this.container)
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  /**
   * @param items {array}
   */
  setSelected(items) {
    items.forEach(item => {
      const node = this.container.querySelector(`[data-id="${item.id}"]`)
      node.querySelector('input').checked = true
      node.classList.add('selected')
    })
  }

  getSelected() {
    return Multiselect.getSelectedFromForm(this.container)
  }

  static getSelectedFromForm(form) {
    const nodes = form.querySelectorAll('[data-id]')
    const items = []
    nodes.forEach(node => {
      if (node.querySelector('input').checked) {
        items.push(node.dataset.id)
      }
    })
    return items
  }
}
