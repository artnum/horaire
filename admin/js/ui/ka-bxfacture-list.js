function UIKABXFactureList () {
    this.currentBill = null
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('ka-bxfacture-list')
    this.domNode.innerHTML = `
        <div class="selector"></div>
        <div class="list">
            <input type="text" name="search" placeholder="Recherche" class="search" />
            <div class="header billItem"><span class="vendor">Créancier<br><small>Facture fournisseur</small></span><span class="duedate">Échéance</span><span class="amount">Montant<br><span class="total"></span></span></div>
        </div>
        <div class="preview"></div>
        <div class="action"></div>
    `
    const b = [
        new KAButton('Entrante',  {value: JSON.stringify({state: 'INCOMING'}), samll: true, classNames: ['incoming'], group: 'billtype'}),
        new KAButton('Ouverte', {value: JSON.stringify({state: 'OPEN'}), samll: true, classNames: ['open'], group: 'billtype'}),
        new KAButton('Payée', {value: JSON.stringify({state: 'PAID', date: `${new Date().getFullYear()}-*`}), samll: true, classNames: ['paid'], group: 'billtype'})
    ]
    this.selectorNode = this.domNode.querySelector('div.selector')
    this.listNode = this.domNode.querySelector('div.list')
    this.previewNode = this.domNode.querySelector('div.preview')
    this.actionNode = this.domNode.querySelector('div.action')
    this.currentState = 'INCOMING'
    b[0].setButton()
    b.forEach(x=> {
        this.selectorNode.appendChild(x)
        x.addEventListener('submit', event => {
            const value = JSON.parse(event.target.dataset.value)
            this.currentState = value.state
            this.clearList()
            .then(_ => this.clearPreview())
            .then(_ => this.clearAction())
            .then(_ => this.render(value))
        })
    })
    this.payModeState = document.createElement('INPUT')
    this.payModeState.type = 'checkbox'
    this.payModeState.name = 'payModeState'
    const payModeLabel = document.createElement('LABEL')
    payModeLabel.textContent = 'Mode paiement'
    payModeLabel.insertBefore(this.payModeState, payModeLabel.firstChild)
    this.selectorNode.appendChild(payModeLabel)

    this.payModeState.addEventListener('change', event => {
        if (this.payModeState.checked) { 
            const payButton = document.createElement('BUTTON')
            payButton.type = 'button'
            payButton.name = 'pay'
            payButton.textContent = 'Payer la selection'
            const node = document.createElement('INPUT')
            this.bankAccountSelector = node
            new KSelectUI(node, new KAPI(`${KAAL.getBase()}/BXBankAccount`), {attribute: 'name', realSelect: true, allowFreeText: false})
            window.requestAnimationFrame(() => this.selectorNode.appendChild(node))
            window.requestAnimationFrame(() => this.selectorNode.appendChild(payButton))
            
           payButton.addEventListener('click', event => {
                this.paySelected(this.bankAccountSelector.dataset.value)
            })
            return 
        }
        window.requestAnimationFrame(() => this.selectorNode.querySelector('button[name="pay"]').remove())
        this.unselectAllBill()
    })

    this.listNode.addEventListener('click', event => {
        if (!this.payModeState.checked) { return }
        event.stopPropagation()
        this.selectBill(event)  
    })
    this.listNode.addEventListener('keyup', event => {
        const name = event.target.name
        switch(name) {
            default: return;
            case 'search':
                let value = event.target.value
                if (value === '') {
                    this.listNode.querySelectorAll('.billItem[data-id]').forEach(node => {
                        node.dataset.search = 'true'
                        Array.from(node.querySelectorAll('span')).forEach(span => {
                            span.classList.remove('highlight')
                        })
                    })
                    return 
                }
                value = value.toLowerCase().split(' ')
                this.listNode.querySelectorAll('.billItem[data-id]')
                .forEach(node => {
                    node.dataset.search = 'false'
                    let found = true
                    let pass = 0
                    value.forEach(word => {
                        pass++
                        if (!found) { return }
                        let wordfound = false
                        if (word === '') { return }
                        Array.from(node.querySelectorAll('span'))
                        .forEach(span => {
                            if (span.textContent.toLowerCase().includes(word)) {
                                wordfound = true
                                span.classList.add('highlight')
                                span.dataset.highlight = pass
                            } else {
                                if (span.dataset.highlight == pass) { span.classList.remove('highlight') }
                            }
                        })
                        if (!wordfound) { found = false; return }
                    })

                    if (found) { node.dataset.search = 'true' }
                    else {
                        Array.from(node.querySelectorAll('span')).forEach(span => {
                            span.classList.remove('highlight')
                        })
                        node.dataset.search = 'false'
                    }
                })
                break;
        }
    })
}

