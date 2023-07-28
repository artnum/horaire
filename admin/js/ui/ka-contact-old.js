function UIKAContactOld () {
    this.countries = [
        ['CH', 'Suisse'],
        ['FR', 'France'],
        ['DE', 'Allemagne'],
        ['IT', 'Italie'],
        ['BE', 'Belgique'],
        ['UK', 'Angeleterre'],
        ['US', 'États-Unis'],
        ['HU', 'Hongrie'],
        ['AR', 'Argentine'],
        ['IE', 'Irlande'],
        ['LI', 'Lichtenstein'],
        ['LU', 'Luxembourg'],
        ['MY', 'Malaisie'],
        ['MV', 'Maldives'],
        ['NO', 'Norvège'],
        ['AT', 'Autriche'],
        ['NL', 'Pays-bas'],
        ['PT', 'Portugal'],
        ['CZ', 'République tchèque'],
        ['RO', 'Roumanie'],
        ['RU', 'Russie'],
        ['TR', 'Turquie'],
        ['IL', 'Israël'],
        ['SE', 'Suède'],
        ['FI', 'Finlande'],
        ['DK', 'Danemark'],
        ['CN', 'Chine'],
        ['BG', 'Bulgarie'],
        ['AT', 'Australie']
    ].sort((a, b) => a[1].localeCompare(b[1]))
    this.clientid = null
    this.currentValue = ''
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('ka-contact-container-old')
    this.domNode.innerHTML = `
        <div class="ka-selected-contact"></div>
        <input type="text" name="search" autocomplete="off" placeholder="Rechercher un client existant" /> ou <button type="button" name="add">Créer nouveau client</button>
        <div class="ka-contact empty"></div>
    `
    this.searchInput = this.domNode.querySelector('input[name="search"]')
    this.result = this.domNode.querySelector('.ka-contact')
    this.selectedContact = this.domNode.querySelector('.ka-selected-contact')
    
    const addClientButton = this.domNode.querySelector('button[name="add"]')
    addClientButton.addEventListener('click', event => {
        new Promise((resolve, reject) => {
            const popup = Admin.popup(`<form>La création de contact ne peut pas encore être faite sur Bexio.<br>
            Utilisez l'interface Bexio pour ceci.<br>
            <button type="submit">Créer un contact local</button> <button type="reset">Ok je vais sur Bexio</button>
            `, 'Non implémenté')
            popup.addEventListener('submit', event => {
                event.preventDefault()
                popup.close()
                resolve()
            })
            popup.addEventListener('reset', event => {
                event.preventDefault()
                popup.close()
                window.open('https://office.bexio.com/index.php/kontakt/edit', '_blank')
                reject('Bexio')
            })
        })
        .then(_ => {
            this.editProjectForm()
            .then(formNode => {
                const popup = window.Admin.popup(formNode, 'Ajouter client')
                formNode.addEventListener('reset', _ => {
                    popup.close()
                })
                formNode.addEventListener('contact-written', event => {
                    this.selectContact(event.detail)
                    popup.close()
                })
            })
        })
        .catch(cause => {
            console.log(cause)
        })
    })

    this.searchInput.addEventListener('keydown', event => this.handleKeyInput(event))
    this.searchInput.addEventListener('keyup', kdebounce(event => {
        this.handleKeyInput(event)
    }, 60))

}

