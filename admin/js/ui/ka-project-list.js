function UIKAProjectList () {
    this.currentSearchValue = ''
    this.currentState = 'open'
    this.currentOffset = 0
    this.selectedState = 'open'
    this.lastResultCount = 0
    this.limit = 50
    this.offset = 0
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('ka-project-list-container')
    this.domNode.innerHTML = `
        <div class="ka-search-box">
            <input type="text" title="Utiliser 'terme1 OU terme2' pour rechercher un projet content soit terme1 ou terme2"  placeholder="Rechercher un projet"></input>
        </div>
        <div class="ka-navigation"></div>
        <div class="ka-project-list">
            <div class="ka-project ka-project-header">
                <span class="reference"><i class="fas fa-sort-up sort"></i> <i class="fas fa-sort-down sort"></i> Référence</span>
                <span class="name"><i class="fas fa-sort-up sort"></i> <i class="fas fa-sort-down sort"></i> Nom</span>
                <span class="client"><i class="fas fa-sort-up sort"></i> <i class="fas fa-sort-down sort"></i> Client</span>
                <span class="manager"><i class="fas fa-sort-up sort"></i> <i class="fas fa-sort-down sort"></i>Responsable</span>
                <span class="tooling"></div>
            </div>
        </div>
    `

    this.navigation = this.domNode.querySelector('div.ka-navigation')

    const buttons = [
        new KAButton('Ouvert', {group: 'state', selected: true}),
        new KAButton('Fermé', {group: 'state'}),
        new KAButton('Tous', {group: 'state'})
    ]

    buttons[0].addEventListener('submit', _ => {
        this.selectedState = 'open'
        this.offset = 0
        this.doSearchEvent(this.currentSearchValue)
    })
    buttons[1].addEventListener('submit', _ => {
        this.selectedState = 'close'
        this.offset = 0
        this.doSearchEvent(this.currentSearchValue)
    })
    buttons[2].addEventListener('submit', _ => {
        this.selectedState = 'any'
        this.offset = 0
        this.doSearchEvent(this.currentSearchValue)
    })

    this.searchBox = this.domNode.querySelector('.ka-search-box input')
    this.searchBox.addEventListener('keyup', event => {
        let value = event.currentTarget.value
        if (value === ''){
            value = '*' 
        }
        if (value !== this.currentSearchValue) {
            this.offset = 0
        }
        this.doSearchEvent(value)
    })

    this.searchBox.parentNode.appendChild(buttons[0])
    this.searchBox.parentNode.appendChild(buttons[1])
    this.searchBox.parentNode.appendChild(buttons[2])

    this.projectList = this.domNode.querySelector('.ka-project-list')

    Array.from(this.projectList.querySelectorAll('span'))
        .forEach(element => {
            element.addEventListener('click', event => {
                const header = event.currentTarget
                if (!header.dataset.sorted) { asc = true}
                else if (header.dataset.sorted === 'asc') { asc = false }
                else { asc = true }

                for (let node = header.parentNode.firstElementChild; node; node = node.nextElementSibling) {
                    window.requestAnimationFrame(() => { delete node.dataset.sorted })
                }

                window.requestAnimationFrame(() => {
                    if (asc) { header.dataset.sorted = 'asc' }
                    else { header.dataset.sorted = 'desc' }
                })

                this.sort(event.currentTarget.classList.item(0), asc)
            })
        })
}

UIKAProjectList.prototype.renderNavigation = function () {
    const prev = document.createElement('A')
    prev.innerHTML = '<i class="fas fa-angle-double-left"></i> Précédent'
    if (this.offset <= 0) {
        prev.classList.add('inactive')
    }
    prev.addEventListener('click', _ => {
        if (this.offset <= 0) { return }
        this.offset -= this.limit
        this.doSearchEvent(this.currentSearchValue)
    })
    const next = document.createElement('A')
    if (this.lastResultCount < this.limit) {
        next.classList.add('inactive')
    }
    next.innerHTML = `Suivant <i class="fas fa-angle-double-right"></i>`
    next.addEventListener('click', _ => {
        if (this.lastResultCount < this.limit) { return }
        this.offset += this.limit
        this.doSearchEvent(this.currentSearchValue)
    })
    window.requestAnimationFrame(() => {
        this.navigation.innerHTML = `<span>de ${this.offset} à ${this.limit + this.offset}</span>`
        this.navigation.insertBefore(prev, this.navigation.firstElementChild)
        this.navigation.appendChild(next)
    })
}