UIKABXFactureList.prototype.render = function (query = {state: 'INCOMING'}) {
    return new Promise((resolve, reject) => {
        //const bxpay = new KAPI(`${KAAL.getBase()}/BXOutgoingPayment`)
        const KAPIBill = new KAPI(`${KAAL.getBase()}/Facture`)
        const KAPIQRAddress = new KAPI(`${KAAL.getBase()}/QRAddress`)
        query.deleted = '--';
        KAPIBill.search(query)
        .then(bills => {
            return new Promise(resolve => {
                let addresses = bills.map(bill => bill.qraddress).filter((value, index, self) => self.indexOf(value) === index)
                Promise.allSettled(addresses.map(id => KAPIQRAddress.get(id)))
                .then(adrresses => {
                    return adrresses.filter(address => address.status === 'fulfilled').map(address => address.value)
                })
                .then(addresses => {
                    resolve(bills.map(bill => {
                        bill.qraddress = addresses.filter(address => address.id === bill.qraddress)[0]
                        bill.duedate = new Date(bill.date)
                    
                        return bill
                    }))
                })
            })
        })
        .then(openBills => {
            nodes = openBills
                .map(bill => {
                    const div = document.createElement('DIV')
                    div.dataset.id = bill.id
                    div.dataset.file = bill.file
                    div.classList.add('billItem')
                    if (bill.remainder > 0) { div.classList.add(`level${bill.remainder}`) }
                    if (bill.qraddress) { div.dataset.address = bill.qraddress.id }
                    div.innerHTML = `<span class="vendor">${bill.qraddress?.name ?? ''}</span>
                    <span class="duedate floating">${bill.duedate.shortDate()}</span>
                    <span class="amount floating">${KAFloat(bill.amount).toFixed(2)}</span>
                    <span class="number">${bill.number}</span>
                    <span class="reference">${bill.reference}</span>`
                    div.addEventListener('click', event => {
                        const details = event.currentTarget.dataset
                        Promise.all([this.clearAction(), this.clearPreview()])
                        .then(_ => this.openBill(details))
                    })
                    return div
                })
            nodes.forEach(node => window.requestAnimationFrame(() => { this.listNode.appendChild(node) }))
            return resolve(this)
        })
    })
}

UIKABXFactureList.prototype.clearSelectedBill = function () {
    const items = Array.from(document.querySelectorAll('.billItem.selected'))
    return Promise.allSettled(       
            items.map(item => {
                return new Promise(resolve => window.requestAnimationFrame(() => { item.classList.remove('selected'); resolve() }))
            })
        )
}

UIKABXFactureList.prototype.clearPreview = function () {
    return new Promise(resolve => {
        window.requestAnimationFrame(() => {
            Array.from(this.previewNode.children)
                .forEach(child => this.previewNode.removeChild(child))
            resolve()
        })
    })
}

UIKABXFactureList.prototype.clearAction = function () {
    return new Promise(resolve => {
        window.requestAnimationFrame(() => {
            Array.from(this.actionNode.children)
                .forEach(child => this.actionNode.removeChild(child))
            resolve()
        })
    })
}

UIKABXFactureList.prototype.clearList = function () {
    return new Promise(resolve => {
        
        window.requestAnimationFrame(() => {
            Array.from(this.listNode.children)
                .filter(child => !child.classList.contains('header') && !child.classList.contains('search'))
                .forEach(child => this.listNode.removeChild(child))
            resolve()
        })
    })
}

UIKABXFactureList.prototype.openBill = function (details) {

    const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
      
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
          const slice = byteCharacters.slice(offset, offset + sliceSize);
      
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
      
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
      
        const blob = new Blob(byteArrays, {type: contentType});
        return blob;
      }
      

    const KAPIBill = new KAPI(`${KAAL.getBase()}/Facture`)
    Promise.allSettled([
        this.clearSelectedBill(),
        this.clearPreview()
    ])
    .then(_ => {
        return KAPIBill.execute('fileByName', {name: details.file})
    })
    .then(result => {
        const rfacture = this.renderFacture(details)
        if (result.length === 1) {
            const fileObject = result.data[0]
            if (fileObject.file !== '') {
                const iframe = document.createElement('iframe')
                const url = URL.createObjectURL(b64toBlob(fileObject.file, fileObject.mimetype))
                iframe.src = url
                window.requestAnimationFrame(() => {
                    this.previewNode.appendChild(iframe)
                })
            }
        }
        return rfacture
    })
    .then(form => {
        window.requestAnimationFrame(() => this.actionNode.appendChild(form))
    })
}

