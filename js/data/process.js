function KAProcess() {
    this.data = new Map()
    this.uid = ''
    return new Proxy(this, KAGenericProxy)
}

KAProcess.create = function (project) {
    const instance = new KAProcess()
    for (const key of Object.keys(project)) {
        if (key === 'id' || key === 'uid') { instance.uid = project[key]; continue }
        instance.set(key, project[key])
    }
    return instance
}

KAProcess.load = function (projectId) {
    return new Promise((resolve, reject) => {
        if (DataUtils.empty(projectId)) { resolve (new KAProcess()); return }
        kafetch(`${KAAL.getBase()}/Process/${projectId.toId()}`)
        .then(project => {
            if (project.length !== 1) { reject('Projet inconnu'); return }
            resolve(KAProcess.create(project.data[0]))
        })
        .catch(error => {
            reject(error)
        })
    })
}

KAProcess.list = function () {
    return new Promise((resolve, reject) => {
        kafetch(`${KAAL.getBase()}/Process/_query`, {method: 'POST', body: JSON.stringify({'#and': {deleted: '--', name: '**'}})})
        .then(processes => {
            const p = []
            for (const process of processes.data) {
                p.push(KAProcess.create(process))
            }
            resolve(p)
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