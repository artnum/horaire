function KGanttView() {
    this.begin = new Date()
    this.begin.setMonth(0, 1)
    this.begin.setHours(0, 0, 0, 0)
    this.end = new Date()
    this.end.setMonth(11, 31)
    this.end.setHours(23, 59, 59, 0)
    this.days = new Array(Math.round((this.end.getTime() - this.begin.getTime()) / 86400000))
    window.addEventListener('resize', () => {
        this.run()
    })
}

KGanttView.prototype.getTravaux = function () {
    return new Promise((resolve) => {
        fetch(`${KAAL.getBase()}/Travail/_query`, {
            method: 'POST',
            body: JSON.stringify({
                '#and': {
                    '#or:0': {
                        'begin:0': ['>=', this.begin.toISOString().split('T')[0]],
                        'begin:1': ['<', this.end.toISOString().split('T')[0]]
                    },
                    '#or:1': {
                        'end:0': ['>=', this.begin.toISOString().split('T')[0]],
                        'end:1': ['<', this.end.toISOString().split('T')[0]]
                    },
                    'closed': 0
                }
            })
        })
        .then(response => {
            if (!response.ok) { return null }
            return response.json()
        })
        .then(result => {
            if (!result) { return resolve([])}
            if (result.length === 0 || result.data === null) { return resolve([]) }
            const statusPromise = []
            const travaux = []
            for (const travail of result.data) {
                const t = new Map()
                for (const k of Object.keys(travail)) {
                    switch(k) {
                        case 'end':
                        case 'begin':
                            if (travail[k]) {
                                travail[k] = new Date(travail[k])
                            } else {
                                travail[k] = new Date()
                                if (k === 'begin') {
                                    travail[k].setHours(8, 0, 0)
                                } else {
                                    travail[k].setHours(17, 0, 0)
                                }
                            }
                            break
                    }
                    t.set(k, travail[k])
                }
                t.set('days', (t.get('end').getTime() - t.get('begin').getTime()) / 86400000)
                t.set('hoursPerDay', (parseInt(t.get('time')) / t.get('days')) / 3600)
                if (isNaN(t.get('days'))) { t.set('days', 0) }
                if (isNaN(t.get('hoursPerDay'))) { t.set('hoursPerDay', 0) }
                const request = new Promise(resolve => {
                    fetch(`${KAAL.kairos.url}/store/Status/${t.get('status')}`)
                    .then(response => {
                        if (!response.ok) { return resolve({length: 0})}
                        return response.json()
                    })
                    .then(result => {
                        if (!result) { return resolve({color: 'black', name: ''}) } 
                        if (result.length < 1) { return resolve({color: 'black', name: ''})}
                        resolve(result.data[0])
                    })
                })
                t.set('request', request)
                const request2 = new Promise(resolve => {
                    fetch(`${KAAL.kairos.url}/store/Reservation/_query`, {method: 'POST', body: JSON.stringify({affaire: t.get('id')})})
                    .then(response => {
                        if (!response.ok) { return {length: 0, data: []} }
                        return response.json()
                    })
                    .then(results => {
                        if (!results.data) { return resolve([]) }
                        return resolve(results.data)
                    })

                })
                t.set('request2', request2)
                statusPromise.push(request)
                statusPromise.push(request2)
                travaux.push(t)
            }
            travaux.sort((a, b) => {
                return a.get('begin').getTime() - b.get('begin').getTime()
            })
            Promise.all(statusPromise)
            .then(_ => {
                for(const t of travaux) {
                    t.get('request')
                    .then(status => {
                        t.set('status', status)
                    })
                    t.get('request2')
                    .then(reservations => {
                        let min
                        let max
                        for (const reservation of reservations) {
                            const begin = new Date(reservation.begin)
                            const end = new Date(reservation.end)

                            if (!isNaN(begin.getTime())) {
                                if (!min) { min = begin }
                                else { if (min.getTime() > begin.getTime()) { min = begin } }
                            }
                            if (!isNaN(end.getTime())) {
                                if (!max) { max = end }
                                else { if (max.getTime() < end.getTime()) { max = end } }
                            }
                        }
                        t.set('max-reservation', max)
                        t.set('min-reservation', min)
                        t.set('reservations', reservations)
                    })
                }
                return resolve(travaux)
            })
        })
    })
}

