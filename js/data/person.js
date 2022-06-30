function KAPerson () {
    this.data = new Map()
    this.uid = ''
    return new Proxy(this, KAGenericProxy)
}

KAPerson.create = function (person) {
    const instance = new KAPerson()
    for (const key of Object.keys(person)) {
        if (key === 'id' || key === 'uid') { instance.uid = person[key]; continue }
        instance.set(key, person[key])
    }
    return instance
}

KAPerson.load = function (personId) {
    return new Promise((resolve, reject) => {
        if (DataUtils.empty(personId)) { return resolve (new KAPerson()) }
        kafetch(`${KAAL.getBase()}/Person/${personId.toId()}`)
        .then(person => {
            if (person.length !== 1) { return resolve (new KAPerson()) }
            resolve(KAPerson.create(person.data[0]))
        })
        .catch(error => {
            reject(error)
        })
    })
}

KAPerson.listActive = function () {
    return new Promise((resolve, reject) => {
        kafetch(`${KAAL.getBase()}/Person/_query`, {method:'POST', body: JSON.stringify(
            {'#and': {
                disabled: 0,
                deleted: '--'
            }}
        )})
        .then(people => {
            if (!people.data) { resolve([]); return }
            const peopleList = []
            for (const person of people.data) {
                peopleList.push(KAPerson.create(person))
            }   
            resolve(peopleList)
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
