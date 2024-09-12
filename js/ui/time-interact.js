function HistoryHandler () {
    this.history = window.history
}

HistoryHandler.prototype.back = function () {
    this.history.back()
}

HistoryHandler.prototype.navigate = function (where, node = null) {
    this.history.pushState({where: where, node: node}, '', '')
}

function TimeInteractUI (userId, workday = 'nyyyyyn') {
    this.eventTarget = new EventTarget()
    this.offset = 0
    this.limit = 100
    this.history = new HistoryHandler()

    window.addEventListener('popstate', event => {
        this.back(event.state)
    })

    this.mustHave = {
        project: true,
        process: true,
        travail: false
    }
    this.hasSet = {
        project: null,
        process: null,
        travail: null
    }
    this.mapString = {
        project: 'Projet',
        process: 'Processus',
        travail: 'Travail'
    }
    this.currentSelection = {
        id: null,
        time: null,
        remark: null,
        km: null,
        dinner: false
    }
    this.userId = userId

    if (window.location.hash) {
        this.loadProject()
        .then(_ => {
            const [type, id] = window.location.hash.split('/')
            window.location.hash = ''
            if (type === '#project') {
                this.loadProject()
                .then(_ => {
                    this.selectProject(id)
                })
            } else {
                kafetch(KAAL.url(`Travail/${id}`))
                .then(travail => {
                    if (travail.length === 1) {
                        this.hasSet.travail = parseInt(travail.data[0].id)
                        this.hasSet.process = parseInt(travail.data[0].status)
                        this.selectProject(travail.data[0].project)
                        .then(_ => {
                            this.showTimeBox()
                        })
                    }
                })
            }
        })
    }
}

TimeInteractUI.prototype.addEventListener = function (type, listener, options = {}) {
    this.eventTarget.addEventListener(type, listener, options)
}
TimeInteractUI.prototype.dispatchEvent = function (event) {
    this.eventTarget.dispatchEvent(event)
}

TimeInteractUI.prototype.gotoIndex = function () {
    this.hideIndex()
    .then(_ => this.showIndex())
}

TimeInteractUI.prototype.back = function (previous = null) {
    if (previous) {
        switch(previous.where) {
            case 'goto-other-project': return this.gotoOtherProject()
            case 'goto-index': return this.gotoIndex()
            case 'select-project': return this.selectProject(previous.node)
        }
    }
    this.hideIndex()
    .then(()=> {
        this.closeProject()
        window.dispatchEvent(new CustomEvent('close-all-kabutton'))
        this.showIndex()
    })
}

TimeInteractUI.prototype.hideIndex = function () {
    return new Promise((resolve) => {
        const container = document.querySelector('div.ka-main-bottom')
        window.requestAnimationFrame(() => {
            container.innerHTML = ''
            resolve()
        })
    })
}

TimeInteractUI.prototype.gotoOtherProject = function () {
    this.hasSet = {
        project: null,
        travail: null,
        process: null
    }
    this.hideIndex()
    .then(() => {
        return this.showHeader()
    })
    .then(() => {
        this.loadProject()
    })
}

TimeInteractUI.prototype.showIndex = function () {
    return new Promise((resolve) => {
        const project = new KAButton('Autres projets', {click: true, fat: true})
        project.addEventListener('submit', event => {
            this.history.navigate('goto-other-project')
            this.gotoOtherProject()
        })

        const hours = new KAButton('Mes heures', {click: true, fat: true})
        hours.addEventListener('submit', event => {
            this.hasSet = {
                project: null,
                travail: null,
                process: null
            }
            this.hideIndex()
            .then(() => {
                const container = document.querySelector('div.ka-main-bottom')
                const div = document.createElement('DIV')
                div.classList.add('ka-project-detail')
                container.appendChild(div)
                this.showRecentTime(container)
            })
        })
        const forecast = new KAButton('Mon planning provisoire', {click: true, fat: true})
        forecast.addEventListener('submit', event => {
            const planning = new KAPlanningUI(this.userId)
            this.hasSet = {
                project: null,
                travail: null,
                process: null
            }
            this.hideIndex()
            .then(() => {
                return planning.load()
            })
            .then(reservations => {
                return planning.render(reservations)
            })
            .then(domNode => {
                const container = document.querySelector('div.ka-main-bottom')
                window.requestAnimationFrame(() => container.appendChild(domNode))
            })
            .catch(cause => {
                console.log(cause)
                MsgInteractUI('error', cause.message)
            })
        })
        const container = document.querySelector('div.ka-main-bottom')
        window.requestAnimationFrame(() => {
            container.appendChild(project)
            container.appendChild(hours)
            container.appendChild(forecast)
        })
        return resolve()
    })
}

TimeInteractUI.prototype.run = function () {
    this.history.navigate('goto-index')
    this.addEventListener('change-date', event => {
        if (this.currentDate) {
            this.unloadPlanningSet(this.currentDate)
        }
        const date = new Date(event.detail)
        this.day = date
        this.currentDate = date.toISOString().split('T')[0]
        this.loadFromPlanning(date)
        .then(loaded => {
            return this.loadFromPreviousEntry(date, loaded)
        })
    })
    this.addEventListener('reset-date', event => {
        this.day = null
        if (this.currentDate) {
            this.unloadPlanningSet(this.currentDate)
        }
    })
    this.showUser()
    .then(() => {
        return this.loadDates()
    })
    .then(() => {
        return this.showDates()
    })
    .then(() => {
        return this.showIndex()
    })
}

TimeInteractUI.prototype.unloadPlanningSet = function (date) {
    const nodes = document.querySelectorAll(`[data-child-of="${date}"]`)
    nodes.forEach((node) => {
        window.requestAnimationFrame(() => {
            if (!node.parentNode) { return }
            node.parentNode.removeChild(node)
        })
    })
}