UIKAContactOld.prototype.handleKeyInput = function (event) {
    switch (event.type) {
        case 'keydown':
            switch(event.key) {
                case 'Escape':
                    this.clearResult()
                    break;
                case 'Enter':
                    event.preventDefault()
                    break
            }
            return
        case 'keyup':
            const value = this.searchInput.value
            if (value.length === 0) { this.clearResult(); return }
            if (event.key !== 'Enter') {
                if (value === this.currentValue) { return }
                this.currentValue = value
            }
            this.startWaitSearch()
            this.search(value)
            .then(contacts => {
                const empty = contacts.length <= 0
                window.requestAnimationFrame(() => {
                    if (!empty) { return this.result.classList.remove('empty') }
                    this.result.classList.add('empty')
                })

                return contacts.sort((c1, c2) => { 
                    if (c1.custom4 === 'BEXIO' && c2.custom4 !== 'BEXIO') { return 1 }
                    if (c1.custom4 === 'BEXIO' && c2.custom4 === 'BEXIO') { return 0 }
                    if (c1.custom4 !== 'BEXIO' && c2.custom4 === 'BEXIO') { return -1 }
                }).splice(contacts.length - 20).reverse()
            })
            .then(contacts => {
                return Promise.allSettled(contacts.map(c => this.renderContact(c)))
            })
            .then(nodes => {
                return nodes.filter(s => s.status === 'fulfilled').map(s => s.value)
            })
            .then(nodes => {
                this.endWaitSearch()
                return this.renderResult(nodes)
            })
            break
    }
}

UIKAContactOld.prototype.startWaitSearch = function () {
    window.requestAnimationFrame(() => this.domNode.classList.add('updating-in-progress'))
}

UIKAContactOld.prototype.endWaitSearch = function () {
    window.requestAnimationFrame(() => this.domNode.classList.remove('updating-in-progress'))
}

UIKAContactOld.prototype.setResult = function (contactId) {
    this.loadContact(contactId)
    .then(contact =>{
        this.clientid = contactId
        return this.renderContact(contact)
    })
    .then(node => {
        this.searchInput.dataset.id = node.dataset.id
        this.createSelectContactInteraction(node)
        window.requestAnimationFrame(() => {
            if (this.selectedContact.firstElementChild) { this.selectedContact.removeChild(this.selectedContact.firstElementChild) }
            this.selectedContact.appendChild(node)
        })
    })
}

UIKAContactOld.prototype.unselectContact = function () {
    this.clientid = null
    delete this.searchInput.dataset.id
    window.requestAnimationFrame(() => {
        if (this.selectedContact.firstElementChild) { this.selectedContact.removeChild(this.selectedContact.firstElementChild) }
    })
}

UIKAContactOld.prototype.createSelectContactInteraction = function (node) {
    const editButton = document.createElement('button')
    editButton.innerHTML = 'Editer le client'
    editButton.type = 'button'
    const removeButton = document.createElement('button')
    removeButton.innerHTML = 'Retirer le client du projet'
    removeButton.type = 'button'
    removeButton.name = 'removeClient'

    window.requestAnimationFrame(() => {
        node.appendChild(removeButton)
        node.appendChild(editButton)
    })

    node.addEventListener('click', event => {
        if (event.target.nodeName === 'A') { return }
        if (event.target.nodeName !== 'BUTTON') { return }

        if (event.target.nodeName === 'BUTTON' && event.target.name === 'removeClient') {
            return this.unselectContact()
        }
        this.editProjectForm(event.currentTarget.dataset.id)
        .then(formNode => {
            const popup = window.Admin.popup(formNode, 'Éditer client')
            formNode.addEventListener('reset', _ => {
                popup.close()
            })
            formNode.addEventListener('contact-written', event => {
                this.selectContact(event.detail)
                popup.close()
            })
        })
    })
}

UIKAContactOld.prototype.selectContact = function (contact) {
    this.renderContact(contact, true)
    .then(contactNode => {
        this.clientid = contact.IDent
        this.searchInput.dataset.id = this.clientid
        this.createSelectContactInteraction(contactNode)

        window.requestAnimationFrame(() => {
            if (this.selectedContact.firstElementChild) { this.selectedContact.removeChild(this.selectedContact.firstElementChild) }
            this.selectedContact.appendChild(contactNode)
        })
    })
}

