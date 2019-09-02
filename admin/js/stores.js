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

const STProject = {
  get: (id) => {
    return new Promise((resolve, reject) => {
      let entry = null
      if (id === undefined || id === null || id === false) { resolve(entry); return }
      Artnum.Query.exec(Artnum.Path.url(`Project/${id}`)).then((results) => {
        if (results.success && results.length === 1) {
          let entry = Array.isArray(results.data) ? results.data[0] : results.data
          entry.label = `${entry.reference} - ${entry.name}`
          entry.value = entry.uid ? entry.uid : entry.id
        }
        resolve(entry)
      })
    })
  },
  query: (txt) => {
    return new Promise((resolve, reject) => {
      let entries = []
      let searchTerm = txt.toAscii().toLowerCase()
      let params = {
        'search.reference': `~${searchTerm}%`,
        'search.name': `~%${searchTerm}%`,
        'search._rules': '(reference OR name) AND deleted AND closed',
        'search.deleted': '-',
        'search.closed': '-'
      }
      Artnum.Query.exec(Artnum.Path.url(`Project`, {params: params})).then((results) => {
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
  },
  getIdentity: (object) => {
    return object.uid ? object.uid : object.id
  }

}