TimeInteractUI.prototype.loadFromPreviousEntry = function (date, travaux = []) {
    const childOf = date.toISOString().split('T')[0]

    const past3days = new Date()
    past3days.setTime(past3days.getTime() - 259200000)
    
    kafetch2(KAAL.url(`Htime/_query`), {
        method:'POST', 
        body: JSON.stringify({
            '#and': {
                person: this.userId,
                deleted: '--',
                day: ['>=', past3days.toISOString().split('T')[0] , 'str']
            }
        })
    })
    .then(times => {
        const container = document.querySelector('div.ka-main-top')
        for (const time of times) {
            if (!time._travail) { continue }
            if (travaux.indexOf(time.travail) !== -1) { continue }
            travaux.push(time.travail)
            const status = time._travail.status || time._project.status
            kafetch2(`${KAAL.kairos.endpoint}/Status/${status}`)
            .then(process => {
                const button = KAEntryForm(time._project, time._travail, process.pop(), time)
                button.dataset.childOf = childOf

                window.requestAnimationFrame(() => {
                    container.appendChild(button)
                })
                button.addEventListener('submit-data', event => {
                    const detail = event.detail
                    this.selectProject(detail.project.id)
                    .then(_ => {
                        return this.selectTravail(detail.affaire.id)
                    })
                    .then(_ => {
                        return new Promise(resolve => {
                            if (!detail.process.id) { return resolve() }
                            return resolve(this.selectProcess(detail.process.id))
                        })
                    })
                    .then(_ => {
                        this.showTimeBox()
                    })
                })
            })
        }
    })
}

TimeInteractUI.prototype.loadFromPlanning = function (date) {
    const affaires = []
    return new Promise((resolve, reject) => {
        kafetch2(`${KAAL.kairos.url}/store/Reservation/_query`, {
            method:'POST', 
            body: JSON.stringify({
                '#and': {
                    target: this.userId,
                    deleted: '--',
                    '#and': {
                        dbegin: ['<=', date.toISOString().split('T')[0], 'str'],
                        dend: ['>=', date.toISOString().split('T')[0], 'str']
                    }
                }
            })
        })
        .then(reservations => {
            
            const req = []

            for (const reservation of reservations) {
                if (affaires.indexOf(reservation.affaire) === -1) { 
                    affaires.push(reservation.affaire)
                    req.push(kafetch(KAAL.url(`Travail/${reservation.affaire}`)))
                }
            }
            Promise.all(req)
            .then(results => {
                const travaux = []
                for (const result of results) {
                    if (result.length < 1) { continue }
                    travaux.push(result.data[0])
                }
                return this.joinProjectToTravail(travaux)
            })
            .then(travaux => {
                for (const travail of travaux) {
                    for (const reservation of reservations) {
                        if (reservation.affaire === travail.id) { reservation.affaire = travail }
                    }
                }
                return this.joinAllToStatus(reservations)
            })
            .then(reservations => {
                const childOf = date.toISOString().split('T')[0]
                const container = document.querySelector('div.ka-main-top')
                for (const reservation of reservations) {
                    const button = KAEntryForm(reservation.affaire.project, reservation.affaire, reservation.affaire.status, reservation)
                    button.dataset.childOf = childOf
                    window.requestAnimationFrame(() => {
                        container.appendChild(button)
                        resolve(affaires)
                    })
                    button.addEventListener('submit-data', event => {
                        const detail = event.detail
                        this.selectProject(detail.project.id)
                        .then(_ => {
                            return this.selectTravail(detail.affaire.id)
                        })
                        .then(_ => {
                            return new Promise(resolve => {
                                if (!detail.process.id) { return resolve() }
                                return resolve(this.selectProcess(detail.process.id))
                            })
                        })
                        .then(_ => {
                            this.showTimeBox()
                        })
                    })
                }
            })
        })
    })
}

TimeInteractUI.prototype.joinAllToStatus = function (reservations) {
    return new Promise((resolve, reject) => {
        kafetch(`${KAAL.kairos.endpoint}/Status/_query`, {method: 'POST', body: JSON.stringify({type: 1, deleted: '--'})})
        .then(results => {
            if (results.length <= 0) { results.data = [] }
            const status = results.data
            for (const reservation of reservations) {
                if (reservation.status) {
                    reservation.status = parseInt(reservation.status)
                } else {
                    reservation.status = 0
                }
                reservation.affaire.status = parseInt(reservation.affaire.status)
                if (reservation.status === 0) {
                    reservation.status = reservation.affaire.status
                }
                for (const s of status) {
                    if (reservation.status === s.id) { reservation.status = s}
                    if (reservation.affaire.status === s.id) { reservation.affaire.status = s}
                }
            }
            return resolve(reservations)
        })
    
    })
}

TimeInteractUI.prototype.joinProjectToTravail = function (travaux) {
    return new Promise((resolve, reject) => {
        const req = []
        const projects = []
        for (const travail of travaux) {
            if (projects.indexOf(travail.project) === -1) {
                projects.push(travail.project)
                req.push(kafetch(KAAL.url(`Project/${travail.project}`)))
            }
        }
        Promise.all(req)
        .then(results => {
            for (const result of results) {
                if (result.length < 1) { continue }
                for (const travail of travaux) {
                    if (travail.project !== result.data[0].id) { continue }
                    travail.project = result.data[0]
                }
            }
            return resolve(travaux)
        })
    })
}

TimeInteractUI.prototype.loadDates = async function () {
    return new Promise(async resolve => {
        let date = new Date()
        date.setHours(12, 0, 0, 0)
        this.dates = []
        this.strDates = []
        date.setHours(12, 0, 0, 0)
        for (let day = KAAL.limits.lateDay; day > 0; day--) {
            const d = new Date(date.getTime())
            d.setTime(date.getTime())
            if (d.getDay() === 0 || d.getDay() === 6) {
                const count = await new Promise(resolve => {
                    kafetch(`${KAAL.kairos.url}/store/Reservation/_query`, {
                        method:'POST', 
                        body: JSON.stringify({
                            '#and': {
                                target: this.userId,
                                deleted: '--',
                                '#and': {
                                    dbegin: ['<=', d.toISOString().split('T')[0], 'str'],
                                    dend: ['>=', d.toISOString().split('T')[0], 'str']
                                }
                            }
                        })            
                    })
                    .then(result => {
                        resolve(result.length)
                    })
                    .catch(_ => {
                        resolve(0)
                    })
                })
                if (count > 0) {
                    this.dates.push(d)
                    this.strDates.push(DataUtils.shortDate(d)) 
                } else {
                    day++
                }
            } else {
                this.dates.push(d)
                this.strDates.push(DataUtils.shortDate(d))
            }
            date = new Date(d.getTime() - 86400000)
        }
        return resolve()
    })
}