UIKAContactOld.prototype.selectResult = function (contactId) {
    return new Promise ((resolve, reject) => {
        this.clientid = contactId
        const originalNode = this.result.firstElementChild.querySelector(`div[data-id="${contactId}"]`)
        if (!originalNode) { return reject('')}
        const node = originalNode.cloneNode(true)
        this.searchInput.dataset.id = node.dataset.id
        this.createSelectContactInteraction(node)

        window.requestAnimationFrame(() => {
            if (this.selectedContact.firstElementChild) { this.selectedContact.removeChild(this.selectedContact.firstElementChild) }
            this.selectedContact.appendChild(node)
        })

        this.clearResult()
        resolve()
    })
}

UIKAContactOld.prototype.clearResult = function () {
    window.requestAnimationFrame(() => {
        this.result.classList.add('empty')
        if (this.result.firstElementChild) { this.result.removeChild(this.result.firstElementChild) }
    })
}

UIKAContactOld.prototype.renderResult = function (contacts) {
    return new Promise((resolve, reject) => {
        const node = document.createElement('DIV')
        contacts.forEach(c => node.appendChild(c))
        window.requestAnimationFrame(() => {
            if (this.result.firstElementChild) { this.result.removeChild(this.result.firstElementChild) }
            this.result.appendChild(node)
            resolve()
        })
    })
}

UIKAContactOld.prototype.search = function (searchValue) {
    const body = {'#and': {}}
    let i = 0
    searchValue.split(' ').forEach(value => {
        body['#and'][`#or:${++i}`] = {
            sn: `*${value}*`,
            givenname: `*${value}*`,
            o: `*${value}*`
        }
    })
    const url = new URL(`${KAAL.getBase()}/Contact/_query`)
    url.searchParams.append('limit', 20)
    return kafetch2(url, {
        method: 'POST',
        body
    })
}

UIKAContactOld.prototype.simplifyContact = function (contact) {
    return new Promise((resolve, reject) => {
        const sContact = {
            displayname: '',
            firstname: '',
            lastname: '',
            address: '',
            postcode: '',
            locality: '',
            mail: '',
            phone: '',
            url: '',
            country: '',
            organization: '',
            type: 'person',
            custom4: 'LOCAL',
            state: 'active'
        }
        if (!contact) { return resolve(sContact) }

        if (Array.isArray(contact)) { contact = contact.pop() }
        sContact.id = contact.IDent
        sContact.state = contact.state
        if (contact.type !== 'person') { sContact.type = 'organization' }
        if (sContact.type === 'organization') {
            if (!isStringEmpty(contact.o)) { sContact.firstname = contact.o }
            if (!isStringEmpty(contact.description)) { sContact.lastname = contact.description }
        } else {
            if (!isStringEmpty(contact.givenname)) { sContact.firstname = contact.givenname }
            if (!isStringEmpty(contact.sn)) { sContact.lastname = contact.sn }
            if (!isStringEmpty(contact.o)) { sContact.organization = contact.o }
        }
        sContact.displayname = [sContact.firstname, sContact.lastname].join(' ')

        if (Array.isArray(contact.mobile)) {
            sContact.phone = arrayFirstNonEmptyString(contact.mobile)
        } else {
            if (!isStringEmpty(contact.mobile)) { sContact.phone = contact.mobile }
        }

        if (sContact.phone === '') {
            if (Array.isArray(contact.telephonenumber)) {
                sContact.phone = arrayFirstNonEmptyString(contact.telephonenumber)
            } else {
                if (!isStringEmpty(contact.telephonenumber)) { sContact.phone = contact.telephonenumber }
            }
        }

        if (Array.isArray(contact.mail)) {
            sContact.mail = arrayFirstNonEmptyString(contact.mail)
        } else {
            if (!isStringEmpty(contact.mail)) { sContact.mail = contact.mail }
        }


        if (Array.isArray(contact.labeleduri)) {
            sContact.url = arrayFirstNonEmptyString(contact.labeleduri)
        } else {
            if (!isStringEmpty(contact.labeleduri)) { sContact.url = contact.labeleduri }
        }

        if (Array.isArray(contact.l)) {
            sContact.locality = arrayFirstNonEmptyString(contact.l)
        } else {
            if (!isStringEmpty(contact.l)) { sContact.locality = contact.l }
        }

        if (Array.isArray(contact.postaladdress)) {
            sContact.address = arrayFirstNonEmptyString(contact.postaladdress)
        } else {
            if (!isStringEmpty(contact.postaladdress)) { sContact.address = contact.postaladdress }
        }

        if (sContact.address !== '') {
            sContact.address = sContact.address.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2');
        }

        if (Array.isArray(contact.postalcode)) {
            sContact.postcode = arrayFirstNonEmptyString(contact.postalcode)
        } else {
            if (!isStringEmpty(contact.postalcode)) { sContact.postcode = contact.postalcode }
        }


        if (Array.isArray(contact.c)) {
            sContact.country = arrayFirstNonEmptyString(contact.c)
        } else {
            if (!isStringEmpty(contact.c)) { sContact.country = contact.c }
        }

        if (!isStringEmpty(sContact.url) && (!sContact.url.startsWith('http:') && !sContact.url.startsWith('https:'))) {
            sContact.url = `https://${sContact.url}` // default to https
        }

        sContact.custom4 = contact.custom4

        return resolve(sContact)
    })
}

