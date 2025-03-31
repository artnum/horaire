import { JAPI, JAPIIterator } from './$script/src/JAPI/JAPI.js'

const NS = 'Project'
const listSize = 20

class Project {
    constructor(API, project) {
        this.API = API
        this.fromObject(project)
    }

    fromObject(object) {
        this.id = String(object.id)
        this.reference = object.reference
        this.name = object.name
        this.closed = object.closed === null ? new Date(0) : new Date(object.closed)
        this.opened = object.opened === null ? new Date(0) : new Date(object.opened)
        this.targetEnd = object.targetEnd === null ? new Date(0) : new Date(object.targetEnd)
        this.deleted = object.deleted === null ? new Date(0) : new Date(parseInt(object.deleted) * 1000)
        this.created = object.created === null ? new Date(0) : new Date(parseInt(object.created) * 1000)
        this.modified = object.modified === null ? new Date(0) : new Date(parseInt(object.modified) * 1000)
        this.uncount = object.uncount !== 0 ? true : false
        this.client = object.client
        this.price = parseFloat(object.price)
        this.manager = String(object.manager)
        this.extid = String(object.extid)
        this.ordering = parseInt(object.ordering)
        this.process = String(object.process)
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

    load() {
        return new Promise((resolve, reject) => {
            this.API.get(this.id)
            .then(object => {
                this.fromObject(object)
                return resolve(this)
            })
            .catch(e => reject(e))
        })
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
    
    static getInstance() {
        if (!this.instance) {
            this.instance = new ProjectAPI()
        }
        return this.instance
    }

    static get NS () {
        return NS
    }

    get (id) {
        return this.API.exec(
            ProjectAPI.NS,
            'get',
            {id: id}
        )
        .then(project => new Project(this, project))
    }

    list () {
        const callback = (offset, size) => {
            return this.API.exec(
                ProjectAPI.NS,
                'list',
                {offset: offset, size: size}
            )
            .then(projects => {
                let last = false
                if (projects[projects.length - 1].__more) {
                    projects.pop()
                } else {
                    last = true
                }
                return [projects.map(p => new Project(this, p)), last]
            })
        }

        return new JAPIIterator(callback, listSize)    
    }
}