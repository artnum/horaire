const CurrencyRounding = {
    'chf': 0.01,
    'eur': 0.01,
    'usd': 0.01,
    'gbp': 0.01,
    'jpy': 0.01
}

const Currency = {
    'chf': 'chf',
    'ch': 'chf',
    'fr': 'chf',
    'fr.': 'chf',
    'frs': 'chf',
    'sfr.': 'chf',
    'sfr': 'chf',
    '$': 'usd',
    'us': 'usd',
    'usd': 'usd',
    '€': 'eur',
    'eu': 'eur',
    'eur': 'eur',
    '£': 'gbp',
    'gbp': 'gbp',
    'gb': 'gbp',
    '¥': 'jpy',
    'jp¥': 'jpy',
    'jp': 'jpy',
    'jpy': 'jpy'
}

const Months = {
    'gennaio': 1,
    'janvier': 1,
    'january': 1,
    'januar': 1,
    'febbraio': 2,
    'fevrier': 2,
    'février': 2,
    'february': 2,
    'feburar': 2,
    'marzo': 3,
    'mars': 3,
    'march': 3,
    'marz': 3,
    'märz': 3,
    'aprile': 4,
    'avril': 4,
    'april': 4,
    'maggio': 5,
    'mai': 5,
    'may': 5,
    'guigno': 6,
    'juin': 6,
    'june': 6,
    'juni': 6,
    'luglio': 7,
    'juillet': 7,
    'july': 7,
    'juli': 7,
    'agosto': 8,
    'aout': 8,
    'août': 8,
    'august': 8,
    'settembre': 9,
    'septembre': 9,
    'september': 9,
    'ottobre': 10,
    'octobre': 10,
    'october': 10,
    'oktober': 10,
    'novembre': 11,
    'november': 11,
    'dicembre': 12,
    'decembre': 12,
    'décembre': 12,
    'dezember': 12,
    'december': 12
}

function roundCurrency (value, currency) {
    if (CurrencyRounding[currency] === undefined) { return value }
    let p = 0
    while (CurrencyRounding[currency] * Math.pow(10, p) < 1) { p++ }
    // parseFloat forces to float value or else it returns a string 
    return parseFloat((Math.ceil(value / CurrencyRounding[currency] ) * CurrencyRounding[currency]).toFixed(p))
}

function round (value) {
    return parseFloat(value).toFixed(4)
}

export class RepartitionUI {
    constructor () {
        this.Events = new EventTarget()
        let forms = document.getElementsByTagName('FIELDSET');
        for (let i = 0; i < forms.length; i++) {
            if (forms[i].dataset && forms[i].dataset.type === 'repartition') {
                this.domNode = forms[i]
                forms[i].addEventListener('change', this.formChange.bind(this))
            }
            forms[i].addEventListener('keyup', (event) => {
                switch(event.key) {
                    case 'Enter':
                        for (let i = 0; i < forms.length; i++) {
                        }
                        break
                }
            })
        }
    }
    
    addEventListener (type, callback, options = {}) {
        this.Events.addEventListener(type, callback, options)
    }

