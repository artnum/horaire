import KTravail from '../data/travail.js'
import KProcess from '../data/process.js'

class StatusTravail {
    static currentProject = null

    static get(id) {
        return new Promise((resolve, reject) => {
            const [type,uid] = String(id).split(':', 2)
            if (!type || !uid) { return reject(new Error('Invalid id')) }
            
            if (type == 'tr') {
                KTravail.load(uid)
                .then(tr => {
                    resolve({
                        id: `tr:${tr.id}`,
                        filterValue: tr.reference,
                        displayName: tr.reference
                    })
                })
                .catch(e => reject(e))
            } else if (type == 'pr') {
                KProcess.load(uid)
                .then(pr => {
                    resolve({
                        id: `pr:${pr.id}`,
                        filterValue: pr.name,
                        displayName: `<span style="border: 1px solid var(--input-border-color, white); background-color: ${pr.color}; width: 2ch; height: 2ex; display: inline-block; margin-right    : 1ch;">&nbsp;</span>${pr.name}`
                    })
                })
                .catch(e => reject(e))
            } else {
                return reject(new Error('Invalid type'))
            }
        })
    }
    static list() {
        return new Promise((resolve, reject) => {
            ;(() => {
                if (!StatusTravail.currentProject) {
                    return Promise.all([KProcess.list(), Promise.resolve([])])
                } else {
                    return Promise.all([KProcess.list(), 
                        KTravail.getByProject(StatusTravail.currentProject)])
                }
            })()
            .then(([pr, tr]) => {
                const values = [
                    {is_sep: true, displayName: 'Processus'},
                     ...pr.map(p => {
                        return {
                            id: `pr:${p.id}`,
                            filterValue: p.name,
                            displayName: `<span style="border: 1px solid var(--input-border-color, white); background-color: ${p.color}; width: 2ch; height: 2ex; display: inline-block; margin-right    : 1ch;">&nbsp;</span>${p.name}`
                        }
                    }),
                    {is_sep: true, displayName: 'Travail'},
                    ...tr.map(p => {
                        return {
                            id: `pr:${p.id}`,
                            filterValue: p.reference,
                            displayName: p.reference
                        }
                    })
                ] 
                console.log(values)
            })
            .catch(e => {
                return reject(e)
            })
        })
    }
}
class TimeEntry {
    constructor() {
    }

    destroy() {
    }

    render() {
        const div = document.createElement('div')
        div.innerHTML = `<input type="text"></input>`
        return Promise.resolve(div)
    }
}

class CarPrivateEntry {
    constructor() {
    }

    destroy() {
    }

    render() {
        return Promise.resolve()
    }

}

class CarEntry {
    constructor() {
    }

    destroy() {
    }

    render() {
        return Promise.resolve()
    }
}

class ExpenseEntry {
    constructor() {
    }

    destroy() {
    }

    render() {
        const div = document.createElement('div')
        div.innerHTML = `<label>Reçu</label><input type="file"></input>
            <label>Montant</label><input type="text"></input>`  
        return Promise.resolve()
    }
}

export default class TimeEntryBox {
    #ExpenseEntry
    #CarEntry 
    #TimeEntry
    #ConfigSource
    #InstalledEvents = []

    #installEvent(node, type, listener, option) {
        node.addEventListener(type, listener, option)
        this.#InstalledEvents.push({node, type, listener, option})
    }
    #removeAllEvents() {
        this.#InstalledEvents.forEach(obj => {
            obj.node.removeEventListener(obj.type, obj.listener, obj.option)
        })
    }

    constructor(ConfigSource) {
        this.domNode = document.createElement('FORM')
        this.#installEvent(this.domNode, 'submit', this.handleFormSubmit, {})

        this.#ConfigSource = ConfigSource
        this.#TimeEntry = new TimeEntry()
        this.#ExpenseEntry = new ExpenseEntry()
        this.#CarEntry = new CarEntry()
    }

    destroy() {
        this.#removeAllEvents()
        this.#TimeEntry.destroy()
        this.#ExpenseEntry.destroy()
        this.#CarEntry.destroy()
    }

    render() {
        Promise.all([
            this.#ConfigSource.runIf('TimeEntry', this.#TimeEntry.render),
            this.#ConfigSource.runIf('CarEntry', this.#CarEntry.render),
            this.#ConfigSource.runIf('ExpenseEntry', this.#ExpenseEntry.render)
        ])
        .then(([timeEntryNode, carEntryNode, expenseEntryNode]) => {
        })
        .catch(e => {
        })
    }
}