UIKAProjectList.prototype.sort = function (by, asc = true) {
    let i = 0
    const a = Array.from(this.projectList.querySelectorAll(`span.${by}`))
        .sort((a, b) => {
            return String(a.textContent).toLocaleLowerCase().localeCompare(String(b.textContent).toLocaleLowerCase())
        })

        if (!asc) { a.reverse() }

        a.forEach(element => {
            if (!element.parentNode.id) { return }
            const order = ++i
            window.requestAnimationFrame(() => {
                element.parentNode.style.order = order
            })
        })
        
}

UIKAProjectList.prototype.doSearchEvent = _debounce(function (value) {
    this.textSearch(value)
}, 250)

UIKAProjectList.prototype.render = function (projects) {
    return new Promise(resolve => {
        for(let node = this.projectList.firstElementChild; node;) {
            if (!node.id) { node = node.nextElementSibling; continue }
            const nextSibling = node.nextElementSibling
            if (projects.findIndex(p => parseInt(p.id) === parseInt(node.id.split('-')[1]) === -1)) {
                const n = node
                window.requestAnimationFrame(() => { if (n && n.parentNode) { n.parentNode.removeChild(n) }} )
            }
            node = nextSibling
        }
        this.renderNavigation()
        Promise.allSettled(projects.map(project => {
            this.renderProject(project)
            .then(domNode => {
                return this.insertProjectNode(domNode)
            })
        }))
        .then(() => resolve())
    })
}

UIKAProjectList.prototype.textSearch = function (text) {
    window.requestAnimationFrame(() => {
        this.projectList.classList.add('loading')
    })
    if (this.currentSearchValue === text 
        && this.currentState === this.selectedState
        && this.currentOffset === this.offset) { return }
    this.currentSearchValue = text
    this.currentState = this.selectedState
    this.currentOffset = this.offset
    const expr = KQueryExpr.fromString(text, {attribute: ['name', 'reference']})
    const query = {deleted: '--'}
    if (this.selectedState === 'open') { query.closed = '--' }
    else if (this.selectedState === 'close') { query.closed = '*' }
    expr.merge(query)
    this.search(expr.object())
    .then(projects => this.render(projects))
    .then(_ => window.requestAnimationFrame(() => this.projectList.classList.remove('loading')))
}

UIKAProjectList.prototype.toggleProjectFolding = function (domNode) {
    const projectId = domNode.id.split('-')[1]
    for(const node of this.projectList.querySelectorAll('.ka-project[data-open="1"]')) {
        window.requestAnimationFrame(() => node.dataset.open = '0')
    }
    if (domNode.dataset.open === '1') { 
        return window.requestAnimationFrame(() => domNode.dataset.open = '0')
    }
    window.requestAnimationFrame(() => domNode.dataset.open = '1')
    this.loadTravaux(projectId)
    .then(travaux => {
        return [travaux.map(travail => this.renderTravail(travail)), this.renderGroup(travaux)]
    })
    .then(([nodes, groups]) => {
        if (nodes.length === 0) { return }
        const parent = domNode.querySelector('div.travail')
        if (!parent.firstElementChild) {
            const supheader = document.createElement('DIV')
            supheader.classList.add('ka-group', 'ka-group-supheader')
            supheader.innerHTML =         `
                <span class="reference">Référence</span>
                <span class="meeting">Rendez-vous</span>
                <span class="contact">Contact</span>
                <span class="phone">Téléphone</span>
                <span class="description">Description</span>
                <span class="tooling"></span>
            `
            parent.appendChild(supheader)
        }
        Promise.all(groups.map(group => new Promise(resolve => window.requestAnimationFrame(() => { 
            const prevNode = parent.querySelector(`div[data-group="${group.dataset.group}"]`)
            if (prevNode) {
                parent.replaceChild(group, prevNode)
                return resolve()
            }
            parent.appendChild(group); 
            resolve() 
        }))))
        .then(_ => {
            nodes.forEach(node => {
                const group = parent.querySelector(`div[data-group="${node.dataset.mygroup}"]`)
                const prevNode = document.getElementById(node.id)
                if (prevNode) {
                    return window.requestAnimationFrame(() => parent.replaceChild(node, prevNode))
                }
                if (!group) {
                    return  window.requestAnimationFrame(() => parent.appendChild(node))
                }
                window.requestAnimationFrame(() => parent.insertBefore(node, group.nextElementSibling))
            })
        })
    })
}