    cleanChild (node) {
        for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
            if (child.children.length > 0) {
                this.cleanChild(child)
            }
            if (child.nodeName !== 'OPTION' && child.nodeName !== 'SELECT') {
                if (child.dataset.default) {
                    child.value = child.dataset.default
                } else {
                    child.value = ''
                }
            }
        }
    }

    checkGroupEmpty (node) {
        for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
            if (child.children.length > 0) {
                if (!this.checkGroupEmpty(child)) {
                    return false
                }
            }
            if (child.value !== '') {
                return false
            }
        }
        return true
    }

    checkAnyEmptyGroup (node) {
        let empty = false
        for (let child = node.parentNode.firstElementChild; child; child = child.nextElementSibling) {
            if (child.dataset.empty === '1') {
                empty = true
            }
        }
        return empty
    }

    addNextLine (event) {
        let node = event.target
        while (node && node.dataset && node.dataset.type !== 'repartitionFrag') {
            node = node.parentNode
        }
        if(!node || !node.dataset) { return false }
        if (this.checkGroupEmpty(node)) {
            let id = node.id
            if (node.parentNode.children.length > 1) {
                node.parentNode.removeChild(node)
            }
            this.Events.dispatchEvent(new CustomEvent('change', {detail: {op:'delete', id: id, value: 0}}))
            return;
        } else {
            node.dataset.empty = 0
        }
        if (!node.id) {
            node.id = `repui-x${performance.now()}` // first one, so it might collide with next one
        }
        if (!this.checkAnyEmptyGroup(node)) {
            let newNode = node.cloneNode(true)
            this.cleanChild(newNode)
            newNode.id = `repui-${performance.now()}`
            newNode.dataset.empty = 1
            newNode.dataset.removeOnClean = 1
            node.parentNode.insertBefore(newNode, node.nextSibling)
            var exploreTree = function (r) {
                for (let c = r.firstElementChild; c; c = c.nextElementSibling) {
                    if (c.children.length > 0) {
                        if (exploreTree(c)) {
                            return true;
                        }
                    }
                    if (c.getAttribute('name') === 'project') {
                        Select(c, new STProject('Project'), {realSelect: true, allowFreeText: false})
                        return true
                    }
                }
                return false
            }
            exploreTree(newNode)
        }
        return node
    }

    formChange (event) {
        let node = this.addNextLine(event)
        if (!node) { return }
        let nodes = [...node.getElementsByTagName('INPUT'), ...node.getElementsByTagName('SELECT')]
        let value = 0
        let tva = 0
        let id
        let del = false
        let project = null
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].getAttribute('name') === 'value') {
                value = this.checkValue(nodes[i])
                id = node.id
                if (value && value.num === 0) {
                    node.parentNode.removeChild(node)
                    del = true
                }
                if (!value) {
                    del = true
                }

                this.printValue(nodes[i], value)
            } 
            if (nodes[i].getAttribute('name') === 'tva') {
                if (!Number.isNaN(parseFloat(nodes[i].value))) {
                    tva = parseFloat(nodes[i].value)
                }
            }
            if (nodes[i].getAttribute('name') === 'project') {
                project = nodes[i].dataset.value
            }
        }
        if (del) {
            this.Events.dispatchEvent(new CustomEvent('change', {detail: {op:'delete', id: id, value: 0}}))
        } else {
            this.Events.dispatchEvent(new CustomEvent('change', {detail: {op:'edit', id: id, value: value, tva: tva, project: project}}))
        }
    }

    printAmountLeft (node, val) {
        if (!node) { return }
        val = roundCurrency(val, 'chf')
        while (node.dataset.type !== 'repartitionFrag') {
            node = node.parentNode
        }
        node = node.parentNode.lastElementChild
        let printBox = node.lastElementChild
        if (!printBox || !printBox.classList || !printBox.classList.contains('printbox')) {
            printBox = document.createElement('SPAN')
            printBox.classList.add('printbox')
            node.appendChild(printBox)
        }
        window.requestAnimationFrame(() => {
            printBox.innerHTML = `Restant : ${val.toFixed(2)}`
        })
    }

    printValue (node, val) {
        let add = false
        if (!node) { return }
        while (node.dataset.type !== 'repartitionFrag') {
            node = node.parentNode
        }
        let printBox = node.firstElementChild
        while (printBox && !printBox.classList.contains('printbox')) {
            printBox = printBox.nextElementSibling
        }
        if (!printBox) {
            printBox = document.createElement('SPAN')
            printBox.classList.add('printbox')
            add = true
        }
        if (!val) {
            window.requestAnimationFrame(() => {
                if (add) { node.appendChild(printBox) }
                printBox.innerHTML = 'Erreur'
                printBox.classList.add('error')
            })
        } else {
            window.requestAnimationFrame(() => {
                if (add) { node.appendChild(printBox) }
                if (!Number.isFinite(val.num)) {
                    printBox.innerHTML = `~ ${val.type}`
                } else {
                    printBox.innerHTML = `${val.num.toFixed(2)} ${val.type}`
                }
                printBox.classList.remove('error')
                this.Events.dispatchEvent(new CustomEvent('change', {detail: {op:'draw', id: node.id}}))
            })
        }
    }

    checkValue (node) {
        const valRegExp = /^([0-9]+|§)\s*((?:[\.,]|[a-z$€£¥]{1,3}|%))?(?:\s*([0-9]*|%|-))?\s*(%|[a-z$€£¥]{1,3})?$/i
        if (!node) { return false }
        if (node.value === undefined) { return false }
        const val = {
            num: 0,
            type: '%'
        }
        if (/^\s*$/.test(node.value)) { return val }
        let value = node.value
        let matches = valRegExp.exec(value)
        if (matches === null) { return false }
        if (matches[1] === '§') {
            return {type: 'chf', num: Number.POSITIVE_INFINITY}
        }
        switch (matches[2]) {
            case '.':
            case ',':
                if (matches[3] === undefined) {
                    val.type = 'chf'
                    val.num = parseInt(matches[1])
                } else if (matches[3] === '%') {
                    val.num = parseInt(matches[1])
                } else {
                    if (matches[3] === '-') {
                        val.num = parseInt(matches[1])
                    } else {
                        val.num = parseInt(matches[1]) + (parseInt(matches[3]) / Math.pow(10, matches[3].length))   
                    }
                    val.type = 'chf'
                }
                break
            case '%':
                val.num = parseInt(matches[1])
                break
            default:
                val.num = parseInt(matches[1])
                if (matches[2] !== undefined && Object.keys(Currency).indexOf(matches[2].toLowerCase()) !== -1 ) {
                    val.type = Currency[matches[2].toLowerCase()]
                } else {
                    val.type = '%'
                }
                break
        }
        switch (matches[4]) {
            default:
                if (matches[4] === undefined) { break }
                if (matches[4] !== undefined && Object.keys(Currency).indexOf(matches[4].toLowerCase()) !== -1) {
                    val.type = Currency[matches[4].toLowerCase()]
                } else {
                    val.type = '%'
                }
                break 
            case '%':
                val.type = '%'
                break
        }

        if (isNaN(val.num)) { return false } 
        if (val.type === '%' && val.num > 100) { val.type = 'chf' }
        return val
    }

    setLeftAmount (id, amount) {
        if (!id)  { return }
        let node = document.getElementById(id)
        this.printAmountLeft(node, amount)
    }
}

