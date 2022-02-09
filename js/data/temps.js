function KATemps() {
    this.data = new Map()
    this.uid = ''
    return new Proxy(this, KAGenericProxy)
}

KATemps.create = function (temps) {
    const instance = new KATemps()
    for (const key of Object.keys(temps)) {
        if (key === 'id' || key === 'uid') { instance.uid = temps[key]; continue }
        instance.set(key, temps[key])
    }
    return instance
}

KATemps.load = function (tempsId) {
    return new Promise((resolve, reject) => {
        if (DataUtils.empty(tempsId)) { resolve (new KATemps()); return }
        kafetch(KAAL.url(`Htime/${tempsId.toId()}`))
        .then(temps => {
            if (temps.length !== 1) { reject('Temps inconnu'); return }
            resolve(KATemps.create(temps.data[0]))
        })
        .catch(error => {
            reject(error)
        })
    })
}

KATemps.deleteById = function (tempsId) {
    return new Promise((resolve, reject) => {
        if (DataUtils.empty(tempsId)) { resolve (); return }
        kafetch(KAAL.url(`Htime/${tempsId.toId()}`), {method: 'DELETE', body: JSON.stringify({id: tempsId.toId()})})
        .then(temps => {
            resolve(temps)
        })
        .catch(error => {
            reject(error)
        })
    })
}

KATemps.prototype.save = function () {
    return new Promise((resolve, reject) => {
        const request = {}
        for (const [key, value] of this.data) {
            request[key] = value
        }
        if (this.uid) {
            request['id'] = this.uid
        }
        kafetch(KAAL.url(`Htime/${this.uid}`), {method: 'POST', body: JSON.stringify(request)})
        .then(result => {
            if (result.length > 0) {
                KATemps.load(result.data[0].id)
                .then(temps => {
                    resolve(temps)
                })
            } else {
                reject(new Error('ERR:AddTime'))
            }
        })
        .catch(reason => {
            reject(reason)
        })
    })
}

KATemps.getByUserAndProject = function(userId, projectId) {
    return new Promise((resolve, reject) => {
        const lesTemps = []
        if (DataUtils.empty(userId) && DataUtils.empty(projectId)) { resolve([]); return }
        kafetch(KAAL.url('Htime/_query'), {method: 'POST', body: JSON.stringify({'#and': { person: userId.toId(), project: projectId.toId() }})})
        .then(temps => {
            for (const t of temps.data) {
                lesTemps.push(KATemps.create(t))
            }
            resolve(lesTemps)
        })
        .catch(error => {
            reject(error)
        })
    })
}

KATemps.getByUserAndDate = function (userId, date) {
    return new Promise((resolve, reject) => {
        const lesTemps = []
        if (DataUtils.empty(userId) && DataUtils.empty(date)) { resolve([]); return }
        if (date instanceof Date) {
            date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }
        kafetch(KAAL.url('Htime/_query'), {method: 'POST', body: JSON.stringify({'#and': { person: userId.toId(), day: date }})})
        .then(temps => {
            if (!temps.data) { resolve([]); return }
            for(const t of temps.data) {
                lesTemps.push(KATemps.create(t))
            }  
            resolve(lesTemps)
        })
        .catch(error => {
            reject(error)
        })
    })
}

KATemps.prototype.set = function (key, value) {
    return this.data.set(key, value)
}

KATemps.prototype.get = function (key) {
    if (!this.data.has(key)) { return '' }
    return this.data.get(key)
}

KATemps.prototype.has = function (key) {
    return this.data.has(key)
}