UIKABXFactureList.prototype.renderFacture = function (bill) {
    return new Promise(resolve => {
        const KAPIBill = new KAPI(`${KAAL.getBase()}/Facture`)
        const KAPIQRAddress = new KAPI(`${KAAL.getBase()}/QRAddress`)
        Promise.allSettled([
            KAPIBill.get(bill.id),
            KAPIQRAddress.get(bill.address)
        ])
        .then(results => {
            return results.map(result => result.status === 'fulfilled' ? result.value : {})
        })
        .then(([bill, address]) => {
            this.currentBill = bill
            this.currentBill.qraddress = address
            this.currentBill._ttc = true
            window.requestAnimationFrame(() => document.querySelector(`.billItem[data-id="${bill.id}"]`).classList.add('selected'))
            const form = document.createElement('FORM')

            if (address.extid === '') {
                const addAddressFS = document.createElement('FIELDSET')
                addAddressFS.innerHTML = `
                    <legend>Lier au contact Bexio</legend>
                    <p>Ce créancier n'est pas encore lié à un contact Bexio.</p>
                `
                const contactSelect = new UIKAContact()
                contactSelect.searchInput.placeholder = 'Recherche un contact'

                contactSelect.addEventListener('submit', event => {
                    KAPIQRAddress.write({extid: event.detail.id}, address.id)
                    .then(_ => {
                        return this.clearAction()
                    })
                    .then(_ => {
                        this.openBill({file: bill.file, id: bill.id, address: address.id})
                    })
                    .catch(reason => {
                        KAErrorUI(reason)
                    })
                })
                
                addAddressFS.appendChild(contactSelect.domNode)
                form.insertBefore(addAddressFS, form.firstElementChild)
                form.insertAdjacentHTML('beforeend', '<button type="button" name="deleteBill">Supprimer la facture</button>')
                form.querySelector('button[name="deleteBill"]').addEventListener('click', event => {
                    KAPIBill.delete(bill.id)
                    .then(_ => {
                        return Promise.allSettled([
                            this.clearAction(),
                            this.clearList(),
                            this.clearPreview()
                        ])
                    })
                    .then(_ => {
                        this.render({state: 'INCOMING'})

                    })
                })
            
                return resolve(form)
            }

            if (!bill.conditions && !address.conditions) { bill.conditions = '0:30' }
            if (!bill.conditions && address.conditions) { bill.conditions = address.conditions }
            if (bill.conditions && address.conditions && bill.conditions.charAt(0) !== '!') { bill.conditions = address.conditions }
            const conditions = this.parseCondition(bill.conditions)

            const detailFieldset = KAFieldsetUI('Détail factures', this.currentState !== 'INCOMING' ? 'closed' : 'open')
            detailFieldset.innerHTML += `
                <label for="reference">Référence <input type="text" name="reference" value="${QRBill.pretty_reference(bill.reference)}"></label>
                <label for="number">Numéro <input type="text" name="number" value="${bill.number}"></label>
                <label for="date">Date <input type="date" name="date" value="${bill.date}"></label>
                <label for="duedate">Date paiement <input type="date" name="duedate" value="${bill.duedate}"></label>
                <input type="hidden" name="condition" value="${bill.condition}">
    
                <label for="amount">Montant <input type="number" name="amount" step="0.01" value="${bill.amount.toFixed(2)}"></label>

                ${conditions.map(condition =>  `<div class="condition  ${bill.condition === `${condition[0]}:${condition[1]}` ? 'applied' : ''}">
                        <label>Rabais ${condition[0]}% à ${condition[1]} jours</label>
                        <button value="${condition[0]}:${condition[1]}" name="applyCondition" type="button">Appliquer</button>
                    </div>
                `).join('')}
                <!-- <button type="button" name="editCondition">Modifier</button> -->
            `

            form.appendChild(detailFieldset)

            if (!address) {
                address = {
                    type: 'S',
                    iban: '',
                    name: '',
                    street: '',
                    number: '',
                    postcode: '',
                    town: '',
                    country: ''
                }
            }

            const creancierFieldset = KAFieldsetUI('Créancier', this.currentState !== 'INCOMING' ? 'closed' : 'open')
            this.renderCreditor(creancierFieldset, address)
            form.appendChild(creancierFieldset)



            form.addEventListener('reset', event => {
                event.preventDefault()
                this.clearAction()
                .then(_ => {
                    this.openBill({file: bill.file, id: bill.id, address: address.id})
                })
            })
            form.addEventListener('change', event => {
                const node = event.target
                if (node.name === 'date') {
                    this.currentBill.date = node.value
                }
                if (node.name === 'amount') {
                    this.currentBill.amount = parseFloat(node.value)
                }
            })
            form.addEventListener('submit', event => {
                event.preventDefault()
                const formNode = event.currentTarget
                const formData = new FormData(event.currentTarget)
                const billUpdate = {
                    id: bill.id,
                    reference: QRBill.ugly_reference(formData.get('reference')),
                    number: formData.get('number'),
                    amount: KAFloat(formData.get('amount')),
                    duedate: formData.get('duedate'),
                    date: formData.get('date'),
                    state: 'OPEN',
                    condition: formData.get('condition'),
                    type: 1
                }                
                address = {
                    id: address.id,
                    type: formData.get('type'),
                    iban: formData.get('iban'),
                    name: formData.get('name'),
                    street: formData.get('street'),
                    number: formData.get('number'),
                    postcode: formData.get('postcode') ?? '',
                    town: formData.get('town') ?? '',
                    country: formData.get('country')
                }

                if (formData.get('address_id')) {
                    address.id = formData.get('address_id')
                    billUpdate.qraddress = address.id
                }
                
                const KAPIRepartition = new KAPI(`${KAAL.getBase()}/Repartition`)
                KAPIQRAddress.write(address, address.id ?? null)
                .then(address => {
                    bill.qraddress = address.id
                    return Promise.all([
                        KAPIBill.write(billUpdate, bill.id),
                        (!KAAL.bexio.enabled 
                            ? Promise.resolve(null) 
                            : (
                                bill.file 
                                ? KAPIBill.execute('BXUpload', {name: bill.file}) 
                                : Promise.resolve(null)
                              )
                        )
                    ])
                    .then(([updatedBill, file]) => {
                        if (file === null) { return Promise.resolve() }
                        return KAPIBill.execute('BXCreateBill', {fileuuid: file.data[0].uuid, billid: bill.id})
                    })
                    .then(_ => {
                        return Promise.allSettled(Array.from(form.querySelectorAll('[data-repartition-id]'))
                        .map(node => {
                            if (node.querySelector('input[name="value"]').value === '') { return Promise.resolve() }
                            const rep = {
                                value: node.querySelector('input[name="value"]').value,
                                project: node.querySelector('input[name="project"]').dataset.value,
                                facture: bill.id,
                                tva: node.querySelector('input[name="tva"]').value,
                                splitvalue: 0.0,
                                splittva: KAFloat(formData.get('tva')),
                                ttc: this.currentBill._ttc ? 1 : 0
                            }

                            rep.value = KAFloat(rep.value)
                            rep.tva = KAFloat(rep.tva)

                            if (rep.value === 0.0) { return Promise.resolve() }
                            if (isNaN(rep.value) || isNaN(rep.tva)) { return Promise.resolve() }
                      

                            if (this.currentBill._split) {
                                rep.splitvalue = this.currentBill._split
                            }

                            if (node.dataset.repartitionId === '0') {
                                return KAPIRepartition.write(rep)
                            }
                            return KAPIRepartition.write(rep, node.dataset.repartitionId)
                        }))
                    })
                    .then(_ => {
                        if (this.currentState === 'INCOMING') {
                            Promise.allSettled([
                                this.clearAction(),
                                this.clearList(),
                                this.clearPreview()
                            ])
                            .then(_ => {
                                this.render({state: 'INCOMING'})
                            })
                        } else {
                            Promise.allSettled([
                                this.clearAction(),
                                this.clearPreview()
                            ])
                            .then(_ => {
                                this.openBill({file: bill.file, id: bill.id, address: address.id})
                            })
                        }
                    })
                })
            })

            form.addEventListener('change', event => {
                const target = event.target
                switch(target.name) {
                    case 'date':
                        const condition = conditions.sort((a, b) => parseInt(a[0]) - parseInt(b[0])).pop()
                        if (target.value.length <=0 ) { return; }
                        const day = new Date(target.value)
                        day.setDate(day.getDate() + parseInt(condition[1]))
                        return form.querySelector('input[name="duedate"]').value = day.toISOString().substring(0, 10)
                }
            })

            form.addEventListener('keyup', event => {
                const target = event.target
                switch(target.name) {
                    case 'reference':
                        return target.setAttribute('aria-invalid', QRBill.verify_qr_reference(target.value) ? 'false' : 'true')
                    case 'iban':
                        return target.setAttribute('aria-invalid', QRBill.verify_iban(target.value) ? 'false' : 'true')
                }
            })
            form.addEventListener('blur', event => {
                const target = event.target
                switch(target.name) {
                    case 'reference':
                        return target.value = QRBill.pretty_reference(target.value)
                }
            }, {capture: true})


            form.addEventListener('click', event => {
                switch(event.target.name){
                    case 'editCondition':
                        return this.editConditions(bill.conditions, bill.id, address.id)
                    case 'applyCondition':
                        const condition = event.target.value.split(':')
                        const day = new Date(form.querySelector('input[name="date"]').value)
                        day.setDate(day.getDate() + parseInt(condition[1]))
                        form.querySelector('input[name="duedate"]').value = day.toISOString().substring(0, 10)
                        form.querySelector('input[name="condition"]').value = `${condition[0]}:${condition[1]}`
                        form.querySelectorAll('.condition').forEach(node => node.classList.remove('applied'))
                        event.target.parentNode.classList.add('applied')
                        return form.querySelector('input[name="amount"]').value = Math.round(KAFloat(bill.amount * (1 - (parseInt(condition[0]) / 100))) * 100) / 100
                }
            })
            form.classList.add('paiement')

            
            this.renderAssociate(bill)
            .then(fieldset => {
                form.appendChild(fieldset)
                this.calculateRepartitionTotal(fieldset)
            })
            .then(_ => {
                const fieldset = new KAFieldsetUI('Rappels')
                if (this.currentState !== 'INCOMING') {
                    const b = [
                        new KAButton('1er Rappel',  {value: 1, samll: true, classNames: ['level1'], group: 'rappel'}),
                        new KAButton('2ème Rappel', {value: 2, samll: true, classNames: ['level2'], group: 'rappel'}),
                        new KAButton('3ème Rappel', {value: 3, samll: true, classNames: ['level3'], group: 'rappel'})
                    ]
                    b.forEach(x => {
                        if (x.getValue() === bill.remainder) { x.setButton() }
                        fieldset.appendChild(x)
                        x.addEventListener('submit', event => {
                            const remainder = event.target.dataset.value
                            KAPIBill.write({remainder}, bill.id)
                            .then(_ => {
                                const node = document.querySelector(`.billItem[data-id="${bill.id}"]`)
                                if (node) {
                                    window.requestAnimationFrame(() => {
                                        Array.from(Array(3).keys()).forEach(i => {
                                            node.classList.remove(`level${i+1}`)
                                        })
                                        node.classList.add(`level${remainder}`)
                                    })
                                }

                            })
                        })
                        x.addEventListener('reset', event => {
                            if(b.filter(y => y.isset()).length !== 0) { return }
                            KAPIBill.write({remainder: 0}, bill.id)
                            .then(_ => {
                                const node = document.querySelector(`.billItem[data-id="${bill.id}"]`)
                                if (node) {
                                    window.requestAnimationFrame(() => {
                                        Array.from(Array(3).keys()).forEach(i => {
                                            node.classList.remove(`level${i+1}`)
                                        })
                                    })
                                }
                            })
                        })
                    })
                    form.appendChild(fieldset)
                }
                form.insertAdjacentHTML('beforeend', `
                <button type="submit">Valider la facture</button>
                ${this.currentState === 'OPEN' ? '<button type="button" name="payBill">Payer la facture</button>' : ''}
                ${this.currentState === 'PAID' ? '<button type="button" name="openBill">Réouvrir la facture</button>' : ''}
                <button type="button" name="deleteBill">Supprimer la facture</button>
                <button type="reset">Annuler</button>
                `)
                if (this.currentState === 'OPEN') {
                    form.querySelector('button[name="payBill"]').addEventListener('click', event => {
                        KAPIBill.write({state: 'PAID'}, bill.id)
                        .then(x => {
                            return Promise.allSettled([
                                this.clearAction(),
                                this.clearList(),
                                this.clearPreview()
                            ])
                        })
                        .then(_ => {
                            this.render({state: this.currentState})
                        })
                    })
                }
                if (this.currentState === 'PAID') {
                    form.querySelector('button[name="openBill"]').addEventListener('click', event => {
                        KAPIBill.write({state: 'OPEN', id: bill.id}, bill.id)
                        .then(_ => {
                            return Promise.allSettled([
                                this.clearAction(),
                                this.clearList(),
                                this.clearPreview()
                            ])
                        })
                        .then(_ => {
                            this.render({state: this.currentState})
                        })
                    })
                }
                form.querySelector('button[name="deleteBill"]').addEventListener('click', event => {
                    KAPIBill.delete(bill.id)
                    .then(_ => {
                        return Promise.allSettled([
                            this.clearAction(),
                            this.clearList(),
                            this.clearPreview()
                        ])
                    })
                    .then(_ => {
                        this.render({state: this.currentState})

                    })
                })
            
                resolve(form)
            })
            
        })
    })
}

