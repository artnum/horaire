const DataUtils = {
    toId (uid) {
        if (typeof uid === 'number') return String(uid)
        uid = String(uid)
        return uid.split('/').pop()
    },
    empty (value) {
        if (value === undefined) { return true }
        if (value === null || value === '') { return true }
        return false
    },
    str (value) {
        if (value === undefined) { return '' }
        if (value === null) { return '' }
        return String(value)
    },
    html (value) {
        return value
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('/', '&#47;')
            .replaceAll(/(?:\r\n|\r|\n)/g, '<br>')
    }
}

const KAGenericProxy = {
    get (target, symbol) {
        if (symbol in target) { return target[symbol] }
        if (symbol === 'id' || symbol === 'uid') { return target.uid }
        const value = target.get(symbol)
        return value
    },
    set (target, symbol, value) {
        if (symbol in target) { return target[symbol] = value }
        return target.set(symbol, value)
    },
    has (target, symbol) {
        return target.has(symbol)
    },
    ownKeys (target) {
        return target.data.keys()
    }
}

/* sanitize for html */
function $s(value) {
    return DataUtils.html(DataUtils.str(value))
}

/* sanitize for input, textarea */
function $i(value) {
    return DataUtils.str(value)
}

Number.prototype.toId = function () {
    return DataUtils.toId(this) 
}

String.prototype.toId = function () {
    return DataUtils.toId(this)
}