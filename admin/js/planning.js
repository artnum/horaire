/* eslint-env browser */
/* workaround bugs in google chrome */
var DNDWorkaround = null
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
  this.Grid = new Grid(1, 8)
  this.TSegs = new TSegs(this)
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

  this.resetCurrent()
  this.installUI()
  document.documentElement.style.setProperty('--box-size', `calc((100% / ${this.Days+1}) - 4px)`)

  window.addEventListener('keyup', event => {
    if (!this.current.travail) { return }
    let wnode = this.current.wnode
    switch (event.key) {    
      case 'Control':
        if (!(this.current.days & 0x40)) {
          this.current.days |= 0x40 // add saturday
        } else if (!(this.current.days & 0x01)) {
          this.current.days |= 0x01 // add sunday
        } else {
          this.current.days = 0x3E // reset to week day
        }
        if (wnode) {
          this.placeTravailOnGrid(wnode)
        }
      return
      case 'Shift':
        if (!wnode) { return }
        let person = wnode.getPerson()
        let remove = false
        for (let i = 0; i < this.current.people.length; i++) {
          if (this.current.people[i].id === person.id) {
            this.current.people.splice(i, 1)
            remove = true
          }
        }
        if (!remove) {
          this.current.people.push(person)
        }
        this.placeTravailOnGrid(wnode)
      return
      case 'Escape':
        this.closeTravail()
        this.cleanNodesInList()
        this.resetCurrent()
      return
    }
  })
}

Planning.prototype.PBar = function () {
  let div = document.createElement('DIV')
  div.id = 'PBar'
  let i = document.createElement('input')
  let s = new Select(i, new STProject('Project'))

  s.addEventListener('change', (event) => {
    const projectId = event.value
    this.TSegs.resetLight()
    fetch(RelURL(`Travail/.unplanned/?search.project=${projectId}`),
      { credential: 'include', headers: { 'X-Request-Id': new Date().getTime() } }).then(
        (response) => {
          if (response.ok) {
            response.json().then((result) => {
              this.displayTravail(result.data, projectId)
            })
          }
        })
    
    let url = new URL('Travail', KAAL.getBase())
    url.searchParams.append('search.project', projectId)
    fetch(url).then(response => {
      if (!response.ok) { return }
      response.json().then(result => {
        for (let i = 0; i < result.length; i++) {
          let t = `Travail/${result.data[i].id}`
          this.TSegs.highlightTravail(t)
        }
      })
    })
  })

  div.appendChild(i)
  this.views.project.parentNode.insertBefore(div, this.views.project)
}

const moveZoomTime = 85

Planning.prototype.move = function (nDays) {
  if (this.move.last) {
    if (performance.now() - this.move.last < moveZoomTime) { return}
  }
  if (this.TSegTimeout) {
    clearTimeout(this.TSegTimeout)
  }
  this.move.last = performance.now()
  this.startDate = new Date(this.startDate.getTime() + (nDays * 86400000))
  this.TSegTimeout = setTimeout(() => {
    this.loadTSeg().then(() => {
      this.TSegTimeout = null
    })
  }, 250)
  this.draw()
}