UIKABXFactureList.prototype.renderCreditor = function (creancierFieldset, creditor, newAddress = false) {
    if (!creditor.iban && !creditor.name) { 
        const node = document.createElement('INPUT')
        new KSelectUI(node, new KAPI(`${KAAL.getBase()}/QRAddress`), {realSelect: true, allowFreeText: false})
        node.addEventListener('change', event => {
            const target = event.target
            new KAPI(`${KAAL.getBase()}/QRAddress`).get(target.dataset.value)
            .then(address => {
                const firstField = creancierFieldset.querySelector('input[name="type"]')
                if (firstField) {
                    let field = firstField
                    while(field) {
                        const nextField = field.nextElementSibling
                        field.remove()
                        field = nextField
                    }
                }
                if (address.type === 'S') {
                    creancierFieldset.insertAdjacentHTML('beforeend', `
                    <input type="hidden" name="address_id" value=${address.id} />
                    <input type="hidden" name="type" value="s" />
                    <label for="iban">IBAN <input type="text" name="iban" value="${address.iban}"></label>
                    <label for="name">Nom <input type="text" name="name" value="${address.name}"></label>
                    <label for="street">Rue <input type="text" name="street" value="${address.street}"></label>
                    <label for="number">Numéro <input type="text" name="number" value="${address.number}"></label>
                    <label for="postcode">Code postal <input type="text" name="postcode" value="${address.postcode}"></label>
                    <label for="postcode">Ville <input type="text" name="town" value="${address.town}"></label>
                    <label for="country">Pays <input type="text" name="country" value="${address.country}"></label>
                    `)
                } else {
                    creancierFieldset.insertAdjacentHTML('beforeend', `
                    <input type="hidden" name="address_id" value=${address.id} />
                    <input type="hidden" name="type" value="k" />
                    <label for="iban">IBAN <input type="text" name="iban" value="${address.iban}"></label>
                    <label for="name">Nom <input type="text" name="name" value="${address.name}"></label>
                    <label for="street">Ligne 1 <input type="text" name="street" value="${address.street}"></label>
                    <label for="number">Ligne 2<input type="text" name="number" value="${address.number}"></label>
                    <label for="country">Pays <input type="text" name="country" value="${address.country}"></label>
                    `)
                }
            })
        })
  
        
        creancierFieldset.appendChild(node)
        creancierFieldset.insertAdjacentHTML('beforeend', `
            <button type="button">Ajouter nouveau créancier</button>
        `)
        creancierFieldset.querySelector('button').addEventListener('click', event => {
            const popup = Admin.popup(`<form><input type="hidden" name="type" value="k" />
                <label for="iban">IBAN <input type="text" name="iban" value=""></label><br>
                <label for="name">Nom <input type="text" name="name" value=""></label><br>
                <label for="street">Ligne 1 <input type="text" name="street" value=""></label><br>
                <label for="number">Ligne 2<input type="text" name="number" value=""></label><br>
                <label for="country">Pays <input type="text" name="country" value=""></label><br>
                <button type="submit">Ajouter</button><button type="reset">Annuler</button></form>
                `, 'Nouveau créancier')

            popup.addEventListener('keyup', event => {
                const target = event.target
                switch(target.name) {
                    case 'iban':
                        return target.setAttribute('aria-invalid', QRBill.verify_iban(target.value) ? 'false' : 'true')

                }
            })
            popup.addEventListener('submit', event=> {
                event.preventDefault()
                const data = new FormData(event.target)
                const address = {
                    type: data.get('type').toUpperCase(),
                    iban: data.get('iban'),
                    name: data.get('name'),
                    street: data.get('street'),
                    number: data.get('number'),
                    country: data.get('country').toUpperCase()
                }
                new KAPI(`${KAAL.getBase()}/QRAddress`).write(address)
                .then(address => {
                    this.renderCreditor(creancierFieldset, address, true)
                    popup.close()
                })
            })
            popup.addEventListener('reset', _ => popup.close())
            
        })
        return 
    }


    if (creditor.type === 'S') {
        creancierFieldset.innerHTML += `
        <input type="hidden" name="type" value="s" />
        ${newAddress ? `<input type="hidden" name="address_id" value="${creditor.id}" />` : ''}
        <label for="iban">IBAN <input type="text" name="iban" value="${creditor.iban}"></label>
        <label for="name">Nom <input type="text" name="name" value="${creditor.name}"></label>
        <label for="street">Rue <input type="text" name="street" value="${creditor.street}"></label>
        <label for="number">Numéro <input type="text" name="number" value="${creditor.number}"></label>
        <label for="postcode">Code postal <input type="text" name="postcode" value="${creditor.postcode}"></label>
        <label for="postcode">Ville <input type="text" name="town" value="${creditor.town}"></label>
        <label for="country">Pays <input type="text" name="country" value="${creditor.country}"></label>
        `
    } else {
        creancierFieldset.innerHTML += `
        <input type="hidden" name="type" value="k" />
        ${newAddress ? `<input type="hidden" name="address_id" value="${creditor.id}" />` : ''}
        <label for="iban">IBAN <input type="text" name="iban" value="${creditor.iban}"></label>
        <label for="name">Nom <input type="text" name="name" value="${creditor.name}"></label>
        <label for="street">Ligne 1 <input type="text" name="street" value="${creditor.street}"></label>
        <label for="number">Ligne 2<input type="text" name="number" value="${creditor.number}"></label>
        <label for="country">Pays <input type="text" name="country" value="${creditor.country}"></label>
        `
    }
}

