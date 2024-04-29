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
                return resolve(updated)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    update (line) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocLineAPI.NS,
                'update',
                {line: line}
            )
            .then(updated => {
                return resolve(updated)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    lock (lineId) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocLineAPI.NS,
                'lock',
                {id: lineId}
            )
            .then(locked => {
                return resolve(locked)
            })
            .catch(err => {
                reject(err)
            })
        })
    }
    unlock (lineId) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                AccountingDocLineAPI.NS,
                'unlock',
                {id: lineId}
            )
            .then(unlocked => {
                return resolve(unlocked)
            })
            .catch(err => {
                reject(err)
            })
        })
    }
}