/* swiss bvr code handling 
 * sad to have to program that in 2020 when bvr code is about to be replaced
 * by qrcode mid-2020.
 */
export class BVRCode {
    constructor () {
        this.reference = ''
        this.amount = 0.0
        this.currency = 'chf'
        this.account = ''
        this.Events = new EventTarget()
    }

    addEventListener(type, callback, options = {}) {
        this.Events.addEventListener(type, callback, options)
    }

    key (ref) {
        let table = [
          [0, 9, 4, 6, 8, 2, 7, 1, 3, 5],
          [9, 4, 6, 8, 2, 7, 1, 3, 5, 0],
          [4, 6, 8, 2, 7, 1, 3, 5, 0, 9],
          [6, 8, 2, 7, 1, 3, 5, 0, 9, 4],
          [8, 2, 7, 1, 3, 5, 0, 9, 4, 6],
          [2, 7, 1, 3, 5, 0, 9, 4, 6, 8],
          [7, 1, 3, 5, 0, 9, 4, 6, 8, 2],
          [1, 3, 5, 0, 9, 4, 6, 8, 2, 7],
          [3, 5, 0, 9, 4, 6, 8, 2, 7, 1],
          [5, 0, 9, 4, 6, 8, 2, 7, 1, 3]
        ]
        ref = ref.split('').reverse().join('')
        let r = 0
        for (let i = ref.length - 1; i >= 0; i--) {
          r = table[r][parseInt(ref[i])]
        }
        return [0, 9, 8, 7, 6, 5, 4, 3, 2, 1][r]
    }