/**
 * Create a DIV element from a project object
 * @param {object} project A project object
 * @returns {Promise.<HTMLElement>}
 */
UIKAProjectList.prototype.renderProject = function (project) {
    return new Promise(resolve => {
        const domNode = document.createElement('DIV')
        domNode.id = `project-${project.id}`
        domNode.classList.add('ka-project')

        domNode.innerHTML = `
            <span class="reference">${project.reference ?? ''}</span>
            <span class="name">${project.name ?? ''}</span>
            <span class="client">${project.client?.displayname ?? ''}</span>
            <span class="manager">${project.manager?.name ?? ''}</span>
            <span class="tooling">
                <button class="onhover" data-action="add-work">Ajout travail</button>
                <button class="onhover" data-action="edit">Éditer</button>
                <button class="onhover" data-action="export">Exporter</button>
                <button class="onhover" data-action="print">Imprimer</button>
                <button class="onopen" data-action="${project.closed ? 'open' : 'close'}">${project.closed ? 'Ouvrir' : 'Clore'}</button>
                <button class="onopen" data-action="delete">Supprimer</button>
            </span>
            <div class="travail">
            </div>
        `
        domNode.addEventListener('click', event => {
            this.toggleProjectFolding(event.currentTarget)
        })

        Array.from(domNode.querySelectorAll('button'))
            .forEach(button => {
                button.addEventListener('click', event => {
                    event.stopPropagation()
                    this.buttonInteractWithProject(project.id, button.dataset.action)
                })
            })

        return resolve(domNode)    
    })
}

UIKAProjectList.prototype.buttonInteractWithProject = function (projectId, interaction) {
    switch(interaction) {
        case 'edit': return this.editProject(projectId)
        case 'export': return this.exportProject(projectId)
        case 'print': return this.printProject(projectId)
        case 'close': return this.closeProject(projectId)
        case 'open': return this.openProject(projectId)
        case 'delete': return this.deleteProject(projectId)
        case 'add-work': return this.addTravailToProject(projectId)
    }
}

UIKAProjectList.prototype.exportProject = function (projectId) {
    return Admin.getUrl('admin/exec/export/project.php', { pid: projectId })
    .then(url => {
      window.open(url)
    })
}

UIKAProjectList.prototype.printProject = function (projectId) {
    return Admin.getUrl('admin/exec/export/bon.php', { pid: projectId })
    .then(url => {
      window.open(url)
    })
}

