function WNode (personId, date = null) {
    this.domNode = document.createElement('DIV')
    if (date === null) {
        this.domNode.id = `${personId}+head`
    } else {
        this.domNode.id = `${personId}+${date.toISOString().split('T')[0]}`
    }
    this.data = {
        date: date,
        personId: personId
    }
    this._generateDom()
    this._register()

    let proxy = new Proxy(this, {
        set: (object, property, value) => {
            console.log(object,property)
            if (object.hasOwnProperty(property)) {
                object[property] = value
                return
            }
            switch (property) {
                default: object.domNode[property] = value; return
            }
        },
        get: (object, property) => {
            let retval = Reflect.get(object, property)
            if (retval) {
                if (typeof(retval) === 'function') {
                    retval.bind(object)
                }
            } else {
                retval = Reflect.get(object['domNode'], property)
                if (typeof(retval) === 'function') {
                    retval.bind(object['domNode'])
                }
            }
            return retval
        }
    })
    return proxy
}

WNode.idFromTSeg = function (tseg) {
    return `${tseg.get('person')}+${tseg.get('date')}`
}

WNode.getWNodeByDomNode = function (domNode) {
    if (KAAL.wnodes === undefined) { return null }
    for (const value of Object.values(KAAL.wnodes)) {
        if (value.domNode === domNode) { return value }
    }
    return null
}

WNode.prototype.addEventListener = function (event, callback, options) {
    switch (event) {
        default: this.domNode.addEventListener(event, callback.bind(this), options); break
    }
}

WNode.prototype._register = function () {
    if (KAAL.wnodes === undefined) {
        KAAL.wnodes = {}
    }
    KAAL.wnodes[this.getId()] = this
}

WNode.prototype._unregister = function () {
    if (KAAL.wnodes === undefined) { return; }
    if (!KAAL.wnodes[this.getId()]) { return }
    delete KAAL.wnodes[this.getId()]

}

WNode.prototype._generateDom = function () {
    this.domNode.classList.add('box')
    if (this.data.date === null) {
        this.domNode.classList.add('user')
    } else {
        if (this.data.date.getDay() === 0 || this.data.date.getDay() === 6) {
            this.domNode.classList.add('weekend')
        }
        this.domNode.classList.add('day', 'wnode')
    }
}

WNode.prototype.getId = function () {
    if (this.data.date === null) {
        return `${this.data.personId}+head`
    } else {
        return `${this.data.personId}-${this.data.date.toISOString().split('T')[0]}`
    }
}

WNode.prototype.delete = function () {
    this._unregister()
    window.requestAnimationFrame(() => this.domNode.parentNode.removeChild(this.domNode))
}

WNode.prototype.getDomNode = function () {
    return this.domNode
}

WNode.prototype.addToDom = function (parent) {
    window.requestAnimationFrame(() => parent.appendChild(this.getDomNode()))
}

WNode.prototype.appendChild = function (node) {
    if (node instanceof WNodes) {
        node.addToTom(this.domNode)
    } else {
        window.requestAnimationFrame(() => this.domNode.appendChild(node))    
    }

}