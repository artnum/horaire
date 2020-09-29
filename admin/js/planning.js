/* eslint-env browser */
Date.prototype.getWeekNumber = function () {
  let d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()))
  let dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

Date.getStartISOWeek = function (w, y) {
  let simple = new Date(y, 0, 1 + (w - 1) * 7)
  let dow = simple.getDay()
  let ISOweekStart = simple
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  }
  return ISOweekStart
}

function RelURL (url) {
  let path = String(window.location.pathname).split('/')
  let component
  while ((component = path.shift()) === '') ;
  return new URL(`${window.location.origin}/${component}/${url}`)
}

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

function Planning (options) {
  this.views = {
    planning: document.getElementById('rightPane'),
    project: document.getElementById('leftPane')
  }
  this.TSeg = {
  }
  this.TSegByTravail = {
  }
  this.domIdCount = 0
  this.options = options
  this.stepColor = 27.5
  this.currentColor = 0
  this.currentLight = 50
  this.currentSaturation = 100
  this.stepSaturation = 20
  this.stepLight = 30
  this.Days = 7
  this.HoursPerDay = 8.5 * 60 * 60 // day work is 8h30
  this.Tolerance = 15 * 80 // below 15 minutes left in day, consider it full
  this.Users = {data: [], store: options.users}
  this.Travaux = {data: [], store: options.travaux}
  if (options.week) {
    this.Week = options.week
  } else {
    this.Week = new Date().getWeekNumber()
    this.Year = new Date().getFullYear()
  }
  this.installUI()
  this.boxSize = `calc(((100% - 120px) / ${this.Days}) - 1px)`
}

Planning.prototype.PBar = function () {
  let div = document.createElement('DIV')
  div.id = 'PBar'
  let i = document.createElement('input')
  let s = new Select(i, new STProject('Project'))

  s.addEventListener('change', (event) => {
    fetch(RelURL(`Travail/.unplanned/?search.project=${event.value}`),
          {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}}).then(
            (response) => {
              if (response.ok) {
                response.json().then((result) => {
                  this.displayTravail(result.data)
                })
              }
            })
  })
  
  this.views.project.addEventListener('dragover', event => {
    if (!event.dataTransfer.getData('application/segment-id')) { return }
    event.preventDefault()
    event.target.style.backgroundColor = 'red'
  })


  this.views.project.addEventListener('drop', event => {
    if (!event.dataTransfer.getData('application/segment-id')) { return }
    let tseg = this.getTSegById(event.dataTransfer.getData('application/segment-id'))
    this.getRelatedTSegs(tseg).forEach(tseg => {
      this.deleteTSeg(tseg)
    })

  })

  div.appendChild(i)
  this.views.project.parentNode.insertBefore(div, this.views.project)
}

Planning.prototype.zoom = function (nDay) {
  if (this.TSegTimeout) {
    clearTimeout(this.TSegTimeout)
  }
  if (nDay < 0 && this.Days > 3) {
    this.Days += nDay
  } else if (nDay > 0 && this.Days < 180) {
    this.Days += nDay
  }
  this.boxSize = `calc(((100% - 124px) / ${this.Days}) - 1px)`
  this.TSegTimeout = setTimeout(() => {
    this.loadTSeg().then(() => {
      this.TSegTimeout = null
    })
  }, 250)
  this.draw()
}

Planning.prototype.installUI = function () {
  this.PBar()
  this.views.planning.addEventListener('wheel', event => {
    if (event.ctrlKey) {
      event.preventDefault()
      if (event.deltaY < 0) {
        this.zoom(-1)
      } else {
        this.zoom(1)
      }
    }
  })
}

Planning.prototype.nodeFullness = function (node) {
  if (!node) { return 0 }
  if (!node.dataset) { return 0 }
  if (!node.dataset.fullness) { return 0 }
  if (isNaN(parseFloat(node.dataset.fullness))) { return 0 }
  return parseFloat(node.dataset.fullness)
}