UIKABXFactureList.prototype.parseCondition = function (conditionsStr) {
    if (conditionsStr.charAt(0) === '!') { conditionsStr = conditionsStr.substr(1) }
    const conditions = conditionsStr.split(';')
    .map(condition => condition.split(':'))
    if (conditions.filter(condition => condition[0] === '0').length === 0) { conditions.push(['0', '30']) }
    conditions.sort((a, b) => parseInt(a[1]) - parseInt(b[1]))
    return conditions
}

UIKABXFactureList.prototype.editConditions = function (conditionsStr, billId, addressId) {
    const KAPIBill = new KAPI(`${KAAL.getBase()}/Facture`)
    const KAPIQRAddress = new KAPI(`${KAAL.getBase()}/QRAddress`)

    const conditions = this.parseCondition(conditionsStr)

    const form = document.createElement('FORM')

    Array.from(Array(10).keys()).forEach(i => {
        form.innerHTML += `Paiement à <input name="conditionDay${i}" type="number" /> jours avec un rabais de <input name="conditionDiscount${i}" type="number" />%<br />`
    })
    form.innerHTML += `
        <label for="linkToAddress"><input type="checkbox" name="linkToAddress" /> Lier les conditions au fournisseur</label><br>
        <input type="submit" value="Enregistrer" /><input type="reset" value="Annuler" />
        `
    conditions.forEach((condition, i) => {
        form.elements[`conditionDay${i}`].value = parseInt(condition[1])
        form.elements[`conditionDiscount${i}`].value = KAFloat(condition[0])
    })

    form.addEventListener('submit', event => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)

        const conditions = []

        Array.from(Array(10).keys()).forEach(i => {
            const day = data.get(`conditionDay${i}`)
            const discount = data.get(`conditionDiscount${i}`)
            if (day !== '' && discount !== '') {
                conditions.push(`${discount}:${day}`)
            }
        })
        const conditionStr = conditions.join(';')
        ; (() => {
            if (data.get("linkToAddress") === 'on') {
                return KAPIQRAddress.write({conditions: conditionStr}, addressId)
            } else {
                return KAPIBill.write({conditions: `!${conditionStr}`}, billId)
            }
        })()
        .then(x => {
            console.log(x)
        })
        .catch(reason => {
            KAErrorUI(reason)
        })
    })
    this.actionNode.appendChild(form)
}

