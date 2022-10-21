function KLogin (base = null) {
    this.base = base || window.location
}

KLogin.prototype.getUserid = function (username) {
    return new Promise((resolve, reject) => {
        fetch (new URL('auth.php/userid', this.base), {method: 'POST', body: JSON.stringify({username})})
        .then(response => {
            if (!response.ok) { return reject(new Error('login error')) }
            return response.json()
        })
        .then(result => {
            if (result.error) { return reject(new Error('login error')) }
            resolve(result.userid)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.init = function (userid) {
    return new Promise((resolve, reject) => {
        fetch (new URL('auth.php/init', this.base), {method: 'POST', body: JSON.stringify({userid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('login error')) }
            return response.json()
        })
        .then(result => {
            if (result.error) { return reject(new Error('login error')) }
            resolve(result)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.genToken = function (params, password) {
    return new Promise ((resolve, reject) => {
        const key = sjcl.codec.base64.fromBits(sjcl.misc.pbkdf2(password, sjcl.codec.base64.toBits(params.salt), parseInt(params.count)))
        crypto.subtle.importKey('raw', new TextEncoder().encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign'])
        .then(key => {
            return crypto.subtle.sign({name: 'HMAC'}, key, new TextEncoder().encode(`${params.auth}`))
        })
        .then(rawtoken => {
            resolve([...new Uint8Array(rawtoken)]
                .map(x => x.toString(16).padStart(2, '0'))
                .join(''))
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.getToken = function () {
    return Promise.resolve(localStorage.getItem('klogin-token'))
}

KLogin.prototype.getUser = function () {
    return Promise.resolve(localStorage.getItem('klogin-userid'))
}

KLogin.prototype.check = function (token) {
    return new Promise((resolve, reject) => {
        fetch (new URL('auth.php/check', this.base), {method: 'POST', body: JSON.stringify({auth: token})})
        .then(response => {
            if (!response.ok) { return reject(new Error('login error')) }
            return response.json()
        })
        .then(result => {
            if (!result.done) { return reject(new Error('login error'))}
            resolve(token)
        })
    })
}

KLogin.prototype.quit = function (token) {
    return fetch(new URL('auth.php/quit', this.base), {method: 'POST', body: JSON.stringify({auth: token})})
}

KLogin.prototype.logout = function () {
    return new Promise(resolve => {
        const token = localStorage.getItem('klogin-token')
        this.quit(token)
        .finally(() => {
            localStorage.removeItem('klogin-token')
            localStorage.removeItem('klogin-userid')
            resolve()
        })
    })
}

KLogin.prototype.login = function (userid, password) {
    return new Promise((resolve, reject) => {
        this.init(userid)
        .then(params => {
            return this.genToken(params, password)
        })
        .then(token => {
            return this.check(token)
        })
        .then(token => {
            localStorage.setItem('klogin-userid', userid)
            localStorage.setItem('klogin-token', token)
            resolve(token)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.disconnect = function (userid) {
    return new Promise((resolve, reject) => {
        return fetch (new URL('auth.php/disconnect', this.base), {method: 'POST', body: JSON.stringify({userid: userid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('Cannot disconnect')) }
            return response.json()
        })
        .then(result => {
            resolve(result.userid)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

KLogin.prototype.getActive = function (userid) {
    return new Promise((resolve, reject) => {
        fetch (new URL('auth.php/active', this.base), {method: 'POST', body: JSON.stringify({userid: userid})})
        .then(response => {
            if (!response.ok) { return reject(new Error('Cannot get active connection')) }
            return response.json()
        })
        .then(result => {
            if (!result.connections) { return reject(new Error('Cannot get active connection'))}
            resolve(result.connections)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}