Planning.prototype.nodeAddTime = function (node, time) {
  if (!node) { return }
  if (!node.dataset) { return }
  node.dataset.fullness = this.nodeFullness(node) + time
}

Planning.prototype.nodeRemoveTime = function (node, time) {
  if (!node) { return }
  if (!node.dataset) { return }
  node.dataset.fullness = this.nodeFullness(node) - time
}

Planning.prototype.loadStore = function (what, search = {}) {
  return new Promise((resolve, reject) => {
    this[what].store.get(null, search).then((objects) => {
      objects.forEach((object) => {
        let loaded = false
        for (let i = 0; i < this[what].data.length; i++) {
          object._new = true
          object._fresh = new Date().getTime()
          if (this[what].data[i].id === object.id) {
            this[what].data[i] = object
            this[what].data[i]._new = false
            loaded = true
            break
          }
        }
        if (!loaded) {
          this[what].data.push(object)
        }
      })
      resolve()
    })
  })
}

Planning.prototype.newDomId = function () {
  let pid = `pid-${performance.now()}`
  while (document.getElementById(pid)) {
    pid = `pid-${performance.now()}`
  }
  return pid
}

Planning.prototype.tsegDrop = function (event) {
  event.preventDefault()
  let pNode = event.target
  let dNode = event.target
  for (; pNode && !pNode.dataset.efficiency; pNode = pNode.parentNode) ;
  if (!pNode) { return }
  for (; dNode && !dNode.dataset.date; dNode = dNode.parentNode) ;
  if (!dNode) { return }

  let tseg = this.getTSegById(event.dataTransfer.getData('application/segment-id'))
  let tsegs = this.getTSegsByAttribute('travail', tseg.get('travail'))
  let totalTime = 0
  let totalPeople = 0
  let peopleList = []
  for (let tseg of tsegs) {
    if (peopleList.indexOf(tseg.get('person')) === -1) {
      totalPeople++
      peopleList.push(tseg.get('person'))
    }
    totalTime += tseg.get('time') * tseg.get('efficiency')
  }
  if (event.shiftKey) {
    /* add people on the task */
  } else {
    let efficiency = parseFloat(pNode.dataset.efficiency)
    totalTime = totalTime / efficiency
    /* move the task */
    for (let tseg of tsegs) {
      if (totalTime <= 0) {
        this.deleteTSeg(tseg)
      } else {
        let oldDate = tseg.get('date')
        let oldPerson = tseg.get('person')
        let oldTime = tseg.get('time')
        tseg.set('person', pNode.id)
        tseg.set('date', dNode.dataset.date.split('T')[0])
        tseg.set('efficiency', efficiency)
        let nHours = this.HoursPerDay - this.nodeFullness(dNode)
        totalTime -= nHours
        tseg.set('time', totalTime < 0 ? totalTime + nHours : nHours)
        this.moveTSeg(tseg, oldPerson, oldDate, oldTime)
      }
      while (dNode && dNode.classList.contains('weekend')) {
        dNode = dNode.nextElementSibling
      }
    }

    while (totalTime > 0) {
      let oTseg = tsegs[tsegs.length - 1].duplicate()
      let nHours = this.HoursPerDay - this.nodeFullness(dNode)
      totalTime -= nHours
      oTseg.set('date', dNode.dataset.date.split('T')[0])
      oTseg.set('time', totalTime < 0 ? totalTime + nHours : nHours)
      oTseg.set('efficiency', efficiency)
      this.addTSeg(oTseg)
      do {
        dNode = dNode.nextElementSibling
      } while (dNode && dNode.classList.contains('weekend'))
    }
  }
}

Planning.prototype.tsegDragOver = function (event) {
  event.preventDefault()
  let tsegid = event.dataTransfer.getData('application/segment-id')
  let tseg = this.getTSegById(tsegid)
  if (tseg) {
    let node = event.target
    for (; node && !node.classList.contains('box'); node = node.parentNode) ;

    node.dataset.dragover = true
    node.style.backgroundColor = tseg.get('domNode').style.backgroundColor
  }
}