UIKABXFactureList.prototype.renderAssociateNode = function (parent, repartition = null) {
    const domNode = document.createElement('DIV')
    domNode.dataset.repartitionId = repartition ? repartition.id : 0
    domNode.classList.add('repartition')
    domNode.dataset.done = false
    if (repartition !== null) { domNode.dataset.done = true }

    const rep = {value: repartition ? repartition.value : '', project: repartition ? repartition.project : '', tva: repartition ? repartition.tva : getTVA(this.currentBill.date)}
    rep.value = KAFloat(rep.value)
    rep.tva = KAFloat(rep.tva)

    rep.value = KAFloat(rep.value)
    if (isNaN(rep.value)) {
        rep.value = 0
    }
    if (rep.value === 0) {
        if (this.currentBill._remaining > 0) {
                rep.value = this.currentBill._remaining
        }
    }

    domNode.innerHTML = `
        <input type="text" name="value" class="value" value="${KAFloat(rep.value)}"><div class="total"></div>
        <input type="text" name="project" value="${rep.project}">
        <input type="number" name="tva" class="tva" step="0.1" value="${rep.tva}">
        <span class="delete">🗙</span>
        `
    new KSelectUI(domNode.querySelector('input[name="project"]'), new STProject('Project', true), { realSelect: true, allowFreeText: false })

    domNode.querySelector('span.delete').addEventListener('click', event => {
        const repartitionId = parseInt(domNode.dataset.repartitionId)
        this.removeRepartitionNode(domNode)
        .then(_ => {
            if (repartitionId === 0) { return Promise.resolve() }

            const karepartition = new KAPI(`${KAAL.getBase()}/Repartition`)
            karepartition.get(repartitionId)
            .then(repartition => {
                karepartition.delete(repartition.id)
            })
            .then(_ => resolve())
        })
    })

    const endButton = parent.querySelector('input[name="add"]')
    new Promise((resolve) => { window.requestAnimationFrame(() => { parent.insertBefore(domNode, endButton); resolve() }) })
    .then(_ => this.calculateRepartitionTotal(parent))
}

