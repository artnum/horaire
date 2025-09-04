/**
 * Abstract invoice and bill.
 * 
 * @param {*} jsonObject 
 * @param 
 */

function KABxBill (jsonObject, type = 'creditor') {
    this.data = jsonObject
    this.currency = 'CHF'
    switch (type.toLowerCase()) {
        default:
        case 'c':
        case 'cred':
        case 'creditor': this.type = 2; break
        case 'd':
        case 'deb':
        case 'debitor': this.type = 1; break
        case 'creditnote':
        case 'cn':
        case 'credit_note': this.type = 3; break
        case 'compensation':
        case 'co':
        case 'comp': this.type = 4; break
    }
    return new Proxy(this, {
        get (object, symbol, receiver) {
            switch(symbol) {
                case 'amount': return object.getAmount()
                case 'pending_amount': return object.getPendingAmount()
                case 'currency': return object.currency
                case 'name': return object.getName()
                case 'reference': return object.getReference()
                case 'date': return object.getDate()
                default:
                    if (object.data[symbol]) { return object.data[symbol] }
                    if (object[symbol]) { return object[symbol]}
                    return undefined
            }
        },
        set (object, symbol, receiver) {
            return false
        }
    })
}

/**
 * Load external data from the bill
 * 
 * The bill may have some external data, like currency, to be loaded before 
 * being usable. This function has to be called before use.
 * 
 * @returns <Promise>
 */
KABxBill.prototype.load = function () {
    return new Promise(resolve => {
        Promise.all([
            (() => {
                if (this.data.currency_code) { return Promise.resolve(String(this.data.currency_code).toLowerCase()) }
                
                return new Promise(resolve => {
                    const bxcurrency = new KAPI(`${KAAL.getBase()}/BXCurrency`)
                    bxcurrency.get(this.data.currency_id)
                    .then(currency => {
                        resolve(String(currency.name).toLowerCase())
                    })
                })
            })()
        ])    
        .then(([currency]) => {
            Reflect.set(this, 'currency', currency)
            resolve(this)
        })
    })
}

KABxBill.prototype.getAmount = function () {
    return this.data.amount_calc || this.data.amount_man || this.data.gross || 0.0
}

KABxBill.prototype.getPendingAmount = function () {
    return this.data.pending_amount
}

KABxBill.prototype.getCurrency = function () {
    return this.currency
}

KABxBill.prototype.getName = function () {
    const name = Reflect.get(this, 'title')
    if (name === null || name === undefined || name === '') { return '' }
    return name
}

KABxBill.prototype.getReference = function () {
    return this.data.vendor_ref || this.data.reference
}

KABxBill.prototype.getDate = function () {
    return this.data.bill_date
}