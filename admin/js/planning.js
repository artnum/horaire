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

function Planning (options) {
  this.views = {
    planning: document.getElementById('rightPane'),
    project: document.getElementById('leftPane')
  }
  this.Travaux = {
  }
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

Planning.prototype.zoom = function (nDay) {
  if (nDay < 0 && this.Days > 3) {
    this.Days += nDay
  } else if (nDay > 0 && this.Days < 180) {
    this.Days += nDay
  }
  this.boxSize = `calc(((100% - 124px) / ${this.Days}) - 1px)`
  this.draw()
}

Planning.prototype.installUI = function () {
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
  let fullness = parseFloat(node.dataset.fullness)
  if (fullness * this.HoursPerDay / 100 >= this.HoursPerDay - this.Tolerance) { return 100 }
  return fullness
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
          subDiv.id = `${div.id}+${x.toISOString().split('T')[0]}`
          subDiv.dataset.date = x.toISOString()
          if (x.getDay() === 0 || x.getDay() === 6) {
            subDiv.classList.add('weekend')
          }
          subDiv.classList.add('day')
          subDiv.style.width = this.boxSize
          if (this.Travaux[subDiv.id]) {
            let fullness = 0
            this.Travaux[subDiv.id].forEach((travail) => {
              let subnode = document.createElement('DIV')
              subnode.classList.add('travailMark')
              subnode.style.backgroundColor = travail.color
              subnode.style.maxHeight = `${travail.height}%`
              subnode.style.minHeight = `${travail.height}%`
              subnode.style.height = `${travail.height}%`
              fullness += travail.height
              subDiv.appendChild(subnode)
            })
            if (fullness > 100) { fullness = 100 }
            subDiv.dataset.fullness = fullness
          }
        }
        subDiv.classList.add('box')
        subDiv.addEventListener('dragover', (event) => {
          let node = event.target
          while (node && (node.nodeName !== 'DIV' || node.classList.contains('travailMark'))) { node = node.parentNode }
          if (node.classList.contains('user')) { node = node.nextElementSibling }
          let parent = node
          while (!parent.dataset.efficiency) { parent = parent.parentNode }
          let transfer = event.dataTransfer.getData('application/travail-id')
          if (!transfer) { return }
          let bgcolor = event.dataTransfer.getData('drag/css-color') || 'red'
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

          while (node && this.nodeFullness(node) >= 100) { node = node.nextElementSibling }
          if (!node) { return }

          let tNode = document.getElementById(transfer)
          if (!tNode) { return }
          let days = ((parseFloat(tNode.dataset.time) / this.HoursPerDay) * parseFloat(tNode.dataset.force)) / parseFloat(parent.dataset.efficiency)

          while (days > 0 && node) {
            if (node.classList.contains('weekend')) {
              node = node.nextElementSibling
              continue
            }
            let fullness = this.nodeFullness(node)
            if (fullness < 100) {
              let s = node
              window.requestAnimationFrame(() => {
                s.style.backgroundColor = bgcolor
              })
              node.dataset.dragover = '1'
              days -= (1 - (1 * fullness / 100))
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
          let node = event.target
          while (node.nodeName !== 'DIV') { node = node.parentNode }
          let transfer = event.dataTransfer.getData('application/travail-id')
          if (!transfer) { return }
          event.preventDefault()
          let bgcolor = event.dataTransfer.getData('drag/css-color')

          /* Prepare color */
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

          let tNode = document.getElementById(transfer)
          while (node && !node.classList.contains('line')) { node = node.parentNode }
          let totalTime = parseFloat(tNode.dataset.time) * parseFloat(tNode.dataset.force) / parseFloat(node.dataset.efficiency)
          let TTime = totalTime
          for (node = node.firstElementChild;
               node;
               node = node.nextElementSibling) {
            let n = node
            if (node.dataset.dragover) {
              let nodeHours = (this.HoursPerDay * (100 - this.nodeFullness(node))) / 100
              console.log(nodeHours, totalTime, this.nodeFullness(node))
              node.dataset.travail = tNode.dataset.travail
              let subnode = document.createElement('DIV')
              subnode.classList.add('travailMark')
              subnode.style.backgroundColor = bgcolor
              let height = 100
              let nodeTime = totalTime
              if (totalTime > nodeHours) {
                totalTime -= nodeHours
                nodeTime = nodeHours
              } else {
                height = 100 * totalTime / nodeHours
              }
              let newFullness = this.nodeFullness(node) + height
              if (newFullness > 100) {
                height -= newFullness - 100
                newFullness = 100
              }
              node.dataset.fullness = newFullness
              subnode.dataset.time = TTime
              subnode.dataset.totalTime = totalTime
              subnode.dataset.nodeTime = nodeHours
              subnode.style.minHeight = `${height}%`
              subnode.style.maxHeight = `${height}%`
              subnode.style.height = `${height}%`
              subnode.innerHTML = `${nodeTime / 3600}`
              if (!this.Travaux[node.id]) {
                this.Travaux[node.id] = []
              }
              this.Travaux[node.id].push({
                color: bgcolor,
                height: height
              })
              window.requestAnimationFrame(() => {
                n.appendChild(subnode)
              })
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

    this.Travaux.data.forEach((travail) => {
      if (parseFloat(travail.time) === 0 || isNaN(parseFloat(travail.time))) { return }
      if (parseFloat(travail.force) === 0 || isNaN(parseFloat(travail.force))) { return }
      let div = document.createElement('DIV')
      div.id = `Travail/${travail.id}`
      div.draggable = true
      div.classList.add('travail')
      div.dataset.travail = travail.id
      div.dataset.time = parseFloat(travail.time)
      div.dataset.force = parseFloat(travail.force)
      div.innerHTML = `<span>${travail.reference} / ${travail.description}</span>`
      window.requestAnimationFrame(() => {
        this.views.project.appendChild(div)
      })
      div.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/travail-id', event.target.id)
        event.dataTransfer.setData('drag/css-color', `hsla(${this.currentColor}, ${this.currentSaturation}%, ${this.currentLight}%, 0.7)`)
      })
    })
  })
}

Planning.prototype.run = async function () {
  await this.loadStore('Users', {deleted: '-', disabled: '0'})
  await this.loadStore('Travaux', {closed: '0'})
  this.draw()
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
    fetch(url, {credential: 'include'}).then((response) => {
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
    travaux: new Store('Travail')
  })

  p.run()
})
