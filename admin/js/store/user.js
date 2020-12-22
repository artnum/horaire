function UserStore(base, minLevel = 256) {
    this.base = base
    this.minLevel = minLevel
}

UserStore.prototype.get = function (id) {
    console.log(id)
    return new Promise((resolve, reject) => {
        let entry = {label: '', value: ''}
        let url = new URL(`${this.base}/${id}`)
        fetch(url).then(response => {
            if (!response.ok) { resolve(entry); return }
            response.json().then(result => {
                if (result.length !== 1) { resolve(entry); return }
                entry = Array.isArray(result.data) ? result.data[0] : result.data
                resolve({label: entry.name, value: entry.id})
            }, _ => resolve(entry))
        }, _ => resolve(entry))
    })
}

UserStore.prototype.query = function(value) {
    return new Promise((resolve, reject) => {
        let entries = []
        let url = new URL(this.base)   
        url.searchParams.append('search.name', `~${value}%`)
        url.searchParams.append('search.disabled', 0)
        fetch(url).then(response => {
            if (!response.ok) { resolve(entries); return; }
            response.json().then(result => {
                for (let i = 0; i < result.length; i++) {
                    let entry = result.data[i]
                    if (parseInt(entry.level) > this.minLevel) { continue; }
                    let name = entry.name.toLowerCase().toAscii()
                    let s = name.indexOf(value.toLowerCase().toAscii())
                    if (s !== -1) {
                        name = `${entry.name.substring(0, s)}<span class="match">${entry.name.substring(s, s + value.length)}</span>${entry.name.substring(s + value.length)}`
                    }
                    entries.push({
                        label: name,
                        value: entry.id
                    })
                    
                }
                resolve(entries)
            }, _ => resolve(entries))
        }, _ => resolve(entries))
    })
}