import { AccountingDocAPI, AccountingDoc } from './AccountingDoc.js'
import { AccountingDocLineAPI } from './AccountingDocLine.js'

export class OfferAPI extends AccountingDocAPI {
    constructor() { super() }

    listByProject (projectId) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                OfferAPI.NS,
                'search',
                {search: {project: projectId, type: 'offer', deleted: 0}}
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

    freeze(offer) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                OfferAPI.NS,
                'freeze',
                {id: offer}
            )
            .then(frozen => {
                resolve(frozen)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    create (offer) {
        offer.type = 'offer'
        return super.create(offer)
    }

    getLines (id) {
        return AccountingDocLineAPI.instance.gets(id)
    }

    updateLines (lines, id) {
        return AccountingDocLineAPI.instance.set(lines, id)
    }
}
