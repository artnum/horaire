import { JAPI } from './$script/src/JAPI/JAPI.js'
import { AccountingDocLineAPI } from './$script/src/JAPI/AccountingDocLine.js'
import { base26 } from './$script/src/lib/base26.js'
const NS = 'AccountingDoc'

class AccountingDoc {
    constructor(API, doc) {
        this.API = API
        this.id = String(doc.id)
        this.project = doc.project
        this.reference = doc.reference
        this.state = doc.state
        this.related = null
        this.variant = base26.encode(doc.variant)
        
        this.date = (() => {
            const date = new Date()
            const parts = doc.date.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/).map(Number)
            date.setUTCDate(parts[3])
            date.setUTCMonth(parts[2]-1)
            date.setUTCFullYear(parts[1])
            date.setUTCHours(parts[4])
            date.setUTCMinutes(parts[5])
            return date
        })()

        this.name = doc.name
        this.description = doc.description
        this.type = doc.type
        this.condition = doc.condition
        this.related = doc.related ?? null
    }

    clone () {
        return new AccountingDoc(this.API, this.toJSON())
    }

    toJSON () {
        return {
            id: this.id,
            project: this.project,
            reference: this.reference,
            date: this.date.toISOString(),
            name: this.name,
            description: this.description,
            type: this.type,
            condition: this.condition,
            state: this.state,
            related: this.related,
            variant: base26.decode(this.variant)
        }
    }

    update () {
        return this.API.update(this)
    }

    delete() {
        return this.API.delete(this)
    }

    create () {
        return this.API.create(this)
    }
}

export class AccountingDocAPI extends JAPI {
    constructor() {
        super()
        this.LineAPI = AccountingDocLineAPI.instance
    }

    static get NS () {
        return NS
    }

    get (id) {
        return new Promise((resolve, reject) => {
            if (typeof id === 'object') { id = id.id }
            this.API.exec(
                AccountingDocAPI.NS,
                'get', 
                {id: id}
            )
            .then(doc => {
                return resolve(new AccountingDoc(this, doc))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    listByProject (projectId) {
        return new Promise((resolve, reject) => {        
            if (typeof projectId === 'object') { projectId = projectId.id }
            this.API.exec(
                AccountingDocAPI.NS,
                'listByProject',
                {project: projectId}
            )
            .then(docs => {
                return resolve(docs.map(doc => new AccountingDoc(this, doc)))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    listFromDocument (documentId) {
        return new Promise((resolve, reject) => {
            if (typeof documentId === 'object') { documentId = documentId.id }
            this.API.exec(
                AccountingDocAPI.NS,
                'listFromDocument',
                {document: documentId}
            )
            .then(docs => {
                return resolve(docs.map(doc => new AccountingDoc(this, doc)))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    list () {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocAPI.NS,
                'list'
            )
            .then(docs => {
                return resolve(docs.map(doc => new AccountingDoc(this, doc)))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    create (document) {
        return new Promise((resolve, reject) => {
            if (document instanceof AccountingDoc) {
                document = document.toJSON()
            }
        
            if (!document.project) {
                document.project = null
            }

            this.API.exec(
                AccountingDocAPI.NS,
                'create',
                {document}
            )
            .then(doc => {
                return resolve(new AccountingDoc(this, doc))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    createVariant (document) {
        return new Promise((resolve, reject) => {
            if (document instanceof AccountingDoc) {
                document = document.toJSON()
                if (!document.id) {
                    return reject('Project ID is required')
                }
            }
        
            this.API.exec(
                AccountingDocAPI.NS,
                'createVariant',
                {document}
            )
            .then(doc => {
                return resolve(new AccountingDoc(this, doc))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }
    update (document) {
        return new Promise((resolve, reject) => {
            if (document instanceof AccountingDoc) {
                document = document.toJSON()
            }
            if (!document.id) {
                return reject('Document ID is required')
            }
            this.API.exec(
                AccountingDocAPI.NS,
                'update',
                {document}
            )
            .then(doc => {
                return resolve(new AccountingDoc(this, doc))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    delete (document) {
        return new Promise((resolve, reject) => {
            if (document instanceof AccountingDoc) {
                document = document.toJSON()
            }
            if (!document.id) {
                return reject('Document ID is required')
            }
            this.API.exec(
                AccountingDocAPI.NS,
                'delete',
                {id: document.id}
            )
            .then(state => {
                if (state.deleted.success) {
                    return resolve(state.deleted)
                }
                return reject()
            }).catch(err => {
                return reject(err)
            })
        })
    }

    getCurrent (projectId) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocAPI.NS,
                'getCurrent',
                {project: projectId}
            )
            .then(doc => {
                if (doc === null) { return resolve(null) }
                return resolve(new AccountingDoc(this, doc))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    nextStep(accDoc) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocAPI.NS,
                'nextStep',
                {id: accDoc}
            )
            .then(newDocument => {
                resolve(newDocument)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    getLines (id) {
        return AccountingDocLineAPI.instance.gets(id)
    }

    updateLines (lines, id) {
        return AccountingDocLineAPI.instance.set(lines, id)
    }

    pdf (id) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocAPI.NS,
                'pdf',
                {id}
            )
            .then(pdf => {
                return resolve(pdf)
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    msword (id) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocAPI.NS,
                'msword',
                {id}
            )
            .then(pdf => {
                return resolve(pdf)
            })
            .catch(err => {
                return reject(err)
            })
        })
    }
}