    match (text) {
        const refRegexp = /^(\d+)>(\d+)\+ (\d+)>$/ug
        let m = refRegexp.exec(text)
        if (m) {         
          /* check bvr code */
          if (this.key(m[1].substring(0, m[1].length - 1)) === parseInt(m[1][m[1].length - 1]) &&
              this.key(m[2].substring(0, m[2].length - 1)) === parseInt(m[2][m[2].length - 1])) {
            this.reference = m[2]
            this.account = m[3]
            if (m[1].substring(0, 2) === '01' || m[1].substring(0, 2) === '21') {
              this.amount = parseInt(m[1].substring(2, m[1].length - 1)) / 100
              if (m[1].substring(0, 2) === '21') {
                this.currency = Currency['eur']
              } else {
                this.currenty = Currency['chf']
              }
              this.Events.dispatchEvent(new CustomEvent('decoded', {detail: {
                  type: 'bvr',
                  currency: this.currency,
                  amount: this.amount,
                  reference: this.reference,
                  account: this.account
              }}))
              return true
            }
          }
        }
        return false
    }

    beautify (value, type = 'reference') {
        switch (type) {
            default: return value
            case 'reference':
                let ref = value
                let newRef = ''
                while(ref[0] === '0') {
                    ref = ref.substring(1)
                }
                ref = ref.split('').reverse().join('')
                for (let i = 0; i < ref.length; i++) {
                    newRef += ref[i]
                    if (i % 4 === 0 && i !== 0) {
                        newRef += ' '
                    }
                }
            return newRef.split('').reverse().join('')
            case 'account':
                let account = value
                let p1 = account.substring(0, 2)
                let p2 = account.substring(2, account.length - 1)
                let p3 = account[account.length - 1]
            
            return `${p1}-${parseInt(p2)}-${p3}`
        }
    }
}

/* QRBill use BVRCode refrence key and other legacy stuff */
export class QRBill extends BVRCode{
    match (str) {
        console.log(str)
    }
}

const BillAttributes = ['currency', 'amount', 'reference', 'account', 'duedate', 'date']

export class Facture {
    constructor (form, RUI) {
        this.RUI = RUI
        this.repartition = {}
        this.form = form
        this.amount = 0
        this.date = new Date() // default to today
        this.currency = Currency['chf']
        this.account = ''
        this.reference = ''
        this.duedate = ''
        this.BVR = new BVRCode()
        this.QRBill = new QRBill()
        this.Events = new EventTarget()
        this.Values = {}

        this.BVR.addEventListener('decoded', this.handleDecodeEvent.bind(this))
        this.QRBill.addEventListener('decoded', this.handleDecodeEvent.bind(this))
        this.form.addEventListener('blur', this.handleFormChange.bind(this), {capture: true})

        let divs = this.form.getElementsByTagName('DIV')
        for (let i = 0; i < divs.length; i++) {
            if (divs[i].classList && divs[i].classList.contains('codebox')) {
                window.addEventListener('paste', (event) => {
                    let node = event.target
                    while (!node.classList.contains('codebox')) {
                        node = node.parentNode
                    }
                    event.preventDefault()
                    let tdata = event.clipboardData || window.clipboardData
                    for (let i = 0; i < tdata.items.length; i++) {
                        if (tdata.items[i].type === 'text/plain') {
                            tdata.items[i].getAsString((str) => {
                                if (this.BVR.match(str)) {
                                    node.innerHTML = `BVR: "${str}"`
                                } else if (this.QRBill.match(str)) {
                                    // todo
                                }
                                this.amountLeft()
                            })
                        }
                    }

                })
            }
        }
    }

    addEventListener(type, callback, options = {}) {
        this.Events.addEventListener(type, callback, options)
    }