UIKAProjectList.prototype.loadTravaux = function (projectId) {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Travail/_query`, {method: 'POST', body: JSON.stringify({project: projectId, closed: '0'})})
        .then(travaux => {
            Promise.allSettled(travaux.map(t => t.status)
                .filter(t => !isIdEmpty(t))
                .filter((t, index, array) => { return array.indexOf(t) === index })
                .map(t => {
                    return kafetch2(`${KAAL.kairos.url}/store/Status/${t}`)
                }))
            .then(status => {
                status = status.filter(s => s.status === 'fulfilled')
                    .map(s => s.value)
                    .flat()
                return resolve(travaux
                    .map(t => {
                        if (isIdEmpty(t.status)) { 
                            t.status = {color: 'white'}
                            return t 
                        }
                        t.status = status[status.findIndex(s => parseInt(s.id) === parseInt(t.status))]
                        return t
                    })
                    .map(t => {
                        if (isStringEmpty(t.group)) { t.group = 'Général'}
                        return t
                    }))
            })            
        })
    })
}

UIKAProjectList.prototype.renderTravail = function (travail) {
    const domNode = document.createElement('DIV')
    domNode.style.setProperty('--status-color', travail.status.color)
    domNode.classList.add('ka-group', 'ka-group-content')
    domNode.id = `travail-${travail.id}`
    domNode.dataset.mygroup = String(travail.group).toLowerCase()
    domNode.innerHTML = `
        <span class="reference"><i class="fas fa-square" style="color: var(--status-color);"></i>${travail.reference ?? ''}</span>
        <span class="meeting">${travail.meeting ?? ''}</span>
        <span class="contact">${travail.contact ?? ''}</span>
        <span class="phone">${travail.phone ?? ''}</span>
        <span class="description">${travail.description ?? ''}</span>
        <span class="tooling">
            <button class="onhover" data-action="edit">Éditer</button>
            <button class="onhover" data-action="print">Imprimer</button>
            <button class="onhover" data-action="delete">Supprimer</button>
        </span>
    `
    return domNode
}

UIKAProjectList.prototype.renderGroup = function (travaux) {
    const a = travaux
            .filter((travail, index, array) => {
                return array.findIndex(t => t.group === travail.group) === index
            })
            .map(travail => travail.group)
            .filter(group => group !== '' && group !== null && group !== undefined)
    .flat()
    if (a.length === 1) { return [] }
    return a.map(group => {
            const node = document.createElement('DIV')
            node.classList.add('ka-group-header', 'ka-group')
            group = String(group)
            node.dataset.group = group.toLowerCase()
            node.innerHTML = `<span>${group}</span>`
            return node
        })
}

UIKAProjectList.prototype.removeProjectNode = function (projectId) {
    const node = document.getElementById(`project-${projectId}`)
    if (node) {
        window.requestAnimationFrame(() => node.parentNode.removeChild(node))
    }
}

UIKAProjectList.prototype.insertProjectNode = function (domNode) {
    return new Promise(resolve => {
        const prevNode = document.getElementById(domNode.id)
        let openIt = false
        if (prevNode && prevNode.dataset.open === '1') {
            openIt = true
        }
        new Promise(resolve => {
            window.requestAnimationFrame(() => {
                /* use interaction can make prevNode have disappeard from page at
                that point. Request it again. */
                const prevNode = document.getElementById(domNode.id)
                if (prevNode) {
                    prevNode.parentNode.replaceChild(domNode, prevNode)
                    return resolve()
                }
                this.projectList.appendChild(domNode)
                return resolve()
            })
        })
        .then(_ => {
            if (openIt) {
                this.toggleProjectFolding(domNode)
            }
            return resolve()
        })
    })
}

/**
 * Associate a project with its client and manager.
 * @param {object} project Project object
 */
UIKAProjectList.prototype.associateProject = function (project) {
    return new Promise((resolve, reject) => {
        console.log(project)
        const requests = []
        if (project.client !== '' 
                && project.client !== null
                && project.client !== undefined) {
            requests.push(kafetch2(`${KAAL.getBase()}/${project.client}`))
        } else {
            requests.push(Promise.resolve(null))
        }
        if (project.manager !== ''
                && project.manager !== null 
                && project.manager !== undefined 
                && !isNaN(parseInt(project.manager))
                && parseInt(project.manager) !== 0) {
            requests.push(kafetch2(`${KAAL.getBase()}/Person/${project.manager}`))
        }
        if (requests.length === 0) { 
            project.client = ''
            project.manager = ''
            return resolve(project) 
        } else {
            requests.push(Promise.resolve(null))
        }
        Promise.all(requests)
        .then(([client, manager]) => {
            
            if (client) { project.client = client[0] }
            if (manager) { project.manager = manager[0] }
            return resolve(project)
        })
        .catch(cause => {
            reject(new Error('Erreur', {cause}))
        })
    })
}

/**
 * Execute a search query an return a list of object with associated clients and manager
 * @param {object} query A search query object
 * @returns {Promise.<array.<object>>} An array of project object
 */
UIKAProjectList.prototype.search = function (query = {}) {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Project/_query?limit=${this.offset},${this.limit}&sort.created=DESC`, {method: 'POST', body: JSON.stringify(query)})
        .then(projects => {
            this.lastResultCount = projects.length
            const clients = projects
                .filter((project, index, array) => {
                    if (project.client === null) { return false }
                    return array.findIndex(p => p.client === project.client) === index
                })
                .map(project => project.client)
            const managers = projects
                .filter((project, index, array) => {
                    if (project.manager === null) { return false }
                    return array.findIndex(p => parseInt(p.manager) === parseInt(project.manager)) === index
                })
                .map(project => parseInt(project.manager))
                .filter(m => m !== 0)
            

            Promise.all(
                [Promise.allSettled(clients.map(client => kafetch2(`${KAAL.getBase()}/${client}`)))
                .then(responses => {
                    return responses
                        .filter(r => r.status === 'fulfilled')
                        .map(r => r.value[0])
                        .filter(r => r !== undefined && r !== null)
                }),
                Promise.allSettled(managers.map(manager => kafetch2(`${KAAL.getBase()}/Person/${manager}`)))
                .then(responses => {
                    return responses
                        .filter(r => r.status === 'fulfilled')
                        .map(r => r.value[0])
                        .filter(r => r !== undefined && r !== null)
                })]
            )
            .then(([clients, managers]) => {
                projects = projects
                    .map(p => {
                        p.manager = managers.find(m => parseInt(m.id) === parseInt(p.manager))
                        if (p.manager === undefined) { p.manager = null }
                        return p
                    })
                    .map(p => {
                        p.client = clients.find(c => String(p.client).endsWith(String(c.uid)))
                        if (p.client === undefined) { p.client = null }
                        return p
                    })    
                return resolve(projects)
            })
        })
        .catch(cause => {
            return reject(new Error('Erreur chargement des project', {cause}))
        })
    })
}
/**
 * Set project status to close
 * @param {number} projectId Id of the project
 * @returns {Promise.<undefined>}
 */
