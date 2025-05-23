import { ProjectAPI } from "./$script/src/JAPI/Project.js"
import Debounce  from "./$script/admin/lib/debounce.js"

export default class UIKAProjectList {
    constructor(parentNode) {
        if (!parentNode) {
            this.parentNode = document.body
        } else {
            this.parentNode = parentNode
        }
        this.currentSearchValue = ''
        this.currentState = 'any'
        this.currentOffset = 0
        this.selectedState = 'any'
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
            new KAButton('Ouvert', { group: 'state' }),
            new KAButton('Fermé', { group: 'state' }),
            new KAButton('Tous', { group: 'state', selected: true })
        ]

        buttons[0].addEventListener('submit', _ => {
            this.selectedState = 'open'
            this.offset = 0
            this.doSearchEvent(this.currentSearchValue, true)
        })
        buttons[1].addEventListener('submit', _ => {
            this.selectedState = 'close'
            this.offset = 0
            this.doSearchEvent(this.currentSearchValue, true)
        })
        buttons[2].addEventListener('submit', _ => {
            this.selectedState = 'any'
            this.offset = 0
            this.doSearchEvent(this.currentSearchValue, true)
        })

        this.searchBox = this.domNode.querySelector('.ka-search-box input')
        this.searchBox.addEventListener('keyup', event => {
            let value = event.currentTarget.value
            if (value === '') {
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
        this.projectListHeader = this.projectList.firstElementChild

        Array.from(this.projectList.querySelectorAll('span'))
            .forEach(element => {
                element.addEventListener('click', event => {
                    const header = event.currentTarget
                    if (!header.dataset.sorted) { asc = true} 
                    else if (header.dataset.sorted === 'asc') { asc = false} 
                    else { asc = true} 

                    for (let node = header.parentNode.firstElementChild; node; node = node.nextElementSibling) {
                        window.requestAnimationFrame(() => { delete node.dataset.sorted })
                    }

                    window.requestAnimationFrame(() => {
                        if (asc) { header.dataset.sorted = 'asc'} 
                        else { header.dataset.sorted = 'desc'} 
                    })

                    this.sort(event.currentTarget.classList.item(0), asc)
                })
            })
    }
    resetSortHeader() {
        for (let node = this.projectListHeader.firstElementChild; node; node = node.nextElementSibling) {
            requestAnimationFrame(() => delete node.dataset.sorted)
        }
    }
    renderNavigation() {
        const prev = document.createElement('A')
        prev.innerHTML = '<i class="fas fa-angle-double-left"></i> Précédent'
        if (this.offset <= 0) {
            prev.classList.add('inactive')
        }
        prev.addEventListener('click', _ => {
            if (this.offset <= 0) { return} 
            this.offset -= this.limit
            this.doSearchEvent(this.currentSearchValue, true)
        })
        const next = document.createElement('A')
        if (this.lastResultCount < this.limit) {
            next.classList.add('inactive')
        }
        next.innerHTML = `Suivant <i class="fas fa-angle-double-right"></i>`
        next.addEventListener('click', _ => {
            if (this.lastResultCount < this.limit) { return} 
            this.offset += this.limit
            this.doSearchEvent(this.currentSearchValue, true)
        })
        window.requestAnimationFrame(() => {
            this.navigation.innerHTML = `<span>de ${this.offset} à ${this.limit + this.offset}</span>`
            this.navigation.insertBefore(prev, this.navigation.firstElementChild)
            this.navigation.appendChild(next)
        })
    }
    sort(by, asc = true) {
        let i = 0
        const a = Array.from(this.projectList.querySelectorAll(`span.${by}`))
            .sort((a, b) => {
                return String(a.textContent).toLocaleLowerCase().localeCompare(String(b.textContent).toLocaleLowerCase())
            })

        if (!asc) { a.reverse()} 

        a.forEach(element => {
            if (!element.parentNode.id) { return} 
            const order = ++i
            window.requestAnimationFrame(() => {
                element.parentNode.style.order = order
            })
        })

    }
    render(projects) {
        return new Promise(resolve => {
            for (let node = this.projectList.firstElementChild; node;) {
                if (!node.id) { node = node.nextElementSibling; continue} 
                const nextSibling = node.nextElementSibling
                if (projects.findIndex(p => parseInt(p.id) === parseInt(node.id.split('-')[1]) === -1)) {
                    const n = node
                    window.requestAnimationFrame(() => { if (n && n.parentNode) { n.parentNode.removeChild(n)}  })
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

    project_render (project)
    {
        project.load()
        .then(project => {
            const domNode = document.createElement('div')
            domNode.id = `project-${project.id}`
            domNode.classList.add('kaal-card-project', 'kaal-project')
            domNode.innerHTML = `
                <div class="title">
                    <span class="reference">${project.reference}</span>
                    <span class="name">${project.name}</span>
                    <span class="client">${project.client?.cn ?? ''}</span>
                </div>
                <div class="main">
                </div>
                <div class="footer">
                </div>
            `
            const previous = document.getElementById(`project-${project.id}`)
            if (previous) {
                previous.remove()
            }
            this.parentNode.appendChild(domNode)
        })
    }

    list() {
        const projectAPI = ProjectAPI.getInstance()
        const iterator = projectAPI.list()
        iterator.next()
        .then(projects => {
            projects.map(p => this.project_render(p))
        })
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                console.log(entry)
                if (!entry.isIntersecting) { return }
                const divBottom = entry.boundingClientRect.bottom
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight
                if (divBottom > viewportHeight) { return }
                iterator.next()
                .then(projects => {
                    projects.map(p => this.project_render(p))
                })
            })
        })
        observer.observe(this.parentNode)
    }

    textSearch(text, onlyProject = false) {
        window.requestAnimationFrame(() => {
            this.projectList.classList.add('loading')
        })
        if (this.currentSearchValue === text
            && this.currentState === this.selectedState
            && this.currentOffset === this.offset) { return} 
        this.currentSearchValue = text
        this.currentState = this.selectedState
        this.currentOffset = this.offset

        this.resetSortHeader()

        const expr = KQueryExpr.fromString(text, { attribute: ['name', 'reference'] })
        const query = { deleted: '--' }
        if (this.selectedState === 'open') { query.closed = '--'} 
        else if (this.selectedState === 'close') { query.closed = '*'} 
        expr.merge(query)


        if (this.runningSearch) { this.runningSearch.abort()} 
        this.runningSearch = new AbortController()

        Promise.allSettled([
            (() => {
                if (onlyProject) { return Promise.resolve([])} 
                return this.searchProjectByClient(KQueryExpr.fromString(text, { attribute: ['givenname', 'o', 'sn'] }).object(), this.runningSearch.signal)
            })(),
            (() => {
                if (onlyProject) { return Promise.resolve([])} 
                return this.searchProjectByManager(KQueryExpr.fromString(text, { attribute: ['name'] }).object(), this.runningSearch.signal)
            })(),
            this.search(expr.object(), this.runningSearch.signal)
        ])
            .then(([projectByClient, searchProjectByManager, projects]) => {
                if (projectByClient.status === 'fulfilled') {
                    projectByClient = projectByClient.value
                } else {
                    projectByClient = []
                }

                if (searchProjectByManager.status === 'fulfilled') {
                    projectByClient = projectByClient.concat(searchProjectByManager.value)
                }

                if (projects.status === 'fulfilled') {
                    projects = projects.value
                } else {
                    projects = []
                }
                projectByClient = projectByClient.filter(p => projects.findIndex(p2 => p2.id === p.id) === -1)
                return projects.concat(projectByClient)
            })
            .then(projects => this.render(projects))
            .then(_ => window.requestAnimationFrame(() => this.projectList.classList.remove('loading')))
    }
    toggleProjectFolding(domNode, forceOpen = false) {
        const projectId = domNode.id.split('-')[1]
        for (const node of this.projectList.querySelectorAll('.ka-project[data-open="1"]')) {
            if (node === domNode) { continue} 
            window.requestAnimationFrame(() => node.dataset.open = '0')
        }
        if (domNode.dataset.open === '1' && !forceOpen) {
            return window.requestAnimationFrame(() => domNode.dataset.open = '0')
        }
        window.requestAnimationFrame(() => domNode.dataset.open = '1')
        this.loadTravaux(projectId)
            .then(travaux => {
                return [travaux.map(travail => this.renderTravail(travail)), this.renderGroup(travaux)]
            })
            .then(([nodes, groups]) => {
                if (nodes.length === 0) { return} 
                const parent = domNode.querySelector('div.travail')
                if (!parent.firstElementChild) {
                    const supheader = document.createElement('DIV')
                    supheader.classList.add('ka-group', 'ka-group-supheader')
                    supheader.innerHTML = `
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
                    parent.appendChild(group)
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
                                return window.requestAnimationFrame(() => parent.appendChild(node))
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
    renderProject(project) {
        return new Promise(resolve => {
            const domNode = document.createElement('DIV')
            domNode.id = `project-${project.id}`
            domNode.dataset.id = project.id
            domNode.classList.add('ka-project')
            if (project.closed) {
                domNode.classList.add('ka-project-closed')
            } else {
                domNode.classList.add('ka-project-open')
            }

            const KContactOld = new UIKAContactOld()
            KContactOld.simplifyContact(project.client)
                .then(client => {
                    domNode.innerHTML = `
                <span class="reference">${project.reference ?? ''}${project.extid ? `&nbsp;<img src="${KAAL.getBase()}/resources/images/bexio-sync.png" />` : ''}</span>
                <span class="name">${project.name ?? ''}</span>
                <span class="client">${client.custom4 === 'BEXIO' ? `<img title="Client archivé" src="${KAAL.getBase()}/resources/images/bexio-icon.png" />&nbsp;` : ''}${client.state === 'archived' ? `<img src="${KAAL.getBase()}/resources/images/archive.png" />&nbsp;` : ''} ${client.displayname ?? ''}</span>
                <span class="manager">${project.manager?.name ?? ''}</span>
                <span class="tooling">
                    <button class="onhover" data-action="add-work">Ajout travail</button>
                    <button class="onhover" data-action="edit">Éditer</button>
                    <button class="onhover" data-action="offer">Offre</button>
                    <button class="onhover" data-action="export">Exporter</button>
                    <button class="onhover" data-action="print">Imprimer</button>
                    <button class="onopen" data-action="${project.closed ? 'open' : 'close'}">${project.closed ? 'Ouvrir' : 'Clore'}</button>
                    <button class="onopen" data-action="delete">Supprimer</button>
                </span>
                <div class="travail">
                </div>
            `
                    domNode.addEventListener('click', event => {
                        let node = event.target
                        while (node) {
                            if (node.classList.contains('travail')) { return} 
                            if (node.classList.contains('ka-project')) { break} 
                            node = node.parentNode
                        }
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
        })
    }
    reloadOpenProject(projectId) {
        return new Promise((resolve, reject) => {
            const currentPos = window.scrollY
            kafetch2(`${KAAL.getBase()}/Project/${projectId}`)
                .then(project => {
                    if (project.length !== 1) { throw new Error('Projet introuvable')} 
                    return this.associateProject(project[0])
                })
                .then(project => {
                    return this.renderProject(project)
                })
                .then(domNode => {
                    this.insertProjectNode(domNode, true)
                    return domNode
                })
                .then(domNode => {
                    setTimeout(() => window.scroll(0, currentPos), 250)
                    resolve(domNode)
                })
                .catch(cause => reject(cause))
        })
    }
    buttonInteractWithProject(projectId, interaction) {
        switch (interaction) {
            case 'edit': return this.editProject(projectId)
            case 'export': return this.exportProject(projectId)
            case 'print': return this.printProject(projectId)
            case 'close': return this.closeProject(projectId)
            case 'open': return this.openProject(projectId)
            case 'delete': return this.deleteProject(projectId)
            case 'add-work': return this.addEditTravailToProject(projectId)
            case 'offer': return this.offerProject(projectId)
        }
    }
    offerProject(projectId) {
        window.open(`${KAAL.getBase()}/admin/offre.html?project=${projectId}`, '_blank')
    }
    buttonInteractWithTravail(projectId, travailId, interaction) {
        switch (interaction) {
            case 'edit': return this.addEditTravailToProject(projectId, travailId)
            case 'print': return this.printTravail(projectId, travailId)
            case 'delete': return this.deleteTravail(travailId)
        }
    }
    exportProject(projectId) {
        return Admin.getUrl('admin/exec/export/project.php', { pid: projectId })
            .then(url => {
                window.open(url)
            })
    }
    printProject(projectId) {
        return Admin.getUrl('admin/exec/export/bon.php', { pid: projectId })
            .then(url => {
                window.open(url)
            })
    }
    loadTravaux(projectId) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.getBase()}/Travail/_query`, { method: 'POST', body: JSON.stringify({ project: projectId, closed: '0' }) })
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
                                        t.status = { color: 'white' }
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
                }).catch(cause => reject(cause))
        })
    }
    renderTravail(travail) {
        const domNode = document.createElement('DIV')
        domNode.style.setProperty('--status-color', travail.status.color)
        domNode.classList.add('ka-group', 'ka-group-content')
        domNode.id = `travail-${travail.id}`
        domNode.dataset.projectId = travail.project
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
        domNode.addEventListener('click', event => {
            const travailId = String(event.currentTarget.id).split('-').pop()
            if (!travailId) { return} 

            this.buttonInteractWithTravail(
                event.currentTarget.dataset.projectId,
                travailId,
                event.target.dataset.action
            )
        })
        return domNode
    }
    renderGroup(travaux) {
        const a = travaux
            .filter((travail, index, array) => {
                return array.findIndex(t => t.group === travail.group) === index
            })
            .map(travail => travail.group)
            .filter(group => group !== '' && group !== null && group !== undefined)
            .flat()
        if (a.length === 1) { return []} 
        return a.map(group => {
            const node = document.createElement('DIV')
            node.classList.add('ka-group-header', 'ka-group')
            group = String(group)
            node.dataset.group = group.toLowerCase()
            node.innerHTML = `<span>${group}</span>`
            return node
        })
    }
    removeProjectNode(projectId) {
        const node = document.getElementById(`project-${projectId}`)
        if (node) {
            window.requestAnimationFrame(() => node.parentNode.removeChild(node))
        }
    }
    insertProjectNode(domNode, forceOpen = false) {
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
                    this.projectList.insertBefore(domNode, this.projectListHeader.nextElementSibling)
                    return resolve()
                })
            })
                .then(_ => {
                    if (openIt || forceOpen) {
                        this.toggleProjectFolding(domNode, forceOpen)
                    }
                    return resolve()
                })
        })
    }
    /**
     * Associate a project with its client and manager.
     * @param {object} project Project object
     */
    associateProject(project) {
        return new Promise((resolve, reject) => {
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
                    if (client) { project.client = client[0]} 
                    if (manager) { project.manager = manager[0]} 
                    return resolve(project)
                })
                .catch(cause => {
                    reject(new Error('Erreur', { cause }))
                })
        })
    }
    searchProjectByManager(query = {}, signal = null) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.getBase()}/Person/_query`, { method: 'POST', body: JSON.stringify(query), signal: signal })
                .then(managers => {
                    Promise.allSettled(managers.map(manager => {
                        const query = { deleted: '--', manager: manager.id }
                        if (this.selectedState === 'open') { query.closed = '--'} 
                        else if (this.selectedState === 'close') { query.closed = '*'} 
                        return kafetch2(`${KAAL.getBase()}/Project/_query`, { method: 'POST', body: query, signal: signal })
                    }))
                        .then(projects => {
                            projects = projects
                                .filter(p => p.status === 'fulfilled')
                                .map(p => p.value)
                                .filter(p => p.length > 0)
                                .map(p => {
                                    return p.map(project => {
                                        project.manager = managers.find(m => m.id === project.manager)
                                        return project
                                    })
                                })
                                .flat()
                            Promise.allSettled(projects
                                .filter(p => p.client !== '')
                                .filter((p, index, array) => {
                                    return array.findIndex(p2 => p2.client === p.client) === index
                                })
                                .map(project => {
                                    const parts = String(project.client).split('/')
                                    return kafetch2(`${KAAL.getBase()}/Contact/${parts.pop()}`, { signal: signal })
                                })
                            )
                                .then(contacts => {
                                    contacts = contacts.filter(c => c.status === 'fulfilled').map(c => c.value)
                                    return resolve(projects.map(project => {
                                        project.client = contacts.find(c => String(project.client).endsWith(String(c.IDent)))
                                        return project
                                    }))
                                })
                        })
                })
                .catch(cause => {
                    reject(new Error('Erreur chargement des project', { cause }))
                })
        })
    }
    searchProjectByClient(query = {}, signal = null) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.getBase()}/Contact/_query`, { method: 'POST', body: JSON.stringify(query), signal: signal })
                .then(contacts => {
                    Promise.allSettled(contacts.map(contact => {
                        const query = { deleted: '--', client: `Contact/${contact.IDent}` }
                        if (this.selectedState === 'open') { query.closed = '--'} 
                        else if (this.selectedState === 'close') { query.closed = '*'} 
                        return kafetch2(`${KAAL.getBase()}/Project/_query`, { method: 'POST', body: query, signal: signal })
                    }))
                        .then(projects => {
                            projects = projects
                                .filter(p => p.status === 'fulfilled')
                                .map(p => p.value)
                                .filter(p => p.length > 0)
                                .map(p => {
                                    return p.map(project => {
                                        project.client = contacts.find(c => String(project.client).endsWith(String(c.IDent)))
                                        return project
                                    })
                                })
                                .flat()
                            Promise.allSettled(projects.map(project => {
                                return kafetch2(`${KAAL.getBase()}/Person/${project.manager}`, { signal: signal })
                            }))
                                .then(managers => {
                                    managers = managers.filter(m => m.status === 'fulfilled').map(m => m.value[0])
                                    return resolve(projects.map(project => {
                                        project.manager = managers.find(m => m.id === project.manager)
                                        return project
                                    }))
                                })
                        })
                })
        })
            .catch(cause => {
                reject(new Error('Erreur', { cause }))
            })
    }
    /**
     * Execute a search query an return a list of object with associated clients and manager
     * @param {object} query A search query object
     * @returns {Promise.<array.<object>>} An array of project object
     */
    search(query = {}, signal = null) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.getBase()}/Project/_query?limit=${this.offset},${this.limit}&sort.ordering=DESC&sort.created=DESC`, { method: 'POST', body: JSON.stringify(query), signal: signal })
                .then(projects => {
                    this.lastResultCount = projects.length
                    const clients = projects
                        .filter((project, index, array) => {
                            if (project.client === null) { return false} 
                            return array.findIndex(p => p.client === project.client) === index
                        })
                        .map(project => project.client)
                    const managers = projects
                        .filter((project, index, array) => {
                            if (project.manager === null) { return false} 
                            return array.findIndex(p => parseInt(p.manager) === parseInt(project.manager)) === index
                        })
                        .map(project => parseInt(project.manager))
                        .filter(m => m !== 0)


                    Promise.all(
                        [Promise.allSettled(clients.map(client => kafetch2(`${KAAL.getBase()}/${client}?short=1`, { signal: signal })))
                            .then(responses => {
                                return responses
                                    .filter(r => r.status === 'fulfilled')
                                    .map(r => r.value[0])
                                    .filter(r => r !== undefined && r !== null)
                            }),
                        Promise.allSettled(managers.map(manager => kafetch2(`${KAAL.getBase()}/Person/${manager}`, { signal: signal })))
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
                                    if (p.manager === undefined) { p.manager = null} 
                                    return p
                                })
                                .map(p => {
                                    p.client = clients.find(c => String(p.client).endsWith(String(c.uid)))
                                    if (p.client === undefined) { p.client = null} 
                                    return p
                                })
                            /* we insert in front of the list, so reverse the order here
                               allow to have it in ID order which is the last created first */
                            return resolve(projects.reverse())
                        })
                })
                .catch(cause => {
                    return reject(new Error('Erreur chargement des project', { cause }))
                })
        })
    }
    /**
     * Set project status to close
     * @param {number} projectId Id of the project
     * @returns {Promise.<undefined>}
     */
    closeProject(projectId) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.getBase()}/Project/${projectId}`, { method: 'PATCH', body: JSON.stringify({ id: projectId, closed: (new Date()).toISOString() }) })
                .then(_ => this.removeProjectNode(projectId))
                .then(_ => resolve())
                .catch(cause => reject(new Error('Erreur fermeture du project', { cause })))
        })
    }
    /**
     * Set project status to open
     * @param {number} projectId Id of the project
     * @returns {Promise.<undefined>}
     */
    openProject(projectId) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.getBase()}/Project/${projectId}`, { method: 'PATCH', body: JSON.stringify({ id: projectId, closed: null }) })
                .then(_ => this.removeProjectNode(projectId))
                .then(_ => resolve())
                .catch(cause => reject(new Error('Erreur ouverture du project', { cause })))
        })
    }
    /**
     * Set project status to deleted
     * @param {number} projectId Id of the project
     * @returns {Promise.<undefined>}
     */
    deleteProject(projectId) {
        return new Promise((resolve, reject) => {
            Promise.all([
                kafetch2(`${KAAL.getBase()}/Project/${projectId}`),
                kafetch2(`${KAAL.getBase()}/Travail/_query`, { method: 'POST', body: { project: projectId } })
            ])
                .then(([project, travaux]) => {
                    if (project.length !== 1) { throw new Error('')} 
                    const popup = window.Admin.popup(`
                <form>
                Confirmer la suppression du projet ${project[0].reference}<br>
                ${travaux.length > 0 ? '<label><input type="checkbox" name="deleteTravaux" checked> Supprimer les travaux et tâches associées</label><br>' : ''}
                ${project[0].extid ? '<label><input type="checkbox" name="deleteBexioProject" checked> Supprimer sur Bexio</label><br>' : ''}
                <button type="submit">Supprimer</button> <button type="reset">Annuler</button>
                </form>
            `, 'Confirmation de suppression')
                    const form = popup.querySelector('form')
                    form.addEventListener('submit', event => {
                        event.preventDefault()
                        const data = new FormData(event.currentTarget); (() => {
                            if (data.get('deleteTravaux')) {
                                return Promise.all(travaux.map(t => {
                                    return new Promise((resolve, reject) => {
                                        this.deleteAssociateReservation(t.id)
                                            .then(_ => {
                                                return this.doDeleteTravail(t.id)
                                            })
                                            .then(_ => resolve())
                                            .catch(cause => reject(cause))
                                    })
                                }))
                            }
                            return Promise.resolve()
                        })()
                            .then(_ => {
                                ; (() => {
                                    if (data.get('deleteBexioProject')) {
                                        return kafetch2(`${KAAL.getBase()}/BXProject/${project[0].extid}`, { method: 'DELETE' })
                                    }
                                    return Promise.resolve()
                                })()
                            })
                            .then(_ => {
                                kafetch2(`${KAAL.getBase()}/Project/${projectId}`, { method: 'DELETE' })
                                    .then(_ => this.removeProjectNode(projectId))
                                    .then(_ => { popup.close(); resolve() })
                            })
                    })
                    form.addEventListener('reset', _ => {
                        popup.close()
                    })
                })
                .catch(cause => {
                    new MsgInteractUI('error', 'Suppression du projet impossible')
                })
        })
    }
    /**
     * Show an edit box for project content
     * @param {number} projectId ID of the project ot edit
     * @returns
     */
    editProject(projectId) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.getBase()}/Project/${projectId}`)
                .then(project => {
                    if (project.length !== 1) { throw new Error('Erreur chargement project')} 
                    project = project[0]
                    const popup = window.Admin.popup(`
                <form>
                    <input type="hidden" value="${project.id}" name="project" />
                    <label for="reference">Numéro de chantier : </label><input readonly name="reference" type="text" value="${project.reference ?? ''}" />
                    <label for="name">Nom : </label><input name="name" type="text" value="${project.name ?? ''}"/><br>
                    <label for="price">Prix de vente HT : </label><input name="price" type="text" value="${project.price ?? ''}"/><br>
                    ${KAAL.bexio.enabled ? `<label for="extid">Projet bexio : <input name="extid" type="text" value="${project.extid ?? ''}" /> 
                        ${project.extid ? '' : '<button type="submit" name="bxcreate">ou créer sur bexio</button>'}<br/>` : ''}
                    <label for="manager">Chef de projet : </label><input name="manager" type="text" value="${project.manager ?? ''}"/><br>
                    <label for="ordering">Ordre : </label><select name="ordering">
                        <option value="0" ${project.ordering == 0 ? 'selected' : ''}>Bas</option>
                        <option value="1" ${project.ordering == 1 ? 'selected' : ''}>Moyen</option>
                        <option value="2" ${project.ordering == 2 ? 'selected' : ''}>Normal</option>
                        <option value="3" ${project.ordering == 3 ? 'selected' : ''}>Haut</option>
                        <option value="4" ${project.ordering == 4 ? 'selected' : ''}>Très haut</option>
                    </select><br>
                    <label for="client">Client : </label><div class="contact"></div><br>
                    <button type="submit">Sauver</button><button type="reset">Annuler</button>
                </form>`,
                        `Projet ${project.reference} - ${project.name}`
                    )

                    const kaoldcontact = new UIKAContactOld()
                    window.requestAnimationFrame(() => { popup.querySelector('div.contact').appendChild(kaoldcontact.domNode) })
                    if (!isStringEmpty(project.client)) {
                        const buttons = popup.querySelectorAll('button')
                        window.requestAnimationFrame(() => {
                            buttons.forEach(button => button.disabled = true)
                            popup.classList.add('updating-in-progress')
                        })
                        kaoldcontact.setResult(project.client)
                            .then(_ => {
                                window.requestAnimationFrame(() => {
                                    buttons.forEach(button => button.disabled = false)
                                    popup.classList.remove('updating-in-progress')
                                })
                            })
                    }

                    const bxProjectSelect = (() => {
                        if (!KAAL.bexio.enabled) { return null} 
                        return new KSelectUI(
                            popup.querySelector('input[name="extid"]'),
                            new BXROGenericStore('BXProject', { idName: 'id', label: 'name', name: 'name' }),
                            { realSelect: true, allowFreeText: false, allowNone: true }
                        )
                    })()

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
                    form.addEventListener('reset', () => popup.close())
                    form.addEventListener('submit', event => {
                        const submitter = event.submitter.name
                        window.requestAnimationFrame(() => { popup.classList.add('updating-in-progress') })
                        event.preventDefault()
                        const data = new FormData(event.currentTarget)
                        const project = {
                            id: projectId,
                            name: data.get('name'),
                            reference: data.get('reference'),
                            price: data.get('price'),
                            manager: managerSelect.value,
                            client: '',
                            ordering: data.get('ordering')
                        }
                        if (bxProjectSelect) {
                            project.extid = submitter === 'bxcreate' ? '_create' : (bxProjectSelect.value == 0 ? '_unlink' : bxProjectSelect.value)
                        }
                        if (kaoldcontact.clientid !== null) {
                            if (String(kaoldcontact.clientid).startsWith('Contact')) {
                                project.client = kaoldcontact.clientid
                            } else { /* sandwich */
                                project.client = `Contact/${kaoldcontact.clientid}`
                            }
                        }
                        this.checkProjectData(project)
                            .then(project => {
                                return kafetch2(`${KAAL.getBase()}/Project/${projectId}`, { method: 'POST', body: JSON.stringify(project) })
                                    .then(projectResult => {
                                        return kafetch2(`${KAAL.getBase()}/Project/${projectResult[0].id}`)
                                    })
                                    .then(project => {
                                        return this.associateProject(project[0])
                                    })
                                    .then(project => {
                                        this.reloadOpenProject(project.id)
                                    })
                                    .then(_ => {
                                        popup.close()
                                        if (submitter === 'bxcreate') { this.editProject(projectId)} 
                                        resolve()
                                    })
                            })
                            .catch(cause => {
                                const label = form.querySelector(`label[for="${cause.cause}"]`)
                                window.requestAnimationFrame(() => {
                                    if (label) { label.classList.add('inerror')} 
                                })
                                new MsgInteractUI('error', cause.message)
                            })
                    })
                })
                .catch(cause => {
                    reject(new Error('Erreur', { cause }))
                })
        })
    }
    checkProjectData(project) {
        return new Promise((resolve, reject) => {
            if (isFloatEmpty(project.price)) {
                return reject(new Error('Pas de prix', { cause: 'price' }))
            }
            if (isIdEmpty(project.manager)) { return reject(new Error('Pas de chef de projet', { cause: 'manager' }))} 
            if (isStringEmpty(project.reference)) { return reject(new Error('Pas de référence', { cause: 'reference' }))} 
            if (isStringEmpty(project.name)) { return reject(new Error('Pas de nom', { cause: 'name' }))} 
            if (isStringEmpty(project.client) || project.client === 'Contact/null') { return reject(new Error('Pas de client', { cause: 'client' }))} 
            return resolve(project)
        })
    }
    checkTravailData(travail) {
        return new Promise((resolve, reject) => {
            if (isIdEmpty(travail.status)) { return reject(new Error('Pas de processus', { cause: 'status' }))} 
            if (isStringEmpty(travail.reference)) { return reject(new Error('Pas de référence', { cause: 'reference' }))} 
            /*if (isStringEmpty(travail.begin)) { return reject(new Error('Pas de début souhaité', {cause: 'begin'})) }
            if (isStringEmpty(travail.end)) { return reject(new Error('Pas de fin souhaitée', {cause: 'end'})) }*/
            if (isStringEmpty(travail.begin)) { travail.begin = new Date().toISOString().split('T')[0]} 
            if (isStringEmpty(travail.end)) { travail.end = new Date().toISOString().split('T')[0]} 
            if (isIntEmpty(travail.force)) {
                travail.force = 0
            }
            if (isIntEmpty(travail.time)) {
                travail.time = 0
            }

            return resolve(travail)
        })
    }
    addEditTravailToProject(projectId, travailId = null) {
        return new Promise((resolve, reject) => {
            ; (() => {
                const req = [kafetch2(`${KAAL.getBase()}/Project/${projectId}`)]
                if (travailId) {
                    req.push(kafetch2(`${KAAL.getBase()}/Travail/${travailId}`))
                } else {
                    req.push(Promise.resolve(
                        [{
                            reference: '',
                            meeting: '',
                            contact: '',
                            phone: '',
                            status: '',
                            group: '',
                            begin: '',
                            end: '',
                            time: '',
                            force: '',
                            description: ''
                        }]
                    ))
                }
                return Promise.all(req)
            })()
                .then(([project, travail]) => {
                    project = project[0]
                    travail = travail[0]
                    const popup = window.Admin.popup(`
                <form>
                    <label for="reference">Référence : </label><input name="reference" type="text" value="${travail.reference ?? ''}" /> 
                    <label for="meeting">Rendez-vous :</label><input name="meeting" type="text" value="${travail.meeting ?? ''}" />
                    <br>
                    <label for="contact">Personne de contact : </label><input name="contact" type="text" value="${travail.contact ?? ''}" /> 
                    <label for="phone">Téléphone : </label><input name="phone" type="text" value="${travail.phone ?? ''}"/>
                    <br>
                    <label for="group">Sous-chantier: </label><input name="group" type="text" value="${travail.group ?? ''}"/> 
                    <label for="process">Processus : </label><input name="status" value="${travail.status ?? ''}"></input>
                    <br>
                    <label for="begin">Début souhaité :</label><input name="begin" type="date" value="${travail.begin ?? ''}"/>
                    <label for="end">Fin souhaitée : </label><input name="end" type="date" value="${travail.end ?? ''}"/>
                    <br>
                    <label for="time">Temps total du projet : <input name="time" type="text" value="${travail.time ?? ''}"></label>
                    <label for="force">Nombre de personne : <input name="force" type="text" value="${travail.force ?? ''}" /></label><br>
                    <label for="force">Localisation GPS : <input class="longer" name="urlgps" type="text" value="${travail.urlgps ?? ''}" /></label><br>
                    <label for="description>">Description du travail</label><br>
                    <textarea name="description">${travail.description ?? ''}</textarea><br>
                    <button type="submit">Sauver</button><button name="print" type="submit">Sauver et imprimer</button><button type="reset">Annuler</button>
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
                        const submitter = event.submitter
                        const data = new FormData(event.currentTarget)
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
                            project: projectId,
                            urlgps: data.get('urlgps')
                        }

                        this.checkTravailData(travail)
                            .then(travail => {
                                if (travailId !== null) {
                                    travail.id = travailId
                                    return kafetch2(`${KAAL.getBase()}/Travail/${travailId}`, { method: 'PUT', body: travail })
                                }
                                return kafetch2(`${KAAL.getBase()}/Travail`, { method: 'POST', body: travail })
                            })
                            .then(travail => {
                                if (travail.length !== 1) { /* error */ }
                                return kafetch2(`${KAAL.getBase()}/Travail/${travail[0].id}`)
                            })
                            .then(travail => {
                                return kafetch2(`${KAAL.getBase()}/Project/${travail[0].project}`)
                            })
                            .then(project => {
                                return this.reloadOpenProject(project[0].id)
                            })
                            .then(domNode => {
                                popup.close()
                                if (submitter.name === 'print') {
                                    return this.printTravail(domNode.dataset.id, travailId)
                                }
                                return resolve()
                            })
                            .catch(cause => {
                                new MsgInteractUI('error', cause)
                            })
                    })
                })
        })
    }
    editTravail(projectId, travailId) {
        return this.addEditTravailToProject(projectId, travailId)
    }
    deleteAssociateReservation(travailId) {
        return new Promise((resolve, reject) => {
            kafetch2(`${KAAL.kairos.url}/store/Reservation/_query`, { method: 'POST', body: { affaire: travailId, deleted: '--' } })
                .then(reservations => {
                    return Promise.allSettled(reservations.map(r => {
                        kafetch2(`${KAAL.kairos.url}/store/Reservation/${r.id}`, { method: 'DELETE' })
                    }))
                })
                .then(_ => {
                    resolve()
                })
                .catch(cause => {
                    reject(cause)
                })
        })
    }
    doDeleteTravail(travailId) {
        return kafetch2(`${KAAL.getBase()}/Travail/${travailId}`, { method: 'DELETE' })
    }
    deleteTravail(travailId) {
        return new Promise((resolve, reject) => {
            Promise.all([
                kafetch2(`${KAAL.getBase()}/Travail/${travailId}`),
                kafetch2(`${KAAL.kairos.url}/store/Reservation/_query`, { method: 'POST', body: { affaire: travailId, deleted: '--' } })
            ])
                .then(([travail, reservations]) => {
                    if (travail.length !== 1) { throw new Error('')} 
                    const taskMsg = (
                        reservations.length > 1 ?
                            `Supprimer les ${reservations.length} tâche planifiées associées.` :
                            `Supprimer la tâche planifiée associée.`
                    )
                    const popup = window.Admin.popup(`
                <form>
                Confirmez la suppression du travail "${travail[0].reference}".<br>
                ${reservations.length > 0 ? `<label><input type="checkbox" name="deleteReservations" checked> ${taskMsg}</label>` : ''}
                <br>
                <button type="submit">Suppression</button> <button type="reset">Annuler</button>
                </form>
            `, `Confirmation de suppression`)
                    const form = popup.querySelector('form')
                    form.addEventListener('submit', event => {
                        event.preventDefault(); (() => {
                            const data = new FormData(event.currentTarget)
                            if (data.get('deleteReservations')) {
                                return this.deleteAssociateReservation(travailId)
                            }
                            return Promise.resolve()
                        })()
                            .then(_ => {
                                return this.doDeleteTravail(travailId)
                            })
                            .then(x => {
                                new MsgInteractUI('info', 'Travail supprimé')
                                popup.close()
                            })
                            .catch(cause => {
                                new MsgInteractUI('error', cause)
                            })
                    })
                    form.addEventListener('reset', event => {
                        popup.close()
                    })

                })
        })
    }
    printTravail(projectId, travailId) {
        return new Promise(resolve => {
            Admin.getUrl('admin/exec/export/bon.php', { pid: projectId, travail: travailId })
                .then((url) => {
                    window.open(url)
                    resolve()
                })
        })
    }
}

UIKAProjectList.prototype.doSearchEvent = new Debounce(function (value, onlyProject = false) {
    this.textSearch(value, onlyProject)
}, 250)