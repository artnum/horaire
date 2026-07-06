import { STProcess } from '../stores.js'

function STProcessTravail(projectId = null) {
    this.projectId = projectId
    this.processStore = new STProcess()
}

STProcessTravail.prototype._formatProcessEntry = function(entry) {
    const value = `pr:${entry.value}`
    return {
        label: entry.label,
        value,
        id: value,
        uid: value,
        color: entry.color,
    }
}

STProcessTravail.prototype._formatTravailEntry = function(travail) {
    const id = travail.id ?? travail.uid
    const value = `tr:${id}`
    return {
        label: travail.reference ?? String(id),
        value,
        id: value,
        uid: value,
    }
}

STProcessTravail.prototype._queryTravaux = function(searchTerm) {
    if (!this.projectId) { return Promise.resolve([]) }
    const term = String(searchTerm).replace(/\*$/, '').trim().toLowerCase()
    return new Promise((resolve) => {
        kafetch(`${KAAL.getBase()}/Travail/_query`, {
            method: 'POST',
            body: JSON.stringify({project: this.projectId, closed: '0'}),
        })
        .then(results => {
            const travaux = results?.data ?? []
            const entries = travaux
                .filter(travail => {
                    if (!term) { return true }
                    const reference = String(travail.reference ?? '').toLowerCase()
                    const description = String(travail.description ?? '').toLowerCase()
                    return reference.includes(term) || description.includes(term)
                })
                .map(travail => this._formatTravailEntry(travail))
            entries.sort((a, b) => a.label.localeCompare(b.label))
            resolve(entries)
        })
        .catch(() => resolve([]))
    })
}

STProcessTravail.prototype.get = function(id) {
    const str = String(id)
    if (str.startsWith('pr:')) {
        return this.processStore.get(str.slice(3))
            .then(entry => entry ? this._formatProcessEntry(entry) : null)
    }
    if (str.startsWith('tr:')) {
        return new Promise((resolve) => {
            kafetch(`${KAAL.getBase()}/Travail/${str.slice(3)}`)
            .then(result => {
                if (!result?.length || result.length !== 1) {
                    resolve(null)
                    return
                }
                const travail = Array.isArray(result.data) ? result.data[0] : result.data
                resolve(this._formatTravailEntry(travail))
            })
            .catch(() => resolve(null))
        })
    }
    return Promise.resolve(null)
}

STProcessTravail.prototype.query = function(txt) {
    if (typeof txt === 'object') { txt = Object.values(txt)[0] ?? '' }
    return Promise.all([
        this.processStore.query({name: txt}),
        this._queryTravaux(txt),
    ])
    .then(([processes, travaux]) => {
        const entries = []
        if (processes.length) {
            entries.push({
                label: 'Processus',
                value: '__hdr_process__',
                uid: '__hdr_process__',
                id: '__hdr_process__',
            })
            entries.push(...processes.map(entry => this._formatProcessEntry(entry)))
        }
        if (travaux.length) {
            entries.push({
                label: 'Travail',
                value: '__hdr_travail__',
                uid: '__hdr_travail__',
                id: '__hdr_travail__',
            })
            entries.push(...travaux)
        }
        return entries
    })
}

STProcessTravail.prototype.getIdentity = function(object) {
    return object.uid ?? object.id ?? object.value
}

export default STProcessTravail