UIKAContactOld.prototype.renderContact = function (contact, notSelectable = false) {
    return new Promise((resolve, reject) => {
        this.simplifyContact(contact)
        .then(contact => {

            const contactNode = document.createElement('DIV')
            contactNode.classList.add('ka-contact-old')
            contactNode.dataset.id = contact.id
            contactNode.innerHTML = `
                <div class="names">${contact.custom4 === 'BEXIO' ? `<img src="${KAAL.getBase()}/resources/images/bexio-icon.png" />&nbsp;` : ''}${contact.firstname} ${contact.lastname}</div>
                ${(contact.type === 'person' && !isStringEmpty(contact.organization)) ? `<div class="organization">${contact.organization}</div>` : ''}
                <div class="address">${contact.address}</div>
                <div class="locality">${!isStringEmpty(contact.country) ? `${contact.country}-` : ''}${contact.postcode} ${contact.locality}</div>
                <div class="phone">${!isStringEmpty(contact.phone) ? `<a href="tel:${contact.phone}">${contact.phone}</a>` : '' }</div>
                <div class="mail">${!isStringEmpty(contact.mail) ? `<a href="mailto:${contact.mail}">${contact.mail}</a>` : '' }</div>
                <div class="url">${!isStringEmpty(contact.url) ? `<a target="_blank" href="${contact.url}">${contact.url}</a>` :'' }</div>
            `
            if (!notSelectable) { 
                contactNode.addEventListener('click', event => {
                    if (event.target.nodeName === 'A') { return }
                    this.selectResult(event.currentTarget.dataset.id)
                }) 
            }
            return resolve(contactNode)
        })
    })
}

UIKAContactOld.prototype.loadContact = function (contactId) {
    return new Promise((resolve, reject) => {
        if (!contactId) { return reject(new Error('Contact inconnu')) }
        contactId = contactId.split('/').pop()
        kafetch2(`${KAAL.getBase()}/Contact/${contactId}`)
        .then(contact => {
            if (contact.length !== 1) { return reject(new Error('Contact inconnu'))}
            resolve(contact[0])
        })
        .catch(cause => reject(cause))
    })
}

