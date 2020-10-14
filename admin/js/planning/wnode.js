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
    this.TSegs = []
    this.TSegsId = []

    /* one wnode is head, in that case, _next is first and _previous is last */
    this._head = null
    this._next = null
    this._previous = null
    this.time = 0.0
    this._generateDom()

    let proxy = new Proxy(this, {
        set: (object, property, value) => {
            if (object.hasOwnProperty(property)) {
                object[property] = value
                return true
            }
            switch (property) {
                default: object.domNode[property] = value; return true
            }
            return false
        },
        get: (object, property) => {
            switch (property) {
                case 'id': return object.getId()
            }
            let retval = Reflect.get(object, property)
            if (retval !== undefined) {
                if (typeof(retval) === 'function') {
                    retval.bind(object)
                }
            } else if ((retval = Reflect.get(object['domNode'], property)) !== undefined) {
                if (typeof(retval) === 'function') {
                    retval.bind(object['domNode'])
                }
            } else {
                retval = Reflect.get(object.data, property)
            }
            return retval
        }
    })
    this._register(proxy)
    return proxy
}

WNode.idFromTSeg = function (tseg) {
    if (tseg === undefined) { return }
    return `${tseg.person}+${tseg.date}`
}

WNode.getWNodeByDomNode = function (domNode) {
    if (KAAL.wnodes === undefined) { return null }
    for (const value of Object.values(KAAL.wnodes)) {
        if (value.domNode === domNode) { return value }
    }
    return null
}

WNode.getWNodeById = function (id) {
    if (KAAL.wnodes === undefined) { return null }
    for (const value of Object.values(KAAL.wnodes)) {
        if (value.getId() === id) {
            return value
        }
    }
    return null
}

WNode.prototype.gotoDate = function (date) {
    let c = null
    if (this._head === null) {
        c = this._next
    } else {
        c = this._head._next       
    }
    while (c !== null) {
        if (c.date.toISOString().split('T')[0] === date) { return c }
        c = c._next
    }
}

WNode.prototype.addEventListener = function (event, callback, options) {
    switch (event) {
        default: this.domNode.addEventListener(event, (event) => { callback(event) }, options); break
    }
}

WNode.prototype._register = function (proxy) {
    if (KAAL.wnodes === undefined) {
        KAAL.wnodes = {}
    }
    KAAL.wnodes[this.getId()] = proxy
}

WNode.prototype._unregister = function () {
    if (KAAL.wnodes === undefined) { return; }
    if (!KAAL.wnodes[this.getId()]) { return }
    delete KAAL.wnodes[this.getId()]

}

WNode.prototype._generateDom = function () {
    this.domNode.setAttribute('draggable', 'true')
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
        return `${this.data.personId}+${this.data.date.toISOString().split('T')[0]}`
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
    if (typeof node.addToDom === 'function') {
        node.addToDom(this.domNode)
    } else {
        window.requestAnimationFrame(() => this.domNode.appendChild(node))    
    }
}

WNode.prototype.highlight = function () {
    window.requestAnimationFrame(() => this.domNode.classList.add('highlight'))
}

WNode.prototype.nolight = function () {
    windows.requestAnimationFrame(() => this.domNode.classList.remove('highlight'))
}

WNode.prototype.fill = function (time) {
    if (KAAL.work.getDay() - this.time < KAAL.work.getMin()) {
        return false
    }
    this.time += time
    return true    
}

WNode.prototype.hasPlace = function (time) {
    let person = this.getPerson()
    if (person.daytime - this.time >= time) {
        return true
    }
    return true
}

WNode.prototype.leftTime = function () {
    let person = this.getPerson()
    return person.daytime - this.time
}

WNode.prototype.addTSeg = function (tseg) {
    if (this.TSegsId.indexOf(tseg.id) !== -1) { return } // don't add already added tseg
    this.TSegsId.push(tseg.id)
    if (tseg.order === 0) {
        tseg.order = this.TSegs.push(tseg)
        tseg.commit()
    } else {
        let pos = tseg.order - 1
        if (this.TSegs[pos] !== undefined) {
            let nextSlot = pos + 1
            while (this.TSegs[nextSlot] !== undefined) {
                nextSlot++
            }
            this.TSegs[nextSlot] = this.TSegs[pos]
            this.TSegs[nextSlot].order = nextSlot + 1
            this.TSegs[nextSlot].commit()
            this.TSegs[pos] = tseg
        }
    }
    
    let before = this.TSegs[tseg.order]
    if (before !== undefined) { before = before.domNode}
    this.time += tseg.time
    this.domNode.insertBefore(tseg.domNode, before)
}

/* to extend */
WNode.prototype.getPerson = function () {
    let head = this._head
    if (head === null) { head = this }
    return { id: head.data.personId, efficiency: head.data.efficiency, daytime: KAAL.work.getDay('s') }
}

WNode.prototype.weekDay = function () {
    return Math.pow(2, this.date.getDay())
}