Planning.prototype.getTSegsByAttribute = function (attr, value) {
  let tsegs = []
  for (let k in this.TSeg) {
    for (let i in this.TSeg[k]) {
      if (this.TSeg[k][i].get(attr) === value) {
        tsegs.push(this.TSeg[k][i])
      }
    }
  }
  return tsegs
}

/* get tsegs from same travail */
Planning.prototype.getRelatedTSegs = function (tseg) {
  if (!tseg) { return [] }
  if (!tseg.data) { return [] }
  if (!tseg.data.travail) { return [] }
  if (!this.TSegByTravail[tseg.data.travail]) { return [] }
  return this.TSegByTravail[tseg.data.travail]
}

Planning.prototype.getTSegById = function (tsegid) {
  for (let k in this.TSeg) {
    for (let i in this.TSeg[k]) {
      if (this.TSeg[k][i].get('id') === tsegid) {
        return this.TSeg[k][i]
      }
    }
  }
  return undefined
}

Planning.prototype.draw = function () {
  return new Promise((resolve, reject) => {
    let days = this.Days ? this.Days : 7
    let header = document.createElement('DIV')
    header.id = 'planingHeader'
    header.classList.add('line', 'header')
    for (let i = 0; i <= days; i++) {
      let col = document.createElement('div')
      if (i === 0) {
        col.id = 'header+head'
        col.innerHTML = `Semain n°<span class="number">${this.Week}</span>`
      } else {
        let x = new Date(Date.getStartISOWeek(this.Week, this.Year).getTime() + ((i - 1) * 86400000))
        x.setHours(12, 0, 0)
        col.id = `header+day-${x.toISOString()}`
        col.innerHTML = `<span class="date">${x.fullDate()}</span>`
        if (x.getDay() === 0 || x.getDay() === 6) {
          col.classList.add('weekend')
        }
        col.style.width = this.boxSize
        col.classList.add('day')
      }
      col.classList.add('box')
      header.appendChild(col)
    }
    window.requestAnimationFrame(() => {
      if (document.getElementById(header.id)) {
        document.getElementById(header.id).parentNode.replaceChild(header, document.getElementById(header.id))
      } else {
        this.views.planning.insertBefore(header, this.views.planning.firstChild)
      }
    })

    this.Users.data.forEach((user) => {
      if (isNaN(parseFloat(user.efficiency)) || parseFloat(user.efficiency) <= 0) { return }
      let div = document.createElement('DIV')
      div.dataset.efficiency = parseFloat(user.efficiency)
      div.id = `Person/${user.id}`
      div.classList.add('line')
      for (let i = 0; i <= days; i++) {
        let subDiv = document.createElement('DIV')
        if (i === 0) {
          subDiv.id = `${div.id}+head`
          subDiv.classList.add('user')
          subDiv.innerHTML = `<span class="name">${user.name}</span>`
        } else {
          let x = new Date(Date.getStartISOWeek(this.Week, this.Year).getTime() + ((i - 1) * 86400000))
          x.setHours(12, 0, 0)
          subDiv.id = `${div.id}+${x.toISOString().split('T')[0]}`
          subDiv.dataset.date = x.toISOString()
          if (x.getDay() === 0 || x.getDay() === 6) {
            subDiv.classList.add('weekend')
          }
          subDiv.classList.add('day')
          subDiv.style.width = this.boxSize
          if (this.TSeg[subDiv.id]) {
            this.TSeg[subDiv.id].forEach((tseg) => {
              if (tseg.domNode) {
                subDiv.appendChild(tseg.domNode)
                this.nodeAddTime(subDiv, tseg.get('time'))
              } else {
                subDiv.appendChild(tseg.newDom(this.HoursPerDay))
                this.nodeAddTime(subDiv, tseg.get('time'))
              }
            })
          }
        }
        subDiv.classList.add('box')
        subDiv.addEventListener('dragover', (event) => {
          let node = event.target
          while (node && (node.nodeName !== 'DIV' || node.classList.contains('travailMark'))) { node = node.parentNode }
          if (node.classList.contains('user')) { node = node.nextElementSibling }
          let parent = node
          while (!parent.dataset.efficiency) { parent = parent.parentNode }

          let days = 0
          let bgcolor = event.dataTransfer.getData('drag/css-color') || 'red'

          if (event.dataTransfer.getData('application/travail-id')) {
            let tNode = document.getElementById(event.dataTransfer.getData('application/travail-id'))
            if (!tNode) { return }
            days = ((parseFloat(tNode.dataset.time) / this.HoursPerDay) * parseFloat(tNode.dataset.force)) / parseFloat(parent.dataset.efficiency)
          } else if (event.dataTransfer.getData('application/segment-id')) {
            let tsegs
            let tseg = this.getTSegById(event.dataTransfer.getData('application/segment-id'))
            if (!tseg) { return }
            tsegs = this.getTSegsByAttribute('travail', tseg.get('travail'))
            days = 0
            if (tsegs.length <= 0) { return }
            let people = 1
            if (event.shiftKey) {
              let p = []
              for (let tseg of tsegs) {
                if (p.indexOf(tseg.get('person')) === -1) {
                  people++
                  p.push(tseg.get('person'))
                }
              }
            }
            for (let tseg of tsegs) {
              bgcolor = tseg.get('domNode').style.backgroundColor
              let currentEfficiency = parseFloat(parent.dataset.efficiency)
              let time = tseg.get('time') * tseg.get('efficiency')
              days += (time / people) / currentEfficiency / this.HoursPerDay
            }
          } else {
            return
          }
          event.preventDefault()

          if (node.classList.contains('weekend')) {
            let realNode = node
            if (realNode.previousElementSibling &&
                !realNode.previousElementSibling.classList.contains('weekend')) {
              node = realNode.previousElementSibling
            } else if (realNode.nextElementSibling &&
                       !realNode.nextElementSibling.classList.contains('weekend')) {
              node = realNode.nextElementSibling
            } else {
              while (realNode && realNode.classList.contains('weekend')) { realNode = realNode.previousElementSibling }
              if (!realNode) {
                while (realNode && realNode.classList.contains('weekend')) { realNode = realNode.nextElementSibling }
              }
              if (!realNode) { return }
              node = realNode
            }
          }

          while (node && this.nodeFullness(node) >= this.HoursPerDay) { node = node.nextElementSibling }
          if (!node) { return }

          while (days > 0 && node) {
            if (node.classList.contains('weekend')) {
              node = node.nextElementSibling
              continue
            }
            let fullness = this.nodeFullness(node)
            if (fullness < this.HoursPerDay) {
              let s = node
              window.requestAnimationFrame(() => {
                s.style.backgroundColor = bgcolor
              })
              node.dataset.dragover = '1'
              days -= (1 - (1 * fullness / this.HoursPerDay))
              if (days < (this.Tolerance / this.HoursPerDay) && days > 0) {
                console.log('Cross tolerance limit', days, this.Tolerance / this.HoursPerDay)
                days = this.Tolerance / this.HoursPerDay
              }
            }
            node = node.nextElementSibling
          }
          if (days > 0) {
            this.zoom(Math.ceil(days))
          }
        })
        subDiv.addEventListener('dragleave', (event) => {
          let node = event.target
          while (node && (!node.classList || !node.classList.contains('line'))) { node = node.parentNode }
          node = node.firstElementChild
          while (node) {
            let n = node
            if (n.dataset.dragover) {
              delete node.dataset.dragover
              window.requestAnimationFrame(() => {
                n.style.backgroundColor = ''
              })
            }
            node = node.nextElementSibling
          }
        })
        subDiv.addEventListener('drop', (event) => {
          if (event.dataTransfer.getData('application/segment-id')) {
            return this.tsegDrop(event)
          }
          let node = event.target
          while (node.nodeName !== 'DIV') { node = node.parentNode }
          let transfer = event.dataTransfer.getData('application/travail-id')
          if (!transfer) { return }
          event.preventDefault()
          let bgcolor = event.dataTransfer.getData('drag/css-color')

          /* Prepare color */
          this.nextColor()

          let tNode = document.getElementById(transfer)
          if (!tNode) { return }
          while (node && !node.classList.contains('line')) { node = node.parentNode }
          let totalTime = parseFloat(tNode.dataset.time) * parseFloat(tNode.dataset.force) / parseFloat(node.dataset.efficiency)
          let atEfficiency = parseFloat(node.dataset.efficiency)
          for (node = node.firstElementChild;
               node;
               node = node.nextElementSibling) {
            let n = node
            if (node.dataset.dragover) {
              let nodeHours = this.HoursPerDay - this.nodeFullness(node)
              node.dataset.travail = tNode.dataset.travail
              let nodeTime = totalTime
              if (totalTime > nodeHours) {
                totalTime -= nodeHours
                nodeTime = nodeHours
              }
              let tseg = new TSeg({
                date: node.id.split('+')[1],
                person: node.id.split('+')[0],
                travail: transfer,
                locked: false,
                id: null,
                deleted: false,
                saved: false,
                time: nodeTime,
                color: bgcolor,
                efficiency: atEfficiency
              })
              this.addTSeg(tseg)
            }

            delete node.dataset.dragover
            window.requestAnimationFrame(() => {
              n.style.backgroundColor = ''
            })
          }
          window.requestAnimationFrame(() => {
            tNode.parentNode.removeChild(tNode)
          })
        })
        div.appendChild(subDiv)
      }
      window.requestAnimationFrame(() => {
        if (document.getElementById(div.id)) {
          document.getElementById(div.id).parentNode.replaceChild(div, document.getElementById(div.id))
        } else {
          this.views.planning.appendChild(div)
        }
      })
    })

    this.displayTravail(this.Travaux.data)
  })
}

