function UserInteractUI () {
    this.eventTarget = new EventTarget()
}

UserInteractUI.prototype.run = function () {
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
    KAPerson.load(form.dataset.userId)
    .then(person => {
        const keyopt = person.get('keyopt').split(' ', 2)
        const hashedPassword = sjcl.codec.base64.fromBits(sjcl.misc.pbkdf2(password, sjcl.codec.base64.toBits(keyopt[1]), parseInt(keyopt[0]))) //=== this.entry.key) {
        if (hashedPassword === person.get('key')) {
            MsgInteractUI('info', 'Authentification réussie')
            this.eventTarget.dispatchEvent(new CustomEvent('user-login', {detail: {userId: person.uid}}))
            window.requestAnimationFrame(() => {
                for (const userbox of userboxes) {
                    container.removeChild(userbox)
                }
            })
        } else {
            MsgInteractUI('error', 'Erreur d\'authentification')
            window.requestAnimationFrame(() => {
                for (const userbox of userboxes) {
                    userbox.style.removeProperty('display')
                }
            })
        }

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