    parseDate (node, parseDuration = false, origin = null) {
        const durationReg = /^\s*([0-9]+)\s*(ja|j|s|m|a|d|y|w|g|t)?.*$/gi
        const dateReg = /^\s*([0-9]+)\s*[\.\/\-]?\s*([0-9]+|[a-zäéû]+)?\s*[\.\/\-]?\s*([0-9]+)?\s*$/gi
        let duration = null
        if (parseDuration) {
            duration = durationReg.exec(node.value)
        }
        if (duration === null) {
            let date = dateReg.exec(node.value)
            if (date) {
                let d = parseInt(date[1])
                let m = (new Date()).getMonth() + 1
                if (date[2]) {
                    m = parseInt(date[2])
                    if (isNaN(m)) {
                        date[2] = date[2].toLocaleLowerCase()
                        if (Months[date[2]] !== undefined) {
                            m = Months[date[2]]
                        } else {
                            for(let month in Months) {
                                if (month.indexOf(date[2]) === 0) {
                                    m = Months[month]
                                    break
                                }
                            }
                        }
                        if (isNaN(m)) {
                            m = (new Date()).getMonth() + 1
                        }
                    }
                }
                let y = (new Date()).getFullYear()
                if (date[3] !== undefined) {
                    y = parseInt(date[3])
                    if (date[3].length < 4) {
                        y += 2000
                    }
                }
                return new Date(y, m - 1, d)
            }
        } else {
            if (origin === null) {
                origin = new Date()
            }
            if (duration[2] === undefined) {
                duration[2] = 'j'
            }
            switch (duration[2].toLowerCase()) {
                // Jour or Day
                case 'j':
                case 'd':
                case 't':
                case 'g':
                    return new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + parseInt(duration[1]))
                // Semaine or Week
                case 's':
                case 'w':
                    return new Date(origin.getFullYear(), origin.getMonth(), origin.getDate() + (parseInt(duration[1]) * 7))
                // Mois or Month
                case 'm':
                    return new Date(origin.getFullYear(), origin.getMonth() + parseInt(duration[1]), origin.getDate())
                // An or Year
                case 'a':
                case 'y':
                case 'ja':
                    return new Date(origin.getFullYear() + parseInt(duration[1]), origin.getMonth(), origin.getDate())
            }
        }
        return new Date('Invalid Date')
    }

    getValues () {
        let nodes = [...this.form.getElementsByTagName('INPUT'), ...this.form.getElementsByTagName('SELECT')]
        let dueNode = null
        let values = {}
        for (let k in nodes) {
            let node = nodes[k]
            let name = node.getAttribute('name')
            if (name === null) { continue }
            // need to have date processed so save for later
            if (name === 'duedate') {
                dueNode = node
                continue
            }
            let tmp = null
            switch (name) {
                default:
                    let type = node.getAttribute('type')
                    if (type && type.toLowerCase() === 'checkbox') {
                        if (node.checked) {
                            values[name] = 1
                        } else {
                            values[name] = 0
                        }
                    } else {
                        if (node.dataset.value) {
                            values[name] = node.dataset.value
                        } else if (node.value) {
                            values[name] = node.value
                        } else {
                            // error 
                        }
                    }
                    break
                case 'amount':
                    tmp = parseInt(node.value)
                    if (!isNaN(tmp)) {
                        values[name] = tmp
                    } else {
                        // error
                    }
                    break
                case 'date':
                    tmp = this.parseDate(node)
                    if (!isNaN(tmp.getTime())) {
                        values[name] = tmp.toISOString()
                    } else {
                        // error 
                    }
                   break
            }
        }
        if (dueNode && values['date']) {
            let tmp = this.parseDate(dueNode, true, new Date(values['date']))
            if (!isNaN(tmp.getTime())) {
                values['duedate'] = tmp.toISOString()
            } else {
                // error
            }
        }

        values['repartition'] = this.Values
        return values
    }

    handleFormChange (event) {
        let node = event.target 
        let name = node.getAttribute('name')
        let attribute = this[name]
        if (attribute !== undefined) {
            switch(name) {
                default:
                    this[name] = node.value
                    break
                case 'amount':
                    this[name] = parseFloat(node.value)
                    break
                case 'date':
                    this.date = this.parseDate(node)
                    if (!isNaN(this.date.getTime())) {
                        let n = document.createTextNode(`${this.date.getDate()}.${this.date.getMonth() + 1}.${this.date.getFullYear()}`)
                        if (!node.nextSibling) {
                            node.parentNode.appendChild(n)
                        } else {
                            node.parentNode.replaceChild(n, node.nextSibling)
                        }
                    }
                    /* fall through */
                case 'duedate':
                    if (name === 'duedate') {
                        this.dueNode = node
                    }
                    if (this.dueNode) {
                        node = this.dueNode
                    } else {
                        break
                    }
                    this.due = this.parseDate(node, true, this.date)
                    if (!isNaN(this.due.getTime())) {
                        let n1 = document.createTextNode(`${this.due.getDate()}.${this.due.getMonth() + 1}.${this.due.getFullYear()}`)
                        if (!node.nextSibling) {
                            node.parentNode.appendChild(n1)
                        } else {
                            node.parentNode.replaceChild(n1, node.nextSibling)
                        }
                    }
                    break

            }
        }
        this.amountLeft()
    }

    handleDecodeEvent (event) {
        if (!event.detail) { return }
        if (!event.detail.type) { return }

        for (let i = 0; i < BillAttributes.length; i++) {
            if (event.detail[BillAttributes[i]]) {
                this[BillAttributes[i]] = event.detail[BillAttributes[i]]
            }
        }        
        this.printValue()
    }

    printValue () {
        let elements = [...this.form.getElementsByTagName('INPUT'), ...this.form.getElementsByTagName('SELECT')]
        for (let i = 0; i < elements.length; i++) {
            if (BillAttributes.indexOf(elements[i].getAttribute('name')) >= 0) {
                elements[i].value = this.BVR.beautify(this[elements[i].getAttribute('name')], elements[i].getAttribute('name'))
            }
        }
    }

    reverseTVA (num, tva) {
        let dec = (tva / 100) + 1
        return num / dec
    }

    amountLeft () {
        let infiniteValues = []
        let relativeValues = []
        let amountLeft = this.amount
        let lastId = ''
        for (let k in this.repartition) {
            if (this.repartition[k][0].type === '%') {
                relativeValues.push(k)
            } else {
                if (Number.isFinite(this.repartition[k][0].num)) {
                    let val = parseFloat(round(parseFloat(this.repartition[k][0].num), this.currency))
                    let tva = parseFloat(round(val * parseFloat(this.repartition[k][1]) / 100, this.currency))
                    let total = round(val + tva)
                    amountLeft -= total
                    this.Events.dispatchEvent(new CustomEvent('change', {detail: {
                        op: 'calculatedValue',
                        id: k,
                        value: total,
                        ht: val, // hors-taxe
                        tva: tva, // tva montant,
                        tvapc: this.repartition[k][1],
                        currency: this.currency
                    }}))
                    this.Values[k] = {
                        tva: tva,
                        total: total,
                        ht: val,
                        tvapc: this.repartition[k][1],
                        project: this.repartition[k][2]
                    }
                } else {
                    infiniteValues.push(k)
                }
            }
            lastId = k
        }
        let totalLeft = amountLeft
        relativeValues.forEach((key) => {
            let total = totalLeft * this.repartition[key][0].num / 100
            let val = this.reverseTVA(total, this.repartition[key][1])
            let tva = total - val
            
            amountLeft -= total
            this.Events.dispatchEvent(new CustomEvent('change', {detail: {
                op: 'calculatedValue',
                id: key,
                value: total,
                ht: val,
                tva: tva, // montant tva
                tvapc: this.repartition[key][1], // tva pourcent
                currency: this.currency
            }}))
            this.Values[key] = {
                tva: tva,
                total: total,
                ht: val,
                tvapc: this.repartition[key][1], // tva pourcent
                project: this.repartition[key][2]
            }
        })
        if (infiniteValues.length > 0) {
            let splitInfinity = round(amountLeft / infiniteValues.length, this.currency)
            let lastKey
            infiniteValues.forEach((key) => {
                amountLeft -= splitInfinity
                let val = round(this.reverseTVA(splitInfinity, this.repartition[key][1]), this.currency)
                let tva = round(val * this.repartition[key][1] / 100, this.currency)
                
                lastKey = key
                this.Events.dispatchEvent(new CustomEvent('change', {detail: {
                    op: 'calculatedValue',
                    id: key,
                    value: splitInfinity,
                    ht: val, // valeur hors taxe
                    tva: tva, // montant tva
                    tvapc: this.repartition[key][1],
                    currency: this.currency
                }}))
                this.Values[key] = {
                    tva: tva,
                    total: splitInfinity,
                    ht: val,
                    tvapc: this.repartition[key][1],
                    project: this.repartition[key][2]
                }
            })
            if (amountLeft !== 0) {
                let total = round(splitInfinity + amountLeft, this.currency)
                let val = this.reverseTVA($total, $this.repartition[lastKey][1])
                let tva = round(val * this.repartition[lastKey][1] / 100, this.currency)
                
                this.Events.dispatchEvent(new CustomEvent('change', {detail: {
                    op: 'calculatedValue',
                    id: lastKey,
                    value:
                    total,
                    ht: val,
                    tva: tva,
                    tvapc: this.repartition[lastKey][1],
                    currency: this.currency
                }}))
                this.Values[lastKey] = {
                    tva: tva,
                    total: total,
                    ht: val,
                    tvapc: this.repartition[lastKey][1],
                    project: this.repartition[lastKey][2]
                }
            }
            amountLeft = 0
        }
        this.Events.dispatchEvent(new CustomEvent('change', {detail: {op: 'amountLeft', id: lastId, value: amountLeft, currency: this.currency}}))
    }

    setRepartition (id, value, tva, project) {
        this.repartition[id] = [value, tva, project]
        this.amountLeft()
    }

    unsetRepartition (id) {
        delete this.repartition[id]
        delete this.Values[id]
        this.amountLeft()
    }

    clearRepartition () {
        this.repartition = {}
        this.Values = {}
        this.amountLeft()
    }
}

