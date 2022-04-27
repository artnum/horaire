function TimeInteractUI (userId) {
    this.eventTarget = new EventTarget()

    this.mustHave = {
        project: true,
        process: true,
        travail: true
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
    }
    this.userId = userId
    const date =  new Date()
    const dates = []
    this.strDates = []
    date.setHours(12, 0, 0, 0)
    dates.push(date)
    this.strDates.push(DataUtils.shortDate(date))
    for (let day = KAAL.limits.lateDay - 1; day > 0; day--) {
        const d = new Date()
        d.setTime(dates[dates.length - 1].getTime())
        do {
            d.setTime(d.getTime() - 86400000)
            d.setHours(12, 0, 0, 0)
        } while (d.getDay() === 0 || d.getDay() === 6)
        dates.push(d)
        this.strDates.push(DataUtils.shortDate(d))
    }
    this.dates = dates

    if (window.location.hash) {
        this.loadProject()
        .then(_ => {
            const [type, id] = window.location.hash.split('/')
            window.location.hash = ''
            if (type === '#project') {
                this.loadProject()
                .then(_ => {
                    this.selectProject(id)
                }
            } else {
                kafetch(KAAL.url(`Travail/${id}`))
                .then(travail => {
                    if (travail.length === 1) {
                        console.log(travail.data[0])
                        this.selectProject(travail.data[0].project)
                        .then(_ => {
                            this.selectTravail(id)
                            .then(_ => {
                                if (travail.data[0].status) {
                                    this.selectProcess(travail.data[0].status)
                                }
                            })
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

TimeInteractUI.prototype.run = function () {
    this.showHeader()
    .then(() => {
        this.loadProject()
    })
}

TimeInteractUI.prototype.loadProject = function () {
    return new Promise((resolve, reject) => {
        kafetch(KAAL.url('Project/_query'), {method: 'POST', body: JSON.stringify({
            '#and': {
                deleted: '-',
                closed: '-'
            }
        })})
        .then(projects => {
            const container = document.querySelector('div.ka-container')
            for (const project of projects.data) {
                const kaproject = KAProject.create(project)
                const div = document.createElement('DIV')
                div.classList.add('ka-project')
                div.dataset.project = kaproject.id
                div.dataset.reference = kaproject.reference.toLowerCase()
                div.innerHTML = `<span class="reference">${kaproject.reference}</span><span class="name">${kaproject.name}</span>`
                window.requestAnimationFrame(() => {
                    container.appendChild(div)
                })
                div.addEventListener('click', event => {
                    let node = event.target
                    while (node && !node.dataset.project) {
                        if (node.classList.contains('ka-project-detail') || node.classList.contains('ka-previous-time')) { return } // we click on detail, so we don't handle event there
                        node = node.parentNode 
                    }
                    this.selectProject(node.dataset.project)
                })
            }
            resolve()
        })
    })
}

TimeInteractUI.prototype.showHeader = function () {
    return new Promise(resolve => {
        KAPerson.load(this.userId)
        .then(user => {
            const div = document.createElement('DIV')
            div.innerHTML = `${user.get('name')}<span>Cliquer ici pour se déconnecter</span>`
            div.classList.add('ka-userbox')
            const container = document.querySelector('div.ka-container')
            
            div.addEventListener('click', event => {
                new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        container.innerHTML = ''
                        resolve()
                    })
                })
                .then(() => {
                    this.eventTarget.dispatchEvent(new CustomEvent('user-logout'))
                })
            })

            const searchDiv = document.createElement('DIV')
            searchDiv.classList.add('ka-search')
            searchDiv.innerHTML = `<input type="text" placeholder="Chercher une référence">`

            searchDiv.firstElementChild.addEventListener('keyup', event => {
                if (event.target.value === '') {
                    const nodes = container.querySelectorAll('.ka-project')

                    for (const node of nodes) {
                      node.style.removeProperty('display' )   
                    }
                    return
                } 
                const search = event.target.value.toLowerCase()
                const nodes = container.querySelectorAll('.ka-project')

                for (const node of nodes) {
                    const label = node.querySelector('span.name')
                    if (!node.dataset.reference.startsWith(search) && label.textContent.toLowerCase().includes(search) === false) {
                        node.style.setProperty('display', 'none')
                    } else {
                        node.style.removeProperty('display' )   
                    }
                }
            })

            container.appendChild(div)
            container.appendChild(searchDiv)
            resolve()
        })
    })
}

TimeInteractUI.prototype.closeProject = function (project) {
    return new Promise(resolve => {
        const container = document.querySelector('div.ka-container')

        if (!project) {
            project = container.querySelector(`div.ka-project[data-project="${this.hasSet.project}"`)
        }
        delete project.dataset.open

        this.hasSet.project = null
        this.hasSet.travail = null
        this.hasSet.process = null
        this.day = null
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
                project.removeChild(subcontainer)
                project.classList.remove('extended')
                resolve()
            })
        })
    })
}

TimeInteractUI.prototype.openProject = function (project) {
    return new Promise(resolve => {
        
        project.dataset.scrollTop = window.scrollY
        project.dataset.open = 'true'

        Promise.all([
            this.loadTravaux(project.dataset.project),
            KAProcess.list()
        ])
        .then(([travaux, processes]) => {
            this.hasSet.project = project.dataset.project
            const container = document.querySelector('div.ka-container')
            const subcontainer = document.createElement('DIV')
            subcontainer.addEventListener('click', this.handleSelectProcessTravail.bind(this))
            subcontainer.classList.add('ka-project-detail')
            
            const hideRequest = []
            for (let node = container.firstElementChild; node; node = node.nextElementSibling) {
                if (node.dataset.project !== project.dataset.project) {
                    if (node.classList.contains('ka-userbox')) { continue }
                    hideRequest.push(new Promise(resolve => {
                        window.requestAnimationFrame(() => {
                            node.style.setProperty('display', 'none')
                            resolve()
                        })
                    }))
                }
            }

            const processHead = document.createElement('DIV')
            processHead.classList.add('ka-head')
            processHead.innerHTML = 'Processus'

            new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    project.classList.add('extended')
                    project.appendChild(subcontainer)
                    subcontainer.appendChild(processHead)
                    resolve()
                })
            })
            .then(_ => {
                const chain = Promise.resolve()
                for (const process of processes) {
                    const div = document.createElement('DIV')
                    div.classList.add('ka-button')
                    div.innerHTML = `<span class="reference">${process.get('reference')}</span> <span class="name">${process.get('name')}</name>`
                    div.dataset.process = process.uid
                    chain.then(() => {
                        return new Promise(resolve => {
                            window.requestAnimationFrame(() => { 
                                subcontainer.appendChild(div)
                                resolve()
                            })
                        })
                    })
                }

                if (travaux.length < 1) { this.mustHave.travail = false }
                if (travaux.length > 0) {
                    const groups = travaux.gets()
                    const travailHead = document.createElement('DIV')
                    travailHead.classList.add('ka-head')
                    travailHead.innerHTML = 'Travail'
                    chain.then(() => {
                        return new Promise(resolve => {
                            window.requestAnimationFrame(() => {
                                subcontainer.appendChild(travailHead)
                                resolve()
                            })
                        })
                    })

                    if (travaux.hasUngrouped()) {
                        for (const travail of travaux.get(groups.shift())) {
                            const div = document.createElement('DIV')
                            div.classList.add('ka-button')
                            div.innerHTML = `<span class="reference">${travail.get('reference')}</span> <span class="name">${travail.get('description')}</span>`
                            div.dataset.travail = travail.uid
                            chain.then(() => {
                                return new Promise(resolve => {
                                    window.requestAnimationFrame(() => { 
                                        subcontainer.appendChild(div)
                                        resolve()
                                    })
                                })
                            })
                        }
                    }

                    if (groups.length > 0) {
                        groups.reverse()
                        for (const group of groups) {
                            const travailHead = document.createElement('DIV')
                            travailHead.classList.add('ka-subhead')
                            travailHead.innerHTML = group
                            chain.then(() => {
                                return new Promise(resolve => {
                                    window.requestAnimationFrame(() => {
                                        subcontainer.appendChild(travailHead)
                                        resolve()
                                    })
                                })
                            })
                            for (const travail of travaux.get(group)) {
                                const div = document.createElement('DIV')
                                div.classList.add('ka-button')
                                div.innerHTML = `<span class="reference">${travail.get('reference')}</span> <span class="name">${travail.get('description')}</span>`
                                div.dataset.travail = travail.uid
                                chain.then(() => {
                                    return new Promise(resolve => {
                                        window.requestAnimationFrame(() => { 
                                            subcontainer.appendChild(div)
                                            resolve()
                                        })
                                    })
                                })
                            }
                        }
                    }
                }
                return chain
            })
            .then(() => {
                resolve()
            })
        })
    })
}