UIKAProjectList.prototype.closeProject = function (projectId) {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Project/${projectId}`, {method: 'PATCH', body: JSON.stringify({id: projectId, closed: (new Date()).toISOString()})})
            .then(_ => this.removeProjectNode(projectId))
            .then(_ => resolve())
            .catch(cause => reject(new Error('Erreur fermeture du project', {cause})))
    })
}

/**
 * Set project status to open
 * @param {number} projectId Id of the project
 * @returns {Promise.<undefined>}
 */
UIKAProjectList.prototype.openProject = function (projectId) {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Project/${projectId}`, {method: 'PATCH', body: JSON.stringify({id: projectId, closed: null})})
            .then(_ => this.removeProjectNode(projectId))
            .then(_ => resolve())
            .catch(cause => reject(new Error('Erreur ouverture du project', {cause})))
    })
}

/**
 * Set project status to deleted
 * @param {number} projectId Id of the project
 * @returns {Promise.<undefined>}
 */
UIKAProjectList.prototype.deleteProject = function (projectId) {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Project/${projectId}`, {method: 'DELETE'})
            .then(_ => this.removeProjectNode(projectId))
            .then(_ => resolve())
            .catch(cause => reject(new Error('Erreur suppression du project', {cause})))
    })
}

/**
 * Show an edit box for project content
 * @param {number} projectId ID of the project ot edit
 * @returns 
 */
UIKAProjectList.prototype.editProject = function (projectId) {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Project/${projectId}`)
        .then(project => {
            if (project.length !== 1) { throw new Error('Erreur chargement project')}
            project = project[0]

            const popup = window.Admin.popup(`
                <form>
                    <input type="hidden" value="${project.id}" name="project" />
                    <label for="reference">Numéro de chantier : </label><input name="reference" type="text" value="${project.reference ?? ''}" />
                    <label for="name">Nom : </label><input name="name" type="text" value="${project.name ?? ''}"/><br>
                    <label for="price">Prix de vente HT : </label><input name="price" type="text" value="${project.price ?? ''}"/>
                    <label for="manager">Chef de projet : </label><input name="manager" type="text" value="${project.manager ?? ''}"/><br>
                    <fieldset name="address"><legend>Adresse</legend></fieldset>
                    <button type="submit">Sauver</button><button type="reset">Annuler</button>
                </form>`,
                `Projet ${project.reference} - ${project.name}`
            )
            const managerSelect = new KSelectUI(popup.querySelector('input[name="manager"]'), new STPerson(), { realSelect: true, allowFreeText: false })
            const form = popup.getElementsByTagName('FORM')[0]
            form.addEventListener('keydown', event => {
                Array.from(form.querySelectorAll('label.inerror'))
                    .forEach(node => {
                        window.requestAnimationFrame(() => node.classList.remove('inerror'))
                    })
            })
            form.addEventListener('mousedown', event => {
                Array.from(form.querySelectorAll('label.inerror'))
                    .forEach(node => {
                        window.requestAnimationFrame(() => node.classList.remove('inerror'))
                    })
            })
            form.addEventListener('reset', () => popup.close() )
            form.addEventListener('submit', event => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                const project = {
                    id: projectId,
                    name: data.get('name'),
                    reference: data.get('reference'),
                    price: data.get('price'),
                    manager: managerSelect.value
                }
                this.checkProjectData(project)
                .then(project => {
                    return kafetch2(`${KAAL.getBase()}/Project/${projectId}`, {method: 'POST', body: JSON.stringify(project)})
                    .then(projectResult => {
                        return kafetch2(`${KAAL.getBase()}/Project/${projectResult[0].id}`)
                    })
                    .then(project => {
                        return this.associateProject(project[0])
                    })
                    .then(project => {
                        return this.renderProject(project)
                    })
                    .then(node => {
                        return this.insertProjectNode(node)
                    })
                    .then(_ => {
                        popup.close()
                        resolve()
                    })
                })
                .catch(cause => {
                    const label = form.querySelector(`label[for="${cause.cause}"]`)
                    window.requestAnimationFrame(() => {
                        label.classList.add('inerror')
                    })
                    new MsgInteractUI('error', cause.message)
                })
            })
        })
        .catch(cause => {
            reject(new Error('Erreur', {cause}))
        })
    })
}

