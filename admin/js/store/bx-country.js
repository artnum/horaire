function BXCountryStore() {
    this.Store = `${KAAL.getBase()}/BXCountry`
    this.intlNames = new Intl.DisplayNames(['fr'], { type: 'region' })
}

BXCountryStore.prototype.formatEntry = function (entry) {
    const name = this.intlNames.of(entry.iso3166_alpha2)
    return {
        name,
        label: name,
        value: this.getIdentity(entry),
        color: null
    }
}

BXCountryStore.prototype.get = function (id) {
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
                console.log(error)
            })
    })
}

BXCountryStore.prototype.query = function (txt) {
    return new Promise((resolve, reject) => {
        if (typeof txt === 'object') { txt = Object.values(txt)[0].replace('*', '') }
        fetch(`${this.Store}`)
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

BXCountryStore.prototype.getIdentity = function (object) {
    return object.id
}