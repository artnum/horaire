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
        return this.API.exec(
            AccountingDocLineAPI.NS,
            'gets',
            {docId}
        )
    }

    set (lines, docId) {
        return this.API.exec(
            AccountingDocLineAPI.NS,
            'set',
            {lines, docId}
        )
    }

    update (line) {
        return this.API.exec(
            AccountingDocLineAPI.NS,
            'update',
            {line: line}
        )
    }

    lock (lineId) {
        return this.API.exec(
            AccountingDocLineAPI.NS,
            'lock',
            {id: lineId}
        )
    }
    unlock (lineId) {
        return this.API.exec(
            AccountingDocLineAPI.NS,
            'unlock',
            {id: lineId}
        )
    }
}