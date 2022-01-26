function KAProject() {
    this.data = new Map()
    this.uid = ''
    return new Proxy(this, KAGenericProxy)
}

KAProject.create = function (project) {
    const instance = new KAProject()
    for (const key of Object.keys(project)) {
        if (key === 'id' || key === 'uid') { instance.uid = project[key]; continue }
        instance.set(key, project[key])
    }
    return instance
}

KAProject.load = function (projectId) {
    return new Promise((resolve, reject) => {
        if (DataUtils.empty(projectId)) { resolve (new KAProject()); return }
        kafetch(`${KAAL.getBase()}/Project/${projectId.toId()}`)
        .then(project => {
            if (project.length !== 1) { reject('Projet inconnu'); return }
            resolve(KAProject.create(project.data[0]))
        })
        .catch(error => {
            reject(error)
        })
    })
}

KAProject.prototype.set = function (key, value) {
    return this.data.set(key, value)
}

KAProject.prototype.get = function (key) {
    if (!this.data.has(key)) { return '' }
    return this.data.get(key)
}

KAProject.prototype.has = function (key) {
    return this.data.has(key)
}