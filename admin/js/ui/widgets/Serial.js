import SchemaModel from "../../../../js/JAPI/SchemaModel.js"
import l10n from "../../../../js/lib/l10n.js"
import Placement from "../../../../js/lib/WidgetBase/Placement.js"

/**
 * Widget to display serial data
 */
export default class Serial {

  /**
   * @param {object} headers Headers of the serial list a key-value pair
   */
  constructor(appContext, headers, options = {}) {
    this.options = Object.assign(
      options,
      {
        readonly: false,
        position: 'top',
        direction: 'column'
      }
    )
    this.dataCallback = (dataArray) => Promise.resolve(dataArray)
    this.sortCallback = (a, b) => parseInt(a._order) - parseInt(b._order)
    this.context = appContext
    this.translation = {}
    this.headers = headers
    this.data = []
    this.container = document.createElement('TABLE')
    this.container.classList.add('serial-container', 'serial')
    this.container.addEventListener('click', event => this.handleClickEvent(event))
  }

  /**
   * @param {MouseEvent} event Event from the event handler
   */
  handleClickEvent(event) {
    const node = event.target.closest('[data-action]')
    if (!node) { return }
    if (node.dataset.action === 'add' || node.dataset.action === 'edit') {
      const obj = {}
      if (node.dataset.action === 'edit') {
        for (let cell = node.firstElementChild; cell; cell = cell.nextElementSibling) {
          if (!cell.dataset.name) { continue }
          obj[cell.dataset.name] = cell.dataset.data
        }
      }
      return this._addEditFromRender(node, obj)
    }
  }

  /**
   * @param {Function} callback Callback that return a Promise<[key, value]>.
   */
  setDataCallback(callback) {
    this.dataCallback = callback
  }

  /**
   * @param {Function} callback 
   */
  setSortCallback(callback) {
    this.sortCallback = callback
  }


  _addEditFromRender(node, content = {}) {
    const addEditForm = document.createElement('FORM')
    addEditForm.classList.add('floating-form', 'serial-form', 'serial-form-add-edit')
    addEditForm.style.visibility = 'hidden'
    addEditForm.dataset.id = node.dataset.id
    for (const key in this.headers) {
      const label = document.createElement('LABEL')
      label.classList.add('serial-form-item')
      label.innerHTML = `${this.translation[key]}`
      const input = document.createElement('INPUT')
      input.name = key
      if (content[key]) {
        input.value = content[key]
      }
      label.appendChild(input)
      addEditForm.appendChild(label)
    }

    l10n.load({
      add: 'Ajouter',
      edit: 'Modifier',
      delete: 'Supprimer',
      cancel: 'Annuler'
    })
      .then(tr => {
        const action = document.createElement('DIV')
        action.innerHTML = `
          ${node.dataset.action === 'edit' ? `<button value="edit">${tr.edit}</button>` : `<button value="add">${tr.add}</button>`}
          ${node.dataset.action === 'edit' ? `<button value="delete">${tr.delete}</button>` : ''}
          <button type="reset">${tr.cancel}</button>
        `
        addEditForm.appendChild(action)
        addEditForm.addEventListener('submit', event => {
          event.preventDefault()
          const actionType = event.submitter.value
          const data = new FormData(event.currentTarget)
          const formNode = event.currentTarget
          this.dataCallback([...data.entries()])
            .then(values => {
              switch (actionType) {
                case 'add': {
                  const row = Object.fromEntries(values)
                  row._state = 'created'
                  this._insertNewRow(row)
                }
                  break
                case 'edit': {
                  const row = Object.fromEntries(values)
                  row._state = 'modified'
                  row._id = formNode.dataset.id
                  this._modifyRow(row)
                }
                  break
                case 'delete': {
                  const row = Object.fromEntries(values)
                  row._state = 'modified'
                  row._id = formNode.dataset.id
                  this._deleteRow(row)

                }
                  break
              }
              this.context.events.emit('close')
            })

        })
        addEditForm.addEventListener('reset', event => {
          event.preventDefault()
          this.context.events.emit('close')
        })

        this.context.events.on('close', _ => window.requestAnimationFrame(() => addEditForm.remove()))
        new Promise(resolve => {
          window.requestAnimationFrame(() => {
            document.body.appendChild(addEditForm)
            resolve()
          })
        }).then(_ => {
          Placement.place(node, addEditForm)
        })
      })
  }

