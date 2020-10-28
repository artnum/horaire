function TSeg(args) {
    this.data = {
        order: 0
    }
    this.saved = false
    this.deleted = false
    this.accessed = 0
    this.segs = null
    this.domNode
    this.modified = performance.now()
    
    for (let k in args) {
        this.data[k] = args[k]
    }
    
    let proxy = new Proxy(this, {
        set: (object, property, value) => {
            object.lastSet = performance.now()
            if (object.hasOwnProperty(property)) {
                object[property] = value
                return true
            } else if (Reflect.get(object['data'], property) !== undefined) {
                object['data'][property] = value
                object.modified = performance.now() // modification on data need to be sent back
                object.saved = false
                return true 
            } else if(property === 'domNode') {
                object.domNode = value
            }
            switch (property) {
                default: object.domNode[property] = value; return
            }
        },
        get: (object, property) => {
            let retval = Reflect.get(object, property)
            if (retval !== undefined) {
                if (typeof (retval) === 'function') {
                    retval.bind(object)
                }
            } else if (Reflect.get(object['data'], property) !== undefined) {
                retval = Reflect.get(object['data'], property)
            } else {
                retval = Reflect.get(object['domNode'], property)
                if (typeof (retval) === 'function') {
                    retval.bind(object['domNode'])
                }
            }
            return retval
        }
    })
    this._generateDom()
    return proxy
}

TSeg.prototype._generateDom = function () {
    if (this.lastSet && this.lastDom) {
        if (this.lastSet < this.lastDom) {
            return this.domNode
        }
    }
    this.lastDom = performance.now()
    let node = document.createElement('DIV')
    this.removeDom()
    let height = this.time * 100 / KAAL.work.getDay()
    node.id = this.domId()
    node.classList.add('travailMark')
    node.style.maxHeight = `calc(${height}% - 4px)`
    node.style.minHeight = `calc(${height}% - 4px)`
    node.style.height = `calc(${height}% - 4px)`
    node.innerHTML = '&nbsp;'
    this.domNode = node
    return this.domNode
}

TSeg.prototype._label = function () {
    new Promise ((resolve,reject) => {
        new Promise ((resolve, reject) => {
            KAAL.fetch(new URL(this.travail, KAAL.getBase())).then(response => {
                if (!response.ok) { reject('Server error') }
                response.json().then(result => {
                    if (result.length === 1) {
                        resolve(result.data)
                    }
                }, reason => reject(reason))
            }, reason => reject(reason))
        }).then(travail => {
            KAAL.fetch(new URL(`Project/${travail.project}`, KAAL.getBase())).then(response => {
                if (response.ok) {
                    response.json().then(result => {
                        if (result.length === 1) {
                            travail.project = Object.assign({}, result.data)
                            resolve(travail)
                        }
                    })
                }
            })
        })
    }).then(travail => {
        window.requestAnimationFrame(() => { 
            this.innerHTML = `${travail.project.reference} | ${travail.description}<br>
            Temps ${this.time / 3600} h`
        })
    })
}

TSeg.prototype.draw = function () {
    let currentParent = this.domNode
    let nextNode = this.domNode.nextElementSibling

    this._generateDom()
    this._label()
}

/* Normalize time on efficiency of 1.0 */
TSeg.prototype.normTime = function () {
    let efficiency = 1.0
    if (this.efficiency) {
        efficiency = this.efficiency
    }
    /*      T1
     * Te = -- => T1 = Te * E
     *      E
     */
    return this.time * efficiency
}

TSeg.prototype.lock = function () {
    this.locked = true
}

TSeg.prototype.unlock = function () {
    this.locked = false
}

TSeg.prototype.copy = function (from) {
    this.travail = from.travail
    this.efficiency = from.efficiency
    this.time = from.time
    this.person = from.person
    this.details = from.details
    this.date = from.date
    this.color = from.color
    this.saved = false
    this._label()
    this._generateDom()
    return this
}

TSeg.prototype.fromObject = function (o) {
    if (o.id) {
        this.data.dbId = o.id
    }
    this.data.id = this.domId()
    /* keep id in sync with their dom */
    if (this.domNode.id !== this.data.id) { this.domNode.id = this.data.id }

    if (o.date) {
        this.data.date = o.date
    }
    if (o.travail) {
        this.data.travail = `Travail/${o.travail}`
    }
    if (o.person) {
        this.data.person = `Person/${o.person}`
    }
    if (o.time) {
        this.data.time = parseFloat(o.time)
    }
    if (o.efficiency) {
        this.data.efficiency = parseFloat(o.efficiency)
    }
    if (o.color) {
        this.data.color = o.color
    }
    if (o.details) {
        if (typeof o.details === 'string') {
            o.details = JSON.parse(o.details)
        }
        if (o.details.order) { this.data.order = o.details.order }
    }
    this.saved = performance.now()
    this._label() // trigger label 
    this._generateDom()
    return this
}