UIKAProjectList.prototype.checkProjectData = function (project) {
    return new Promise((resolve ,reject) => {
        if (isFloatEmpty(project.price)) { 
            if (parseFloat(project.price) !== 0.0) {
                return reject(new Error('Pas de prix', {cause: 'price'})) 
            }
        }
        if (isIdEmpty(project.manager)) { return reject(new Error('Pas de chef de projet', {cause: 'manager'})) }
        if (isStringEmpty(project.reference)) { return reject(new Error('Pas de référence', {cause: 'reference'})) }
        if (isStringEmpty(project.name)) { return reject(new Error('Pas de nom', {cause: 'name'})) }
        return resolve(project)
    })
}

UIKAProjectList.prototype.checkTravailData = function (travail) {
    return new Promise((resolve, reject) => {
        if (isIdEmpty(travail.status)) { return reject(new Error('Pas de processus', {cause: 'status'})) }
        if (isStringEmpty(travail.reference)) { return reject(new Error('Pas de référence', {cause: 'reference'})) }
        if (isStringEmpty(travail.begin)) { return reject(new Error('Pas de début souhaité', {cause: 'begin'})) }
        if (isStringEmpty(travail.end)) { return reject(new Error('Pas de fin souhaitée', {cause: 'end'})) }

        if (isIntEmpty(travail.force)) {
            travail.force = 0
        }
        if (isIntEmpty(travail.time)) { 
            travail.time = 0
        }

        return resolve(travail)
    })
}