Planning.prototype.displayTravail = function (travaux) {
  new Promise((resolve, reject) => {
    window.requestAnimationFrame(() => {
      this.views.project.innerHTML = ''
      resolve()
    })
  }).then(() => {
    travaux.forEach((travail) => {
      if (parseFloat(travail.time) === 0 || isNaN(parseFloat(travail.time))) { travail.time = KAAL.work.getDay() }
      if (parseFloat(travail.force) === 0 || isNaN(parseFloat(travail.force))) { travail.force = 1.0 }
    
      let div = document.createElement('DIV')
      div.id = `Travail/${travail.id}`
      div.draggable = true
      div.classList.add('travail')
      div.dataset.travail = travail.id
      div.dataset.time = parseFloat(travail.time)
      div.dataset.force = parseFloat(travail.force)
      div.innerHTML = `<span class="reference">${travail.reference}</span><span class="description">${travail.description}</span><span class="close"><i class="fas fa-times"></i><span>`
      window.requestAnimationFrame(() => {
        this.views.project.appendChild(div)
      })
      div.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/travail-id', event.target.id)
        let node = event.target
        for (; node && !node.classList.contains('travail'); node = node.parentNode) ;
        this.openTravail(node)
      })
      div.addEventListener('click', (event) => {
        let node = event.target
        for (; node && !node.classList.contains('travail'); node = node.parentNode) ;
        this.openTravail(node)
      })
    })
  })
}