KGanttView.prototype.getProjectsFromTravaux = function (travaux) {
    return new Promise(resolve => {
        const projects = new Map()
        const requests = []
        for (const travail of travaux) {
            if (!projects.has(travail.get('project'))) {
                const project = new Map()
                project.set('travaux', [])
                project.set('id', travail.get('project'))
                const request = new Promise(resolve => {
                    fetch(`${KAAL.getBase()}/Project/${travail.get('project')}`)
                    .then(response => {
                        if (!response.ok) { return null }
                        return response.json()
                    })
                    .then(data => {
                        if (!data) { resolve(null); return }
                        if (data.length < 1) { resolve(null) }
                        else { resolve(Array.isArray(data.data) ? data.data[0] : data.data) }
                    })
                })
                project.set('request', request)
                requests.push(request)
                projects.set(travail.get('project'), project)
            }
            projects.get(travail.get('project')).get('travaux').push(travail)
        }

        Promise.all(requests)
        .then(_ => {
            const requests = []
            for (const [_, project] of projects) {
                requests.push(new Promise(resolve => {
                    project.get('request')
                    .then(data => {
                        if (data === null) { return }
                        project.set('begin', 0)
                        project.set('end', 0)
                        for (const k of Object.keys(data)) {
                            project.set(k, data[k])
                        }
                        for (const travail of project.get('travaux')) {
                            if (project.get('begin') === 0) {
                                project.set('begin', travail.get('begin'))
                                project.set('end', travail.get('end'))
                                continue
                            }
                            
                            if (project.get('begin').getTime() > travail.get('begin').getTime()) {
                                project.set('begin', travail.get('begin'))
                            }
                            if (project.get('end').getTime() > travail.get('end').getTime()) {
                                project.set('end', travail.get('end'))
                            }
                        }
                        return
                    })
                    .then(_ => {
                        resolve()
                    })
                }))
            }

            return Promise.all(requests)
        })
        .then(_ => {
            const arrProjects = Array.from(projects.values())
            arrProjects.sort((a, b) => {
                return a.get('begin').getTime() - b.get('begin').getTime()
            })
            return resolve(arrProjects)
        })
    })
}

KGanttView.prototype.overlapTravaux = function (project) {
    const travaux = project.get('travaux')

    let maxOverlapValue = 0
    for (let i = 0; i < travaux.length; i++) {
        const t1 = travaux[i]
        if (!t1.get('overlap')) {
            t1.set('overlap', [])
        }
        for (let j = i+1; j < travaux.length; j++) {
            const t2 = travaux[j]
            if (!t2.get('overlap')) {
                t2.set('overlap', [])
            }

            const b1 = t1.get('begin').getTime()
            const b2 = t2.get('begin').getTime()
            const e1 = t1.get('end').getTime()
            const e2 = t2.get('end').getTime()
    
            if ((b1 < b2 && b2 < e1) || (b1 < e2 && e2 < e1)) {
                t1.get('overlap').push(t2)
            }
        }
    }

    let root
    for (const travail of travaux) {
        let t = travail
        if (!root) { root = t }
        let overlapIdx = 0
        do {
            if (!t.get('overlap-max')) {
                t.set('overlap-max', travail.get('overlap').length + 1)
                maxOverlapValue = travail.get('overlap').length + 1
                continue
            }
            if (travail.get('overlap-max') < t.get('overlap').length + 1) {
                travail.set('overlap-max', t.get('overlap').length + 1)
                if (maxOverlapValue < t.get('overlap').length + 1) {
                    maxOverlapValue = t.get('overlap').length + 1
                }
                root = t
            }
            if (t.get('overlap-max') < travail.get('overlap-max')) {
                if (maxOverlapValue < travail.get('overlap-max')) {
                    maxOverlapValue = travail.get('overlap-max')
                }
                t.set('overlap-max', travail.get('overlap-max'))
                root = travail
            }
            t = travail.get('overlap')[overlapIdx]
            overlapIdx++
        } while (t)
    }
    const leveled = [root.get('id')]
    root.set('overlap-level', 0)
    for (let i = 0; i < root.get('overlap').length; i++) {
        root.get('overlap')[i].set('overlap-level', i + 1)
        leveled.push(root.get('overlap')[i].get('id'))
    }

    for (const travail of travaux) {
        if (leveled.indexOf(travail.get('îd')) !== -1) { continue }
        root = travail
        if (!root.get('overlap-level')) { root.set('overlap-level', 0) }
        for (let i = 0; i < root.get('overlap').length; i++) {
            if (leveled.indexOf(root.get('overlap')[i].get('id')) !== -1) { continue }
            root.get('overlap')[i].set('overlap-level', i + 1)
            leveled.push(root.get('overlap')[i].get('id'))
        }
    }

    project.set('overlap-max', maxOverlapValue)
    project.set('travaux', travaux)
}