UIKAContactOld.prototype.editProjectForm = function (contactId = null) {
    return new Promise((resolve, reject) => {
        ; (() => {
            if (contactId === null) { return Promise.resolve({type: 'person'}) }
            return this.loadContact(contactId)
        })()
        .then(contact => {
            if (contact.custom4 !== 'BEXIO') { return contact }
            return new Promise((resolve, reject) => {
                const popup = Admin.popup('<form>Les contacts Bexio ne peuvent pas être modifié actuellement<br><button type="submit">Ok</button></form>', 'Non implémenté')
                popup.addEventListener('submit', event => {
                    event.preventDefault()
                    popup.close()
                    return reject('Bexio')
                })
            })
        }).then(contact => {
            const form = document.createElement('FORM')
            form.classList.add(contact.type === 'person'? 'ka-person-form' : 'ka-org-form')
            form.innerHTML = `
                <input type="hidden" name="c:IDent" value="${contact.IDent ?? ''}" />
                ${
                    contactId === null ? 
                        `<label><input type="radio" value="person" name="c:type" ${contact.type === 'person' ? 'checked' : ''} /> Personne</label>
                        <label><input type="radio" value="organization"  name="c:type" ${contact.type === 'organization' ? 'checked' : ''} /> Organisation</label><br />` :
                        `<input type="hidden" name="c:type" value="${contact.type}" />`
                }
                <span class="ka-person-visible"><label for="c:sn">Nom</label><input type="text" name="c:sn" value="${contact.sn ?? ''}" />
                <label for="c:givenname">Prénom</label><input type="text" name="c:givenname" value="${contact.givenname ?? ''}"/><br /></span>
                <label for="c:o">Organisation</label><input type="text" name="c:o" value="${contact.o ?? ''}"><br />
                <label for="c:postaladdress">Addresse</label><textarea name="c:postaladdress">${contact.postaladdress ?? ''}</textarea><br />
                <label for="c:postalcode">Code postal</label><input type="text" name="c:postalcode" value="${contact.postalcode ?? ''}">
                <label for="c:l">Localité</label><input type="text" name="c:l" value="${contact.l ?? ''}"><br />
                <label for="c:c">Pays</label><select name="c:c">
                    <option value=""> -- </option>
                    ${this.countries.map(country => `<option ${contact.c === country[0] ? 'selected' : ''} value="${country[0]}">${country[1]}</option>`).join('')}
                </select><br>
                <label for="c:telephonenumber">Téléphone</label><button type="button" class="addMore"></button><br />
                <span class="ka-person-visible"><label for="c:mobile">Mobile</label><button type="button" class="addMore"></button><br /></span>
                <label for="c:mail">E-mail</label><button type="button" class="addMore"></button><br />
                <label for="c:labeleduri">Site Web</label><button type="button" class="addMore"></button><br />
                <button type="submit" name="save">Enregistrer</button>${contact.IDent ? '<button type="submit" class="danger" name="delete">Supprimer le client</button>' : ''}<button type="reset" name="reset">Annuler</button><br />
            `

            if (!contact.telephonenumber) { contact.telephonenumber = [''] }
            if (!contact.mobile) { contact.mobile = [''] }
            if (!contact.mail) { contact.mail = [''] }
            if (!contact.labeleduri) { contact.labeleduri = [''] }

            if (!Array.isArray(contact.telephonenumber)) { contact.telephonenumber = [contact.telephonenumber] }
            if (!Array.isArray(contact.mobile)) { contact.mobile = [contact.mobile] }
            if (!Array.isArray(contact.mail)) { contact.mail = [contact.mail] }
            if (!Array.isArray(contact.labeleduri)) { contact.labeleduri = [contact.labeleduri] }

            ; ['telephonenumber', 'mobile', 'mail', 'labeleduri'].forEach(attr => {
                const label = form.querySelector(`label[for="c:${attr}"]`)
                if (!label) { return }
                contact[attr].reverse().forEach(value => {
                    const node = document.createElement('INPUT')
                    node.name = `c:${attr}`
                    node.value = value
                    node.type = 'text'
                    label.parentNode.insertBefore(node, label.nextElementSibling)
                })

            })

            form.addEventListener('click', event => {
                if (event.target.nodeName === 'INPUT' && event.target.name === 'c:type') {
                    const type = event.target.value
                    window.requestAnimationFrame(() => {
                        form.classList.remove('ka-org-form')
                        form.classList.remove('ka-person-form')
                        form.classList.add(type === 'person' ? 'ka-person-form' : 'ka-org-form')
                    })
                    return
                }
                if (!event.target.classList.contains('addMore')) { return }
                const node = event.target
                const input = node.previousElementSibling.cloneNode(true)
                input.value = ''
                window.requestAnimationFrame(() => {
                    node.parentNode.insertBefore(input, node)
                })
            })

            form.addEventListener('submit', event => {
                event.preventDefault()
                event.stopPropagation()
                const data = new FormData(event.currentTarget)
                if (event.submitter.name === 'delete') {
                    this.deleteContactUI(data.get('c:IDent'))
                }
                const contact = {}
                data.forEach((v, k) => {
                    k = k.split(':')
                    if (k.length !== 2) { return }
                    if (k[0] !== 'c') { return }

                    if (isStringEmpty(v)) { return }

                    if (contact[k[1]] && !Array.isArray(contact[k[1]])) { 
                        contact[k[1]] = [contact[k[1]]]
                    }
                    if (Array.isArray(contact[k[1]])) {
                        contact[k[1]].push(v)
                        return
                    }
                    contact[k[1]] = v
                    if (contact.type === 'person') {
                        contact.cn = [contact.givenname, contact.sn].join(' ')
                    }
                })

                if (contact.type !== 'person') {
                    delete contact.mobile
                    delete contact.givenname
                    delete contact.sn
                }

                ; (() => {
                    ; [
                        'labeleduri',
                        'mail',
                        'mobile', 
                        'telephonenumber',
                        'postaladdress',
                        'postalcode',
                        'c',
                        'l',
                        'sn',
                        'givenname'
                    ].forEach(attr => {
                        if (!contact[attr]) { contact[`-${attr}`] = '' }
                    })
                    if (contact.IDent) {
                        return kafetch2(`${KAAL.getBase()}/Contact/${contact.IDent}`, {method: 'PUT', body: contact})
                    }
                    return kafetch2(`${KAAL.getBase()}/Contact/`, {method: 'POST', body: contact})
                })()
                .then(contact => {
                    return this.loadContact(contact[0].IDent)
                })
                .then(contact => {
                    form.dispatchEvent(new CustomEvent('contact-written', {detail: contact}))
                })
            })

            resolve(form)
        })
        .catch(cause => {
            console.log(cause)
        })
    })
}