TimeInteractUI.prototype.selectProject = function (projectId) {
    return new Promise (resolve => {
        const container = document.querySelector('div.ka-container')
        new Promise(resolve => {
            if (this.hasSet.project) {
                const prevProject = this.hasSet.project
                const closeProject = container.querySelector(`div.ka-project[data-project="${this.hasSet.project}"`)
                closing = this.closeProject(closeProject)
                if (prevProject === projectId) { 
                    resolve(false);
                    return 
                }
            }
            resolve(true)
        })
        .then(doOpen => {
            if (!doOpen) { resolve(); return }
            const openProject = container.querySelector(`div.ka-project[data-project="${projectId}"]`)
            this.openProject(openProject)
            .then(() => {
                return this.showRecentTime()

            })
            .then(() => {
                resolve()
            })
        })

    })
}

TimeInteractUI.prototype.selectTravail = function (travailId) {
    return new Promise((resolve) => {
        if (travailId === null) { resolve(); return }
        const container = document.querySelector('div.ka-container')
        const subcontainer = container.querySelector('div.ka-project-detail')
        this.hasSet.travail = travailId
        const animReq = []
        for (const node of subcontainer.querySelectorAll('.ka-button[data-travail]')) {
            animReq.push(new Promise(resolve => { delete node.dataset.open; resolve() }))
            if (node.dataset.travail === travailId) {
                animReq.push(new Promise (resolve => { window.requestAnimationFrame(() => { node.dataset.open = 'true'; resolve() }) }))
            }
        }
        Promise.allSettled(animReq)
        .then(() => {
            resolve()
        })
    })
}