KGanttView.prototype.showWeeks = function () {
    function getWeek (d) {
        const date = new Date(d.getTime())
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
        const week1 = new Date(date.getFullYear(), 0, 4)
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
    }
    return new Promise((resolve, reject) => {
        const weekContainer = document.createElement('DIV')
        const container = document.getElementById('k-gantt-container')
        weekContainer.id = `k-gantt-weeks`
        weekContainer.style.minWidth = '100%'
        weekContainer.style.minHeight = '50px'
        weekContainer.style.backgroundColor = 'black'
        window.requestAnimationFrame(() => {
            if (document.getElementById('k-gantt-weeks')) {
                container.removeChild(document.getElementById('k-gantt-weeks'))
            }
            container.insertBefore(weekContainer, container.firstElementChild)
        })

        let week
        let date = new Date()
        for (date.setTime(this.begin.getTime()); date.getTime() < this.end.getTime(); date.setTime(date.getTime() + 86400000)) {
            if (week !== getWeek(date)) {
                week = getWeek(date)
                const w = document.createElement('DIV')
                w.style.minWidth = `${(7 * 86400000 * this.secWidth) - 2}px`
                w.style.maxWidth = w.style.minWidth
                w.style.border = 'solid 1px gray'
                w.style.position = 'absolute'
                w.style.left = `${(week - 1) * 7 * 86400000 * this.secWidth}px`
                w.style.top = '0px'
                w.style.backgroundColor = 'white'
                w.style.textAlign = 'center'
                w.innerHTML = `${week}`
                window.requestAnimationFrame(() => { weekContainer.appendChild(w) })
            }
        }

        resolve()
    })

}