TimeInteractUI.prototype.showDates = function () {
    return new Promise((resolve) => {
        const div = document.createElement('DIV')
        div.classList.add('ka-date-selector')
        for (const date of this.dates) {
            const d = new KAButton(DataUtils.textualShortDate(date), {group: 'date', fat: true})
            d.dataset.date = date.toISOString().split('T')[0]
            d.addEventListener('submit', event => {
                this.dispatchEvent(new CustomEvent('change-date', {detail: event.target.dataset.date}))
            })
            d.addEventListener('reset', event => {
                this.dispatchEvent(new CustomEvent('reset-date'))
            })                
            div.insertBefore(d, div.firstElementChild)
        }
        const container = document.querySelector('div.ka-main-top')
        window.requestAnimationFrame(() => {
            container.appendChild(div)
            resolve()
        })
    })
}

TimeInteractUI.prototype.loadProject = function () {
    return new Promise((resolve, reject) => {
        kafetch(KAAL.url(`Project/_query?limit=${this.offset},${this.limit}&sort.ordering=DESC&sort.created=DESC`), {method: 'POST', body: JSON.stringify({
            '#and': {
                deleted: '-',
                closed: '-'
            }
        })})
        .then(projects => {
            const container = document.querySelector('div.ka-main-bottom')
            for (const project of projects.data) {
              this.createProjectNode(project, container)
            }
            resolve()
        })
    })
}

TimeInteractUI.prototype.gotoSelectProject = function (project) {
    const node = document.querySelector(`div.ka-project[data-project="${project}"]`)
    if (node.dataset.project === this.hasSet.project) {
        return this.closeProject(node)
    }
    this.selectProject(node.dataset.project)
}

TimeInteractUI.prototype.createProjectNode = function (project, container) {
    const kaproject = KAProject.create(project)
    const div = document.createElement('DIV')
    div.classList.add('ka-project')
    div.dataset.project = kaproject.id
    div.dataset.reference = kaproject.reference?.toLowerCase()
    div.innerHTML = `<span class="reference">${kaproject.reference}</span><span class="name">${kaproject.name}</span>`
    window.requestAnimationFrame(() => {
        container.appendChild(div)
    })
    div.addEventListener('click', event => {
        let node = event.target
        while (node && !node.classList.contains('ka-project')) {
            if (node.classList.contains('ka-project-detail') || node.classList.contains('ka-previous-time')) { return } // we click on detail, so we don't handle event there
            node = node.parentNode
        }
        const project = node.dataset.project
        if (!project)  { return}
        this.history.navigate('select-project', project)
        this.gotoSelectProject(project)
    })
    return div
}

TimeInteractUI.prototype.showUser = function () {
    return new Promise(resolve => {
        KAPerson.load(this.userId)
        .then(user => {
            const div = new KAButton(`${user.get('name')}`, {fat: true, click: true, small: true})
            const subcontainer = document.createElement('div')
            subcontainer.classList.add('ka-user-action')
            const logout = new KAButton(`Déconnexion`, {fat: true, click: true, small: true})
            const back = new KAButton(`Retour`, {fat: true, click: true, small: true})

            subcontainer.appendChild(back)
            subcontainer.appendChild(logout)
            const container = document.querySelector('div.ka-head')
            

            back.addEventListener('submit', event => {
                this.history.back()
            })
            logout.addEventListener('submit', event => {
                new Promise(resolve => {
                    const klogin = new KLogin()
                    klogin.logout()
                    .then(() => {
                        window.requestAnimationFrame(() => {
                            document.querySelector('div.ka-head').innerHTML = ''
                            document.querySelector('div.ka-main-top').innerHTML = ''
                            document.querySelector('div.ka-main-bottom').innerHTML = ''
                            document.querySelector('div.ka-foot').innerHTML = ''
                            resolve()
                        })
                    })
                })
                .then(() => {
                    this.eventTarget.dispatchEvent(new CustomEvent('user-logout'))
                })
            })

            window.requestAnimationFrame(() => {
                container.appendChild(div)
                container.appendChild(subcontainer)
                resolve()
            })
        })
    })
}

TimeInteractUI.prototype.showHeader = function () {
    return new Promise(resolve => {
        const container = document.querySelector('div.ka-main-bottom')

        const searchDiv = document.createElement('DIV')
        searchDiv.classList.add('ka-search')
        searchDiv.innerHTML = `<input type="text" placeholder="Chercher une référence ou nom de projet">`

        searchDiv.firstElementChild.addEventListener('keyup', event => {
            const search = event.target.value.split(' ')
            kafetch(KAAL.url('Project/_query'), {method: 'POST', body: JSON.stringify({
                '#and': {
                    deleted: '-',
                    '#or': {
                        reference: `*${search[0]}*`,
                        name: `*${search.join('*')}*`
                    }
                }
            })})
            .then(projects => {
                const nodes = container.querySelectorAll('.ka-project')
                for (const node of nodes) {
                    node.style.setProperty('display', 'none')
                }
                for (const project of projects.data) {
                    const node = document.querySelector(`[data-project="${project.id}"]`)
                    if (!node) {
                        this.createProjectNode(project, container)
                    } else {
                        node.style.removeProperty('display' )   
                    }
                }
            })
        })
        window.requestAnimationFrame(() => {
            container.appendChild(searchDiv)
            resolve()
        })
    })
}