window.onload = () => {
    let RUI = new RepartitionUI()
    let F = new Facture(document.getElementById('bill'), RUI)
    window.Facture = F
    let Values = {}
    F.addEventListener('change', (event) => {
        if (event.detail.op  === 'amountLeft') {
            RUI.setLeftAmount(event.detail.id, event.detail.value)
        }
        if (event.detail.op === 'calculatedValue') {
            Values[event.detail.id] = event.detail
        }
    })
    RUI.addEventListener('change', (event) => {
        switch (event.detail.op) {
            case 'edit':
                F.setRepartition(event.detail.id, event.detail.value, event.detail.tva, event.detail.project)
                break
            case 'delete':
                F.unsetRepartition(event.detail.id)
                break
            case 'draw':
                for (let k in Values) {
                    let node = document.getElementById(k)
                    if (node) {
                        let add = false
                        let lc = node.firstElementChild
                        while (lc && !lc.classList.contains('calculated')) { lc = lc.nextElementSibling }
                        if (!lc) {
                            lc = document.createElement('DIV')
                            lc.classList.add('calculated')
                            add = true
                        }
                        for (let i of ['chf', 'eur', 'usd', 'gbp', 'jpy']) {
                            lc.classList.remove(i)
                        }
                        lc.classList.add(Values[k].currency)
                        window.requestAnimationFrame(() => {
                            if (add) {
                                node.appendChild(lc)
                            }
                            lc.innerHTML = `<span class="total">${parseFloat(Values[k].value).toPrecision(4)}</span> <span class="tva">${parseFloat(Values[k].tva).toPrecision(4)}</span>`
                        }) 
                    }
                } 
                break
        }
    })
}