import DataUtils from '../lib/DataUtils.js'
import Fetch from '../lib/Fetch.js'
import FormatHour from '../lib/FormatHour.js'
import FileExtension from '../lib/FileExtension.js'
import Kolor from '../lib/Kolor.js'
import STProcessTravail from '../stores/process-travail.js'
import { STProject } from '../stores.js'
import admin from '../admin.js'


const F = new Fetch(`Bearer ${localStorage.getItem('klogin-token')}`)

export default class TimeUI {
    #myEventController
    #viewEventController
    #mainNode
    #navNode
    #currentView
    #currentViewState
    #currentPersonEntries
    #currentPersonId = null
    #worktimeData = null
    #personViewFilter = ''
    #dateRange = [null, null]
    #app
    #duplicate = new Map()
    #kcoreReady = null

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

    #formatOverviewHours(value) {
        if (value instanceof FormatHour) { return value }
        return new FormatHour(value * 3600)
    }

    #emptyPersonOverview() {
        return {
            days: 0,
            pause: 0,
            total_time: 0,
            absence_time: 0,
            accounted_time: 0,
            private_km: 0,
        }
    }

    #resolvePersonName(id, personData) {
        if (personData?.name) { return personData.name }
        const navItem = this.#navNode?.querySelector(`[data-action="person:${id}"]`)
        return navItem?.textContent?.trim() ?? ''
    }

    #personHasWorktimeData(personData) {
        return Boolean(personData?.entries?.length)
    }

    #buildPersonCard(item, beginDate, endDate, {showDownload = true} = {}) {
        const overview = item.overview ?? this.#emptyPersonOverview()
        const card = document.createElement('DIV')
        card.classList.add('person-card')
        card.dataset.personId = item.id
        card.dataset.personName = item.name
        card.dataset.beginDate = beginDate
        card.dataset.endDate = endDate
        card.innerHTML = `
            <div class="name">${item.name}</div>
            <div class="days">
                <span class="label">Jours</span>
                <span class="value">${overview.days}</span>
            </div>
            <div class="pauses">
                <span class="label">Pauses</span>
                <span class="value">${overview.pause}</span>
            </div>
            <div class="total-time">
                <span class="label">Temps total</span>
                <span class="value">${this.#formatOverviewHours(overview.total_time)}</span>
            </div>
            <div class="absence-time">
                <span class="label">- absences</span>
                <span class="value">${this.#formatOverviewHours(overview.absence_time)}</span>
            </div>
            <div class="accounted-time">
                <span class="label">- comptabilisé</span>
                <span class="value">${this.#formatOverviewHours(overview.accounted_time)}</span>
            </div>
            <div class="private-km">
                <span class="label">KM Privé</span>
                <span class="value">${overview.private_km}</span>
            </div>
            ${showDownload ? `<div data-action="download" class="download">
                &#11015; Excel
            </div>` : ''}`
        return card
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

    #escapeText(value) {
        return DataUtils.str(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
    }

    #indexWorktimeData(data) {
        this.#duplicate.clear()
        data.forEach(item => {
            item.entries.forEach(entry => {
                entry._person = item.name
                entry._person_id = item.id
                if (this.#duplicate.has(entry.x_key)) {
                    this.#duplicate.get(entry.x_key).push(entry)
                } else {
                    this.#duplicate.set(entry.x_key, [entry])
                }
            })
        })
    }

    #findEntryInCache(personId, entryId) {
        const person = this.#worktimeData?.find(item => item.id === personId)
        if (!person?.entries) { return null }
        return person.entries.find(entry => entry.id === entryId) ?? null
    }

    #patchCachedEntry(personId, entryId, patch) {
        const entry = this.#findEntryInCache(personId, entryId)
        if (!entry) { return false }
        Object.assign(entry, patch)
        return true
    }

    #removeCachedEntry(personId, entryId) {
        const person = this.#worktimeData?.find(item => item.id === personId)
        if (!person?.entries) { return false }
        const index = person.entries.findIndex(entry => entry.id === entryId)
        if (index === -1) { return false }
        person.entries.splice(index, 1)
        if (this.#worktimeData) {
            this.#indexWorktimeData(this.#worktimeData)
        }
        return true
    }

    #persistEntry(entry, method, body = null) {
        // TODO: use when /api/worktime/{id} is available on the backend
        const url = `/api/worktime/${entry.id}`
        if (method === 'DELETE') {
            return F.delete(url)
        }
        return F.post(url, entry)
    }

    #entryMatchesFilter(entry, query) {
        const q = DataUtils.str(query).toLowerCase()
        if (!q.trim()) { return true }
        const fields = [entry.reference, entry.project_name, entry.travail_ref]
        return fields.some(value => DataUtils.str(value).toLowerCase().includes(q))
    }

    #applyPersonViewFilter(listContainer, query = this.#personViewFilter) {
        listContainer.querySelectorAll('.time-entry').forEach(node => {
            const entry = this.#currentPersonEntries.get(node.id)
            const visible = entry ? this.#entryMatchesFilter(entry, query) : false
            node.classList.toggle('is-filtered-out', !visible)
        })
    }

    #entryProcessTravailValue(entry) {
        const travailId = entry.travail_id ?? entry.travail ?? entry.htime_travail
        const processId = entry.process_id ?? entry.process ?? entry.htime_process ?? entry.hstatus_id
        if (travailId) { return `tr:${travailId}` }
        if (processId) { return `pr:${processId}` }
        return ''
    }

    #entryProjectId(entry, projectId = null) {
        return projectId ?? entry.project_id ?? entry.project ?? entry.projectId ?? entry.htime_project ?? null
    }

    #resolveProjectId(entry) {
        const direct = this.#entryProjectId(entry)
        if (direct) { return Promise.resolve(direct) }
        if (!entry.reference) { return Promise.resolve(null) }
        const store = new STProject('Project', true)
        return store.query({name: entry.reference})
            .then(results => {
                const match = results.find(item =>
                    String(item.reference) === String(entry.reference))
                return match?.value ?? match?.id ?? null
            })
            .catch(() => null)
    }

    #attachProjectSelect(form, projectId) {
        const projectInput = form.querySelector('input[name="project"]')
        return new Promise(resolve => {
            if (projectId) {
                projectInput.value = projectId
            }
            const select = new KSelectUI(projectInput, new STProject('Project'), {
                realSelect: true,
                allowFreeText: false,
            })
            resolve(select)
        })
    }

    #patchFromProjectSelection(value, lastEntry) {
        if (!value || !lastEntry) { return {} }
        return {
            project_id: value,
            project: value,
            projectId: value,
            htime_project: value,
            reference: lastEntry.reference ?? '',
            project_name: lastEntry.name ?? lastEntry.label ?? '',
        }
    }

    #replaceProcessTravailSelect(form, projectId, processTravailSelect = null) {
        processTravailSelect?.close?.()
        const field = form.querySelector('.process-travail-field')
        field.innerHTML = `
            <span>Processus / Travail</span>
            <input type="text" name="process_travail" autocomplete="off" />
        `
        return this.#attachProcessTravailSelect(form, {}, projectId)
    }

    #attachProcessTravailSelect(form, entry, projectId) {
        const processTravailInput = form.querySelector('input[name="process_travail"]')
        const store = new STProcessTravail(projectId)
        return new Promise(resolve => {
            const initial = this.#entryProcessTravailValue(entry)
            if (initial) {
                select.value = initial
            } else if (entry.travail_ref) {
                processTravailInput.value = entry.travail_ref
            } else if (entry.process_name) {
                processTravailInput.value = entry.process_name
            }
            const select = new KSelectUI(processTravailInput, store, {
                realSelect: true,
                allowFreeText: false,
            })
            resolve(select)
        })
    }

    #patchFromProcessTravailSelection(value, lastEntry) {
        if (value.startsWith('pr:')) {
            const color = String(lastEntry?.color ?? '').replace(/^#/, '')
            return {
                process_id: value.slice(3),
                process: value.slice(3),
                travail_id: null,
                travail: null,
                process_name: lastEntry?.label ?? '',
                process_color: color,
                travail_ref: '',
            }
        }
        if (value.startsWith('tr:')) {
            return {
                travail_id: value.slice(3),
                travail: value.slice(3),
                process_id: null,
                process: null,
                process_name: '',
                process_color: '',
                travail_ref: lastEntry?.label ?? '',
            }
        }
        return {}
    }

    #refreshPersonViewFromCache() {
        if (!this.#currentPersonId || !this.#worktimeData) { return }
        const container = this.#buildPersonViewContainer(this.#currentPersonId, {preserveFilter: true})
        window.requestAnimationFrame(_ => {
            Array.from(this.#mainNode.children).forEach(n => n.remove())
            this.#mainNode.appendChild(container)
        })
    }

    #loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`)
            if (existing) {
                if (existing.dataset.loaded === '1') {
                    resolve()
                    return
                }
                existing.addEventListener('load', () => resolve(), {once: true})
                existing.addEventListener('error', () => {
                    reject(new Error(`Impossible de charger ${src}`))
                }, {once: true})
                return
            }
            const script = document.createElement('SCRIPT')
            script.src = src
            script.addEventListener('load', () => {
                script.dataset.loaded = '1'
                resolve()
            }, {once: true})
            script.addEventListener('error', () => {
                reject(new Error(`Impossible de charger ${src}`))
            }, {once: true})
            document.head.appendChild(script)
        })
    }

    #loadPopper() {
        if (window.Popper?.createPopper) { return Promise.resolve() }
        const sources = [
            new URL('../node_modules/@popperjs/core/dist/umd/popper.min.js', window.location),
            'https://unpkg.com/@popperjs/core@2/dist/umd/popper.min.js',
        ]
        const tryNext = (index) => {
            if (index >= sources.length) {
                return Promise.reject(new Error('Popper indisponible'))
            }
            return this.#loadScript(sources[index])
                .then(() => {
                    if (!window.Popper?.createPopper) {
                        return tryNext(index + 1)
                    }
                })
                .catch(() => tryNext(index + 1))
        }
        return tryNext(0)
    }

    #ensureKcore() {
        if (window.KSelectUI && window.Popper?.createPopper) { return Promise.resolve() }
        if (!this.#kcoreReady) {
            this.#kcoreReady = this.#loadPopper()
                .then(() => {
                    window.KCORE = {...(window.KCORE ?? {}), NoPopper: true}
                    if (window.KSelectUI) { return }
                    const kcoreUrl = new URL('../vendor/kcore/index.js', window.location).href
                    return this.#loadScript(kcoreUrl).then(() => KCORELoad())
                })
        }
        return this.#kcoreReady
    }

    #openEntryEditor(personId, entryNodeId) {
        const entry = this.#currentPersonEntries.get(entryNodeId)
        if (!entry) { return }

        this.#ensureKcore()
            .then(() => this.#resolveProjectId(entry))
            .then(projectId => this.#showEntryEditor(personId, entryNodeId, entry, projectId))
            .catch(() => {
                KAAL.error('Impossible de charger le sélecteur processus / travail')
            })
    }

    #showEntryEditor(personId, entryNodeId, entry, projectId) {
        const previousSelected = document.querySelector('.time-entry-list .time-entry.selected')
        if (previousSelected) { previousSelected.classList.remove('selected') }
        const entryNode = document.getElementById(entryNodeId)
        if (entryNode) { entryNode.classList.add('selected') }

        const form = document.createElement('FORM')
        form.classList.add('time-entry-editor-form')
        form.innerHTML = `
                <div class="time-entry-editor-readonly">
                    <div class="kv-pair date">
                        <span class="label">Date</span>
                        <input type="date" name="date" value="${entry.date}" />
                    </div>
               </div>
                <div class="time-entry-editor-fields">
                    <label class="project-field">
                        <span>Projet</span>
                        <input type="text" name="project" autocomplete="off" />
                    </label>
                    <label class="process-travail-field">
                        <span>Processus / Travail</span>
                        <input type="text" name="process_travail" autocomplete="off" />
                    </label>
                    <div class="kv-pair accounted-time">
                        <span class="label">Temps comptabilisé</span>
                        <span class="value">${new FormatHour(entry.time_accounted * 3600)}</span>
                    </div>

                    <label>
                        <span>Temps inscrit</span>
                        <input type="text" name="time" required
                            value="${DataUtils.durationToStrTime(entry.time_written * 3600)}" />
                    </label>
                    <label>
                        <span>KM privé</span>
                        <input type="number" name="private_km" min="0" step="1"
                            value="${entry.private_km}" />
                    </label>
                    <label>
                        <span>Remarque</span>
                        <textarea name="remark" rows="4">${DataUtils.html(entry.remark)}</textarea>
                    </label>
                </div>
                <div class="time-entry-editor-actions">
                    <button type="submit">Enregistrer</button>
                    <button type="reset" name="cancel">Annuler</button>
                    <button type="button" name="delete" class="danger">Supprimer</button>
                </div>
        `

        const popup = admin.popup(form, `Modifier entrée du ${DataUtils.longDate(entry.date)}`, {
            minWidth: '52ch',
            supClasses: ['time-entry-editor'],
        })

        const closePopup = () => {
            if (entryNode) { entryNode.classList.remove('selected') }
            popup.close()
        }

        form.addEventListener('reset', (event) => {
            event.preventDefault()
            closePopup()
        })
        form.querySelector('input[name="time"]').addEventListener('change', event => {
            const duration = DataUtils.strToDuration(event.currentTarget.value)
            form.querySelector('.accounted-time .value').innerHTML = `${new FormatHour(duration)}`
        })
        form.querySelector('button[name="delete"]').addEventListener('click', () => {
            if (!window.confirm('Supprimer cette entrée de temps ?')) { return }
            if (!this.#removeCachedEntry(personId, entry.id)) {
                KAAL.error("Impossible de supprimer l'entrée")
                return
            }
            this.#currentPersonEntries.delete(entryNodeId)
            closePopup()
            this.#refreshPersonViewFromCache()
            this.#persistEntry(entry, 'DELETE')
        })

        Promise.all([
            this.#attachProjectSelect(form, projectId),
            this.#attachProcessTravailSelect(form, entry, projectId),
        ])
        .then(([projectSelect, processTravailSelect]) => {
            let currentProcessTravailSelect = processTravailSelect
            let currentProjectId = projectId || null

            projectSelect.domNode.addEventListener('change', () => {
                const newProjectId = projectSelect.value || null
                if (String(newProjectId) === String(currentProjectId)) { return }
                currentProjectId = newProjectId
                this.#replaceProcessTravailSelect(form, newProjectId, currentProcessTravailSelect)
                    .then(select => { currentProcessTravailSelect = select })
            })

            form.addEventListener('submit', (event) => {
                event.preventDefault()
                const formData = new FormData(form)
                const date = formData.get('date')
                if (isNaN(new Date(date).getTime())) {
                    KAAL.error('La date est manquante ou erronée')
                    return
                }
                const time = DataUtils.strToDuration(formData.get('time'))
                if (time <= 0) {
                    KAAL.error('Le temps est manquant ou erroné')
                    return
                }
                const km = parseInt(formData.get('private_km'), 10)
                const remark = formData.get('remark') ?? ''
                const projectValue = projectSelect.value
                if (!projectValue) {
                    KAAL.error('Le projet est manquant ou erroné')
                    return
                }
                const processTravailValue = currentProcessTravailSelect.value
                if (!processTravailValue?.startsWith('pr:') && !processTravailValue?.startsWith('tr:')) {
                    KAAL.error('Le processus ou le travail est manquant ou erroné')
                    return
                }
                const patch = {
                    date: date,
                    time_written: time / 3600,
                    private_km: Number.isNaN(km) ? 0 : km,
                    remark,
                    ...this.#patchFromProjectSelection(projectValue, projectSelect.lastEntry),
                    ...this.#patchFromProcessTravailSelection(
                        processTravailValue,
                        currentProcessTravailSelect.lastEntry,
                    ),
                }
                if (!this.#patchCachedEntry(personId, entry.id, patch)) {
                    KAAL.error("Impossible de modifier l'entrée")
                    return
                }
                this.#indexWorktimeData(this.#worktimeData)
                closePopup()
                this.#refreshPersonViewFromCache()
                this.#persistEntry(entry, 'POST')
            })
        })
        .catch(e => {
            KAAL.error('Impossible d\'initialiser l\'éditeur',  e)
            closePopup()
        })
    }

    #buildPersonViewContainer(id, {preserveFilter = false} = {}) {
        const personData = this.#worktimeData?.find(item => item.id === id)
        const {beginDate, endDate} = this.#getDateRange()
        const wrapper = document.createElement('DIV')
        wrapper.classList.add('time-person-view')

        const hasData = this.#personHasWorktimeData(personData)
        const summaryItem = hasData
            ? personData
            : {
                id,
                name: this.#resolvePersonName(id, personData),
                overview: this.#emptyPersonOverview(),
            }
        const summaryNode = this.#buildPersonCard(summaryItem, beginDate, endDate, {showDownload: hasData})
        if (hasData) {
            summaryNode.addEventListener('click', this.#personCardEventHandler.bind(this),
                {signal: this.#viewEventController.signal})
        }
        wrapper.appendChild(summaryNode)

        const searchBar = document.createElement('DIV')
        searchBar.classList.add('time-entry-search-bar')
        const searchInput = document.createElement('INPUT')
        searchInput.type = 'text'
        searchInput.name = 'filter'
        searchInput.autocomplete = 'off'
        searchInput.spellcheck = false
        searchInput.placeholder = 'Rechercher par référence, projet ou travail…'
        searchInput.setAttribute('aria-label', 'Filtrer les entrées')
        searchBar.appendChild(searchInput)
        wrapper.appendChild(searchBar)

        const listContainer = document.createElement('DIV')
        listContainer.classList.add('time-entry-list')
        wrapper.appendChild(listContainer)

        if (!preserveFilter) {
            this.#personViewFilter = ''
        }
        searchInput.value = this.#personViewFilter

        this.#currentPersonId = id
        if (!this.#currentPersonEntries) {
            this.#currentPersonEntries = new Map()
        }
        this.#currentPersonEntries.clear()

        searchInput.addEventListener('input', () => {
            this.#personViewFilter = searchInput.value
            this.#applyPersonViewFilter(listContainer, searchInput.value)
        }, {signal: this.#viewEventController.signal})

        listContainer.addEventListener('click', event => {
            const entryNode = event.target.closest('.time-entry')
            if (!entryNode || !listContainer.contains(entryNode)) { return }
            this.#openEntryEditor(id, entryNode.id)
        }, {signal: this.#viewEventController.signal})

        listContainer.addEventListener('mouseleave', event => {
            window.requestAnimationFrame(_ => {
                Array.from(this.#app.mainAction.children).forEach(n => n.remove())
            })
        }, {signal: this.#viewEventController.signal})

        listContainer.addEventListener('pointerover', event => {
            const node = event.target.closest('div')
            if (!node) { return }
            if (!node.id) { return }
            if (this.#app.mainAction.querySelector(`#form-${node.id}`)) { return }
            const entry = this.#currentPersonEntries.get(node.id)
            if (!entry) { return }
            const form = document.createElement('DIV')
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
                dupNode.innerHTML = `<div class="title">Mêmes inscriptions</div>`
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

        const headerNode = document.createElement('DIV')
        headerNode.classList.add('time-entry-header')
        headerNode.innerHTML = `
            <span class="same" aria-hidden="true"></span>
            <span class="date">Date</span>
            <span class="project-reference">Référence</span>
            <span class="project-name">Projet</span>
            <span class="process-name">Processus</span>
            <span class="written-time">Temps inscrit</span>
            <span class="accounted-time">Comptabilisé</span>
            <span class="pause">Pause</span>
            <span class="private-km">KM privé</span>
        `
        listContainer.appendChild(headerNode)

        const entries = personData?.entries ?? []
        entries.forEach(entry => {
            const entryId = `${id}-${entry.id}`
            this.#currentPersonEntries.set(entryId, entry)
            const entryNode = document.createElement('DIV')
            entryNode.classList.add('entry', 'time-entry')
            entryNode.id = entryId
            const travailRef = DataUtils.str(entry.travail_ref)
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
                <span class="travail-ref${travailRef ? '' : ' is-empty'}">${travailRef}</span>
            `
            listContainer.appendChild(entryNode)
        })

        this.#applyPersonViewFilter(listContainer)
        return wrapper
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
            .then(_ => resolve(this.#buildPersonViewContainer(id)))
            .catch(reject)
        })
    }

    #loadData() {
        return new Promise((resolve, reject) => {
            const {begin, end, beginDate, endDate} = this.#getDateRange()
            F.get(`/api/worktime?start=${beginDate}&end=${endDate}`)
            .then(data => {
                this.#worktimeData = data
                this.#indexWorktimeData(data)
                resolve(data)
            })
            .catch(reject)
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
                    container.appendChild(this.#buildPersonCard(item, beginDate, endDate))
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
            this.#currentPersonId = id
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