KGanttView.prototype.run = function () {

    function LightenDarkenColor(col, amt) {
        if (col.indexOf('#') !== -1) { col = col.substring(1) }
        col = parseInt(col, 16);
        return `#${(((col & 0x0000FF) + amt) | ((((col >> 8) & 0x00FF) + amt) << 8) | (((col >> 16) + amt) << 16)).toString(16)}`
      }
      

    this.secWidth = window.innerWidth / (this.end.getTime() - this.begin.getTime())
    for (let i = 0; i < this.days.length; i++) { this.days[i] = 0 }
    Promise.all([
        this.getTravaux(),
        this.showWeeks()])
    .then(([travaux, _]) => {
        return this.getProjectsFromTravaux(travaux)
    })
    .then(projects => {
        const secWidth = this.secWidth
        let rects 
        let totalHours = 0
        const nodesAdded = []
        for (const project of projects) {
            if (project.get('deleted')) { continue }
            if (!project.get('uncount')) { continue }
            this.overlapTravaux(project)
            if (!project.get('overlap-max')) { project.set('overlap-max', 1)}
            if (project.get('overlap-max') < 1) { project.set('overlap-max', 1)}
            let baseHeight = 40
            const projNode = document.getElementById(`project-${project.get('id')}`) || document.createElement('DIV')
            if (projNode.dataset.open === '1') {
                baseHeight = project.get('overlap-max') * baseHeight
            }
            projNode.id = `project-${project.get('id')}`
            projNode.dataset.maxOverlap = project.get('overlap-max')
            if (project.get('overlap-max') > 1) {
                projNode.classList.add('zoom')
            }
            projNode.classList.add('project')
            projNode.style.setProperty('position', 'relative')
            projNode.style.setProperty('min-width', '100%')
            projNode.style.setProperty('min-height', `${baseHeight + 18}px`)
            projNode.innerHTML = `<span class="reference">${project.get('reference')}</span><span class="name">${project.get('name')}</span>`
            if (!projNode.parentNode) {
                projNode.addEventListener('click', (event) => {
                    let node = event.target
                    while (node && !node.classList.contains('project')) { node = node.parentNode }
                    if (node.dataset.open === '1') {
                        this.reheightProject(node, baseHeight)
                        node.dataset.open = '0'
                    } else {
                        this.reheightProject(node, node.dataset.maxOverlap * baseHeight)
                        node.dataset.open = '1'
                    }
                })
                
                window.requestAnimationFrame(() => {
                    document.getElementById('k-gantt-container').appendChild(projNode)
                })
            }
            let i = 0
            const drawn = []
            for (const travail of project.get('travaux')) {
                if (drawn.indexOf(travail.get('id')) !==-1) { continue }
                let t = travail
                let height = baseHeight / (travail.get('overlap-max'))
                if (!isFinite(height)) { height = baseHeight }
                do {
                    drawn.push(t.get('id'))
                    let firstDay = Math.round((t.get('begin').getTime()- this.begin.getTime()) / 86400000)
                    if (firstDay < 0) { firstDay = 0 }
                    for (let i = firstDay; i <= firstDay + t.get('days'); i++) {
                        
                        if (i >= this.days.length) { break }
                        const perDay = t.get('hoursPerDay')
                        if (isNaN(perDay) || !isFinite(perDay)) { continue }
                        this.days[i] += perDay
                        totalHours += perDay
                    }
                    const trNode = document.getElementById(`travail-${t.get('id')}`) || document.createElement('DIV')
                    trNode.classList.add('travail')
                    trNode.dataset.overlapLevel = t.get('overlap-level')
                    trNode.dataset.overlapMax = t.get('overlap-max')
                    trNode.dataset.tooltip = `${t.get('reference')} - ${t.get('description')}`
                    trNode.style.setProperty('position', 'absolute')
                    trNode.style.setProperty('top', `${(t.get('overlap-level') * height) + 18}px`)
                    trNode.style.setProperty('width', `${((t.get('end').getTime() - t.get('begin').getTime()) * secWidth) - 1}px`)
                    trNode.style.setProperty('left',  `${((t.get('begin').getTime() - this.begin.getTime()) * secWidth) - 1}px`)
                    trNode.style.setProperty('min-height', `${height - 2}px`)
                    trNode.style.setProperty('background-color', `${t.get('status').color}`)

                    if (t.get('min-reservation') && t.get('max-reservation')) {
                        const planNode = document.getElementById(`travail-minmax-${t.get('id')}`) || document.createElement('DIV')
                        planNode.classList.add('planifie')
                        planNode.dataset.overlapLevel = t.get('overlap-level')
                        planNode.dataset.overlapMax = t.get('overlap-max')
                        planNode.dataset.tooltip = `${t.get('reference')} - ${t.get('description')}`
                        planNode.style.setProperty('position', 'absolute')
                        planNode.style.setProperty('top', `${(t.get('overlap-level') * height) + 10 + height / 2}px`)
                        planNode.style.setProperty('min-height', `${(height / 2) - 2}px`)
                        planNode.style.setProperty('left',  `${((t.get('min-reservation').getTime() - this.begin.getTime()) * secWidth) - 1}px`)
                        planNode.style.setProperty('width', `${((t.get('max-reservation').getTime() - t.get('min-reservation').getTime()) * secWidth) - 1}px`)
                        planNode.style.setProperty('--border-color', LightenDarkenColor(t.get('status').color, 20))
                        const x = parseInt(t.get('status').color.substring(1), 16)
                        const r = (x & 0xFF0000) >> 16
                        const g = (x & 0x00FF00) >> 8
                        const b = (x & 0x0000FF) 
                        planNode.style.setProperty('background-color', `rgba(${r+20},${g+20},${b+20},0.3)`)
                        planNode.style.setProperty('z-index', 5)
                        nodesAdded.push(new Promise(resolve => {
                            if (!planNode.parentNode) {
                                window.requestAnimationFrame(() => {
                                    projNode.appendChild(planNode)
                                    resolve()
                                })
                            } else {
                                resolve()
                            }
                        }))
                    }

                    nodesAdded.push(new Promise((resolve) => {
                        if (!trNode.parentNode) {
                            window.requestAnimationFrame(() => {
                                projNode.appendChild(trNode)
                                if (!rects) {
                                    rects = projNode.getClientRects()
                                }
                                resolve()
                            })
                        } else {
                            rects = projNode.getClientRects()
                            resolve()
                        }
                    }))
                    
                    i++
                    t = travail.get('overlap').pop()
                } while (t)
            }
        }

        Promise.all(nodesAdded)
        .then(() => {
            const svgns = 'http://www.w3.org/2000/svg'
            const mean = totalHours / this.days.length
            const owidth = rects[0].width - rects[0].left
            const oheight = 200
            const overlay = document.getElementById('k-gantt-time') || document.createElementNS(svgns, 'svg')
            overlay.setAttributeNS(null, 'id', 'k-gantt-time')
            overlay.setAttributeNS(null, 'width', `${owidth}px`)
            overlay.setAttributeNS(null, 'height', `${oheight}px`)
            overlay.setAttributeNS(null, 'version', `1.1`)

            overlay.style.position = 'fixed'
            overlay.style.left =  `${rects[0].left}px`
            overlay.style.bottom = '0px'
            overlay.style.backgroundColor = 'lightgray'

            window.requestAnimationFrame(() => { 
                const node = document.getElementById('k-gantt-container')
                if (!overlay.parentNode) { node.appendChild(overlay) }
                node.style.marginBottom = `${oheight}px`
                node.style.overflow = 'hidden'
            })

            const width = this.secWidth * 86400000
            
            let cords = `M 0,${oheight} `
            let i = 0
            for (const day of this.days) {
                const baseX =  i * width
                let baseY = oheight - (oheight / 104 * day)
                if (baseY < 0) { baseY = -1 }
                cords += `L ${baseX + width/2},${baseY} ` 
                i++
            }
            const pathCoords = roundPathCorners(cords, 4)
            const path = document.getElementById('k-gantt-timewave') || document.createElementNS(svgns, 'path')
            path.setAttributeNS(null, 'id', 'k-gantt-timewave')
            window.requestAnimationFrame(() => {
                if (!path.parentNode) { overlay.appendChild(path) }
                path.setAttributeNS(null, 'd', pathCoords)
                path.setAttributeNS(null, 'stroke', '#FF0000')
                path.setAttributeNS(null, 'fill', 'transparent')
                path.setAttributeNS(null, 'stroke-width', '3')
            })

            const h = oheight - ((oheight / 104) * mean)
            const meanLine = document.getElementById('k-gantt-timemean') || document.createElementNS(svgns, 'path')
            meanLine.setAttributeNS(null, 'id', 'k-gantt-timemean')
            window.requestAnimationFrame(() => {
                if (!meanLine.parentNode) { overlay.appendChild(meanLine) }
                meanLine.setAttributeNS(null, 'd', `M 0,${h} H ${owidth}`)
                meanLine.setAttributeNS(null, 'stroke', '#00FF00')
                meanLine.setAttributeNS(null, 'fill', 'transparent')
                meanLine.setAttributeNS(null, 'stroke-width', '1')
            })
        })
    })
}


KGanttView.prototype.reheightProject = function (node, size) {
    window.requestAnimationFrame(() => {
        node.style.minHeight = `${size + 18}px`
    })
    const nodes = node.querySelectorAll('div.travail')
    for (const n of nodes) {
        let height = size / n.dataset.overlapMax
        if (height > 40) { height = 40 }
        const top = (height * n.dataset.overlapLevel) + 18
        window.requestAnimationFrame(() => {
            n.style.minHeight = `${height - 2}px`
            n.style.top = `${top}px`
        })
    }
    const nodes2 = node.querySelectorAll('div.planifie')
    for (const n of nodes2) {
        let height = size / n.dataset.overlapMax
        if (height > 40) { height = 40 }
        const top = (height  * n.dataset.overlapLevel) + 10 + (height / 2)
        window.requestAnimationFrame(() => {
            n.style.minHeight = `${(height / 2) - 2}px`
            n.style.top = `${top}px`
        })
    }
}

window.onload = (event) => {
    const gantt = new KGanttView()
    gantt.run()
}