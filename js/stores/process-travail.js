import { kafetch2 } from '../fetch.js'
import { STProcess } from '../stores.js'

function STProcessTravail(projectId = null) {
    this.projectId = projectId
    this.processStore = new STProcess()
}

STProcessTravail.prototype._formatProcessEntry = function(entry) {
    const value = `pr:${entry.value}`
    return {
        label: entry.label,
        name: entry.label,
        value,
        id: value,
        uid: value,
        color: entry.color,
    }
}

STProcessTravail.prototype._formatTravailEntry = function(travail) {
    const id = travail.id ?? travail.uid
    const label = travail.reference ?? String(id)
    const value = `tr:${id}`
    return {
        label,
        name: label,
        value,
        id: value,
        uid: value,
    }
}

STProcessTravail.prototype._normalizeQuery = function(txt) {
    if (typeof txt === 'object') {
        txt = Object.values(txt)[0] ?? ''
    }
    return String(txt).replace(/\*+$/, '')
}

STProcessTravail.prototype._queryTravaux = function(searchTerm) {
    if (!this.projectId) { return Promise.resolve([]) }
    const term = String(searchTerm).trim().toLowerCase()
    return kafetch2(`${KAAL.getBase()}/Travail/_query`, {
        method: 'POST',
        body: {project: this.projectId, closed: 0},
    })
    .then(travaux => {
        const entries = travaux
            .filter(travail => {
                if (!term) { return true }
                const reference = String(travail.reference ?? '').toLowerCase()
                const description = String(travail.description ?? '').toLowerCase()
                return reference.includes(term) || description.includes(term)
            })
            .map(travail => this._formatTravailEntry(travail))
        entries.sort((a, b) => a.label.localeCompare(b.label))
        return entries
    })
    .catch(() => [])
}

STProcessTravail.prototype.get = function(id) {
    const str = String(id)
    if (str.startsWith('pr:')) {
        return this.processStore.get(str.slice(3))
            .then(entry => entry ? this._formatProcessEntry(entry) : null)
    }
    if (str.startsWith('tr:')) {
        return kafetch2(`${KAAL.getBase()}/Travail/${str.slice(3)}`)
            .then(travaux => {
                if (!travaux.length) { return null }
                return this._formatTravailEntry(travaux[0])
            })
            .catch(() => null)
    }
    return Promise.resolve(null)
}

STProcessTravail.prototype.query = function(txt) {
    const search = this._normalizeQuery(txt)
    const processQuery = search ? {name: `${search}*`} : {name: '*'}
    return Promise.all([
        this.processStore.query(processQuery),
        this._queryTravaux(search),
    ])
    .then(([processes, travaux]) => {
        const entries = processes.map(entry => this._formatProcessEntry(entry))
        return entries.concat(travaux)
    })
}

STProcessTravail.prototype.getIdentity = function(object) {
    return object.uid ?? object.id ?? object.value
}

export default STProcessTravail