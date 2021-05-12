function KED () {
    this.uri = null
    if (KAAL.ked === undefined) { return }
    if (KAAL.ked.api === undefined) { return }
    this.uri = KAAL.ked.api
}

function KEDPacket () {
    this.packet = new FormData()
    this.appId = 'kpck'
    this.uri = null
}

KEDPacket.prototype.appId = function (appId) {
    this.appId = appId
}

KEDPacket.prototype.endpoint = function (uri) {
    this.uri = new URL(uri)
}

KEDPacket.prototype.op = function (type) {
    switch (type) {
        default: this.packet.set('operation', type); break
    }
    return this
}
KEDPacket.prototype.path = function (path) {
    switch (path) {
        default: this.packet.set('path', path); break
    }
    return this
}

KEDPacket.prototype.details = function (name, value) {
    const appName = `${this.appId}:${name}`
    switch (name) {
        default: this.packet.append(appName, value); break
    }
    return this
}

KEDPacket.prototype.name = function (value) {
    this.packet.set('name', value)
    return this
}

KEDPacket.prototype.set = function (name, value) {
    this.packet.set(name, value)
    return this
}

KEDPacket.prototype.send = function () {
    return new Promise((resolve, reject) => {
        if (!this.uri) { reject('uri not set'); return }
        fetch(this.uri, {
            method: 'POST',
            body: this.packet
        })
        .then (response => {
            if (!response.ok) { return undefined }
            return response.json()
        })
        .then (json => {
            resolve(json)
        })
    })
}

KED.prototype.packet = function () {
    const p = new KEDPacket()
    p.endpoint (this.uri)
    return p
}

KED.prototype.createProject = function (id, reference, related) {
    if (this.uri === null) { return }
    const packet = this.packet()
    
    packet
        .op('create-tag')
        .path('')
        .name(reference)
        .set('related', [related])
        .send()
        .then(response => {
            console.log(response)
        })
        .catch(reason => { console.log(reason) })
}