TimeInteractUI.prototype.closeProject = function (project) {
    return new Promise(resolve => {
        const container = document.querySelector('div.ka-main-bottom')

        if (!project) {
            project = container.querySelector(`div.ka-project[data-project="${this.hasSet.project}"`)
        }
        if (!project) { return resolve() }
        delete project.dataset.open

        this.hasSet.project = null
        this.hasSet.travail = null
        this.hasSet.process = null
        const unhide = []
        for (let node = container.firstElementChild; node; node = node.nextElementSibling) {
            if (node.dataset.project !== project.dataset.project) {
                unhide.push(new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        node.style.removeProperty('display')
                        resolve()
                    })
                }))
            }
        }
        
        const prev = project.querySelectorAll('div.ka-previous-time')
        unhide.push(
            new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    for(const p of prev) { project.removeChild(p) }
                    resolve()
                })
            })
        )
        Promise.allSettled(unhide)
        .then(() => {
            window.requestAnimationFrame(() => {
                window.scroll(0, project.dataset.scrollTop)
            })
       
            const subcontainer = project.querySelector('div.ka-project-detail')
            window.requestAnimationFrame(() => {
                if (subcontainer) { project.removeChild(subcontainer) }
                project.classList.remove('extended')
                resolve()
            })
        })
    })
}

TimeInteractUI.prototype.renderProcess = function (container, processes) {
    const processHead = document.createElement('DIV')
    processHead.classList.add('ka-head', 'toggable')
    processHead.innerHTML = '<span class="open-close-icon">🭭</span><span class="title">Processus</span>'
    processHead.classList.add('open')
    processHead.addEventListener('click', event => {
        if ( processHead.firstElementChild.innerHTML === '🭭') {
            let canClose = false
            for (let i = 1; i < container.children.length; i++) {
                if (container.children[i].dataset.open === 'true') { canClose = true; break }
            }
            if (canClose) {
                window.requestAnimationFrame(() => processHead.firstElementChild.innerHTML = '🭬')
                for (let i = 1; i < container.children.length; i++) {
                    if (container.children[i].dataset.open === 'true') { continue }
                    window.requestAnimationFrame(() => container.children[i].style.setProperty('display', 'none'))
                }
            }
        } else {
            window.requestAnimationFrame(() => processHead.firstElementChild.innerHTML = '🭭')        
            for (let i = 1; i < container.children.length; i++) {
                window.requestAnimationFrame(() => container.children[i].style.removeProperty('display'))
            }
        }
    })

    window.requestAnimationFrame(() => {
        container.appendChild(processHead)
    })
    for (const process of processes) {
        const div = document.createElement('DIV')
        div.classList.add('ka-button2')
        const kolor = new Kolor(process.get('color'))
        div.style.setProperty('--ka-button-background-color', process.get('color'))
        div.style.setProperty('--ka-button-color', kolor.foreground())
        div.style.setProperty('--ka-button-blended-bg', kolor.alpha(0.4))
        div.innerHTML = `<span class="reference"><span class="checkmark">☐</span></span> <span class="name">${process.get('name')}</name>`
        div.dataset.process = process.uid
        if (process.uid === this.hasSet.process) {
            div.dataset.open = 'true'
        } else {
            div.dataset.open = 'false'
        }            
        window.requestAnimationFrame(() => { 
            container.appendChild(div)
        })
    }
}

TimeInteractUI.prototype.renderTravaux = function (container, travaux) {
    if (travaux.length <= 0) { return }
    const groups = travaux.gets()
    const travailHead = document.createElement('DIV')
    travailHead.classList.add('ka-head', 'toggable')
    travailHead.innerHTML = '<span class="open-close-icon">🭭</span><span class="title">Travail</span>'
    travailHead.addEventListener('click', event => {
        if (travailHead.firstElementChild.innerHTML === '🭭') {
            window.requestAnimationFrame(() => travailHead.firstElementChild.innerHTML = '🭬')
            for (let i = 1; i < container.children.length; i++) {
                if (container.children[i].dataset.open === 'true') { continue }
                window.requestAnimationFrame(() => container.children[i].style.setProperty('display', 'none'))
            }
        } else {
            window.requestAnimationFrame(() => travailHead.firstElementChild.innerHTML = '🭭')        
            for (let i = 1; i < container.children.length; i++) {
                window.requestAnimationFrame(() => container.children[i].style.removeProperty('display'))
            }
        }
    })

    window.requestAnimationFrame(() => {
        container.appendChild(travailHead)
    })


    if (travaux.hasUngrouped()) {
        for (const travail of travaux.get(groups.shift())) {
            const div = document.createElement('DIV')
            div.classList.add('ka-button2', 'stacked')
            if (travail.get('description').trim() === '' || travail.get('description').trim() === travail.get('reference').trim()) { 
                div.classList.add('no-description')
            }
            div.innerHTML = `
                <span class="checkmark">☐</span><span class="reference">${travail.get('reference')}</span>
                <span class="name">${travail.get('description')}</span>`
            div.dataset.travail = travail.uid
            div.dataset.process = travail.get('status')
            if (travail.uid === this.hasSet.travail) {
                div.dataset.open = 'true'
            } else {
                div.dataset.open = 'false'
            }
            
            window.requestAnimationFrame(() => { 
                container.appendChild(div)
    
            })        
        }
    }

    if (groups.length > 0) {
        groups.reverse()
        for (const group of groups) {
            const travailHead = document.createElement('DIV')
            travailHead.classList.add('ka-subhead')
            travailHead.innerHTML = group
            window.requestAnimationFrame(() => {
                container.appendChild(travailHead)
            })
            
            for (const travail of travaux.get(group)) {
                const div = document.createElement('DIV')
                div.classList.add('ka-button2', 'stacked')
                if (travail.get('description').trim() === '') { 
                    div.classList.add('no-description')
                }
                div.innerHTML = `<span class="checkmark">☐</span><span class="reference">${travail.get('reference')}</span> <span class="name">${travail.get('description')}</span>`
                div.dataset.travail = travail.uid
                div.dataset.process = travail.get('status')
                if (travail.uid === this.hasSet.travail) {
                    div.dataset.open = 'true'
                } else {
                    div.dataset.open = 'false'
                }

                window.requestAnimationFrame(() => { 
                    container.appendChild(div)
                })
            }
        }
    }
}