UIKAContactOld.prototype.deleteContactUI = function (contactId) {
    return new Promise((resolve, reject) => {
        if (!contactId) { return reject(new Error('Pas de contact spécifié')) }
        this.loadContact(contactId)
        .then(contact => {
            return this.simplifyContact(contact)
        })
        .then(contact => {
            const formNode = document.createElement('FORM')
            formNode.innerHTML = `
                Voulez-vous réellement supprimer le contact ${[contact.firstname, contact.lastname].join(' ')} du carnet d'adresses ?<br>
                <strong style="color: red">Cette opération est irréversible.</strong> <br>
                <button type="submit" class="danger">Oui</button> <button type="reset">Non</button>
            `
            const popup = window.Admin.popup(formNode, `Confirmer la suppression de ${[contact.firstname, contact.lastname].join(' ')}`)
            formNode.addEventListener('submit', event => {
                event.preventDefault()
                popup.close()
                this.deleteContact(contactId)
                .then(x => {
                    resolve()
                })
                .catch(cause => {
                    reject(cause)
                })
                
            })
            formNode.addEventListener('reset', event => {
                event.preventDefault()
                popup.close()
                resolve()
            })
        })
    })
}

UIKAContactOld.prototype.deleteContact = function (contactId) {
    return new Promise ((resolve, reject) => {
        kafetch2(`${KAAL.getBase()}/Contact/${contactId}`, {method: 'DELETE'})
        .then(_ => {
            window.requestAnimationFrame(() => {
                if (this.selectedContact.firstElementChild) { this.selectedContact.removeChild(this.selectedContact.firstElementChild) }
            })
        })
        .catch(cause => {
            reject(cause)
        })
    })
}

UIKAContactOld.prototype.getClientId = function () {
    return this.clientid
}