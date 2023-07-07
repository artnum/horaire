function BXUserStore() {
}

BXUserStore.prototype.formatEntry = function (entry, bxid) {
    return {
        color: null,
        name: entry.name,
        label: entry.name,
        value: bxid,
        entry
    }
}

BXUserStore.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        if (id === undefined || id === null || id === false) { resolve(null); return }

        fetch(`${KAAL.getBase()}/PersonLink/_query`, {method: 'POST', body: JSON.stringify({service: 'bexio', extid: id})})
            .then(response => {
                if (!response.ok) { return { data: [], length: 0 } }
                return response.json()
            })
            .then(results => {
                if (results.length === 0) { return resolve(null) }
                const person = Array.isArray(results.data) ? results.data[0] : results.data
                return kafetch2(`${KAAL.getBase()}/Person/${person.uid}`)
            })
            .then(person => {
                if (person.length === 0) { return resolve(null) }
                return resolve(this.formatEntry(person[0], id))
            })
            .catch(error => {
                console.log(error)
            })
    })
}

BXUserStore.prototype.query = function (txt) {
    return new Promise((resolve, reject) => {
        if (typeof txt === 'object') { txt = Object.values(txt)[0] }
        Promise.all([
            kafetch2(`${KAAL.getBase()}/PersonLink/_query`, {method: 'POST', body: JSON.stringify({service: 'bexio'})}),
            kafetch2(`${KAAL.getBase()}/Person/_query`, {method: 'POST', body: JSON.stringify({name: txt})})
        ])
        .then(([bexioUsers, users]) => {
            users = users.map(e => {
                e.bxid = bexioUsers[bexioUsers.findIndex(bx => parseInt(bx.uid) === parseInt(e.id))]?.extid
                return e
            })
            console.log(users)
            return resolve(users.filter(u => u.bxid).map(u => this.formatEntry(u, u.bxid)))
        })
    })
}

BXUserStore.prototype.getIdentity = function (object) {
    return object.id
}