/* eslint-env browser */
/* global Artnum, STCategory */
var Item = function (DisplayNode) {
  this.Items = {}
  this.STCategory = new STCategory('Category')
  this.CategoryBuffer = {}
  this.TBody = {}
  if (DisplayNode) {
    if (typeof DisplayNode === 'string') {
      if (document.getElementById(DisplayNode)) {
        this.DisplayNode = document.getElementById(DisplayNode)
      } else {
        this.DisplayNode = document.body
      }
    } else {
      this.DisplayNode = DisplayNode
    }
  } else {
    this.DisplayNode = document.body
  }
}

Item.prototype.load = function (id) {
  return new Promise((resolve, reject) => {
    let url = 'Item'
    if (id) {
      url = `Item/${id}`
    }
    Artnum.Query.exec(Artnum.Path.url(url, {params: {'search.deleted': '-'}})).then((result) => {
      if (result.success) {
        if (!Array.isArray(result.data)) {
          result.data = [result.data]
        }
        for (let i = 0; i < result.length; i++) {
          let item = result.data[i]
          if (this.Items[item.id]) {
            this.Items[item.id] = Object.assign(this.Items[item.id], {data: item, updated: performance.now()})
          } else {
            this.Items[item.id] = {
              data: item,
              updated: performance.now(),
              displayed: 0
            }
          }
        }
        resolve(this)
      } else {
        reject(new Error('Impossible de charger les données'))
      }
    })
  })
}

Item.prototype.display = async function () {
  console.log('this', this)
  for (let k in this.Items) {
    if (this.Items[k].displayed > this.Items[k].updated) { continue }
    let item = Object.assign({}, this.Items[k].data)
    for (let attr in item) {
      if (!item[attr]) {
        item[attr] = ''
      }
    }
    let category = ''
    let catid = ''
    if (item.category !== null && !this.CategoryBuffer[item.category]) {
      let c = await this.STCategory.get(item.category)
      if (c) {
        this.CategoryBuffer[item.category] = c
        category = this.CategoryBuffer[item.category].name
      }
      catid = `category-${item.category}`
    } else if (item.category !== null) {
      category = this.CategoryBuffer[item.category].name
      catid = `category-${item.category}`
    } else {
      catid = `category-none`
    }

    let tbody = this.TBody[catid]
    if (!tbody) {
      tbody = document.createElement('TBODY')
      tbody.setAttribute('id', catid)
      tbody.innerHTML = `<tr data-header="1"><th colspan="5">${category ? category : '---'}</th></tr>`
      this.TBody[catid] = tbody
      window.requestAnimationFrame(() => this.DisplayNode.appendChild(tbody))
    }

    let div = document.createElement('TR')
    div.setAttribute('id', `item-${item.id}`)
    div.innerHTML = `<td class="reference">${item.reference}</td><td class="name">${item.name}</td><td class="description">${item.description}</td><td class="price">${item.price}</td><td class="unit">${item.unit}</td>`

    let n = tbody.firstElementChild
    for (; n; n = n.nextElementSibling) {
      if (n.id === div.id) {
        window.requestAnimationFrame(() => tbody.replaceChild(div, n))
        break
      }
    }
    if (!n) {
      window.requestAnimationFrame(() => tbody.appendChild(div))
    }
  }
}

Item.prototype.exists = function (name) {
  return new Promise((resolve, reject) => {
    if (!name) { resolve(false) }
    if (name === '') { resolve(true) }
  })
}

Item.prototype.write = function (id, options) {
  return new Promise((resolve, reject) => {
    let item = {}
    let method = 'POST'
    let url = 'Item'

    if (id) {
      method = 'PATCH'
      item = Object.assign({}, options)
      item.id = id
      url = `Item/${item.id}`
      if (options.name && options.name === '') {
        reject(new Error('Nécessite un nom'))
        return
      }
    } else {
      item = Object.assign({
        reference: '',
        name: '',
        description: '',
        unit: 'pce',
        price: 0,
        details: '',
        category: null}, options)
      if (item.name === '') {
        reject(new Error('Nécessite un nom'))
        return
      }
    }
    if (typeof item.details === 'object') {
      item.details = JSON.stringify(item.details)
    }

    Artnum.Query.exec(Artnum.Path.url(url), {method: method, body: item}).then((result) => {
      console.log(this)
      if (result.success && result.length > 0) {
        resolve([result.data[0].id, this])
      }
    })
  })
}

window.onload = async function (event) {
  window.Item = new Item('items')
  var t = new Artnum.DTable({table: 'items', sortOnly: true})
  window.Item.load().then((Item) => {
    Item.display()
    console.log(Item)
    Item.write(1, {name: 'Tounch', reference: 'Rounche'}).then(([id, Item]) => {
      Item.load(id).then((item) => { item.display() })
    })
  })
}
