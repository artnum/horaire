/* eslint-env browser */
/* global Artnum */
/* exported STProject */

function highlight (val, txt, open = '<span class="match">', close = '</span>') {
  let s = txt.toLowerCase().toAscii().indexOf(val.toLowerCase().toAscii())
  if (s !== -1) {
    return `${txt.substring(0, s)}${open}${txt.substring(s, s + val.length)}${close}${txt.substring(s + val.length)}`
  }
  return txt
}

function STProcess(store) {
  this.Store = store
}
STProcess.prototype.get = function (id) {
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

STProcess.prototype.query = function (txt) {
  return new Promise((resolve, reject) => {
    let entries = []
    let searchTerm = txt.toAscii().toLowerCase()
    let params = {
      'search.name': `~%${searchTerm}%`,
      'search.deleted': '-'
    }
    Artnum.Query.exec(Artnum.Path.url(`${this.Store}`, {params: params})).then((results) => {
      if (results.success && results.length) {
        results.data.forEach((entry) => {
          let name = `${entry.name}`
          name = highlight(searchTerm, name)
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
    if (id === undefined || id === null || id === false) { resolve(entry); return }
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
    let entries = []
    let searchTerm = txt.toAscii().toLowerCase()
    let params = {
      'search.reference': `~${searchTerm}%`,
      'search.name': `~%${searchTerm}%`,
      'search._rules': '(reference OR name) AND deleted',
      'search.deleted': '-'
    }
    if (!this.closed) {
      params['search.closed'] = '-'
      params['search._rules'] = '(reference OR name) AND deleted AND closed'
    }
    Artnum.Query.exec(Artnum.Path.url(`${this.Store}`, {params: params})).then((results) => {
      if (results.success && results.length) {
        results.data.forEach((entry) => {
          let name = `${entry.reference} ${entry.name}`
          name = highlight(searchTerm, name)
          entry.label = name
          entry.value = entry.uid ? entry.uid : entry.id
          entries.push(entry)
        })
      }
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

const STCategory = function (store) {
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
          name = highlight(searchTerm, name)
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
