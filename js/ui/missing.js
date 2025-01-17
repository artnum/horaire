function Missing() {
    if (Missing._instance) {
        return Missing._instance
    }
    Missing._instance = this
}

Missing.prototype.init = function () {
    return new Promise((resolve, _) => {
        fetch(KAAL.missing.url)
        .then(response => {
            if(response.ok) { return response.json() }
            return null
        })
        .then(missing => {
            if (missing === null) { return }
            this.data = missing
            return
        }) 
        .then(_ => {
            resolve()
        })
        .catch(reason => {
            this.none = true
            console.error(reason)
            resolve()
        })
    })
}

Missing.prototype.isMissing = function(userid) {
    if (this.none) { return false }
    if (!this.data) { return false }
    if (!this.data.ids) { return false }
    if(this.data.ids.find(element => parseInt(element) === parseInt(userid)) !== undefined) {
        return true
    }
    return false
}