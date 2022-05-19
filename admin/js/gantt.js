function KGantt() {
    this.begin = new Date()
    this.begin.setMonth(0, 1)
    this.begin.setHours(0, 0, 0, 0)
    this.end = new Date()
    this.end.setMonth(11, 31)
    this.end.setHours(24, 0, 0, 0)
    this.days = new Array((Math.round(this.end.getTime() - this.begin.getTime()) / 86400000))
    for (let i = 0; i < this.days.length; i++) { this.days[i] = 0 }
}

KGantt.prototype.getTravaux = function () {
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
                    }
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
                travaux.push(t)
            }
            travaux.sort((a, b) => {
                return a.get('begin').getTime() - b.get('begin').getTime()
            })
            return resolve(travaux)
        })
    })
}

KGantt.prototype.getProjectsFromTravaux = function (travaux) {
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

KGantt.prototype.run = function () {
    this.getTravaux()
    .then(travaux => {
        return this.getProjectsFromTravaux(travaux)
    })
    .then(projects => {
        const secWidth = window.innerWidth / (this.end.getTime() - this.begin.getTime())
        let baseColor = 0
        for (const project of projects) {
            const baseHeight = 40
            const projNode = document.createElement('DIV')
            projNode.style.setProperty('position', 'relative')
            projNode.style.setProperty('min-width', '100%')
            projNode.style.setProperty('min-height', `${baseHeight}px`)
            projNode.innerHTML = `<span class="reference">${project.get('reference')}</span><span class="name">${project.get('name')}</span>`
            window.requestAnimationFrame(() => {
                document.getElementById('k-gantt-container').appendChild(projNode)
            })
            const height = baseHeight / project.get('travaux').length
            let i = 0
            for (const travail of project.get('travaux')) {
                let firstDay = Math.round((travail.get('begin').getTime()- this.begin.getTime()) / 86400000)
                console.log(firstDay)
                if (firstDay < 0) { firstDay = 0 }
                for (let i = firstDay; i <= firstDay + travail.get('days'); i++) {
                    
                    if (i >= this.days.length) { break }
                    const perDay = travail.get('hoursPerDay')
                    if (!isNaN(perDay) || !isFinite(perDay)) { continue }
                    this.days[i] += perDay
                }
                const trNode = document.createElement('DIV')
                trNode.style.setProperty('position', 'absolute')
                trNode.style.setProperty('top', `${i * height}px`)
                trNode.style.setProperty('width', `${(travail.get('end').getTime() - travail.get('begin').getTime()) * secWidth}px`)
                trNode.style.setProperty('left',  `${(travail.get('begin').getTime() - this.begin.getTime()) * secWidth}px`)
                trNode.style.setProperty('min-height', `${height}px`)
                trNode.style.setProperty('background-color', `hsla(${baseColor}, 100%, 60%, 0.5)`)
                trNode.style.setProperty('z-index', '-1')
                window.requestAnimationFrame(() => {
                    projNode.appendChild(trNode)
                })
                i++
            }
            baseColor = (baseColor + 20) % 360
        }

        const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        overlay.setAttributeNS(null, 'width', `${window.innerWidth}px`)
        overlay.setAttributeNS(null, 'height', `${window.innerHeight}px`)
        overlay.setAttributeNS(null, 'version', `1.1`)

        overlay.style.position = 'fixed'
        overlay.style.left = '0px'
        overlay.style.bottom = '0px'
        overlay.style.backgroundColor = 'transparent'

        window.requestAnimationFrame(() => { document.getElementById('k-gantt-container').appendChild(overlay) })

        const width = window.innerWidth / this.days.length

        let cords = `M 0,${window.innerHeight} `
        let i = 0
        for (const day of this.days) {
            const baseX =  i * width
            const baseY = window.innerHeight - (window.innerHeight / 104 * day)
            cords += `L ${baseX},${baseY} ` 
            /*const bar = document.createElement('div')
            bar.style.position = 'absolute'
            bar.style.bottom = '0px'
            bar.style.left = `${i * width}px`
            bar.style.minWidth = `${width}px`
            bar.style.minHeight = `${window.innerHeight / (8 * 20) * day}px`
            bar.style.borderTop = '1px solid red'
            i++
            window.requestAnimationFrame(() => { overlay.appendChild(bar)})*/
            i++
        }
        const pathCoords = roundPathCorners(cords, 4)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttributeNS(null, 'd', pathCoords)
        path.setAttributeNS(null, 'stroke', '#FF0000')
        path.setAttributeNS(null, 'fill', 'transparent')
        path.setAttributeNS(null, 'stroke-width', '3')

        overlay.appendChild(path)
    })
}


window.onload = (event) => {
    const gantt = new KGantt()
    gantt.run()
}