
export default class KATravail {
    constructor () {
        this.data = new Map()
        this.changed = new Map()
        this.uid = ''
        return new Proxy(this, KAGenericProxy)
    }

    static create(travail) {
        const instance = new KATravail()
        for (const k of Object.keys(travail)) {
            if (k === 'id') {
                instance.uid = travail[k]
                continue
            }
            instance.data.set(k, travail[k])
        }
        return instance
    }

    static load(travailId) {
        return new Promise((resolve, reject) => {
            kafetch(`${KAAL.getBase()}/Travail/${travailId.toId()}`)
            .then(travail => {
                if (travail.length !== 1) { reject('Travail inexistant'); return }
                resolve(KATravail.create(travail.data[0]))
            })
            .catch(error => {
                reject(error)
            })
        })
    }

    static getByProject(projectId) {
        return new Promise((resolve, reject) => {
            kafetch(`${KAAL.getBase()}/Travail/_query`, {method: 'POST', body: JSON.stringify({project: projectId, closed: 0})})
            .then(travaux => {
                if (travaux.length < 1) { resolve([]); return }
                const instances = []
                for (const travail of travaux.data) {
                    instances.push(KATravail.create(travail))
                }
                resolve(instances)
            })
            .catch(error => {
                reject(error)
            })
        })
    }

    rollback() {
        for (const [key, value] of this.changed) {
            this.data.set(key, value)
        }
        this.changed = new Map()
    }

    commit() {
        return new Promise((resolve, reject) => {
            const saveObject = {}
            for (const [key, value] of this.data) {
                if (this.changed.get(key) === value) { continue }
                saveObject[key] = value
            }
            saveObject.id = this.uid
            kafetch(`${KAAL.getBase()}/Travail/${this.uid}`, {method: 'POST', body: JSON.stringify(saveObject)})
            .then(result => {

            })
        })
    }

    set(key, value) {
        if (this.changed.has(key)) { 
            this.changed.set(key, this.data.get(key))
        }
        this.data.set(key, value)
    }

    get(key) {
        return this.data.get(key)
    }
}