TimeInteractUI.prototype.openProject = function (project) {
    return new Promise(resolve => {
        const KAPIProject = new KAPI('Project')
        KAPIProject.get(project.dataset.project)
        .then(projectData => {
            project.dataset.scrollTop = window.scrollY
            project.dataset.open = 'true'
            
            requests = []

            if (this.hasSet.travail) {
                requests[0] = new Promise((resolve, reject) => {
                    KATravail.load(this.hasSet.travail)
                    .then(travail => {
                        resolve(new KAGroup([travail]))
                    })
                    .catch(e => {
                        reject(e)
                    })
                })
            } else {
                requests[0] = this.loadTravaux(project.dataset.project)
            }

            if (this.hasSet.process || projectData.process) {
                if (projectData.process !== 0) { this.hasSet.process = projectData.process }
                requests[1] = new Promise((resolve, reject) => {
                    KAProcess.load(this.hasSet.process)
                    .then(process => {
                        resolve([process])
                    })
                    .catch(e => {
                        reject(e)
                    })
                })
            } else {
                requests[1] = KAProcess.list()
            }
            return Promise.all(requests)
        })
        .then(([travaux, processes]) => {
            this.hasSet.project = parseInt(project.dataset.project)
            const container = document.querySelector('div.ka-main-bottom')
            const subcontainer = document.createElement('DIV')
            subcontainer.addEventListener('click', this.handleSelectProcessTravail.bind(this))
            subcontainer.classList.add('ka-project-detail')
            const processContainer = document.createElement('DIV')
            processContainer.classList.add('ka-process-container')
            const travauxContainer = document.createElement('DIV')
            travauxContainer.classList.add('ka-travail-container')

            
            window.requestAnimationFrame(() => {
                project.classList.add('extended')
                project.appendChild(subcontainer)
                subcontainer.appendChild(travauxContainer)
                subcontainer.appendChild(processContainer)
                resolve()      
            })
    
            this.renderProcess(processContainer, processes)
            this.renderTravaux(travauxContainer, travaux)
            for (let node = container.firstElementChild; node; node = node.nextElementSibling) {
                if (node.dataset.project !== project.dataset.project) {
                    if (node.classList.contains('ka-userbox')) { continue }
                    window.requestAnimationFrame(() => {
                        node.style.setProperty('display', 'none')
                    })
                }
            }
            
            if ( this.hasSet.process) { this.showTimeBox() }
        })
    })
}

TimeInteractUI.prototype.selectProject = function (projectId) {
    return new Promise (resolve => {
        const container = document.querySelector('div.ka-main-bottom')
        new Promise((resolve, reject) => {
            if (this.hasSet.project) {
                const closeProject = container.querySelector(`div.ka-project[data-project="${this.hasSet.project}"`)
                this.closeProject(closeProject)
                .then(() => {
                    return resolve()
                })
            } else {
                return resolve()
            }
        })
        .then (() => {
            const openProject = container.querySelector(`div.ka-project[data-project="${projectId}"]`)
            if (openProject) { return Promise.resolve(openProject) }
            return new Promise(resolve => {
                kafetch(KAAL.url(`Project/${projectId}`))
                .then(project => {
                    resolve(this.createProjectNode(project.data[0], container))
                })
            })
        })
        .then(openProject => {
            this.openProject(openProject)
            .then(() => {
                this.hasSet.project = parseInt(projectId)
                return this.showRecentTime()

            })
            .then(() => {
                resolve()
            })
        })
        .catch(_ => {
            // nothing
        })
    })
}

TimeInteractUI.prototype.selectTravail = function (travailId) {
    return new Promise((resolve) => {
        if (travailId === null) { resolve(); return }
        const container = document.querySelector('div.ka-travail-container')
        const head = container.querySelector('.ka-head')
        window.requestAnimationFrame(() => head.firstElementChild.innerHTML = '🭬')

        this.hasSet.travail = parseInt(travailId)
        for (let i = 1; i < container.children.length; i++) {
            const node = container.children[i]
            if (parseInt(node.dataset?.travail) === parseInt(travailId)) {
                node.dataset.open = 'true'
                window.requestAnimationFrame(() => node.querySelector('.checkmark').innerHTML = '🗹')
                continue
            }
            window.requestAnimationFrame(() => {
                if (node.querySelector('.checkmark')) { node.querySelector('.checkmark').innerHTML = '☐' }
                node.style.display = 'none'
            })
            delete node.dataset.open
        }
        resolve()
    })
}

TimeInteractUI.prototype.selectProcess = function (processId) {
    return new Promise((resolve) => {
        const container = document.querySelector('div.ka-process-container')
        const head = container.querySelector('.ka-head')
        window.requestAnimationFrame(() => head.firstElementChild.innerHTML = '🭬')
        this.hasSet.process = parseInt(processId)
        for (const node of container.querySelectorAll('.ka-button2[data-process]')) {
            if (parseInt(node.dataset.process) === parseInt(processId)) {
                node.dataset.open = 'true'
                window.requestAnimationFrame(() => {
                    node.querySelector('.checkmark').innerHTML = '🗹'
                    node.style.display = ''

                })
                continue
            }
            window.requestAnimationFrame(() => { 
                node.querySelector('.checkmark').innerHTML = '☐'
                node.style.display = 'none'
            })
            delete node.dataset.open
        }
        resolve()
    })
}

TimeInteractUI.prototype.createPeviousTimeEntry = function(temps) {
    const div = document.createElement('DIV')
    div.dataset.timeId = temps.uid
    div.dataset.second = temps.get('value')
    div.classList.add('ka-time-entry')
    const d = new Date(Date.parse(temps.get('day')))
    div.dataset.day = DataUtils.shortDate(d)
    div.innerHTML = `
        <span class="day">${DataUtils.shortDate(d)}</span>
        <span class="time">${DataUtils.secToHour(temps.get('value'))}</span>
        <span class="remark">${temps.get('comment') ? temps.get('comment') : ''}</span><br>
        <span class="project-reference">${temps.get('_project')?.reference}</span><span class="project-remark">${temps.get('_project')?.name}</span>
        `
    return div
}

