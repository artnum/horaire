function KAProcess() {
    this.data = new Map()
    this.uid = ''
    return new Proxy(this, KAGenericProxy)
}

KAProcess.create = function (process) {
    const instance = new KAProcess()
    for (const key of Object.keys(process)) {
        if (key === 'id' || key === 'uid') { instance.uid = process[key]; continue }
        instance.set(key, process[key])
    }
    return instance
}

KAProcess.load = function (processId) {
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

KAProcess.list = function () {
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

KAProcess.prototype.set = function (key, value) {
    return this.data.set(key, value)
}

KAProcess.prototype.get = function (key) {
    if (!this.data.has(key)) { return '' }
    return this.data.get(key)
}

KAProcess.prototype.has = function (key) {
    return this.data.has(key)
}