Planning.prototype.closeOthers = function (node) {
  for (let s = node.parentNode.firstElementChild; s; s = s.nextElementSibling) {
    if (s !== node) {
      if (s.lastChild && s.lastChild.classList.contains('details')) {
        window.requestAnimationFrame(() => s.removeChild(s.lastChild))
      }
      window.requestAnimationFrame(() => s.classList.remove('selected'))
    }
  }
}

Planning.prototype.openTravail = function (node) {
  fetch(RelURL(`${node.id}`), {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}}).then((response) => {
    if (response.ok) {
      response.json().then((result) => {
        this.closeOthers(node)

        let travailTime = 0
        let defaultTime = false
        if (parseFloat(result.data.time) === 0) {
          travailTime = KAAL.work.getDay('h')
          defaultTime = true
        } else if (parseFloat(result.data.force) === 0.0) {
          travailTime = KAAL.work.getDay('h')
          defaultTime = true
        } else {
          travailTime = parseFloat(result.data.time) / parseFloat(result.data.force) / 3600
        }

        let details = document.createElement('DIV')
        details.classList.add('details')
        details.innerHTML = `<ul>
                                <li><span class="label">Temps</span>${travailTime} h ${defaultTime ? '(valeur par défaut)' : ''}</li>
                                <li><span class="label">Contact</span>${result.data.contact}</li>
                                <li><span class="label">Téléphone</span>${result.data.phone}</li>
                             </ul>`
        window.requestAnimationFrame(() => node.classList.add('selected'))
        if (node.lastChild && node.lastChild.classList.contains('details')) {
          window.requestAnimationFrame(() => node.replaceChild(details, node.lastChild))
        } else {
          window.requestAnimationFrame(() => node.appendChild(details))
        }
      })
    }
  })
}

