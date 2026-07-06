export default class KAPerson {
    data = new Map()
    constructor () {
        this.uid = ''
        return new Proxy(this, KAGenericProxy)
    }

    static create(person) {
        const instance = new KAPerson()
        for (const key of Object.keys(person)) {
            if (key === 'id' || key === 'uid') { instance.uid = person[key]; continue }
            instance.set(key, person[key])
        }
        return instance
    }

    static load(personId) {
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

    static listActive() {
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

    set(key, value) {
        return this.data.set(key, value)
    }

    get(key) {
        if (!this.data.has(key)) { return '' }
        return this.data.get(key)
    }

    has(key) {
        return this.data.has(key)
    }
}