TimeInteractUI.prototype.prependPreviousTimeEntry = function (temps, container = null) {
    return new Promise(resolve => {
        if (!container) { container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`) }
        if (!container) { container = document.querySelector(`div.ka-main-bottom`) }
        if (!container) { return resolve() }
        const prevTimeContainer = container.querySelector('.ka-previous-time')
        if (!prevTimeContainer) { return resolve() }
        const currentEntry = prevTimeContainer.querySelector(`div[data-time-id="${temps.uid}"]`)
        const newEntry = this.createPeviousTimeEntry(temps)
        if (this.strDates.indexOf(DataUtils.shortDate(temps.get('day'))) === -1) {
            newEntry.classList.add('ka-unmodifiable')
        }
        if (currentEntry) {
            window.requestAnimationFrame(() => {
                currentEntry.parentNode.replaceChild(newEntry, currentEntry)
                resolve()
            })
        } else {
            window.requestAnimationFrame(() => {
                prevTimeContainer.insertBefore(newEntry, prevTimeContainer.firstElementChild.nextElementSibling);           
                resolve()
            })
        }
    })
}

TimeInteractUI.prototype.insertPreviousTimeEntry = function (temps, container = null) {
    return new Promise(resolve => {
        if (!container) { container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`) }
        if (!container) { container = document.querySelector(`div.ka-main-bottom`) }
        if (!container) { return resolve() }
        const prevTimeContainer = container.querySelector('.ka-previous-time')
        if (!prevTimeContainer) { return resolve() }
        const currentEntry = prevTimeContainer.querySelector(`div[data-time-id="${temps.uid}"]`)
        const newEntry = this.createPeviousTimeEntry(temps)
        if (this.strDates.indexOf(DataUtils.shortDate(temps.get('day'))) === -1) {
            newEntry.classList.add('ka-unmodifiable')
        }
        if (currentEntry) {
            window.requestAnimationFrame(() => {
                currentEntry.parentNode.replaceChild(newEntry, currentEntry)
                resolve()
            })
        } else {
            const lastEntry = this.findLastTimeEntryForDay(temps.get('day'), container)
            window.requestAnimationFrame(() => {
                if (!lastEntry) {
                    prevTimeContainer.appendChild(newEntry);
                } else {
                    prevTimeContainer.insertBefore(newEntry, lastEntry.nextElementSibling);
                }
                resolve()
            })
        }
    })
}

