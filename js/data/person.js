function KAPerson () {
    this.data = new Map()
    return new Proxy(this, KAGenericProxy)
}

KAPerson.create = function (person) {
    const instance = new KAPerson()
    for (const key of Object.keys(person)) {
        instance.set(key, person[key])
    }
    return instance
}

KAPerson.load = function (personId) {
    return new Promise((resolve, reject) => {
        if (DataUtils.empty(personId)) { resolve (new KAPerson()); return }
        kafetch(`${KAAL.getBase()}/Person/${personId.toId()}`)
        .then(person => {
            if (person.length !== 1) { reject('Personne inconnue'); return }
            resolve(KAPerson.create(person.data[0]))
        })
        .catch(error => {
            reject(error)
        })
    })
}

KAPerson.prototype.set = function (key, value) {
    return this.data.set(key, value)
}

KAPerson.prototype.get = function (key) {
    if (!this.data.has(key)) { return '' }
    return this.data.get(key)
}

KAPerson.prototype.has = function (key) {
    return this.data.has(key)
}