Planning.prototype.nextColor = function () {
  this.currentColor += 45
  this.currentSaturation -= this.stepSaturation
  this.stepSaturation = -this.stepSaturation
  if (this.currentColor >= 360) {
    this.currentColor = (this.currentColor - 360) + this.stepColor
    this.currentLight -= this.stepLight
    if (this.currentSaturation < this.stepSaturation * 3) {
      this.currentSaturation = 100 - (this.stepSaturation * 0.5)
    }
    this.stepLight = -this.stepLight
  }
}

Planning.prototype.deleteTSeg = function (tseg) {
  this._deleteTSeg(tseg, tseg.get('person'), tseg.get('date'), tseg.get('time'))
  tseg.delete()
  tseg.commit()
}

Planning.prototype.moveTSeg = function (tseg, oldPerson, oldDate, oldTime) {
  this._deleteTSeg(tseg, oldPerson, oldDate, oldTime)
  this.addTSeg(tseg)
}

Planning.prototype._deleteTSeg = function (tseg, oldPerson, oldDate, oldTime) {
  tseg.removeDom()
  let node = document.getElementById(`${oldPerson}+${oldDate}`)
  if (node) {
    this.nodeRemoveTime(node, oldTime)
    if (this.TSeg[node.id]) {
      let found = -1
      for (let i in TSeg[node.id]) {
        if (this.TSeg[node.id][i].get('id') === tseg.get('id')) {
          found = i
          break
        }
      }
      if (found > -1) {
        this.TSeg[node.id].splice(found, 1)
      }
    }
  }
}

Planning.prototype.addTSeg = function (tseg) {
  if (tseg) {
    tseg.commit().then(() => {
      let node = document.getElementById(`${tseg.get('person')}+${tseg.get('date')}`)
      if (node) {
        if (!this.TSeg[node.id]) {
          this.TSeg[node.id] = []
        }

        let found = false
        if (tseg.get('id') !== null) {
          for (let i in this.TSeg[node.id]) {
            if (this.TSeg[node.id][i].get('id') === tseg.get('id')) {
              found = true
              this.TSeg[node.id][i].fromObject(tseg.toObject())
            }
          }
        }
        if (!tseg.data.domNode) {
          let node = document.getElementById(tseg.data.id)
          if (node) {
            tseg.data.domNode = node
          }
        }
        let segDom
        if (found) {
          segDom = tseg.data.domNode
        } else {
          this.TSeg[node.id].push(tseg)
          if(!this.TSegByTravail[tseg.data.travail]) {
            this.TSegByTravail[tseg.data.travail] = []
          }
          this.TSegByTravail[tseg.data.travail].push(tseg)
          this.nodeAddTime(node, tseg.get('time'))

          segDom = tseg.newDom()
          window.requestAnimationFrame(() => {
            node.appendChild(segDom)
          })
        }
        if (!segDom) { return }

        segDom.addEventListener('mouseover', event => {
          window.requestAnimationFrame(() => {
            event.target.style.backgroundColor = 'green'
          })
          if (this.TSegByTravail[event.target.dataset.travail]) {
            this.TSegByTravail[event.target.dataset.travail].forEach(tseg => {
              window.requestAnimationFrame(() => tseg.data.domNode.style.backgroundColor = 'green')
            })
          }
        })
        segDom.addEventListener('mouseout', event => {
          window.requestAnimationFrame(() => {
            event.target.style.backgroundColor = ''
            if (this.TSegByTravail[event.target.dataset.travail]) {
              this.TSegByTravail[event.target.dataset.travail].forEach(tseg => {
                window.requestAnimationFrame(() => tseg.data.domNode.style.backgroundColor = '')
              })
            }
          })
        })
      }
    })
  }
}

