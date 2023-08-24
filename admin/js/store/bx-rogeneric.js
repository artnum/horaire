function BXROGenericStore(store, fieldMapping = {idName: 'id'}) {
    this.Store = `${KAAL.getBase()}/${store}`
    this.fieldMapping = fieldMapping
}

BXROGenericStore.prototype.formatEntry = function (entry) {
    return {
        id: this.getIdentity(entry),
        value: this.getIdentity(entry),
        name: entry[this.fieldMapping.name],
        label: (this.fieldMapping.label ? entry[this.fieldMapping.label] : entry[this.fieldMapping.name]),
        color: (this.fieldMapping.color ? entry[this.fieldMapping.color] : null),
        symbol: (this.fieldMapping.symbol ? entry[this.fieldMapping.symbol] : null)
    }
}

BXROGenericStore.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        if (id === undefined || id === null || id === false) { resolve(null); return }
        fetch(`${this.Store}/${id}`)
            .then(response => {
                if (!response.ok) { return { data: [], length: 0 } }
                return response.json()
            })
            .then(results => {
                if (results.length === 0) { return resolve(null) }
                return resolve(this.formatEntry(Array.isArray(results.data) ? results.data[0] : results.data))
            })
            .catch(error => {
                reject(error)
            })
    })
}

BXROGenericStore.prototype.query = function (txt) {
    return new Promise((resolve, reject) => {
        if (typeof txt === 'object') { txt = Object.values(txt)[0].replace('*', '') }
        const request = {[this.fieldMapping.name]: ['~', txt]}
        fetch(`${this.Store}/_query`, {method: 'POST', body: JSON.stringify(request)})
            .then(response => {
                if (!response.ok) { return { length: 0, data: [] } }
                return response.json()
            })
            .then(results => {
                if (results.length === 0) { return resolve([]) }
                if (!Array.isArray(results.data)) { results.data = [results.data] }
                resolve(results.data
                    .map(e => this.formatEntry(e))
                    .filter(e => {
                        return String(e.label).match(new RegExp(`^${txt}.*`, 'i')) !== null
                    })
                    .sort((a, b) => {
                        return a.label.localeCompare(b.label)
                    })
                )
            })
            .catch(error => {
                console.log(error)
                resolve([])
            })
    })
}

BXROGenericStore.prototype.getIdentity = function (object) {
    let idName = 'id'
    if (this.fieldMapping.idName) { idName = this.fieldMapping.idName }
    return object[idName]
}