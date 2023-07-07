function GroupStore(endpoint = null) {
    if (GroupStore._instance) { return GroupStore._instance }
    if (endpoint === null) { this.endpoint = `${KAAL.getBase()}/Group` }
    else { this.endpoint = endpoint }
    GroupStore._instance = this
}

GroupStore.prototype.formatEntry = function (group) {
    return {
        id: group.uid,
        value: group.uid,
        description: group.description,
        label: group.name.capitalize(),
        name: group.name.toAscii().toUpperCase(),
        icon: null,
        color: null,
        entry: group
    }
}

/**
 * Fetch a group by its name or id
 * @param {number|string} idOrName Id or name of the group to be fetch
 * @return {Promise.<object>} The group
 */
GroupStore.prototype.get = function (idOrName) {
    return new Promise((resolve, reject) => {
        (() => {
            if (typeof idOrName === 'string' && !/^[0-9]+$/.test(idOrName)) {
                return kafetch2(`${this.endpoint}/_query`, {body: {name: idOrName}, method: 'POST'})
            }
            return kafetch2(`${this.endpoint}/${idOrName}`)
        })()
        .then(group => {
            if (group.length <= 0) { return resolve(null) }
            return resolve(this.formatEntry(group[0]))
        })
        .catch(cause => {
            return reject(new Error('Group introuvable', {cause}))
        })
    })
}

GroupStore.prototype.query = function (term) {
    return new Promise((resolve, reject) => {
        if (typeof term === 'object') {
            term = Object.values(term)[0]
        } else if (term.length === 0) {
            term = String(term)
            term = '*'
        } else if (term.indexOf('*') !== -1) {
            term = String(term)
            term = `*${term}*`
        }
        kafetch2(`${this.endpoint}/_query`, {body: {'#or': {
            name: term,
            description: term
        }}, method: 'POST'})
        .then(groups => {
            return resolve(groups.map(e => this.formatEntry(e)))
        })
        .catch(cause => {
            reject(new Error('Erreur de rechercher', {cause}))
        })
    })
}

GroupStore.prototype.isNameUnique = function (groupOrName) {
    return new Promise((resolve, reject) => {
        if (typeof groupOrName === 'object') {
            groupOrName = groupOrName.name
        }

        this.get(groupOrName)
        .then(group => {
            if (group === null) { return resolve(true) }
            return resolve(false)
        })
        .catch(cause => {
            reject(new Error('Erreur', {cause}))
        })
    })

}

GroupStore.prototype.delete = function (idOrName) {
    return new Promise((resolve, reject) => {
        this.get(idOrName)
        .then(group => {
            return kafetch2(`${this.endpoint}/${group.uid}`, {method: 'DELETE'})
        })
        .then(result => {
            return resolve()    
        })
        .catch(cause => {
            return reject(new Error('Suppression impossible', {cause}))
        })

    })
}

GroupStore.prototype.set = function (group) {
    return new Promise((resolve, reject) => {
        this.isNameUnique(group)
        .then(isUnique => {
            if (!isUnique) { throw new Error('Nom déjà existant') }
            (() => {
                if (group.id || group.uid) {
                    if (group.id) { group.uid = group.id }
                    return kafetch2(`${this.endpoint}/${group.uid}`, {method: 'PATCH', body: {
                        name: group.name.toAscii().toUpperCase(),
                        description: group.description,
                        uid: group.uid
                    }})
                }
                return kafetch2(`${this.endpoint}`, {method: 'POST', body: {
                    name: group.name.toAscii().toUpperCase(),
                    description: group.description
                }})
            })()
            .then(uid => {
                return this.get(uid)
            })
            .then(group => {
                return resolve(group)
            })
        })
        .catch(cause => {
            return reject(new Error('Création ou édition du groupe échouée', {cause}))
        })
    })
}