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
    return Promise.resolve(sessionStorage.getItem('klogin-token'))
}

KLogin.prototype.getUser = function () {
    return Promise.resolve(sessionStorage.getItem('klogin-userid'))
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
        const token = sessionStorage.getItem('klogin-token')
        this.quit(token)
        .finally(() => {
            sessionStorage.removeItem('klogin-token')
            sessionStorage.removeItem('klogin-userid')
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
            sessionStorage.setItem('klogin-userid', userid)
            sessionStorage.setItem('klogin-token', token)
            resolve(token)
        })
        .catch(e => {
            reject(new Error('login error', {cause: e}))
        })
    })
}

/*
KLogin.prototype.logout = function () {
    return new Promise(resolve => {
        let base = window.location.pathname.split('/')
        while (!base[0]) { base.shift() }
        const url_root = `${window.location.origin}/${base.shift()}`

        const url = new URL(`${url_root}/Person/.bye`)
        fetch(url)
        .then(_ => {
            resolve()
        })
    })
}

KLogin.prototype.logged = function () {
    return new Promise(resolve => {
        let base = window.location.pathname.split('/')
        while (!base[0]) { base.shift() }
        const url_root = `${window.location.origin}/${base.shift()}`

        const url = new URL(`${url_root}/Person/.me`)
        fetch(url)
        .then(response => {
            if (!response.ok) { resolve(false) }
            return response.json()
        })
        .then (result => {
            if (result.length === 0) {
                resolve(false)
            } else {
                resolve(result.data[0])
            }
        })
    })
}

KLogin.prototype.doById = function (id, password) {
    function buf2b64(buffer) {
        let binary = ''
        const bytes = new Uint8Array(buffer)
        const len = bytes.byteLength
        for (var i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '.')
    }
    
    let base = window.location.pathname.split('/')
    while (!base[0]) { base.shift() }
    const url_root = `${window.location.origin}/${base.shift()}`
    const url = new URL(`${url_root}/Person/.auth1`)
    url.searchParams.append('id', id)
    return fetch(url)
    .then(response => {
        if (!response.ok) { throw new Error('auth') }
        return response.json()
    })
    .then(data => {
        if (data.length !== 1 || !data.success) { throw new Error('auth') }
        return data.data[0]
    })
    .then(user => {
        const [iteration, salt] = user.keyopt.split(' ', 2)
        const p = sjcl.codec.base64.fromBits(sjcl.misc.pbkdf2(password, sjcl.codec.base64.toBits(salt), parseInt(iteration)))
        return [p, user]
    })
    .then(([pass, user]) => {
        return crypto.subtle.importKey('raw', (new TextEncoder('utf-8')).encode(pass), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
            .then(key => {
                return crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, key, (new TextEncoder('utf-8')).encode(`${user.id} ${user.key}`))
            })
    })
    .then(authValue => {
        authValue = buf2b64(authValue)
        sessionStorage.setItem('k-auth-value', authValue)
        return authValue
    })
    .then(_ => {
        const url = new URL(`${url_root}/Person/.auth2`)
        return fetch(url)
    })
    .then(response => {
        if (!response.ok) {
            sessionStorage.removeItem('k-auth-value')
            throw new Error('auth')
        }
        return response.json()
    })
    .then(result => {
        if (result.length !== 1) { throw new Error('auth') }
        if (!result.data[0].ok) { throw new Error('auth') }
    })
}


KLogin.prototype.do = function (username, password) {
    return new Promise(resolve => {
        let base = window.location.pathname.split('/')
        while (!base[0]) { base.shift() }
        const url_root = `${window.location.origin}/${base.shift()}`

        let url = new URL(`${url_root}/Person/_query`)
        fetch(url, { method: 'POST', body: JSON.stringify({ username }) })
        .then((result) => {
            if (!result.ok) { throw new Error('auth') }
            return result.json()
        })
        .then((data) => {
            if (!data.success || data.length !== 1) { throw new Error('auth') }
            return data.data[0].id
        })
        .then(id => {
            return this.doById(id, password)
        })
        .catch(e => {
            console.log(e)
            alert('Authentification échouée')
        })
    })
}
*/