TimeInteractUI.prototype.createPreviousTimeTotal = function (day, container = null) {
    return new Promise(resolve => {
        if (!container) { container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`) }
        if (!container) { container = document.querySelector(`div.ka-main-bottom`) }
        if (!container) { return resolve() }
        const prevTimeContainer = container.querySelector('.ka-previous-time')
        if (!prevTimeContainer) { return resolve() }
        const div = document.createElement('DIV')
        div.classList.add('ka-total-day')
        div.dataset.day = DataUtils.shortDate(day)
        
        const prevDays = prevTimeContainer.querySelectorAll(`div.ka-time-entry[data-day="${DataUtils.shortDate(day)}"]`)
        let total = 0
        for (const day of prevDays) {
            total += parseInt(day.dataset.second)
        }
        
        div.innerHTML = `<span class="label-total">Total</span><span class="day">${DataUtils.shortDate(day)}</span><span class="time">${DataUtils.secToHour(total)}</span>`
        const totalNode = prevTimeContainer.querySelector(`div.ka-total-day[data-day="${DataUtils.shortDate(day)}"]`)
        if (totalNode) {
            window.requestAnimationFrame(() => {
                totalNode.parentNode.replaceChild(div, totalNode)
                resolve()
            })
        } else {
            const lastEntry = this.findLastTimeEntryForDay(day, container)
            if (lastEntry) {
                window.requestAnimationFrame(() => {
                    prevTimeContainer.insertBefore(div, lastEntry.nextElementSibling)
                    resolve()
                })
            } else {
                window.requestAnimationFrame(() => {
                    prevTimeContainer.appendChild(div)
                    resolve()
                })
            }
        }
    })
}

TimeInteractUI.prototype.findLastTimeEntryForDay = function (day, container = null) {
    if (!container) { container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`) }
    const prevTimeContainer = container.querySelector('.ka-previous-time')

    const entries = prevTimeContainer.querySelectorAll(`.ka-time-entry[data-day="${DataUtils.shortDate(day)}"]`)
    return Array.from(entries).pop()
}

TimeInteractUI.prototype.showRecentTime = function (container = null) {
    return new Promise (resolve => {
        const t = []
        const today = new Date()
        today.setHours(12, 0, 0, 0)
        for (let i = 0; i  < 30; i++) {
            const date = new Date()
            date.setTime(today.getTime() - (86400000 * i))
            t.push(KATemps.getByUserAndDate(this.userId, date))
        }
        Promise.all(t)
        .then(tempsByDate => {
            if (!container) { container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`) }
            const subcontainer = container.querySelector('div.ka-project-detail')
    
            const div = document.createElement('DIV')
            div.classList.add('ka-previous-time')
            div.innerHTML += '<div class="ka-head">Vos temps récemment notés</div>'
            div.addEventListener('click', event => {
                let node = event.target
                while(!node.classList.contains('ka-previous-time') && !node.classList.contains('ka-time-entry')) { node = node.parentNode }
                if (node.classList.contains('ka-previous-time')) { return }
                this.selectTimeEntry(node.dataset.timeId)
            })
            new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    subcontainer.parentNode.appendChild(div)
                    resolve()
                })
            })
            .then(() => {
                const totalPromise = []
                for (const tempsDate of tempsByDate) {
                    const timeEntriesPromise = []
                    let date = null
                    for (const temps of tempsDate) {
                        date = temps.get('day')
                        timeEntriesPromise.push(this.insertPreviousTimeEntry(temps, container))
                    }

                    Promise.allSettled(timeEntriesPromise)
                    .then(_ => {
                        if (date !== null) {
                            totalPromise.push(this.createPreviousTimeTotal(date, container))
                        }
                    })
                }
                Promise.allSettled(totalPromise)
                .then(() => {
                    resolve()
                })
            })
        })
    })
}

TimeInteractUI.prototype.selectTimeEntry = function (timeId) {
    return new Promise((resolve, reject) => {
        this.hideIndex()
        .then(() => {
            return this.showHeader()
        })
        .then(() => {
            return this.loadProject()
        })
        .then(() => {
            Promise.all([
                KATemps.load(timeId),
                this.closeProject()
            ])
            .then(([temps]) => {
                if (this.strDates.indexOf(DataUtils.shortDate(temps.get('day'))) === -1) {
                    this.alert('Entrée non-modifiable')
                    return
                }

                this.selectProject(temps.get('project'))
                .then(_ => {
                    return this.selectProcess(temps.get('process'))
                })
                .then(_ => {
                    return this.selectTravail(temps.get('travail'))
                })
                .then(() => {
                    return this.showTimeBox({
                        id: temps.uid,
                        time: temps.get('value'),
                        remark: temps.get('comment'),
                        km: temps.get('km'),
                        dinner: temps.get('dinner')
                    })
                })
                .then(() => {
                    this.selectDay(temps.day)
                    this.highlightTimeEntry(timeId)
                    resolve()
                })
                .catch(reason => {
                    reject(reason)
                })
            })
        })
    })
}

TimeInteractUI.prototype.selectDay = function (day) {
    if (typeof day === 'string') { day = new Date(day) }

    const node = document.querySelector(`.ka-button[data-group="date"][data-date="${DataUtils.dbDate(day)}"]`)
    node.dispatchEvent(new CustomEvent('select'))   
}

TimeInteractUI.prototype.handleSelectProcessTravail = function (event) {
    let node = event.target
    while (!node.classList.contains('ka-button2') && !node.classList.contains('ka-head') && !node.classList.contains('ka-project')) { node = node.parentNode }
    if (node.classList.contains('ka-head')) { return }
    if (node.classList.contains('ka-project')) { return }

    const selectItem = []
    if(node.dataset.travail) {
        selectItem.push(this.selectTravail(node.dataset.travail))
    }

    if (node.dataset.process) {
        selectItem.push(this.selectProcess(node.dataset.process))
    }


    Promise.all(selectItem)
    .then(_ => {
        this.showTimeBox()
    })
}

TimeInteractUI.prototype.clearTimeBox = function () {
    return new Promise(resolve => {
        this.currentSelection = {
            id: null,
            time: null,
            remark: null,
            km: null,
            diner: false
        }
        this.hasSet = {
            project: null,
            travail: null,
            process: null
        }
        const container = document.querySelector('div.ka-container')
        const subcontainer = container.querySelector('div.ka-project-detail')
        const form = subcontainer.querySelector('.ka-timebox form')
        const timebox = subcontainer.querySelector('.ka-timebox')
        const delButton = form.querySelector('button[data-delete]')

        form.dataset.timeId = ''

        if (delButton) {
            window.requestAnimationFrame(() => {
                delButton.parentNode.removeChild(delButton)
            })
        }
        const addButton = form.querySelector('button[type="submit"]')
        window.requestAnimationFrame(() => {
            addButton.innerHTML = 'Ajouter'
        })

        const inputs = form.querySelectorAll('input')
        for (const input of inputs) {
            window.requestAnimationFrame(() => {
                input.value = ''
            })
        }

        const days = timebox.querySelectorAll('div[data-day]')
        for (const day of days) {
            window.requestAnimationFrame(() => {
                day.classList.remove('selected')
            })
        }

        this.showTimeBox()
        .then(() => {
            resolve()
        })
    })
}

TimeInteractUI.prototype.showTimeBox = function (opts = {id: null, time: null, remark: null}) {
    return new Promise(resolve => {
        if (document.querySelector('div.ka-timebox')) { 
            document.querySelector('div.ka-timebox').remove()
        }
        const container = document.querySelector('div.ka-container')
        const subcontainer = container.querySelector('div.ka-project-detail')
    
        this.currentSelection.id = opts.id
        this.currentSelection.time = opts.time
        this.currentSelection.remark = opts.remark
        this.currentSelection.km = opts.km
        this.currentSelection.dinner = opts.dinner

        /* check for what must be set is set except if we have an id */
        if (opts.id === null) {
            for (const k of Object.keys(this.mustHave)) {
                if (!this.hasSet[k] && this.mustHave[k]) { return }
            }
        }
        
        if (!subcontainer) { return }
        if (subcontainer.querySelector('.ka-timebox')) { return }

        const timebox = document.createElement('DIV')
        timebox.classList.add('ka-timebox')
        //timebox.innerHTML = this.dates.map(v => { return `<div class="ka-day" data-day="${v.toISOString()}">${DataUtils.shortDate(v)}</div>` }).join('')
        timebox.innerHTML = `<form data-time-id="${this.currentSelection.id ? this.currentSelection.id : ''}">
            <div class="ka-input"><label for="time">Temps</label><input type="text" placeholder="Temps" name="time" value="${this.currentSelection.time ? DataUtils.durationToStrTime(this.currentSelection.time) : ''}"/></div>
            <div class="ka-input multiple">
                ${KAAL.time?.withLunch ? `<label for="dinner" class="ka-checkbox"><input type="checkbox" name="dinner" ${this.currentSelection.dinner ? 'checked' : ''}> Repas</label>` : ''}
                ${KAAL.time?.withKm ? `<label for="km" class="ka-checkbox"><input type="text" name="km" value="${this.currentSelection.km ? this.currentSelection.km : ''}"> KM Déplacement</label>`: ''}
            </div>
            <div class="ka-input"><label for="remark">Remarque</label><input type="text" name="remark" placeholder="Remarque" value="${this.currentSelection.remark ? this.currentSelection.remark : ''}"/></div>
            <div class="ka-fieldset ka-car" style="display: none"></div>
            <div class="ka-input"><button type="submit" >${this.currentSelection.id ? 'Modifier' : 'Ajouter'}${this.currentSelection.time? ` <b>${DataUtils.durationToStr(this.currentSelection.time)}</b>` : ''}</button></div>
            ${this.currentSelection.id ? `<div class="ka-input"><button type="button" data-delete="${this.currentSelection.id}">Supprimer${this.currentSelection.time ? ` <b>${DataUtils.durationToStr(this.currentSelection.time)}</b>` : ''}</button></div>`: ''}
            </form>
        `

        //timebox.addEventListener('click', this.handleTimeBox.bind(this))
        timebox.querySelector('form').addEventListener('submit', this.addTime.bind(this))
        const delButton = timebox.querySelector('form').querySelector('button[data-delete]')
        if (delButton){
            delButton.addEventListener('click', this.delTime.bind(this))
        }

        timebox.querySelector('input[name="time"]').addEventListener('keyup', event => {
            const time = DataUtils.strToDuration(timebox.querySelector('input[name="time"]').value)
            timebox.querySelector('button[type="submit"]').innerHTML = `${this.currentSelection.id ? 'Modifier' : 'Ajouter'} <b>${DataUtils.durationToStr(time)}</b>`
        })

        window.requestAnimationFrame(() => { subcontainer.appendChild(timebox); resolve(timebox) })
    })
    .then(timebox => {
        if (KAAL.nodes.indexOf('car') === -1) { return }
        const carInteract = new KCarInteractUI()
        this.carUsage = carInteract
        carInteract.render(opts ? opts.id : null)
        .then(select => {
            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    const node = timebox.querySelector('div.ka-car')
                    node.appendChild(select, node)
                    node.style.removeProperty('display')
                    return resolve(select)
                })
            })
        })
        .then(select => {
            carInteract.showCarForm(select.querySelector('select'))
        })
    })
}

TimeInteractUI.prototype.highlightTimeEntry = function (timeId) {
    const container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`)
    const prevTimeContainer = container.querySelector('.ka-previous-time')
    const timeEntries = prevTimeContainer.querySelectorAll(`.ka-time-entry[data-time-id]`)

    if (timeEntries.length > 0) {
        window.requestAnimationFrame(() => {
            for(const entry of timeEntries) {
                entry.classList.remove('highlight')
                if (entry.dataset.timeId === timeId) {
                    entry.classList.add('highlight')
                }
            }
        })
    }
}

TimeInteractUI.prototype.delTime = function (event) {
    const container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`)
    const prevTimeContainer = container.querySelector('.ka-previous-time')
    let node = event.target
    while (node && node.nodeName !== 'BUTTON') { node = node.parentNode }
    if (!node) { return }
    const timeId = node.dataset.delete
    KATemps.load(timeId)
    .then(temps => {
        KATemps.deleteById(temps.uid)
        .then(_ => {            
            this.clearTimeBox()
            const timeEntry = prevTimeContainer.querySelector(`.ka-time-entry[data-time-id="${temps.uid}"]`)
            if (!timeEntry) { return }
            new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    timeEntry.parentNode.removeChild(timeEntry)
                    this.msg('Entrée correctement surpprimée')
                    resolve()
                })
            })
            .then(() => {
                this.createPreviousTimeTotal(temps.get('day'))
            })
        })
    })
}

TimeInteractUI.prototype.setTime = function (project, process, travail, comment, day, value) {
    return new Promise((resolve, reject) => {
        const temps = KATemps.create({
            project,
            process,
            travail,
            person: this.userId,
            comment,
            day,
            value
        })
        temps.save()
        .then(temps => {
            resolve(temps)
        })
        .catch(e => {
            reject(e)
        })
    })
}

TimeInteractUI.prototype.addTime = function (event) {
    event.preventDefault()
    const node = event.target

    /* check for what must be set is set */
    for (const k of Object.keys(this.mustHave)) {
        if (!this.hasSet[k] && this.mustHave[k]) { 
            this.alert(`${this.mapString[k]} est manquant`)
            return 
        }
    }

    if (this.day === null || this.day === undefined) { this.alert('Le jour est manquant'); return }
    const formData = new FormData(event.target)
    const time = DataUtils.strToDuration(formData.get('time'))
    if (time <= 0) {
        this.alert('Le temps est manquant ou erroné')
        return 
    }
    const dinner = formData.get('dinner') ? 1 : 0
    const km = formData.get('km') ? parseInt(formData.get('km')) : 0

    const temps = KATemps.create({
        project: this.hasSet.project,
        process: this.hasSet.process,
        travail: this.hasSet.travail,
        person: this.userId,
        comment: formData.get('remark'),
        day: DataUtils.dbDate(this.day),
        value: time,
        dinner,
        km
    })

    if (event.target.dataset.timeId) {
        temps.uid = event.target.dataset.timeId
    }
    temps.save()
    .then(temps => {
        this.hasSet = {
            project: null,
            travail: null,
            process: null
        }
        node.dataset.timeId = temps.id
        if (this.carUsage) { this.carUsage.save(temps.id, document.querySelector('div.ka-car')) }
        this.insertPreviousTimeEntry(temps)
        .then(() => {
            this.createPreviousTimeTotal(new Date(temps.get('day')))
            this.msg('Entrée correctement ajoutée')
            this.selectTimeEntry(temps.id)
        })
    })
    .catch(e => {
        console.log(e)
        this.alert('Erreur lors de l\'ajout de l\'entrée')
    })
}

TimeInteractUI.prototype.alert = function (str) {
    MsgInteractUI('error', str)
}

TimeInteractUI.prototype.msg = function (str) {
    MsgInteractUI('info', str)
}

TimeInteractUI.prototype.handleTimeBox = function (event) {
    const container = document.querySelector('div.ka-container')
    const subcontainer = container.querySelector('div.ka-project-detail')

    let node = event.target
    while (!node.classList.contains('ka-timebox') && !node.classList.contains('ka-day')) { node = node.parentNode }
    if (node.classList.contains('ka-timebox')) { return }

    const tb = subcontainer.querySelector('.ka-timebox')

    for (const prev of tb.querySelectorAll('.ka-day')) {
        prev.classList.remove('selected')
    }
    node.classList.add('selected')
    this.day = new Date(node.dataset.day)
}

TimeInteractUI.prototype.loadTravaux = function (projectId) {
    return new Promise((resolve, reject) => {
        KATravail.getByProject(projectId)
        .then(travaux => {
            travaux.sort((a,b) => parseInt(a.get('created')) - parseInt(b.get('created')))
            resolve(new KAGroup(travaux))
        })
        .catch(reason => {
            reject(reason)
        })
    })
}