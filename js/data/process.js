import { DataUtils, KAGenericProxy } from './utils.js'

export default class KAProcess {
    constructor() {
        this.data = new Map()
        this.uid = ''
        return new Proxy(this, KAGenericProxy)
    }

    static create(process) {
        const instance = new KAProcess()
        for (const key of Object.keys(process)) {
            if (key === 'id' || key === 'uid') { instance.uid = process[key]; continue }
            instance.set(key, process[key])
        }
        return instance
    }

    static load(processId) {
        return new Promise((resolve, reject) => {
            const KAPIStatus = new KAPI(`${KAAL.kairos.endpoint}/Status`)
            if (DataUtils.empty(processId)) { resolve (new KAProcess()); return }
            KAPIStatus.get(processId.toId())
            .then(process => {
                resolve(KAProcess.create(process))
            })
            .catch(error => {
                reject(error)
            })
        })
    }

    static list() {
        return new Promise((resolve, reject) => {
            const KAPIStatus = new KAPI(`${KAAL.kairos.endpoint}/Status`)
            KAPIStatus.search({name: '**', type: 1, deleted: '--'})
            .then(processes => {
                if (!processes) { return resolve([]) }
                return resolve(processes.map(process => KAProcess.create(process)))
            })
            .catch (error => {
                reject (error)
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
