import { JAPI } from './$script/src/JAPI/JAPI.js'

const NS = 'Project'

class Project {
    constructor(API, project) {
        this.API = API
        this.id = String(project.id)
        this.reference = project.reference
        this.name = project.name
        this.closed = project.closed === null ? new Date(0) : new Date(project.closed)
        this.opened = project.opened === null ? new Date(0) : new Date(project.opened)
        this.targetEnd = project.targetEnd === null ? new Date(0) : new Date(project.targetEnd)
        this.deleted = project.deleted === null ? new Date(0) : new Date(parseInt(project.deleted) * 1000)
        this.created = project.created === null ? new Date(0) : new Date(parseInt(project.created) * 1000)
        this.modified = project.modified === null ? new Date(0) : new Date(parseInt(project.modified) * 1000)
        this.uncount = project.uncount !== 0 ? true : false
        this.client = project.client
        this.price = parseFloat(project.price)
        this.manager = String(project.manager)
        this.extid = String(project.extid)
        this.ordering = parseInt(project.ordering)
        this.process = String(project.process)
    }

    clone () {
        return new Project(this.API, this.toJSON())
    }

    toJSON () {
        return {
            id: this.id,
            reference: this.reference,
            name: this.name,
            closed: this.closed,
            opened: this.opened,
            targetEnd: this.targetEnd,
            deleted: this.deleted,
            created: this.created,
            modified: this.modified,
            uncount: this.uncount,
            client: this.client,
            price: this.price,
            manager: this.manager,
            extid: this.extid,
            ordering: this.ordering,
            process: this.process
        }
    }

    update () {
        return this.API.update(this)
    }

    delete() {
        return this.API.delete(this)
    }

    create () {
        return this.API.create(this)    }

}

export class ProjectAPI extends JAPI {
    constructor () {
        super()
    }
    
    static get NS () {
        return NS
    }

    get (id) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                ProjectAPI.NS,
                'get',
                {id: id}
            )
            .then(project => {
                return resolve(new Project(this, project))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }
}