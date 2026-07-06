function UIKAProjectForm () {
    this.projectType = 'project'
    this.domNode = document.createElement('FORM')
    this.domNode.innerHTML = `
        <fieldset name="general" class="half">
            <legend>Général</legend>
            <label for="reference">Numéro de chantier : </label><input name="reference" type="text"><br>
            <br><label for="year">Année : </label><input name="year" value="${(new Date()).getFullYear()}" type="text"><br>
            <label for="name">Nom : </label><input name="name" type="text"><br>
            <label for="price">Prix de vente HT : </label><input name="price" type="text"><br>
            <label for="manager">Chef projet : </label><input name="manager"><br>
            <label for="uncount">Heures non-comptabilisées : </label><input name="uncount" type="checkbox"><br>
            <label for="client">Client : </label><div name="client"></div><br>

            <button type="submit" name="add">Ajouter</button>
        </fieldset>
    `

    this.domNode.addEventListener('submit', event => {
        event.preventDefault()
        return this.addProject(event.currentTarget)
    })

    const KAContactUI = new UIKAContact()
    const node = this.domNode.querySelector('div[name="client"]')
    window.requestAnimationFrame(() => {
        node.parentNode.replaceChild(KAContactUI.domNode, node)
    })

    this.manager = this.domNode.querySelector('input[name="manager"]')
    const klogin = new KLogin()
    klogin.getUser()
    .then(userid => {
        this.manager.value = userid
        new KSelectUI(this.manager, new STPerson(), { realSelect: true, allowFreeText: false })

    })
    this.reference = this.domNode.querySelector('input[name="reference"]')
    const buttons = [
        new KAButton('Projet', {group: 'ptype', selected: true}),
        new KAButton('Régie', {group: 'ptype'})
    ]

    buttons[0].addEventListener('submit', _ => {
        this.projectType = 'project'
        this.setProjectReference()
    })
    buttons[1].addEventListener('submit', _ => {
        this.projectType = 'regie'
        this.setProjectReference()
    })

    buttons.reverse().forEach(button => {
        window.requestAnimationFrame(() => this.reference.parentNode.insertBefore(button, this.reference.nextElementSibling))
    })


    this.setProjectReference()
}

UIKAProjectForm.prototype.setProjectReference = function () {
    return new Promise((resolve, reject) => {
        this.getNextReference()
        .then(({project, regie}) => {
            if (this.projectType === 'project') {
                this.reference.value = project
                return resolve(project)
            }
            this.reference.value = regie
            return resolve(regie)
        })
        .catch(cause => {
            reject(new Error('Erreur de chargement des références', {cause}))
        })
    })
}

UIKAProjectForm.prototype.getNextReference = function () {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Project/.nextReferences`)
        .then(r => {
            resolve({project: r[0].project, regie: r[0].regie})
        })
        .catch(cause => {
            reject(new Error('Erreur de chargement des références', {cause}))
        })
    })
}

UIKAProjectForm.prototype.addProject = function () {
    this.getNextReference()
    .then(({project, regie}) => {
        const data = new FormData(this.domNode)
        
        const body = {
            reference: this.projectType === 'project' ? project : regie,
            year: data.get('year'),
            manager: this.manager.dataset.value,
        }
        console.log(body)
    })
}
