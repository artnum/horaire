function KGanttView() {
    this.begin = new Date()
    this.begin.setMonth(0, 1)
    this.begin.setHours(0, 0, 0, 0)
    this.end = new Date()
    this.end.setMonth(11, 31)
    this.end.setHours(24, 0, 0, 0)
    this.days = new Array((Math.round(this.end.getTime() - this.begin.getTime()) / 86400000))
    for (let i = 0; i < this.days.length; i++) { this.days[i] = 0 }
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
                statusPromise.push(request)
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

    let overlap_order = 0
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

    project.set('travaux', travaux)
}

KGanttView.prototype.run = function () {
    this.getTravaux()
    .then(travaux => {
        return this.getProjectsFromTravaux(travaux)
    })
    .then(projects => {
        const secWidth = window.innerWidth / (this.end.getTime() - this.begin.getTime())
        let rects 
        let totalHours = 0
        const nodesAdded = []
        for (const project of projects) {
            if (project.get('deleted')) { continue }
            if (!project.get('uncount')) { continue }
            this.overlapTravaux(project)
            const baseHeight = 40
            const projNode = document.createElement('DIV')
            projNode.style.setProperty('position', 'relative')
            projNode.style.setProperty('min-width', '100%')
            projNode.style.setProperty('min-height', `${baseHeight}px`)
            projNode.innerHTML = `<span class="reference">${project.get('reference')}</span><span class="name">${project.get('name')}</span>`
            window.requestAnimationFrame(() => {
                document.getElementById('k-gantt-container').appendChild(projNode)
            })
            let i = 0
            const drawn = []
            for (const travail of project.get('travaux')) {
                if (drawn.indexOf(travail.get('id')) !==-1) { continue }
                let t = travail
                let overlapIdx = 0
                let height = baseHeight / (travail.get('overlap').length + 1)
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
                    const trNode = document.createElement('DIV')
                    trNode.style.setProperty('position', 'absolute')
                    trNode.style.setProperty('top', `${overlapIdx * height}px`)
                    trNode.style.setProperty('width', `${(t.get('end').getTime() - t.get('begin').getTime()) * secWidth}px`)
                    trNode.style.setProperty('left',  `${(t.get('begin').getTime() - this.begin.getTime()) * secWidth}px`)
                    trNode.style.setProperty('min-height', `${height}px`)
                    trNode.style.setProperty('background-color', `${t.get('status').color}`)
                    trNode.style.setProperty('z-index', '-1')
                    nodesAdded.push(new Promise((resolve) => {
                        window.requestAnimationFrame(() => {
                            projNode.appendChild(trNode)
                            if (!rects) {
                                rects = projNode.getClientRects()
                            }
                            resolve()
                        })
                    }))
                    
                    i++
                    t = travail.get('overlap').pop()
                    overlapIdx++
                } while (t)
            }
        }

        Promise.all(nodesAdded)
        .then(() => {
            const svgns = 'http://www.w3.org/2000/svg'
            const mean = totalHours / this.days.length
            const owidth = rects[0].width - rects[0].left
            const oheight = 200
            const overlay = document.createElementNS(svgns, 'svg')
            overlay.setAttributeNS(null, 'width', `${owidth}px`)
            overlay.setAttributeNS(null, 'height', `${oheight}px`)
            overlay.setAttributeNS(null, 'version', `1.1`)

            overlay.style.position = 'fixed'
            overlay.style.left =  `${rects[0].left}px`
            overlay.style.bottom = '0px'
            overlay.style.backgroundColor = 'lightgray'

            window.requestAnimationFrame(() => { 
                const node = document.getElementById('k-gantt-container')
                node.appendChild(overlay) 
                node.style.marginBottom = `${oheight}px`
            })

            const width = secWidth * 86400000
            
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
            const path = document.createElementNS(svgns, 'path')
            path.setAttributeNS(null, 'd', pathCoords)
            path.setAttributeNS(null, 'stroke', '#FF0000')
            path.setAttributeNS(null, 'fill', 'transparent')
            path.setAttributeNS(null, 'stroke-width', '3')

            const meanLine = document.createElementNS(svgns, 'path')
            const h = oheight - ((oheight / 104) * mean)
            meanLine.setAttributeNS(null, 'd', `M 0,${h} H ${owidth}`)
            meanLine.setAttributeNS(null, 'stroke', '#00FF00')
            meanLine.setAttributeNS(null, 'fill', 'transparent')
            meanLine.setAttributeNS(null, 'stroke-width', '1')
            overlay.appendChild(path)
            overlay.appendChild(meanLine)
        })
    })
}


window.onload = (event) => {
    const gantt = new KGanttView()
    gantt.run()
}