Planning.prototype.zoom = function (nDay) {
  if (this.zoom.last) {
    if (performance.now() - this.zoom.last < moveZoomTime) { return}
  } 
  this.zoom.last = performance.now()
  if (this.TSegTimeout) {
    clearTimeout(this.TSegTimeout)
  }
  if (nDay < 0 && this.Days > 3) {
    this.Days += nDay
  } else if (nDay > 0 && this.Days < 180) {
    this.Days += nDay
  }
  document.documentElement.style.setProperty('--box-size', `calc((100%  / ${this.Days+1}) - 4px)`)
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
    } else if (!event.ctrlKey && event.shiftKey) {
      if (event.deltaY < 0) {
        this.move(1)
      } else {
        this.move(-1)
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

/* return an array of double-linked list of nodes we can look for */
Planning.prototype.getNodesForTravail = function (date, travail, people, days = 0x3E) {
  /* find a set of node to fill with worktime */
  let [averageTime, maxDayTime] = TSegs.averageTime(travail, people)
  let firstNode = []
  let peoplesNodes = []
  for (let person of people) {
    let wnode = WNode.getWNodeById(`${person.id}+head`)
    if (wnode) {
      peoplesNodes.push(wnode)
      wnode = wnode.gotoDate(date)
      if (wnode) {
        firstNode.push(wnode)
      } else {
        break
      }
    }
  }

  let lists = new Array(firstNode.length)
  let leftTime = averageTime
  while (firstNode[0] !== null && leftTime > 0) {
    let passCheck = true
    let maxNodeTime = Infinity

    for (let i = 0; i < firstNode.length; i++) {
      if (!firstNode[i]) { passCheck = false; break }
      if (!(days & firstNode[i].weekDay())) {
        passCheck = false
        break
      }
      if (!firstNode[i].hasPlace(KAAL.work.getMin('s'))) {
        passCheck = false
        break
      }
      if (maxNodeTime > firstNode[i].leftTime()) {
        maxNodeTime = firstNode[i].leftTime()
      }
    }

    if (!passCheck) {
      for (let i = 0; i < firstNode.length; i++) { 
        if (!firstNode[i]) { return } // somthing wrong with it
        firstNode[i] = firstNode[i]._next 
      }
      continue
    }

    let time = 0
    if (leftTime - maxNodeTime <= 0) {
      time = leftTime
    } else {
      time = maxNodeTime
    }

    leftTime = leftTime - time
    for (let i = 0; i < firstNode.length; i++) { 
      if (!lists[i]) { lists[i] = new DLList() }  
      lists[i].add({node: firstNode[i], time: time})
      firstNode[i] = firstNode[i]._next
    }
  }

  if (!firstNode[0]) {
    this.zoom(7)
  }

  return lists
}

Planning.prototype.travailOver = function () {
  /* travail must be open */
  if (this.current.travail === null) { return }
  if (this.current.people.length === 0) { return }

  let lists = this.getNodesForTravail(this.current.travail, this.current.people)

}

Planning.prototype.cleanNodesInList = function () {
  for (let i = 0; i < this.current.cleanList.length; i++) {
    let n = this.current.cleanList[i]
    window.requestAnimationFrame(() => {
      if (n.node) {
        n.node.style.backgroundColor = ''
      }
    })
  }
  this.current.cleanList = []
}

Planning.prototype.draw = function () {
  const startDate = this.startDate || Date.getStartISOWeek(this.Week, this.Year)
  this.startDate = startDate
  return new Promise((resolve, reject) => { 
    let days = this.Days ? this.Days : 7
    if (this.Grid.colLength() < days + 1) {
      this.Grid.addColumn(this.Grid.colLength() - (days + 1))
    } else {
      this.Grid.removeColumn((days + 1) - this.Grid.colLength())
    }
    if (this.Grid.rowLength() !== this.Users.data.length + 1) {
      this.Grid.addRow(this.Grid.rowLength() - (this.Users.data.length + 1))
    }

    let header = document.createElement('DIV')
    header.id = 'planingHeader'
    header.classList.add('line', 'header')
    
    for (let i = 0; i <= days; i++) {
      let col = document.createElement('div')
      if (i === 0) {
        col.id = 'header+head'
        col.innerHTML = `Semaine n°<span class="number">${startDate.getWeek()}</span>`
      } else {
        let x = new Date(startDate.getTime() + ((i - 1) * 86400000))
        x.setHours(12, 0, 0)
        col.id = `header+day-${x.toISOString()}`
        col.innerHTML = `<span class="date">${x.fullDate()}</span>`
        if (x.getDay() === 0 || x.getDay() === 6) {
          col.classList.add('weekend')
        }
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
      let head = null
      for (let i = 0; i <= days; i++) {
        let wnode
        if (i === 0) {
          wnode = new WNode(div.id)
          wnode.innerHTML = `<span class="name">${user.name}</span><br/><span class="efficiency">${user.efficiency}</span>`
          wnode.data.efficiency = parseFloat(user.efficiency)
          head = wnode
        } else {
          const date = new Date(startDate.getTime() + ((i - 1) * 86400000))
          date.setHours(12, 0, 0)

          wnode = new WNode(div.id, date)
          wnode.data.efficiency = parseFloat(user.efficiency)
          wnode._head = head
          if (head._next === null) {
            head._next = wnode
            head._previous = wnode
          } else {
            wnode._previous = head._previous
            head._previous._next = wnode
            head._previous = wnode
          }
        }
   
        wnode.addEventListener('mouseover', event => {
          this.cleanNodesInList()
          let dnode = event.target
          let wnode
          while (dnode && !(wnode = WNode.getWNodeByDomNode(dnode))) {
            dnode = dnode.parentNode
          }

          this.placeTravailOnGrid(wnode)
        })

        wnode.addEventListener('click', event => {
          if (!this.current.travail) { return }
          if (this.current.travail.fake) {
            let tsegs = this.generateTSegForGrid()
            while (tseg = tsegs.pop()) {
              let old_tseg = this.current.travail.segment.pop()
              if (old_tseg) {
                old_tseg.copy(tseg)
                old_tseg.commit()
              } else {
                tseg.commit()
              }
            }
            /* move use less time (so less segment) than old */
            while (tseg = this.current.travail.segment.pop()) {
              tseg.delete()
              tseg.commit()
            }
          } else {
            this.placeTSegOnGrid()
            this.removeTravail()
          }
          this.cleanNodesInList()
          this.resetCurrent()
        })

        wnode.addToDom(div)
      }
      this.TSegs.draw()
      
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

Planning.prototype.generateTSegForGrid = function () {
  let tsegs = []
  let nodes = this.current.nodes
  if (nodes === null) { return }
  for (let i = 0; i < nodes.length; i++) {
    for (let node = nodes[i].first(); node; node = nodes[i].next()) {
      let tseg = new TSeg({
        travail: `Travail/${this.current.travail.id}`,
        time: node.time,
        person: node.node.personId,
        date: node.node.date.toISOString().split('T')[0],
        efficiency: node.node.efficiency
      })
      tsegs.push(tseg)
    }
  }
  return tsegs
}

Planning.prototype.placeTSegOnGrid = function () {
  let tsegs = this.generateTSegForGrid()
  tsegs.forEach(tseg => {
    tseg.commit().then(result => {
      this.TSegs.add(tseg)
    })
  })
}

Planning.prototype.placeTravailOnGrid = function (wnode) {
  if (!this.current.travail) { return }
  if (!wnode) { return }
  this.cleanNodesInList()

  this.current.wnode = wnode
  let person = wnode.getPerson()
  let people = [person]
  for (let i  = 0; i < this.current.people.length; i++) {
    if (this.current.people[i].id !== person.id) {
      people.push(this.current.people[i])
    }
  }
  let date
  if (wnode._head === null) {
    date = wnode._next.date.toISOString().split('T')[0]
  } else {
    date = wnode.date.toISOString().split('T')[0]
  }
  let nodes = this.getNodesForTravail(date, this.current.travail, people, this.current.days)
  for (let i = 0; i < nodes.length; i++) {
    if (!nodes[i]) { continue }
    for (let n = nodes[i].first(); n; n = nodes[i].next()) {
        this.current.cleanList.push(n)
        let color = 'red'
        if (n.node.personId !== person.id) { color = 'blue' }
        window.requestAnimationFrame(() => n.node.style.backgroundColor = color)
    }
  }

  this.current.nodes = nodes
}

Planning.prototype.addTravail = function (event) {
  event.preventDefault()

  const TravailBody = {
    force: 1.0,
    project: null,
    description: null,
    time: null
  }

 let formData = new FormData(event.target)
 TravailBody.project = formData.get('project')
 TravailBody.description = formData.get('description')
 TravailBody.time = Admin.parseDuration(formData.get('duration'))
 TravailBody.plan = 1
 if (TravailBody.time <= 0) {
   alert('La durée est incorrecte')
   return
 }
 fetch(new URL('Travail', KAAL.getBase()), {
   credential: 'include', 
   headers: new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`}),
   method: 'POST',
   body: JSON.stringify(TravailBody)
  }).then((response) => {
    fetch(RelURL(`Travail/.unplanned/?search.project=${TravailBody.project}`),
    {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}}).then(
      (response) => {
        if (response.ok) {
          response.json().then((result) => {
            this.displayTravail(result.data, TravailBody.project)
          })
        }
      })
  })
}

Planning.prototype.displayTravail = function (travaux, projectId = false) {
  new Promise((resolve, reject) => {
    let element 
    if (projectId) {
      element = document.createElement('FORM')
      element.classList.add('add')
      element.innerHTML = `<fieldset><legend>Ajout travail</legend>
      <input type="hidden" value="${projectId}" name="project" />
      <label>Durée : <input type="text" name="duration" /></label>
      <label>Description : <textarea name="description"></textarea></label>
      <input type="submit" value="Ajouter" /><input type="reset" value="Annuler" />
      </fieldset>
      `
      element.addEventListener('submit', this.addTravail.bind(this))
    }
    window.requestAnimationFrame(() => {
      this.views.project.innerHTML = ''
      if (projectId) {
        this.views.project.appendChild(element)
      }
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
      if (s.lastChild && s.lastChild.classList && s.lastChild.classList.contains('details')) {
        window.requestAnimationFrame(() => s.removeChild(s.lastChild))
      }
      window.requestAnimationFrame(() => s.classList.remove('selected'))
    }
  }
}

Planning.prototype.resetCurrent = function () {
  this.current = {}
  this.current.days = 0x3E /* bit 0 -> sunday, bit 6 -> saturday */
  this.current.travail = null
  this.current.people = []
  this.current.events = {}
  this.current.cleanList = new Array()
  this.current.nodes = null
  this.current.wnode = null
  this.current.tnode = null
}

Planning.prototype.openTravail = function (node) {
  fetch(RelURL(`${node.id}`), {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}}).then((response) => {
    if (response.ok) {
      response.json().then((result) => {
        if (result.data.length === 0) { throw new Error('Travail non-trouvé') }
        this.closeOthers(node)
        
        let travail = {
          id: result.data.id,
          raw: result.data,
          time: parseFloat(result.data.time),
          force: parseFloat(result.data.force)
        }
        this.resetCurrent()
        this.current.travail = travail
  
        /* work without time are considered as one day job */
        if (travail.time === 0.0) {
          travail.time = KAAL.work.getDay('s')
        }
        /* when no force is set, force is considered as 1 */
        if (travail.force === 0.0) {
          travail.force = 1.0
        }
  
        let travailTime = travail.time / travail.force / 3600      
        let details = document.createElement('DIV')
        details.classList.add('details')
        details.innerHTML = `<ul>
                                <li><span class="label">Temps</span>${travailTime} h</li>
                                <li><span class="label">Contact</span>${result.data.contact}</li>
                                <li><span class="label">Téléphone</span>${result.data.phone}</li>
                             </ul>`
        this.current.tnode = node
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

Planning.prototype.removeTravail = function () {
  let node = this.current.tnode
  if (!node) { return }
  window.requestAnimationFrame(() => { if (node.parentNode) { node.parentNode.removeChild(node) } })
  this.current.travail = null
}

Planning.prototype.closeTravail = function () {
  let node = this.current.tnode
  if (!node) { return }
  window.requestAnimationFrame(() => node.classList.remove('selected'))
  this.current.travail = null
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

Planning.prototype.openSegment = function (tseg) {
  this.resetCurrent()
  this.FakeTravail = {
    fake: true,
    time: tseg.normTime(),
    force: 1,
    id: tseg.travail.split('/')[1],
    segment: [tseg]
  }
  this.current.travail = this.FakeTravail
}

Planning.prototype.addToOpenSegment = function (tseg) {
  this.FakeTravail.time += tseg.normTime()
  this.FakeTravail.segment.push(tseg)
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
  this.TSegs.add(tseg)
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
    const begin = this.startDate || new Date(Date.getStartISOWeek(this.Week, this.Year).getTime())
    begin.setHours(12)
    const end = new Date(begin.getTime() + ((this.Days - 1) * 86400000))
    end.setHours(12)
    const url = new URL('TSeg', KAAL.getBase())
    url.searchParams.append('search.date', `>=${begin.toISOString().split('T')[0]}`)
    url.searchParams.append('search.date', `<=${end.toISOString().split('T')[0]}`)
    fetch(url, {credential: 'include', headers: {'X-Request-Id': new Date().getTime()}})
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