  _modifyRow(row) {
    const rowNode = this.container.querySelector(`[data-id="${row._id}"]`)
    for (let cell = rowNode.firstElementChild; cell; cell = cell.nextElementSibling) {
      if (!cell.dataset.name) { continue }
      cell.innerHTML = SchemaModel.toString(row[cell.dataset.name])
      cell.dataset.data = row[cell.dataset.name]
    }
    rowNode.dataset.state = 'modified'
  }

  _deleteRow(row) {
    const rowNode = this.container.querySelector(`[data-id="${row._id}"]`)
    window.requestAnimationFrame(() => rowNode.style.display = 'none')
    rowNode.dataset.state = 'deleted'
  }

  _insertNewRow(row) {
    const nodes = this.container.querySelectorAll('[data-order]')
    let inserted = false;
    const rowNode = this._renderRow(row)
    for (let i = 0; i < nodes.length; i++) {
      const c = { _order: nodes[i].dataset.order }
      if (this.sortCallback(c, row) < 0) {
        window.requestAnimationFrame(() => this.container.insertBefore(rowNode, nodes[i]))
        inserted = true
        break
      }
    }
    if (!inserted) {
      window.requestAnimationFrame(() => this.container.appendChild(this._renderRow(row)))
    }
  }

  /**
   * @param {object|array} data Data of the list
   */
  setData(data) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      data = [data]
    }

    data.sort((a, b) => a.order - b.order)
    this.data = data
  }

  getValues() {
    return Serial._getValues(this.container.querySelectorAll('[data-id]'))
  }

  static _getValues(nodes) {
    const values = {
      created: [],
      deleted: [],
      modified: []
    }
    for (let i = 0; i < nodes.length; i++) {
      if (!values[nodes[i].dataset.state]) { continue; }
      const obj = {
        _id: nodes[i].dataset.id ?? '',
        _order: nodes[i].dataset.order ?? ''
      }
      for (let cell = nodes[i].firstElementChild; cell; cell = cell.nextElementSibling) {
        if (!cell.dataset.name) { continue }
        obj[cell.dataset.name] = cell.dataset.data ?? ''
      }
      values[nodes[i].dataset.state].push(obj)
    }
    return values
  }

  static getFormValue(form) {
    return Serial._getValues(form.querySelectorAll('[data-id]'))
  }

  /**
   * @param {object} row A row
   * @return {HTMLElement}
   */
  _renderRow(row) {
    const rowNode = document.createElement('TR')
    rowNode.dataset.state = row._state ?? ''
    rowNode.dataset.order = row._order ?? '0'
    rowNode.dataset.id = row._id ?? ''
    rowNode.dataset.action = 'edit'
    for (const key in this.headers) {
      const cell = document.createElement('TD')
      if (row[key]) {
        cell.dataset.name = key
        cell.dataset.data = row[key]
        cell.innerHTML = SchemaModel.toString(row[key])
      }
      rowNode.appendChild(cell)
    }
    return rowNode
  }

  render() {
    return new Promise((resolve, reject) => {
      l10n.load(
        Object.assign(
          {
            _addRowStr: 'Ajouter'
          },
          this.headers)
      )
        .then(tr => {
          Object.assign(this.translation, tr)
          let rowMaxSpan = 0

          /* header row */
          const row = document.createElement('TR')
          for (const key in this.headers) {
            rowMaxSpan++
            const cell = document.createElement('TH')
            cell.innerHTML = SchemaModel.toString(tr[key])
            row.appendChild(cell)
          }
          this.container.appendChild(row)

          const addRow = document.createElement('TR')
          addRow.dataset.action = 'add'
          addRow.innerHTML = `<td colspan="${rowMaxSpan}">${tr._addRowStr}</td>`
          if (this.options.position === 'top') {
            this.container.appendChild(addRow)
          }

          if (this.data) {
            this.data.forEach(row => {
              this.container.appendChild(this._renderRow(row))
            })
          }

          if (this.options.position !== 'top') {
            this.container.appendChild(addRow)
          }
          resolve(this.container)
        })
    })
  }
}