UIKABXFactureList.prototype.removeRepartitionNode = function (node) {
    return new Promise(resolve => {
        const parentNode = node.parentNode
        new Promise(resolve => { window.requestAnimationFrame(() => { node.remove(); resolve() }) })
        .then(_ => {
            this.calculateRepartitionTotal(parentNode)
            resolve()
        })
    })
}

UIKABXFactureList.prototype.renderAssociate = function (bill) {
    return new Promise(resolve => {
        const fieldset = KAFieldsetUI('Répartition')
        fieldset.insertAdjacentHTML('beforeend', 
            `<div class="bill-summary">
                <label for="amount">Montant restant : <input class="shorter" name="amount" type="text" readonly="true" value="${KAFloat(bill.amount, 2)}"></input></label>
                <label for="total">Total répartition : <input class="shorter" name="total" type="text" readonly="true"></input></label>
                <label><input type="radio" name="ttc" value="1" ${bill._ttc ? 'checked' : ''} /> TTC</label>
                <label><input type="radio" name="ttc" value="0" ${!bill._ttc ? 'checked' : ''} /> HT</label>
                <label> Frais généraux : <input class="shorter" type="text" name="frais" class="value" value=""></label>
                <label>TVA : <input class="shorter" type="text" name="tva" class="value" value="${getTVA(this.currentBill.date)}"></label>
                </div>
                <input name="add" type="button" value="Ajouter une répartition" />
                `)

        fieldset.addEventListener('click', event => {
            const target = event.target
            if (target.type === 'button') {
                this.renderAssociateNode(fieldset)
            }
        })
        fieldset.addEventListener('change', event => {
            const target = event.target
            if (target.name === 'ttc') {
                if (this.currentBill) {
                    this.currentBill._ttc = target.value === '1'
                }
            }
            if (target.name === 'amount') {
                if (this.currentBill) {
                    this.currentBill.amount = KAFloat(target.value)
                }
            }
        })
        const karepartition = new KAPI(`${KAAL.getBase()}/Repartition`)
        karepartition.search({facture: bill.id})
        .then(repartitions => {
            if (repartitions.length === 0) { return resolve(fieldset) }
            if (KAFloat(repartitions[0].splittva) !== 0) {
                fieldset.querySelector('input[name="tva"]').value = KAFloat(repartitions[0].splittva)
            }
            if (repartitions[0].ttc === 0) {
                fieldset.querySelector('input[name="ttc"][value="0"]').checked = true
                this.currentBill._ttc = false
            } else {
                fieldset.querySelector('input[name="ttc"][value="1"]').checked = true
                this.currentBill._ttc = true
            }
            let acc = repartitions.map(repartition => repartition.split === 1).reduce((acc, repartition) => {
                acc += repartition.value
                return acc
            }, 0)
            const splitvalue = repartitions.reduce((acc, repartition) => {
                acc += KAFloat(repartition.splitvalue)
                return acc
            }, 0)
            if (splitvalue !== 0) {
                fieldset.querySelector('input[name="frais"]').value = splitvalue
            }
            let total = 0
            repartitions.forEach(repartition => {
                const value = KAFloat(repartition.value)
                if (!isNaN(value)) { total += value }
                this.renderAssociateNode(fieldset, repartition)
            })
            return resolve(fieldset)
        })
        fieldset.addEventListener('change', event => {
            const name = event.target.name
            this.calculateRepartitionTotal(fieldset)

            switch(name) {
                case 'value':
                    this.calculateRepartitionTotal(fieldset)
                    break;
            }
        })
    })
}