TimeInteractUI.prototype.selectProcess = function (processId) {
    return new Promise((resolve) => {
        const container = document.querySelector('div.ka-container')
        const subcontainer = container.querySelector('div.ka-project-detail')
        this.hasSet.process = processId
        const animReq = []
        for (const node of subcontainer.querySelectorAll('.ka-button[data-process]')) {
            animReq.push(new Promise(resolve => { delete node.dataset.open; resolve() }))
            if (node.dataset.process === processId) {
                animReq.push(new Promise (resolve => { window.requestAnimationFrame(() => { node.dataset.open = 'true'; resolve() }) }))
            }
        }
        Promise.allSettled(animReq)
        .then(() => {
            resolve()
        })
    })
}

TimeInteractUI.prototype.selectDay = function (day) {
    
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

TimeInteractUI.prototype.insertPreviousTimeEntry = function (temps) {
    console.log(temps)
    return new Promise(resolve => {
        const container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`)
        const prevTimeContainer = container.querySelector('.ka-previous-time')
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
            const lastEntry = this.findLastTimeEntryForDay(temps.get('day'))
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

TimeInteractUI.prototype.createPreviousTimeTotal = function (day) {
    return new Promise(resolve => {
        const container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`)
        const prevTimeContainer = container.querySelector('.ka-previous-time')

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
            const lastEntry = this.findLastTimeEntryForDay(day)
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

TimeInteractUI.prototype.findLastTimeEntryForDay = function (day) {
    const container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`)
    const prevTimeContainer = container.querySelector('.ka-previous-time')

    const entries = prevTimeContainer.querySelectorAll(`.ka-time-entry[data-day="${DataUtils.shortDate(day)}"]`)
    return Array.from(entries).pop()
}

TimeInteractUI.prototype.showRecentTime = function () {
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
            const container = document.querySelector(`div.ka-project[data-project="${this.hasSet.project}"]`)
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
                        timeEntriesPromise.push(this.insertPreviousTimeEntry(temps))
                    }

                    Promise.allSettled(timeEntriesPromise)
                    .then(_ => {
                        if (date !== null) {
                            totalPromise.push(this.createPreviousTimeTotal(date))
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
                return this.showTimeBox({id: temps.uid, time: temps.get('value'), remark: temps.get('comment')})   
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
}

TimeInteractUI.prototype.selectDay = function (day) {
    if (typeof day === 'string') { day = new Date(day) }

    const container = document.querySelector('div.ka-container')
    const subcontainer = container.querySelector('div.ka-project-detail')
    const tb = subcontainer.querySelector('.ka-timebox')

    for (const prev of tb.querySelectorAll('.ka-day')) {
        if (DataUtils.dbDate(new Date(prev.dataset.day)) === DataUtils.dbDate(day)) {
            this.day = day
            prev.classList.add('selected')
        } else {
            prev.classList.remove('selected')
        }
    }
    
}

TimeInteractUI.prototype.handleSelectProcessTravail = function (event) {
    let node = event.target
    while (!node.classList.contains('ka-button') && !node.classList.contains('ka-head') && !node.classList.contains('ka-project')) { node = node.parentNode }
    if (node.classList.contains('ka-head')) { return }
    if (node.classList.contains('ka-project')) { return }

    const selectItem = []

    if (node.dataset.process) {
        selectItem.push(this.selectProcess(node.dataset.process))
    }


    if(node.dataset.travail) {
        selectItem.push(this.selectTravail(node.dataset.travail))
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
            remark: null
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

        this.day = null
        this.showTimeBox()
        .then(() => {
            resolve()
        })
    })
}

TimeInteractUI.prototype.showTimeBox = function (opts = {id: null, time: null, remark: null}) {
    return new Promise(resolve => {
        const container = document.querySelector('div.ka-container')
        const subcontainer = container.querySelector('div.ka-project-detail')
    
        this.currentSelection.id = opts.id
        this.currentSelection.time = opts.time
        this.currentSelection.remark = opts.remark

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
        timebox.innerHTML = this.dates.map(v => { return `<div class="ka-day" data-day="${v.toISOString()}">${DataUtils.shortDate(v)}</div>` }).join('')
        timebox.innerHTML += `<form data-time-id="${this.currentSelection.id ? this.currentSelection.id : ''}">
            <div class="ka-input"><label for="time">Temps</label><input type="text" name="time" value="${this.currentSelection.time ? DataUtils.durationToStrTime(this.currentSelection.time) : ''}"/></div>
            <div class="ka-input"><label for="remark">Remarque</label><input type="text" name="remark" value="${this.currentSelection.remark ? this.currentSelection.remark : ''}"/></div>
            <div class="ka-input"><button type="submit" >${this.currentSelection.id ? 'Modifier' : 'Ajouter'}${this.currentSelection.time? ` <b>${DataUtils.durationToStr(this.currentSelection.time)}</b>` : ''}</button></div>
            ${this.currentSelection.id ? `<div class="ka-input"><button type="button" data-delete="${this.currentSelection.id}">Supprimer${this.currentSelection.time ? ` <b>${DataUtils.durationToStr(this.currentSelection.time)}</b>` : ''}</button></div>`: ''}
            </form>
        `

        timebox.addEventListener('click', this.handleTimeBox.bind(this))
        timebox.querySelector('form').addEventListener('submit', this.addTime.bind(this))
        const delButton = timebox.querySelector('form').querySelector('button[data-delete]')
        if (delButton){
            delButton.addEventListener('click', this.delTime.bind(this))
        }

        timebox.querySelector('input[name="time"]').addEventListener('keyup', event => {
            const time = DataUtils.strToDuration(event.target.value)
            timebox.querySelector('button[type="submit"]').innerHTML = `${this.currentSelection.id ? 'Modifier' : 'Ajouter'} <b>${DataUtils.durationToStr(time)}</b>`
        })

        window.requestAnimationFrame(() => { subcontainer.appendChild(timebox); resolve() })
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

TimeInteractUI.prototype.addTime = function (event) {
    event.preventDefault()

    /* check for what must be set is set */
    for (const k of Object.keys(this.mustHave)) {
        if (!this.hasSet[k] && this.mustHave[k]) { 
            this.alert(`${this.mapString[k]} est manquant`)
            return 
        }
    }

    if (this.day === null) { this.alert('Le jour est manquant'); return }
    const formData = new FormData(event.target)
    const time = DataUtils.strToDuration(formData.get('time'))
    if (time <= 0) {
        this.alert('Le temps est manquant ou erroné')
        return 
    }

    const temps = KATemps.create({
        project: this.hasSet.project,
        process: this.hasSet.process,
        travail: this.hasSet.travail,
        person: this.userId,
        comment: formData.get('remark'),
        day: DataUtils.dbDate(this.day),
        value: time
    })

    if (event.target.dataset.timeId) {
        temps.uid = event.target.dataset.timeId
    }

    temps.save()
    .then(temps => {
        this.clearTimeBox()
        this.insertPreviousTimeEntry(temps)
        .then(() => {
            this.createPreviousTimeTotal(new Date(temps.get('day')))
            this.msg('Entrée correctement ajoutée')
        })
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
            resolve(new KAGroup(travaux))
        })
        .catch(reason => {
            reject(reason)
        })
    })
}