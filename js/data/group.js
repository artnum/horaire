function KAGroup (items, attribute = 'group') {
    this.data = new Map()
    this.ungrouped = []
    for (const item of items) {
        const groupName = item.get(attribute)
        this.add(groupName, item)
        item.set(attribute, this)
    }

    return new Proxy(this, {
        get(target, symbol) {
            if (symbol in target) {
                return target[symbol]
            }
            if (symbol === 'length') {
                let length = 0
                for (const [_, v] of target.data) {
                    length += v.length
                }
                return target.ungrouped.length + length
            }
            return target.get(symbol)
        }
    })
}

KAGroup.prototype.add = function (groupName, item) {
    if (groupName === '' || groupName === undefined || groupName === null) {
        return this.ungrouped.push(item)
    }
    if (!this.data.has(groupName)) {
        this.data.set(groupName, [])
    }
    return this.data.get(groupName).push(item)
}

KAGroup.prototype.get = function (groupName) {
    if (groupName === '' || groupName === undefined || groupName === null) {
        return this.ungrouped
    }
    return this.data.get(groupName)
}

KAGroup.prototype.gets = function () {
    if (this.ungrouped.length > 0) {
        return ['', ...this.data.keys()]
    }
    return this.data.keys()
}