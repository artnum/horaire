function UserInteractUI () {
    this.eventTarget = new EventTarget()
}

UserInteractUI.prototype.run = function () {
    const klogin = new KLogin()
    klogin.getToken()
    .then(token => {
        if (token) {
            klogin.check(token)
            .then(() => {
                return klogin.getUser()
            })
            .then(userid => {
                return KAPerson.load(userid)
            })
            .then(user => {
                this.eventTarget.dispatchEvent(new CustomEvent('user-login', {detail: {userId: user.uid, workday: user.workday}}))
            })
            .catch(() => {
                this.listActive()
            })
        } else {
            this.listActive()
        }
    })
}

UserInteractUI.prototype.listActive = function () {
    KAPerson.listActive()
    .then(people => {
        const container = document.querySelector('.ka-main-top')
        for (const person of people) {
            const div = document.createElement('DIV')
            div.classList.add('ka-userbox')
            div.dataset.userId = person.uid
            div.innerHTML = `${person.get('name')}`
            window.requestAnimationFrame(() => {
                container.appendChild(div)
            })
            div.addEventListener('click', event => {
                this.showLogin(person.uid)
                //this.eventTarget.dispatchEvent(new CustomEvent('user-login', {detail: {userId: person.uid}}))
            })
        }
    })
}

UserInteractUI.prototype.showLogin = function (uid) {
    const container = document.querySelector('.ka-main-top')
    const userboxes = container.querySelectorAll('.ka-userbox')

    if (document.querySelector('.ka-login')) { return ; }

    for (const userbox of userboxes) {
        if (userbox.dataset.userId !== uid) {
            window.requestAnimationFrame(() => {
                userbox.style.setProperty('display', 'none')
            })
        }
    }

    const logForm = document.createElement('DIV')
    logForm.classList.add('ka-login')
    logForm.innerHTML = `
        <form data-user-id="${uid}"><input placeholder="Mot de passe" type="password" name="motdepasse">
        <button type="submit">Authentifier</button>
        <button type="reset">Annuler</button></form>
    `
    logForm.querySelector('form').addEventListener('submit', this.doLogin.bind(this))
    logForm.querySelector('form').addEventListener('reset', this.cancelLogin.bind(this))

    window.requestAnimationFrame(() => { container.appendChild(logForm) })
}

UserInteractUI.prototype.doLogin = function (event) {
    event.preventDefault()
    const container = document.querySelector('.ka-main-top')
    const userboxes = container.querySelectorAll('.ka-userbox')
    const formData = new FormData(event.target)
    let form = event.target
    while (form && form.nodeName !== 'FORM') { node = node.parentNode }
    const password = formData.get('motdepasse')

    const klogin = new KLogin()

    klogin.login(form.dataset.userId, password)
    .then(token => {
        return KAPerson.load(form.dataset.userId)
    })
    .then(user => {
        this.eventTarget.dispatchEvent(new CustomEvent('user-login', {detail: {userId: user.uid, workday: user.workday}}))
        MsgInteractUI('info', 'Authentification réussie')
        window.requestAnimationFrame(() => {
            for (const userbox of userboxes) {
                container.removeChild(userbox)
            }
        })
    })
    .catch(_ => {
        MsgInteractUI('error', 'Erreur d\'authentification')
        window.requestAnimationFrame(() => {
            for (const userbox of userboxes) {
                userbox.style.removeProperty('display')
            }
        })
    })
    .finally(() => {
        window.requestAnimationFrame(() => {
            form.parentNode.parentNode.removeChild(form.parentNode)
        })
    })
}

UserInteractUI.prototype.cancelLogin = function () {
    const container = document.querySelector('.ka-main-top')
    const userboxes = container.querySelectorAll('.ka-userbox')
    window.requestAnimationFrame(() => {
        for (const userbox of userboxes) {
            userbox.style.removeProperty('display')
        }
    })
    const login = container.querySelector('.ka-login')
    window.requestAnimationFrame(() => {
        container.removeChild(login)
    })

}

UserInteractUI.prototype.addEventListener = function (type, listener, options = {}) {
    this.eventTarget.addEventListener(type, listener, options)
}