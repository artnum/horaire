/* eslint-env browser */
/* global Artnum */
/* exported STProject */

function STProcess() {
  this.Store = KAAL.kairos.url
}
STProcess.prototype.get = function (id) {
  return new Promise((resolve, reject) => {
    let entry = null
    if (id === undefined || id === null || id === false) { resolve(entry); return }
    fetch(`${this.Store}/store/Status/${id}`)
    .then(response => {
      if (!response.ok) { return {data:[], length: 0} }
      return response.json()
    })
    .then(results => {
      if (results.length === 0) { return resolve(entry) }
      entry = Array.isArray(results.data) ? results.data[0] : results.data
      entry.label = `${entry.name}`
      entry.value = entry.uid ? entry.uid : entry.id
      entry.color = entry.color ? entry.color : '#000000'
      return resolve(entry)
    })
    .catch(error => {
      console.log(error)
    })
  })
}

STProcess.prototype.query = function (txt) {
  return new Promise((resolve, reject) => {
    if (typeof txt === 'object') { txt = Object.values(txt)[0] }
    const entries = []
    const searchTerm = txt.toAscii().toLowerCase()
    const query = {
      name: `*${searchTerm}`,
      type: '1'
    }

    fetch(`${this.Store}/store/Status/_query`, {method: 'post', body: JSON.stringify(query)})
    .then(response => {
      if (!response.ok) { return {length: 0, data: []} }
      return response.json()
    })
    .then(results => {
      if (results.length === 0) { return resolve(entries) }
      if (!Array.isArray(results.data)) { results.data = [results.data] }
      results.data.forEach((entry) => {
        entry.label = entry.name
        entry.value = entry.uid ? entry.uid : entry.id
        entry.color = entry.color ? entry.color : '#000000'
        entries.push(entry)
      })
      entries.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })
      resolve(entries)
    })
    .catch(error => {
      console.log(error)
      resolve([])
    })
  })
}

STProcess.prototype.getIdentity = function (object) {
  return object.uid ? object.uid : object.id
}

function STProject (store, closed = false) {
  this.Store = store
  this.closed = closed
}

STProject.prototype.get = function (id) {
  return new Promise((resolve, reject) => {
    let entry = null
    if (id === undefined || id === null || id === false) { return resolve(entry) }
    Artnum.Query.exec(Artnum.Path.url(`${this.Store}/${id}`)).then((results) => {
      if (results.success && results.length === 1) {
        entry = Array.isArray(results.data) ? results.data[0] : results.data
        entry.label = `${entry.reference} - ${entry.name}`
        entry.value = entry.uid ? entry.uid : entry.id
      }
      resolve(entry)
    })
  })
}

STProject.prototype.query = function (txt) {
  return new Promise((resolve, reject) => {
    if (typeof txt === 'object') { txt = Object.values(txt)[0] }
    let entries = []
    let searchTerm = txt.toAscii().toLowerCase()
    const request = {
      '#and': {
        '#or': { 
          reference: `${searchTerm}`,
          name: `*${searchTerm}` 
        },
        deleted: '-'
      }
    }

    if (!this.closed) {
      request['#and'].closed = '-'
    }

    fetch(Artnum.Path.url(`${this.Store}/_query`), {method: 'post', body: JSON.stringify(request)})
    .then(response => {
      if (!response.ok) { return {length: 0, data: []} }
      return response.json()
    })
    .then(results => {
      if (results.length === 0) { return resolve([]) }

      results.data.forEach((entry) => {
        let name = `${entry.reference} ${entry.name}`
        entry.label = name
        entry.value = entry.uid ? entry.uid : entry.id
        entries.push(entry)
      })
    
      entries.sort((a, b) => {
        let Xa = parseInt(a.reference)
        let Xb = parseInt(b.reference)
        if (isNaN(Xa)) { Xa = Infinity }
        if (isNaN(Xb)) { Xb = Infinity }
        if (Xa.toString() !== a.reference) { Xa = Infinity }
        if (Xb.toString() !== b.reference) { Xb = Infinity }
        if (Xa === Infinity && Xb === Infinity) {
          return a.reference.localeCompare(b.reference)
        }
        return Xa - Xb
      })

      resolve(entries)
    })
  })
}

STProject.prototype.getIdentity = function (object) {
  return object.uid ? object.uid : object.id
}

function STPerson (level = 128) {
  this.level = level
}

STPerson.prototype.get = function (id) {
  return new Promise((resolve, reject) => {
    let entry = null
    if (id === undefined || id === null || id === false) { resolve(entry); return }
    fetch(`${KAAL.getBase()}/Person/${id}`)
    .then(response => {
      if (!response.ok) { return {data:[], length: 0} }
      return response.json()
    })
    .then(results => {
      if (results.length === 0) { return resolve(entry) }
      entry = Array.isArray(results.data) ? results.data[0] : results.data
      entry.label = `${entry.name}`
      entry.value = entry.uid ? entry.uid : entry.id
      return resolve(entry)
    })
    .catch(error => {
      console.log(error)
    })
  })
}

STPerson.prototype.query = function (txt) {
  return new Promise((resolve, reject) => {
    if (typeof txt === 'object') { txt = Object.values(txt)[0] }
    let entries = []
    let searchTerm = txt.toAscii().toLowerCase()
    const request = {
      '#and': {
        name: `*${searchTerm}`,
        level: ['<=', this.level, 'int'],
        disabled: '0',
        deleted: '--'
      }
    }

    fetch(`${KAAL.getBase()}/Person/_query`, {method: 'post', body: JSON.stringify(request)})
    .then(response => {
      if (!response.ok) { return {length: 0, data: []} }
      return response.json()
    })
    .then(results => {
      if (results.length === 0) { return resolve([]) }

      results.data.forEach((entry) => {
        let name = `${entry.name}`
        entry.label = name
        entry.value = entry.uid ? entry.uid : entry.id
        entries.push(entry)
      })
    
      entries.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })

      resolve(entries)
    })
  })
}

STProject.prototype.getIdentity = function (object) {
  return object.uid ? object.uid : object.id
}

function STCategory (store) {
  this.Store = store
}

STCategory.prototype.get = function (id) {
  return new Promise((resolve, reject) => {
    let entry = null
    if (id === undefined || id === null || id === false) { resolve(entry); return }
    Artnum.Query.exec(Artnum.Path.url(`${this.Store}/${id}`)).then((results) => {
      if (results.success && results.length === 1) {
        entry = Array.isArray(results.data) ? results.data[0] : results.data
        entry.label = `${entry.name}`
        entry.value = entry.uid ? entry.uid : entry.id
      }
      resolve(entry)
    })
  })
}

STCategory.prototype.query = function (txt) {
  return new Promise((resolve, reject) => {
    if (typeof txt === 'object') { txt = Object.values(txt)[0] }
    let entries = []
    let searchTerm = txt.toAscii().toLowerCase()
    let params = {
      'search.name': `~%${searchTerm}%`,
      'search.deleted': '-'
    }
    Artnum.Query.exec(Artnum.Path.url(`${this.Store}`, {params: params})).then((results) => {
      if (results.success && results.length) {
        results.data.forEach((entry) => {
          let name = `${entry.reference} ${entry.name}`
          entry.label = name
          entry.value = entry.uid ? entry.uid : entry.id
          entries.push(entry)
        })
      }
      entries.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })

      resolve(entries)
    })
  })
}

STCategory.prototype.getIdentity = function (object) {
  return object.uid ? object.uid : object.id
}
