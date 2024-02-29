function KAPI (endpoint) {
    const url = endpoint instanceof URL ? endpoint.toString() : String(endpoint)
    if (!KAPI._instances) { KAPI._instances = new Map() }
    if (KAPI._instances.has(url)) { return KAPI._instances.get(url) }
    this.url = url
    this.idname = ''
    KAPI._instances.set(url, this)
}

KAPI.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        fetch(`${this.url}/${id}`, {keepalive: true})
        .then(response => {
            return response.json()
        })
        .then(enveloppe => {
            if (this.idname === '' && enveloppe.idname !== '') {
                this.idname = enveloppe.idname
            }
            if (enveloppe.length === 1) {
                return resolve(Array.isArray(enveloppe.data) ? enveloppe.data[0] : enveloppe.data)
            }
            return resolve(false)
        })
        .catch(cause => {
            reject(new Error(`Get item ${id} failed`, {cause}))
        })
    })
}

KAPI.prototype.delete = function (id) {
    return new Promise((resolve, reject) => {
        fetch(`${this.url}/${id}`, {method: 'DELETE', keepalive: true})
        .then(response => {
            return response.json()
        })
        .then(enveloppe => {
            if (this.idname === '' && enveloppe.idname !== '') {
                this.idname = enveloppe.idname
            }
            if (enveloppe.length === 1) {
                return resolve(Array.isArray(enveloppe.data) ? enveloppe.data[0] : enveloppe.data)
            }
            return resolve(false)
        })
        .catch(cause => {
            reject(new Error(`Delete item ${id} failed`, {cause}))
        })
    })
}


KAPI.prototype.list = function () {
    return new Promise((resolve, reject) => {
        fetch(`${this.url}`, {keepalive: true})
        .then(response => {
            return response.json()
        })
        .then(enveloppe => {
            if (this.idname === '' && enveloppe.idname !== '') {
                this.idname = enveloppe.idname
            }
            if (enveloppe.length > 0) {
                return resolve(enveloppe.data)
            }
            return resolve([])
        })
        .catch(cause => {
            reject(new Error(`List collection failed`, {cause}))
        })
    })
}

KAPI.prototype.search = function (query) {
    return new Promise((resolve, reject) => {
        fetch(`${this.url}/_query`, {method: 'POST', body: JSON.stringify(query), keepalive: true})
        .then(response => {
            return response.json()
        })
        .then(enveloppe => {
            if (this.idname === '' && enveloppe.idname !== '') {
                this.idname = enveloppe.idname
            }
            if (enveloppe.length > 0) {
                return resolve(enveloppe.data)
            }
            return resolve([])
        })
        .catch(cause => {
            reject(new Error(`Search query failed`, {cause}))
        })
    })
}

KAPI.prototype.query = KAPI.prototype.search

KAPI.prototype.write = function (body, id = null) {
    return new Promise((resolve, reject) => {
        const url = id === null ? this.url : `${this.url}/${id}`
        if (id !== null && this.idname !== '' && body[this.idname] === undefined) {
            body[this.idname] = id
        }
        fetch(url, {method: id === null ? 'POST' : 'PATCH', body: JSON.stringify(body), keepalive: true})
        .then(response => {
            return response.json()
        })
        .then(enveloppe => {
            if (this.idname === '' && enveloppe.idname !== '') {
                this.idname = enveloppe.idname
            }
            if (enveloppe.length !== 1) { throw new Error(enveloppe.message) }
            return this.get(Array.isArray(enveloppe.data) ? enveloppe.data[0].id : enveloppe.data.id)
        })
        .then(object => {
            return resolve(object)
        })
        .catch(cause => {
            reject(new Error(`Write faile ${id}`, {cause}))
        })
    })
}

KAPI.prototype.overwrite = function (body, id = null) {
    return new Promise((resolve, reject) => {
        const url = id === null ? this.url : `${this.url}/${id}`
        fetch(url, {method: 'POST', body: JSON.stringify(body), keepalive: true})
        .then(response => {
            return response.json()
        })
        .then(enveloppe => {
            if (this.idname === '' && enveloppe.idname !== '') {
                this.idname = enveloppe.idname
            }
            if (enveloppe.length !== 1) { throw new Error(enveloppe.message) }
            return this.get(Array.isArray(enveloppe.data) ? enveloppe.data[0].id : enveloppe.data.id)
        })
        .then(object => {
            return resolve(object)
        })
        .catch(cause => {
            reject(new Error(`Overwrite failed ${id}`, {cause}))
        })
    })
}

KAPI.prototype.execute = function (functionName, params = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${this.url}/.${functionName}`)
        Object.keys(params).forEach(k => url.searchParams.append(k, params[k]))
        fetch(url, {keepalive: true})
        .then(response => {
            return response.json()
        })
        .then(data => {
            data.__request = {
                name: functionName,
                params: params
            }
            return resolve(data)
        })
        .catch(cause => {
            reject(new Error(`Execute ${functionName} failed`, {cause}))
        })
    })
}