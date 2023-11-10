function UIKABXFactureList () {
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('ka-bxfacture-list')
    this.domNode.innerHTML = `
        <div class="selector"></div>
        <div class="list">
            <div class="header billItem"><span>Créditeur</span><span>Échéance</span><span>Montant</span></div>
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
}

UIKABXFactureList.prototype.render = function (query = {state: 'INCOMING'}) {
    return new Promise((resolve, reject) => {
        //const bxpay = new KAPI(`${KAAL.getBase()}/BXOutgoingPayment`)
        const KAPIBill = new KAPI(`${KAAL.getBase()}/Facture`)
        const KAPIQRAddress = new KAPI(`${KAAL.getBase()}/QRAddress`)
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
                    div.innerHTML = `<span class="vendor">${bill.qraddress?.name ?? ''}</span><span class="duedate floating">${bill.duedate.shortDate()}</span><span class="amount floating">${parseFloat(bill.amount).toFixed(2)}</span>`
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
        const div = document.createElement('DIV')
        div.innerHTML = '<span>Créditeur</span><span>Échéance</span><span>Montant</span>'
        div.classList.add('header', 'billItem')
        window.requestAnimationFrame(() => {
            Array.from(this.listNode.children)
                .forEach(child => this.listNode.removeChild(child))
            this.listNode.appendChild(div)
            resolve()
        })
    })
}

UIKABXFactureList.prototype.openBill = function (details) {
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
                const object = document.createElement('object')
                object.type = fileObject.mimetype
                object.data = `data:${fileObject.mimetype};base64,${fileObject.file}`
                window.requestAnimationFrame(() => {
                    this.previewNode.appendChild(object)
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

    
                <label for="amount">Montant <input type="number" name="amount" step="0.01" value="${bill.amount.toFixed(2)}"></label>

                ${conditions.map(condition =>  `<label>Rabais ${condition[0]}% à ${condition[1]} jours</label>`).join('')}
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

            form.addEventListener('submit', event => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                const billUpdate = {
                    id: bill.id,
                    reference: QRBill.ugly_reference(formData.get('reference')),
                    number: formData.get('number'),
                    amount: parseFloat(formData.get('amount')),
                    duedate: formData.get('duedate'),
                    date: formData.get('date'),
                    state: 'OPEN'
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
                        (bill.file ? KAPIBill.execute('BXUpload', {name: bill.file}) : Promise.resolve(null))
                    ])
                    .then(([updatedBill, file]) => {
                        if (file === null) { return Promise.resolve() }
                        return KAPIBill.execute('BXCreateBill', {fileuuid: file.data[0].uuid, billid: bill.id})
                    })
                    .then(_ => {
                        return Promise.allSettled(Array.from(form.querySelectorAll('[data-repartition-id]'))
                        .map(node => {
                            if (node.querySelector('input[name="value"]').value === '') { return Promise.resolve() }
                            const rep = {value: node.querySelector('input[name="value"]').value, project: node.querySelector('input[name="project"]').dataset.value, facture: bill.id, tva: node.querySelector('input[name="tva"]').value}

                            rep.value = parseFloat(rep.value)
                            rep.tva = parseFloat(rep.tva)

                            if (isNaN(rep.value) || isNaN(rep.tva)) { return Promise.resolve() }
                            rep.value = (rep.value / (1 + (rep.tva / 100))).toFixed(4)

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
                if (event.target.name === 'editCondition') {
                    this.editConditions(bill.conditions, bill.id, address.id)
                }
            })
            form.classList.add('paiement')

            
            this.renderAssociate(bill.id)
            .then(fieldset => {
                form.appendChild(fieldset)
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
                <button type="reset">Annuler</button>
                `)
                resolve(form)
            })
            
        })
    })
}

UIKABXFactureList.prototype.renderCreditor = function (creancierFieldset, creditor, newAddress = false) {
    if (!creditor.iban) { 
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
                    console.log(address)
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
        form.elements[`conditionDiscount${i}`].value = parseFloat(condition[0])
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

    const rep = {value: repartition ? repartition.value : '', project: repartition ? repartition.project : '', tva: repartition ? repartition.tva : 7.7}
    rep.value = parseFloat(rep.value)
    rep.tva = parseFloat(rep.tva)

    if (isNaN(rep.value) || isNaN(rep.tva)) { return Promise.resolve() }
    rep.value = (rep.value + (rep.value * rep.tva / 100)).toFixed(2)

    domNode.innerHTML = `
        <input type="text" name="value" class="value" value="${rep.value}">
        <input type="text" name="project" value="${rep.project}">
        <input type="number" name="tva" class="tva" step="0.1" value="${rep.tva}">
        <span class="delete">X</span>
        `
    new KSelectUI(domNode.querySelector('input[name="project"]'), new STProject('Project'), { realSelect: true, allowFreeText: false })

    domNode.querySelector('span.delete').addEventListener('click', event => {
        const repartitionId = parseInt(domNode.dataset.repartitionId)
        if (repartitionId === 0) {
            window.requestAnimationFrame(() => domNode.remove())
            if (parent.querySelectorAll('[data-done="false"]').length === 0) {
                this.renderAssociateNode(parent)
            }
            return 
        }
        const karepartition = new KAPI(`${KAAL.getBase()}/Repartition`)
        karepartition.delete(repartitionId)
        .then(_ => window.requestAnimationFrame(() => domNode.remove()))
    })
    domNode.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', event => {
            if (domNode.dataset.done === 'true') { return }
            domNode.dataset.done = true
            this.renderAssociateNode(parent)
        })
    })
    window.requestAnimationFrame(() => parent.appendChild(domNode))
}

UIKABXFactureList.prototype.renderAssociate = function (billId) {
    return new Promise(resolve => {
        const fieldset = KAFieldsetUI('Répartition')
        const karepartition = new KAPI(`${KAAL.getBase()}/Repartition`)
        karepartition.search({facture: billId})
        .then(repartitions => {
            repartitions.forEach(repartition => {
                this.renderAssociateNode(fieldset, repartition)
            })
            this.renderAssociateNode(fieldset)
            return resolve(fieldset)
        })
        
    })
}