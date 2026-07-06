import DataUtils from '../lib/DataUtils.js'
import Fetch from '../lib/Fetch.js'
import FormatHour from '../lib/FormatHour.js'
import FileExtension from '../lib/FileExtension.js'
import Kolor from '../lib/Kolor.js'


const F = new Fetch(`Bearer ${localStorage.getItem('klogin-token')}`)

export default class TimeUI {
    #myEventController
    #viewEventController
    #mainNode
    #navNode
    #currentView
    #currentViewState
    #currentPersonEntries
    #dateRange = [null, null]
    #app
    #duplicate = new Map()

    constructor(app, timeapi = null) {
        this.#app = app
        this.#currentViewState = new Map()
        console.log(this.#app)
        this.#myEventController = new AbortController()
    }

    destroy() {
        console.log('End of TimeUi')
        this.#myEventController.abort()
    }

    #personCardEventHandler(event) {
        if (event.target.dataset.action != 'download') { return }
        const personNode = event.target.closest('.person-card')
        const personId = personNode.dataset.personId
        const personName = personNode.dataset.personName
        const beginDate = personNode.dataset.beginDate
        const endDate = personNode.dataset.endDate

        this.#downloadFile('xlsx', personName, 'worktime',
                           beginDate, endDate, personId)
    }

    #downloadFile(type, name, what, begin, end, id = null) {
        let url
        switch(what) {
        case 'worktime':
            url = 'worktime'
            break
        case 'mybm':
            url = 'export-mybm'
            break
        default:
            return
        }

        let params  = `start=${begin}&end=${end}`
        if (id) {
            params += `&person=${id}`
        }
        
        F.get(`/api/${url}?${params}`, type)
        .then(theFile => {
            const ext = FileExtension.fromMimetype(theFile.type)
            const renamedFile = new File([theFile], `${name} ${begin}-${end}.${ext}`, {
              type: theFile.type
            })
            const url = window.URL.createObjectURL(renamedFile)
            window.open(url, '_blank')
        })
        .catch(e => {
        })
    }

    init() {
        return Promise.resolve()
    }
    #getDateRange() {
        if (this.#dateRange[0] === null) {
            this.#dateRange[0] = new Date()
            this.#dateRange[0].setDate(30)
            this.#dateRange[0].setMonth(6)
            this.#dateRange[0].setYear(2022)
            this.#dateRange[1] = new Date()
            this.#dateRange[1].setDate(1)
            this.#dateRange[1].setMonth(6)
            this.#dateRange[1].setYear(2022)
        }
        console.log(this.#dateRange)
        return {
            begin:     this.#dateRange[1],
            end:       this.#dateRange[0], 
            beginDate: this.#dateRange[1].toISOString().split('T')[0],
            endDate:   this.#dateRange[0].toISOString().split('T')[0],
        }
    }

    #hasDuplicate(person_id, entry) {
        const dups = []
        const dup = this.#duplicate.get(entry.x_key)
        if (dup && dup.length > 1) {
            const d = [...new Map(this.#duplicate.get(entry.x_key).map(e => [e._person_id, e])).values()]
            if (d.length > 1) {
                d.forEach(e => {
                    if (e._person_id != person_id && e.time_written !== entry.time_written) {
                        dups.push({name: e._person, time_written: e.time_written})
                    }
                })
            }
        }
        return dups
    }

    personView(id) {
        return new Promise((resolve, reject) => { 
            const {begin, end, beginDate, endDate} = this.#getDateRange()
            /* TODO : don't reload everything
             * reload everything here, we need to check same days entries
             * between people. Something should be done but I don't know what
             * yet.
             */
            this.#loadData()
            .then(data => {
                const personData = data.find(item => item.id === id)
                const container = document.createElement('DIV')
                container.classList.add('time-entry-list')

                if (!personData) { return resolve(container) }
                if (!personData.entries) { return resolve(container) }
                container.addEventListener('mouseleave', event => {
                    window.requestAnimationFrame(_ => {
                        Array.from(this.#app.mainAction.children).forEach(n => n.remove())
                    })
                }, {signal: this.#viewEventController.signal})

                container.addEventListener('pointerover', event => {
                    const node = event.target.closest('div')
                    if (!node) { return }
                    if (!node.id) { return }
                    if (this.#app.mainAction.querySelector(`#form-${node.id}`)) { return }
                    const form = document.createElement('DIV')
                    const entry = this.#currentPersonEntries.get(node.id)
                    form.id = `#form-${node.id}`
                    form.classList.add('time-entry-details')
                    form.innerHTML = `
                        <div class="kv-pair date">
                            <span class="label">Date</span>
                            <span class="value">${DataUtils.longDate(entry.date)}</span>
                        </div>
                        <div class="kv-pair project-reference">
                            <span class="label">Référence de projet</span>
                            <span class="value">${entry.reference}</span>
                        </div>
                        <div class="kv-pair project-name">
                            <span class="label">Nom de projet</span>
                            <span class="value">${entry.project_name}</span>
                        </div>
                        <div class="kv-pair project-name">
                            <span class="label">Référence travail</span>
                            <span class="value">${entry.travail_ref}</span>
                        </div>

                        <div class="kv-pair process-name">
                            <span class="label">Processus</span>
                            <span class="value" 
                                style="color: ${new Kolor(entry.process_color).foreground()} !important;
                                background-color: #${entry.process_color} !important">
                                ${entry.process_name}
                            </span>
                        </div>
                        <div class="kv-pair written-time">
                            <span class="label">Temps inscrit</span>
                            <span class="value">${new FormatHour(entry.time_written * 3600)}</span>
                        </div>
                        <div class="kv-pair accounted-time">
                            <span class="label">Temps comptabilisé</span>
                            <span class="value">${new FormatHour(entry.time_accounted * 3600)}</span>
                        </div>
                        <div class="kv-pair pause">
                            <span class="label">Pause</span>
                            <span class="value">${entry.pause}</span>
                        </div>
                        <div class="kv-pair private-km">
                            <span class="label">KM Privé</span>
                            <span class="value">${entry.private_km}</span>
                        </div>
                        <div class="kv-pair remark">
                            <span class="label">Remarque</span>
                            <span class="value">${DataUtils.html(entry.remark)}</span>
                        </div>
                    `
                    let dupNode
                    const dups = this.#hasDuplicate(id, entry)
                    if (dups.length > 0) {
                        dupNode = document.createElement('DIV')
                        dupNode.classList.add('time-same-entries')
                        dupNode.innerHTML = `
                            <div class="title">Mêmes inscriptions</div>
                        `
                        dups.forEach(d => {
                            const n = document.createElement('DIV')
                            n.classList.add('kv-pair')
                            n.innerHTML = `
                                <span class="label">${d.name}</span>
                                <span class="value">${new FormatHour(d.time_written * 3600)}</span>
                            `
                            dupNode.appendChild(n)
                        })
                    }
                    window.requestAnimationFrame(_ => {
                        Array.from(this.#app.mainAction.children).forEach(n => n.remove())
                        this.#app.mainAction.appendChild(form)
                        if (dupNode) {
                            this.#app.mainAction.appendChild(dupNode)
                        }
                    })
                }, {signal: this.#viewEventController.signal})
                personData.entries.forEach(entry => {
                    const entryId = `${id}-${entry.id}`
                    this.#currentPersonEntries.set(entryId, entry)
                    const entryNode = document.createElement('DIV')
                    entryNode.classList.add('entry', 'time-entry')
                    entryNode.id = entryId
                    entryNode.innerHTML = `
                        <span class="same">${this.#hasDuplicate(id, entry).length > 1 ? '&#9888;' :''}</span>
                        <span class="date">${DataUtils.longDate(entry.date)}</span>
                        <span class="project-reference">${entry.reference}</span>
                        <span class="project-name">${entry.project_name}</span>
                        <span class="process-name" 
                            style="color: ${new Kolor(entry.process_color).foreground()} !important;
                            background-color: #${entry.process_color} !important">
                            ${entry.process_name}
                        </span>
                        <span class="written-time">${new FormatHour(entry.time_written * 3600)}</span>
                        <span class="accounted-time">${new FormatHour(entry.time_accounted * 3600)}</span>
                        <span class="pause">${entry.pause}</span>
                        <span class="private-km">${entry.private_km}</span>
                    `
                    container.appendChild(entryNode)
                })
                resolve(container)
            })
        })
    }

    #loadData() {
        return new Promise((resolve, reject) => {
            

            const {begin, end, beginDate, endDate} = this.#getDateRange()
            this.#duplicate.clear()
            F.get(`/api/worktime?start=${beginDate}&end=${endDate}`)
            .then(data => {
                data.forEach(item => {
                   item.entries.forEach(entry => {
                        entry._person    = item.name
                        entry._person_id = item.id
                        if (this.#duplicate.has(entry.x_key)) {
                            this.#duplicate.get(entry.x_key).push(entry)
                        } else {
                            this.#duplicate.set(entry.x_key, [entry])
                        }
                    })
                })
                resolve(data)
            })
        })
    }

    overview() {
        return new Promise((resolve, reject) => {
           const container = document.createElement('DIV')
           container.addEventListener('click', this.#personCardEventHandler.bind(this),
                                      {signal: this.#viewEventController.signal})
            container.classList.add('time-card-container')
    
            const {begin, end, beginDate, endDate} = this.#getDateRange()

            this.#loadData()
            .then(data => {
                   data.forEach(item => {
                   item.entries.forEach(entry => {
                        entry._person    = item.name
                        entry._person_id = item.id
                        if (this.#duplicate.has(entry.x_key)) {
                            this.#duplicate.get(entry.x_key).push(entry)
                        } else {
                            this.#duplicate.set(entry.x_key, [entry])
                        }
                    })
                    item.overview.total_time = new FormatHour(item.overview.total_time * 3600)
                    item.overview.absence_time = new FormatHour(item.overview.absence_time * 3600)
                    item.overview.accounted_time = new FormatHour(item.overview.accounted_time * 3600)
                    const iNode = document.createElement('DIV')
                    iNode.classList.add('person-card')
                    iNode.dataset.personId = item.id
                    iNode.dataset.personName = item.name
                    iNode.dataset.beginDate = beginDate
                    iNode.dataset.endDate = endDate
                    iNode.innerHTML = `
                    <div class="name">${item.name}</div>
                    <div class="days">
                        <span class="label">Jours</span>
                        <span class="value">${item.overview.days}</span>
                    </div>
                    <div class="pauses">
                        <span class="label">Pauses</span>
                        <span class="value">${item.overview.pause}</span>
                    </div>
                    <div class="total-time">
                        <span class="label">Temps total</span>
                        <span class="value">${item.overview.total_time}</span>
                    </div>
                    <div class="absence-time">
                        <span class="label">- absences</span>
                        <span class="value">${item.overview.absence_time}</span>
                    </div>
                    <div class="accounted-time">
                        <span class="label">- comptabilisé</span>
                        <span class="value">${item.overview.accounted_time}</span>
                    </div>
                    <div class="private-km">
                        <span class="label">KM Privé</span>
                        <span class="value">${item.overview.private_km}</span>
                    </div>
                    <div data-action="download" class="download">
                        &#11015; Excel
                    </div>`

                    container.appendChild(iNode);
                })
            })
            return resolve(container)
        })
    }

    main() {
        return new Promise((resolve, reject) => {
            if (!this.#mainNode) {
                this.#mainNode = document.createElement('DIV')
                this.#mainNode.classList.add('timeui-main')
            }
            return resolve(this.#mainNode)
        })
    }

    navigate(where) {
        const node = this.#navNode.querySelector(`[data-action="${where}"]`)
        if (!node) {
            return;
        }
        if (node.dataset.nostate !== 'true') {
            if (this.#viewEventController) {
                this.#viewEventController.abort()
            }
            this.#viewEventController = new AbortController()

            const prevSelected = this.#navNode.querySelector('.selected')
            if (prevSelected) {
                prevSelected.classList.remove('selected')
            }
            node.classList.add('selected')
            this.#currentView = where
            if (!this.#currentPersonEntries) {
                this.#currentPersonEntries = new Map()
            }
            this.#currentPersonEntries.clear()
            this.#currentViewState.clear()
        }

        let id = ''
        const sepPos = where.indexOf(':')
        if(sepPos != -1) {
            id = where.slice(sepPos + 1)
            where = where.slice(0, sepPos)
        }

        switch(where) {
        case 'overview': 
            this.overview()
            .then(node => {
                window.requestAnimationFrame(_ => {
                    Array.from(this.#mainNode.children).forEach(n => n.remove())
                    this.#mainNode.appendChild(node)
                })
            })
            break
        case 'export-all': {
            const {begin, end, beginDate, endDate} = this.#getDateRange()
            this.#downloadFile('xlsx', `Feuille d'heures`, 'worktime', beginDate, endDate)
        } break
        case 'export-mybm': {
            const {begin, end, beginDate, endDate} = this.#getDateRange()
            this.#downloadFile('csv', `MyBM`, 'mybm', beginDate, endDate)
        } break
        case 'person': {
            this.personView(id)
            .then(node => {
               window.requestAnimationFrame(_ => {
                    Array.from(this.#mainNode.children).forEach(n => n.remove())
                    this.#mainNode.appendChild(node)
                })
            })
        } break
        }

    }

    navigation() {
        return new Promise((resolve, reject) => {
            if (!this.#navNode) {
                const {begin, end, beginDate, endDate} = this.#getDateRange()
                this.#navNode = document.createElement('DIV')
                this.#navNode.innerHTML = `
                    <div>Du <input value="${beginDate}"  name="start" type="date"> au <input value="${endDate}" name="end" type="date"></div>
                    <div class="item separator" aria-role="none"> </div>
                    <div data-action="overview" class="item">Aperçu</div>
                    <div class="item separator" aria-role="none"> </div>
                    <div data-action="export-all" data-nostate="true" class="item">&#11015; Feuille d'heures</div>
                    <div data-action="export-mybm" data-nostate="true" class="item">&#11015; MyBM</div>
                    <div class="item separator" aria-role="none"> </div>
                `
                this.#navNode.addEventListener('click', event => {
                    if (event.target.dataset.action) {
                        this.navigate(event.target.dataset.action)
                    }
                }, {signal: this.#myEventController.signal})
                this.#navNode.addEventListener('change', event => {
                    const node = event.originalTarget
                    const {begin, end, beginDate, endDate} = this.#getDateRange()
                    const date = new Date(node.value)
                    date.setHours(12)
                    if (node.name == 'start') {
                        this.#dateRange[1] = date
                        if (this.#dateRange[1] > this.#dateRange[0]) {
                            this.#dateRange[0] = new Date(this.#dateRange[1].getFullYear(), this.#dateRange[1].getMonth() + 1, 0, 12);
                            const {begin, end, beginDate, endDate} = this.#getDateRange()
                            this.#navNode.querySelector('input[name="end"]').value = endDate
                        }
                    } else {
                        this.#dateRange[0] = date
                        if (this.#dateRange[0] < this.#dateRange[1]) {
                            this.#dateRange[1] = new Date(this.#dateRange[0].getFullYear(), this.#dateRange[0].getMonth(), 1, 12);
                            console.log(this.#dateRange[1])
                            const {begin, end, beginDate, endDate} = this.#getDateRange()
                            this.#navNode.querySelector('input[name="start"]').value = beginDate
                        }
                    }
                    
                    this.navigate(this.#currentView)
                }, {signal: this.#myEventController.signal})
            }

            F.get(`/api/people`)
            .then(data => {
                data.forEach(p => {
                    const div = document.createElement('div')
                    div.dataset.action = `person:${p.id}`
                    div.textContent = p.name
                    div.classList.add('item')
                    if (!p.active && p.deleted == 0) {
                        div.classList.add('disabled')
                    } else if (p.deleted > 0) {
                        div.classList.add('deleted')
                    }
                    this.#navNode.appendChild(div)
                })
            })
            .catch(e => {
                console.log(e)
                reject(new Error('Erreur réseau', {cause:e}))
            })
            return resolve(this.#navNode)
        })
    }

    run() {
        this.navigate('overview')    
    }
}
