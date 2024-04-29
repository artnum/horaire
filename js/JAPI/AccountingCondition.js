import { JAPI } from './JAPI.js'

const NS = 'AccountingCondition'

export class AccountingConditionAPI extends JAPI {
    constructor() {
        super()
    }

    static get instance() {
        if (AccountingConditionAPI.Instance === undefined) {
            AccountingConditionAPI.Instance = new AccountingConditionAPI()
        }
        return AccountingConditionAPI.Instance
    }

    static get NS() {
        return NS
    }

    lookup (docid) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingConditionAPI.NS,
                'lookup',
                {docId: docid}
            )
            .then(lines => {
                resolve(lines)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    get (docid) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingConditionAPI.NS,
                'get',
                {condition: docid}
            )
            .then(lines =>  {
                resolve(lines)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    set (condition) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingConditionAPI.NS,
                'create',
                {condition}
            )
            .then(updated => {
                return resolve(updated)
            })
            .catch(err => {
                reject(err)
            })
        })
    }
}