UIKAProjectList.prototype.addTravailToProject = function (projectId) {
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Project/${projectId}`)
        .then(project => {
            project = project[0]
            const popup = window.Admin.popup(`
                <form>
                    <label for="reference">Référence : </label><input name="reference" type="text" value="" /> 
                    <label for="meeting">Rendez-vous :</label><input name="meeting" type="text" value="" />
                    <br>
                    <label for="contact">Personne de contact : </label><input name="contact" type="text" value="" /> 
                    <label for="phone">Téléphone : </label><input name="phone" type="text" value=""/>
                    <br>
                    <label for="group">Sous-chantier: </label><input name="group" type="text" value=""/> 
                    <label for="process">Processus : </label><input name="status" value=""></input>
                    <br>
                    <label for="begin">Début souhaité :</label><input name="begin" type="date" value=""/>
                    <label for="end">Fin souhaitée : </label><input name="end" type="date" value=""/>
                    <br>
                    <label for="time">Temps total du projet : <input name="time" type="text" value=""></label>
                    <label for="force">Nombre de personne : <input name="force" type="text" value="" /></label><br>
                    <label for="description>">Description du travail</label><br>
                    <textarea name="description"></textarea><br>
                    <button type="submit">Sauver</button><button name="print" type="button">Sauver et imprimer</button><button type="reset">Annuler</button>
                </form>`, 
                `Travail pour ${project.reference} - ${project.name}`
            )

            KATravail.getByProject(project.id)
            .then(travaux => {
                new KAList(popup.querySelector('input[name="group"]'), new KAGroup(travaux))
            })
            const statusSelect = new KSelectUI(popup.querySelector('input[name="status"]'), new STProcess(), { realSelect: true, allowFreeText: false })
            const form = popup.getElementsByTagName('form')[0]
            form.addEventListener('reset', _ => {
                popup.close()
            })
            form.addEventListener('submit', event => {
                event.preventDefault()
                data = new FormData(event.currentTarget)
                const travail = {
                    reference: data.get('reference'),
                    description: data.get('description'),
                    meeting: data.get('meeting'),
                    contact: data.get('contact'),
                    phone: data.get('phone'),
                    status: statusSelect.value,
                    group: data.get('group'),
                    begin: data.get('begin'),
                    end: data.get('end'),
                    time: data.get('time'),
                    force: data.get('force'),
                    description: data.get('description'),
                    project: projectId
                }
                console.log(travail)

                this.checkTravailData(travail)
                .then(travail => {
                })
            })
        })
    })

}

async function newTravailPopup(params) {
    let query
    if (params.travail) {
      query = new Promise((resolve, reject) => {
        Artnum.Query.exec(Artnum.Path.url(`Travail/${params.travail}`)).then((result) => {
          if (!result.success || result.length !== 1) { reject(new Error('La mission est inexistante')); return }
          let travail = Array.isArray(result.data) ? result.data[0] : result.data
          Artnum.Query.exec(Artnum.Path.url(`Project/${params.project}`)).then((result) => {
            if (!result.success || result.length !== 1) { reject(new Error('Le project est inexistant')); return }
            resolve({ project: Array.isArray(result.data) ? result.data[0] : result.data, travail: travail })
          })
        })
      })
    } else if (params.project) {
      query = new Promise((resolve, reject) => {
        Artnum.Query.exec(Artnum.Path.url(`Project/${params.project}`)).then((result) => {
          if (!result.success || result.length !== 1) { reject(new Error('Le projet est inexistant')); return }
          result.data = Array.isArray(result.data) ? result.data[0] : result.data
          resolve({ project: result.data, travail: { id: '', reference: params.first ? result.data.reference : '', meeting: '', contact: '', phone: '', description: '', time: 0 } })
        })
      })
    } else {
      return;
    }
    query.then((result) => {
      let project = result.project
      let travail = result.travail

      let time = (travail.time ? parseInt(travail.time) : 0) / 3600
      let popup = window.Admin.popup(`<form>
      <label for="subref">Référence : </label><input name="subref" type="text" value="${travail.reference}" /> <label for="meeting">Rendez-vous :</label><input name="meeting" type="text" value="${travail.meeting}" /><br>
      <label for="contact">Personne de contact : </label><input name="contact" type="text" value="${travail.contact}" /> <label for="cphone">Téléphone : </label><input name="cphone" type="text" value="${travail.phone}"/><br>
      <label for="group">Sous-chantier: </label><input name="group" type="text" value="${$i(travail.group)}"/> <label for="process">Processus : </label>
      <input name="status" value="${travail.status ?? ''}"></input>
      <br>
      <label for="begin">Début souhaité :</label><input name="begin" type="date" value="${travail.begin ? travail.begin : ''}"/><label for="end">Fin souhaitée : </label><input name="end" type="date" value="${travail.end ? travail.end : ''}"/><br>
      <label for="time">Temps total du projet : <input name="time" type="text" value="${time}"></label><label for="force">Nombre de personne : <input name="force" type="text" value="${travail.force ? travail.force : 1}" /></label><br>
      <label for="description>">Description du travail</label><br>
      <textarea name="description">${travail.description ? travail.description : ''}</textarea><br>
      <button type="submit">Sauver</button><button name="print" type="button">Sauver et imprimer</button><button type="reset">Annuler</button>
    </form>`, `Travail pour ${project.reference} - ${project.name}`)

      const s = new KSelectUI(popup.querySelector('input[name="status"]'), new STProcess(), { realSelect: true, allowFreeText: false })


      KATravail.getByProject(project.id)
        .then(travaux => {
          new KAList(popup.querySelector('input[name="group"]'), new KAGroup(travaux))
        })

      let form = popup.getElementsByTagName('form')[0]
      form.addEventListener('reset', (event) => {
        let p = event.target
        while (!p.classList.contains('popup')) {
          p = p.parentNode
        }
        p.dispatchEvent(new CustomEvent('close'))
      })

      form.addEventListener('click', (event) => {
        if (event.target.nodeName === 'BUTTON' && event.target.name === 'print') {
          let node = event.target
          while (node && node.nodeName !== 'FORM') { node = node.parentNode }
          form.dispatchEvent(new CustomEvent('submit', { bubbles: true, cancelable: true, target: node, detail: { print: true } }))
        }
      })
      form.addEventListener('submit', (event) => {
        event.preventDefault()
        let content = window.Admin.getForm(event.target)
        let mapping = { group: 'group', project: 'project', description: 'description', subref: 'reference', meeting: 'meeting', contact: 'contact', cphone: 'phone', time: 'time', end: 'end', begin: 'begin', force: 'force', status: 'status' }
        let data = travail.id !== '' ? { id: travail.id } : {}
        for (let i in mapping) {
          data[mapping[i]] = '' // init to empty string
          switch (i) {
            default:
              if (!content[i]) { break }
              data[mapping[i]] = content[i]
              break
            case 'begin':
            case 'end':
              if (!content[i]) { break }
              data[mapping[i]] = content[i].split('T')[0]
              break
            case 'force':
              if (!content[i]) { data[mapping[i]] = 1.0; break }
              data[mapping[i]] = parseFloat(content[i])
              break
            case 'time':
              if (!content[i]) { data[mapping[i]] = 1.0; break }
              let exp = /([0-9]+(?:[\.,][0-9]+)?)\s*([jJsS]?)/
              let m
              if ((m = exp.exec(content[i])) !== null) {
                let x = parseFloat(m[1].replace(',', '.'))

                switch (m[2]) {
                  case 's':
                  case 'S':
                    x *= APPConf.weekhours
                    break
                  case 'j':
                  case 'J':
                    x *= APPConf.workday
                    break
                }
                data[mapping[i]] = x * 3600 // stored in second
              } else {
                data[mapping[i]] = 1.0
              }
              break
          }
        }
        Artnum.Query.exec(Artnum.Path.url(`Travail/${travail.id}`), { method: travail.id !== '' ? 'PUT' : 'POST', body: data }).then((result) => {
          if (result.success) {
            let tid = result.data[0].id
            let p = event.target
            while (!p.classList.contains('popup')) {
              p = p.parentNode
            }
            p.dispatchEvent(new CustomEvent('close'))
            UIKADisplayProject(project)
              .then(kaproject => {
                showHideTravaux(kaproject.id, true)
                if (event.detail && event.detail.print) {
                  const klogin = new KLogin(KAAL.getBase())
                  const url = new URL('admin/exec/export/bon.php', KAAL.getBase())
                  url.searchParams.append('pid', kaproject.id)
                  url.searchParams.append('tid', tid)
                  klogin.getShareableToken(url.toString())
                  .then(token => {
                    url.searchParams.append('access_token', `${token}`)
                    window.open(url)
                  })
                }
              })
          } else {
            alert('Une erreur est survenue')
          }
        })
      })
    })
  }