TSeg.prototype.duplicate = function () {
    let newTseg = this.toObject()
    newTseg.deleted = false
    newTseg.saved = false
    newTseg.locked = false
    newTseg.id = null
    return (new TSeg()).fromObject(newTseg)
}

TSeg.prototype.toObject = function () {
    let o = {}
    if (this.data.dbId !== null) { o.id = this.data.dbId }
    if (this.data.date) { o.date = this.data.date }
    if (this.data.person) {
        o.person = this.data.person.split('/')[1]
    }
    if (this.data.travail) {
        o.travail = this.data.travail.split('/')[1]
    }
    if (this.data.time) {
        o.time = this.data.time
    }
    if (this.data.color) {
        o.color = this.data.color
    }
    if (this.data.efficiency) {
        o.efficiency = this.data.efficiency
    }

    o.details = {}
    o.details.order = this.data.order

    return o
}

TSeg.prototype.toJson = function () {
    let object = this.toObject()
    object.details = JSON.stringify(object.details)
    return JSON.stringify(object)
}

TSeg.prototype.delete = function () {
    this.deleted = performance.now()
}

TSeg.prototype.refresh = function (tseg) {
    this.fromObject(tseg.toObject())
}

/* commit return true if tseg must be kept and false if not */
TSeg.prototype.commit = function () {
    return new Promise((resolve, reject) => {
        if (this.deleted && this.data.dbId) {
            fetch(RelURL(`TSeg/${this.data.dbId}`), { credential: 'include', headers: { 'X-Request-Id': new Date().getTime() }, method: 'DELETE' })
                .then((response) => {
                    resolve(false) // handle error later
                })
        } else if (this.deleted && !this.data.dbId) {
            resolve(false)
        } else if (this.saved && this.data.dbId) {
            resolve(true) // is saved
        } else if (!this.saved && this.data.dbId) {
            fetch(RelURL(`TSeg/${this.data.dbId}`),
                {
                    credential: 'include',
                    headers: { 'X-Request-Id': new Date().getTime() },
                    method: 'PUT',
                    body: this.toJson()
                }).then((response) => {
                    if (response.ok) {
                        response.json().then((data) => {
                            this.saved = performance.now()
                            resolve(true)
                        })
                    } else {
                        resolve(false)
                    }
                })
        } else if (!this.saved && !this.data.dbId) {
            fetch(RelURL(`TSeg`),
                {
                    credential: 'include',
                    headers: { 'X-Request-Id': new Date().getTime() },
                    method: 'POST',
                    body: this.toJson()
                }).then((response) => {
                    if (response.ok) {
                        response.json().then((data) => {
                            this.saved = performance.now()
                            this.data.dbId = data.data[0].id
                            resolve(true)
                        })
                    } else {
                        resolve(false)
                    }
                })
        }
    })
}

TSeg.prototype.domId = function () {
    if (this.data.dbId === undefined) {
        this.data.id = KAAL.domId()
    } else {
        this.data.id = `tseg-${this.data.dbId}`
    }
    return this.data.id
}

TSeg.prototype.removeDom = function () {
    if (this.domNode) {
        let d = this.domNode
        delete this.domNode
        window.requestAnimationFrame(() => {
            if (d.parentNode) {
                d.parentNode.removeChild(d)
            }
        })
    }
}

TSeg.prototype.addToDom = function (parent) {
    parent.appendChild(this.domNode)
}

TSeg.prototype.appendChild = function (node) {
    if (typeof node.addToDom === 'function') {
        node.addToDom(this.domNode)
    } else {
        window.requestAnimationFrame(() => this.domNode.appendChild(node))    
    }
}

TSeg.prototype.light = function (level) {
    let light = 'light'
    switch (level) {
        default:
        case 0: case '0': light += '0'; break
        case 1: case '1': light += '1'; break
        case 2: case '2': light += '2'; break
        case 3: case '3': light += '3'; break
    }
    window.requestAnimationFrame(() => this.domNode.classList.add(light))
}

TSeg.prototype.lowlight = function () {
    window.requestAnimationFrame(() => this.domNode.classList.add('lowlight'))
}

TSeg.prototype.highlight = function () {
    window.requestAnimationFrame(() => this.domNode.classList.add('highlight'))
}

TSeg.prototype.nolight = function () {
    window.requestAnimationFrame(() => this.domNode.classList.remove('highlight', 'lowlight', 'light0', 'light1', 'light2', 'ligth3'))
}

TSeg.prototype.addEventListener = function (event, callback, options) {
    switch (event) {
        default: this.domNode.addEventListener(event, callback.bind(this), options); break
    }
}