UIKABXFactureList.prototype.calculateRepartitionTotal = function (fieldset) {
    const nodes = Array.from(fieldset.querySelectorAll('input[name="value"]'))
    let divided = KAFloat(fieldset.querySelector('input[name="frais"]').value) 
    divided /= nodes.length
    let repAmount = nodes.reduce((acc, node) => {
            const value = KAFloat(node.value)
            let total = 0
            if (!isNaN(value)) { acc += value; total += value }
            if (!isNaN(divided)) { acc += divided; total += divided }
            node.nextElementSibling.textContent = KAFloat(total).toFixed(2)  
            return acc
        }, 0)

    /* bill amount is ALWAYS with taxes, so we need to recalculate the repartition amount with taxes added */
    if (!this.currentBill._ttc) {
        repAmount = nodes.reduce((acc, node) => {
            let value = KAFloat(node.value)
            value *= 1 + KAFloat(node.parentNode.querySelector('input[name="tva"]').value) / 100
            if (!isNaN(value)) { acc += value} 
            return acc
        }, 0) + KAFloat(fieldset.querySelector('input[name="frais"]').value) * (1 + KAFloat(fieldset.querySelector('input[name="tva"]').value) / 100)
    }

    fieldset.querySelector('input[name="total"]').value = KAFloat(repAmount, 2)
    if (this.currentBill) {
        const remaining = KAFloat(this.currentBill.amount - repAmount)
        this.currentBill._split = divided
        this.currentBill._remaining = remaining
        fieldset.querySelector('input[name="amount"]').value = KAFloat(remaining, 2)
        if (remaining < 0) {
            fieldset.querySelector('input[name="amount"]').classList.add('over')
        } else {
            fieldset.querySelector('input[name="amount"]').classList.remove('over')
        }
    }
}

UIKABXFactureList.prototype.unselectAllBill = function () {
    this.multiselect = []
    window.requestAnimationFrame(() => { this.listNode.querySelector('.header .total').textContent = '' })
    this.listNode.querySelectorAll('.billItem.payment').forEach(node => 
        window.requestAnimationFrame(() => node.classList.remove('payment'))
    )
}

UIKABXFactureList.prototype.selectBill = function (event) {
    if (!this.multiselect) {
        this.multiselect = []
    }
    let node = event.target
    while(node && !node.classList.contains('billItem')) { 
        node = node.parentNode
    }
    const amount = KAFloat(node.querySelector('.amount').textContent)
    const id = node.dataset.id

    if (node.classList.contains('payment')) {
        this.multiselect = this.multiselect.filter(item => item.id !== id)
    } else {
        this.multiselect.push({id, amount})
    }

    node.classList.toggle('payment')

    const total = this.multiselect.reduce((acc, item) => {
        acc += item.amount
        return acc
    }, 0)
    this.listNode.querySelector('.header .total').textContent = total.toFixed(2)
}

UIKABXFactureList.prototype.paySelected = function (bank) {
    const KAPIBill = new KAPI(`${KAAL.getBase()}/Facture`)
    Promise.allSettled(this.multiselect.map(item => KAPIBill.execute('pay', {id: item.id, bank})))
    .then(results => {
        return results.filter(result => result.status === 'fulfilled').map(result => result.value).filter(value => !value.success)
    })
    .then(failed => {
        return Promise.allSettled(failed.map(fail => KAPIBill.get(fail.__request.params.id)))
    })
    .then(results => {
        return results.filter(result => result.status === 'fulfilled').map(result => result.value)
    })
    .then(bills => {
        this.clearPreview()
        .then(_ => {
            if (bills.length === 0) { return }
            const title = document.createElement('H2')
            title.innerHTML = 'Factures ne pouvant être mise en paiement'
            this.previewNode.appendChild(title)
            const KAPIQRAddress = new KAPI(`${KAAL.getBase()}/QRAddress`)
            bills.forEach(bill => {
                KAPIQRAddress.get(bill.qraddress)
                .then(qraddress => {
                    const div = document.createElement('DIV')
                    div.classList.add('billItem')
                    if (bill.duedate === '') { bill.duedate = bill.date }
                    bill.duedate = new Date(bill.duedate)
                    div.innerHTML =  `<span class="vendor">${qraddress?.name ?? ''}</span>
                    <span class="duedate floating">${bill.duedate.shortDate()}</span>
                    <span class="amount floating">${KAFloat(bill.amount).toFixed(2)}</span>
                    <span class="number">${bill.number}</span>
                    <span class="reference">${bill.reference}</span>`
                    window.requestAnimationFrame(() => this.previewNode.appendChild(div))
                })
            })
        })
        .then(_ => {
            this.clearList()
            .then(_ => {
                this.render({state: this.currentState})
            })
        })
    })
}