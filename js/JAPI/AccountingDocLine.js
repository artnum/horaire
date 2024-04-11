import { JAPI } from './JAPI.js'

const NS = 'AccountingDocLine'

export class AccountingDocLineAPI extends JAPI {
    constructor() {
        super()
    }

    static get instance() {
        if (AccountingDocLineAPI.Instance === undefined) {
            AccountingDocLineAPI.Instance = new AccountingDocLineAPI()
        }
        return AccountingDocLineAPI.Instance
    }

    static get NS() {
        return NS
    }

    gets (docId) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocLineAPI.NS,
                'gets',
                {docId}
            )
            .then(lines =>  {
                resolve(lines)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    set (lines, docId) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocLineAPI.NS,
                'set',
                {lines, docId}
            )
            .then(updated => {
                console.log(updated)
            })
            .catch(err => {
                reject(err)
            })
        })
    }
}