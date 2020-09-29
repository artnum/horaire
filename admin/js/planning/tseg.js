function TSeg (args) {
    this.data = {}
    this.saved = false
    this.deleted = false
    this.accessed = 0
    for (let k in args) {
      this.data[k] = args[k]
    }
    this.modified = performance.now()
  }
  
  TSeg.prototype.lock = function () {
    this.locked = true
  }
  
  TSeg.prototype.unlock = function () {
    this.locked = false
  }
  
  TSeg.prototype.fromObject = function (o) {
    if (o.id) {
      this.data.dbId = o.id
    }
    this.data.id = this.domId()
  
    if (o.date) {
      this.data.date = o.date
    }
    if (o.travail) {
      this.data.travail = `Travail/${o.travail}`
    }
    if (o.person) {
      this.data.person = `Person/${o.person}`
    }
    if (o.time) {
      this.data.time = parseFloat(o.time)
    }
    if (o.efficiency) {
      this.data.efficiency = parseFloat(o.efficiency)
    }
    if (o.color) {
      this.data.color = o.color
    }
    this.saved = true
  
    return this
  }
  
  TSeg.prototype.duplicate = function () {
    let newTseg = this.toObject()
    newTseg.deleted = false
    newTseg.saved = false
    newTseg.locked = false
    newTseg.id = null
    return (new TSeg()).fromObject(newTseg)
  }
  
  TSeg.prototype.toObject = function () {
    let o = {}
    if (this.data.dbId !== null) { o.id = this.data.dbId }
    if (this.data.date) { o.date = this.data.date }
    if (this.data.person) {
      o.person = this.data.person.split('/')[1]
    }
    if (this.data.travail) {
      o.travail = this.data.travail.split('/')[1]
    }
    if (this.data.time) {
      o.time = this.data.time
    }
    if (this.data.color) {
      o.color = this.data.color
    }
    if (this.data.efficiency) {
      o.efficiency = this.data.efficiency
    }
    return o
  }
  
  TSeg.prototype.toJson = function () {
    return JSON.stringify(this.toObject())
  }
  
  TSeg.prototype.set = function (prop, val) {
    this.data[prop] = val
    this.modified = performance.now()
    this.saved = false
  }
  
  TSeg.prototype.get = function (prop) {
    this.accessed = performance.now()
    return this.data[prop]
  }
  
  TSeg.prototype.delete = function () {
    this.deleted = performance.now()
  }

  TSeg.prototype.refresh = function (tseg) {
      // nothing to do yet
  }
  
  /* commit return true if tseg must be kept and false if not */
  TSeg.prototype.commit = function () {
    return new Promise((resolve, reject) => {
      if (this.deleted && this.data.dbId) {
        fetch(RelURL(`TSeg/${this.data.dbId}`), {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}, method: 'DELETE'})
          .then((response) => {
            resolve(false) // handle error later
          })
      } else if (this.deleted && !this.data.dbId) {
        resolve(false)
      } else if (this.saved && this.data.dbId) {
        resolve(true) // is saved
      } else if (!this.saved && this.data.dbId) {
        fetch(RelURL(`TSeg/${this.data.dbId}`),
              {credential: 'include',
               headers: {'X-Request-Id': new Date().getTime()},
               method: 'PUT',
               body: this.toJson()}).then((response) => {
                 if (response.ok) {
                   response.json().then((data) => {
                     this.saved = true
                     resolve(true)
                   })
                 } else {
                   resolve(false)
                 }
               })
      } else if (!this.saved && !this.data.dbId) {
        fetch(RelURL(`TSeg`),
              {credential: 'include',
               headers: {'X-Request-Id': new Date().getTime()},
               method: 'POST',
               body: this.toJson()}).then((response) => {
                if (response.ok) {
                  response.json().then((data) => {
                    this.saved = true
                    this.data.dbId = data.data[0].id
                    resolve(true)
                  })
                } else {
                  resolve(false)
                }
              })
      }
    })
  }
  
  TSeg.prototype.domId = function () {
    if (this.data.dbId === undefined) {
      this.data.id = KAAL.domId()
    } else {
      this.data.id = `tseg-${this.data.dbId}`
    }
    return this.data.id
  }
  
  TSeg.prototype.removeDom = function () {
    if (this.data.domNode) {
      let d = this.data.domNode
      delete this.data.domNode
      window.requestAnimationFrame(() => {
        if (d.parentNode) {
          d.parentNode.removeChild(d)
        }
      })
    }
  }
  
  TSeg.prototype.newDom = function (maxTime) {
    let subnode = document.createElement('DIV')
    this.removeDom()
    let height = this.data.time * 100 / KAAL.work.getDay()
    subnode.id = this.domId()
    subnode.classList.add('travailMark')
    subnode.style.backgroundColor = this.data.color
    subnode.style.maxHeight = `calc(${height}% - 4px)`
    subnode.style.minHeight = `calc(${height}% - 4px)`
    subnode.style.height = `calc(${height}% - 4px)`
    subnode.innerHTML = `${this.data.time / 3600}`
    subnode.setAttribute('draggable', 'true')
    subnode.dataset.travail = this.data.travail
  
    this.data.domNode = subnode
    this.data.domNode.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('application/segment-id', this.get('id'))
      let node = event.target
      for (; node && node.nodeName !== 'DIV'; node = node.parentNode) ;
      node.dataset.dragging = '1'
    })
    this.data.domNode.addEventListener('dragend', (event) => {
      let node = event.target
      for (; node && node.nodeName !== 'DIV'; node = node.parentNode) ;
      delete node.dataset.dragging
    })
    return this.data.domNode
  }