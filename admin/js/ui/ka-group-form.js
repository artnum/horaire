function UIKAGroupForm () {
    this.domNode = document.createElement('FORM')
    this.domNode.innerHTML = `
        <label for="name">Name</label><input name="name" placeholder="Nom du groupe" />
        <label for="description">Description</label><input name="description" placeholder="Description du groupe" />
        <button type="submit">Ajouter</button><button type="reset">Annuler</button>
    `
    this.evtTarget = new EventTarget()

    this.domNode.addEventListener('submit', event => {
        event.preventDefault()
        event.stopPropagation()
        const formData = new FormData(event.currentTarget)
        this.checkName(formData.get('name'))
        .then(([ok, error]) => {
            if (!ok) { this.showError('name', error); return }
            this.dispatchEvent(new CustomEvent('submit', {detail: formData}))
        })
    })
    this.domNode.addEventListener('reset', event => {
        event.preventDefault()
        this.dispatchEvent(new CustomEvent('reset'))
    })
}

UIKAGroupForm.prototype.addEventListener = function (type, listener, options) {
    this.evtTarget.addEventListener(type, listener, options)
}

UIKAGroupForm.prototype.removeEventListener = function (type, listener, options) {
    this.evtTarget.removeEventListener(type, listener, options)
}

UIKAGroupForm.prototype.dispatchEvent = function (event) {
    this.evtTarget.dispatchEvent(event)
}

UIKAGroupForm.prototype.checkName = function (name) {
    return new Promise(resolve => {
        name = String(name).trim()
        if (name.length < 3) { return resolve([false, 'Minimum 3 caractères']) }
        return resolve([true, ''])
    })
}

UIKAGroupForm.prototype.showError = function (name, text) {
    console.log(name)
    const node = this.domNode.querySelector(`*[name="${name}"]`)
    node.setCustomValidity(text)
    window.requestAnimationFrame(() => {
        node.classList.add('error')
    })
}

UIKAGroupForm.prototype.getGroups = function () {

}