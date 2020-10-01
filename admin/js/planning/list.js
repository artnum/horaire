/* double-linked list ... not sure if it is good enough but ok for now */
function DLList () {
    this._first = null
    this._last = null
    this._current = null
    this.length = 0
}

DLList.prototype.add = function (entry) {
    let node = {data: entry, next: null, previous: null}
    this._current = node
    if (this._first === null) {
        this._first = node
        this._last = node
    } else {
        this._last.next = node
        node.previous = this._last
        this._last = node
    }
    this.length++
}

DLList.prototype.getAtIndex = function (idx) {
    let node = this._first
    for (let i = 0; i !== idx; i++ ) {
        node = node.next
    }
    this._current = node
    return node.data
}

DLList.prototype.rewind = function () {
    this._current = this._first
    if (!this._current) {
        return null
    }
    return this._current.data
}

DLList.prototype.first = function () {
    if (!this._first) {
        return null
    }
    this._current = this._first
    return this._current.data
}

DLList.prototype.next = function () {
    if (!this._current) {
        return null
    }
    this._current = this._current.next
    if (!this._current) {
        return null
    }
    return this._current.data
}

DLList.prototype.pop = function () {
    if (!this._last) {
        return null
    }
    this._current = this._last.previous
    if (this._current === null) {
        this.length = 0
        this._first = null
        this._last = null
        return null
    }
    this._current.next = null
    let d = this._last.data
    this._last = this._current
    this.length--
    return d
}

DLList.prototype.getCurrent = function () {
    if (!this._current) {
        return null
    }
    return this._current.data
}

DLList.prototype.removeCurrent = function () {
    if (!this._current) {
        return null
    }
    let node = this._current
    if (node.next) {
        node.next.previous = node.previous
    }
    if (node.previous) {
        node.previous.next = node.next
    }

    return node.data
}

DLList.prototype.setCurrent = function (node) {
    if (!this._current) {
        return null
    }
    this._current.data = node
    return this._current.data
}