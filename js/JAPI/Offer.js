import { AccountingDocAPI, AccountingDoc } from './AccountingDoc.js'
import { AccountingDocLineAPI } from './AccountingDocLine.js'

export class OfferAPI extends AccountingDocAPI {
    constructor() { super() }

    listByProject (projectId) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                OfferAPI.NS,
                'search',
                {search: {project: projectId, type: 'order', deleted: 0}}
            )
            .then(docs => {
                console.log(docs)
                return resolve(docs.map(doc => new AccountingDoc(this, doc)))
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    nextStep(offer) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                OfferAPI.NS,
                'nextStep',
                {id: offer}
            )
            .then(newDocument => {
                console.log(newDocument)
                resolve(newDocument)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    create (offer) {
        offer.type = 'order'
        return super.create(offer)
    }

    getLines (id) {
        return AccountingDocLineAPI.instance.gets(id)
    }

    updateLines (lines, id) {
        return AccountingDocLineAPI.instance.set(lines, id)
    }
}