Planning.prototype.save = async function () {
  let sleep = function (ms) {
    return new Promise((resolve, reject) => setTimeout(resolve(), ms))
  }

  for (let k in this.TSeg) {
    let tsegArray = []
    for (let i in this.TSeg[k]) {
      if (await this.TSeg[k][i].commit()) {
        tsegArray.push(this.TSeg[k][i])
      }
    }
    this.TSeg[k] = tsegArray
    sleep(5) // give time for browser to do something else
  }

  setTimeout(this.save.bind(this), 1000)
}

Planning.prototype.getTSegByTravail = function (tid) {
  return new Promise((resolve, reject) => {
    let URL = RelURL('TSeg')
    URL.searchParams.append('search.travail', `${tid}`)
    fetch(URL, {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}})
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
      })
      .then((json) => {
        for (let i = 0; i < json.length; i++) {
          let tseg = new TSeg()
          tseg.fromObject(json.data[i])
          this.addTSeg(tseg)
        }
        resolve()
      })
  })
}

Planning.prototype.loadTSeg = function () {
  return new Promise((resolve, reject) => {
    let begin = new Date(Date.getStartISOWeek(this.Week, this.Year).getTime())
    begin.setHours(12)
    let end = new Date(Date.getStartISOWeek(this.Week, this.Year).getTime() + ((this.Days - 1) * 86400000))
    end.setHours(12)
    let URL = RelURL('TSeg')
    URL.searchParams.append('search.date', `>=${begin.toISOString().split('T')[0]}`)
    URL.searchParams.append('search.date', `<=${end.toISOString().split('T')[0]}`)
    fetch(URL, {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}})
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
      })
      .then((json) => {
        for (let i = 0; i < json.length; i++) {
          let tseg = new TSeg()
          tseg.fromObject(json.data[i])
          this.addTSeg(tseg)
        }
        resolve()
      })
  })
}

Planning.prototype.run = async function () {
  await this.loadStore('Users', {deleted: '-', disabled: '0'})
  await this.loadStore('Travaux', {closed: '0'})
  setTimeout(this.save.bind(this), 1000)
  this.draw()
  this.loadTSeg()
}

function Store (store) {
  this.Store = store
}

Store.prototype.get = function (id = null, search = {}) {
  return new Promise((resolve, reject) => {
    let url
    if (id) {
      url = RelURL(`${this.store}/${id}`)
    } else {
      url = RelURL(this.Store)
    }
    for (let s in search) {
      url.searchParams.append(`search.${s}`, search[s])
    }
    fetch(url, {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}}).then((response) => {
      if (!response.ok) { reject(new Error('CANT GET FROM STORE')) } else {
        response.json().then((result) => {
          if (result.success) {
            resolve(result.data ? result.data : [])
          }
        })
      }
    })
  })
}

window.addEventListener('load', (event) => {
  let p = new Planning({
    days: 7,
    users: new Store('Person'),
    travaux: new Store('Travail/.unplanned'),
    tseg: new Store('TSeg')
  })

  p.run()
})
