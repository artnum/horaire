function UIKAContact () {
    this.eventTarget = new EventTarget()
    this.previousSearchValue = ''
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('ka-contacts')
    this.domNode.innerHTML = `
        <input type="text" name="search" />
        <div class="ka-contact-result-set">
        </div>
    `

    this.searchInput = this.domNode.firstElementChild
    this.searchInput.addEventListener('keyup', kdebounce((event) => {
        const searchValue = event.originalTarget.value
        if (this.previousSearchValue === searchValue) { return }
        this.previousSearchValue = searchValue

        window.requestAnimationFrame(() => {
            this.domNode.classList.add('sending')
        })
        ; (() => {
            if (searchValue.length > 0) {
                return Promise.allSettled([
                    kafetch(`${KAAL.getBase()}/BXContacts/_query`, {method: 'POST', body: {'name_1': ['~', searchValue]}}),
                    kafetch(`${KAAL.getBase()}/BXContacts/_query`, {method: 'POST', body: {'name_2': ['~', searchValue]}}),
                    kafetch(`${KAAL.getBase()}/BXContacts/_query`, {method: 'POST', body: {'address': ['~', searchValue]}}),
                    kafetch(`${KAAL.getBase()}/BXContacts/_query`, {method: 'POST', body: {'city': ['~', searchValue]}}),
                    kafetch(`${KAAL.getBase()}/BXContacts/_query`, {method: 'POST', body: {'mail': ['~', searchValue]}}),
                    kafetch(`${KAAL.getBase()}/BXContacts/_query`, {method: 'POST', body: {'mail_second': ['~', searchValue]}})
                ])
            }
            return Promise.allSettled([
                kafetch(`${KAAL.getBase()}/BXContacts/`)
            ])
        })()
        .then(responses => {
            return responses.filter(response => response.status === 'fulfilled').map(response => response.value)
        })
        .then(results => {
            return results.map(result => result.data).flat().filter((contact, idx, array) => array.findIndex(c => contact.id === c.id) === idx)
        })
        .then(contacts => {
            window.requestAnimationFrame(() => {
                this.domNode.classList.remove('sending')
            })
            this.resultSet.querySelectorAll('div.contact').forEach(line => window.requestAnimationFrame(() => this.resultSet.removeChild(line)))
            contacts.every(contact => window.requestAnimationFrame(() => {
                this.resultSet.appendChild(this.renderLine(contact))
            }))
        })
        .catch(cause => {
            window.requestAnimationFrame(() => {
                this.domNode.classList.remove('sending')
            })
        })
    }, 100))
    this.resultSet = this.domNode.lastElementChild
}

UIKAContact.prototype.renderLine = function (contact) {
    const nodeLine = document.createElement('DIV')
    nodeLine.classList.add('contact')
    nodeLine.dataset.bexioId = contact.id

    let name = ''
    if (contact.contact_type_id === 1) {
        name = contact.name_1
    } else {
        name = [contact.name_1, contact.name_2].join(' ')
    }
    let address = ''
    if (contact.address) {
        address = [...contact.address.split("\n"), ' '].filter(e => e !== null && e !== '').shift()
    }

    const phone = [contact.phone_fixed, contact.phone_fixed_second, ' '].filter(e => e !== null && e !== '').shift()
    const mobile = [contact.phone_mobile, ' '].filter(e => e !== null && e !== '').shift()
    const locality = [contact.city, ' '].filter(e => e !== null && e !== '').shift()
    const npa = [contact.postcode, ' '].filter(e => e !== null && e !== '').shift()
    const email = [contact.mail, contact.mail_second, ' '].filter(e => e !== null && e !== '').shift()

    nodeLine.innerHTML = `
        <div class="name">${name}</div>
        <div class="name">${address}</div>
        <div class="name">${npa}</div>
        <div class="name">${locality}</div>
        <div class="name">${mobile}</div>
        <div class="name">${phone}</div>
        <div class="name">${email}</div>
    `
    nodeLine.addEventListener('click', event => {
        const id = event.currentTarget.dataset.bexioId
        const domNode = event.currentTarget.cloneNode(true)
        this.eventTarget.dispatchEvent(new CustomEvent('submit', {detail: {id, domNode}}))
        this.reset()
    })
    return nodeLine
}

UIKAContact.prototype.reset = function () {
    window.requestAnimationFrame(() => { 
        this.searchInput.value = ''
        this.resultSet.innerHTML = ''
    })
}

UIKAContact.prototype.addEventListener = function (type, listener, options) {
    switch(type) {
        default: return this.domNode.addEventListener(type, listener)
        case 'submit': return this.eventTarget.addEventListener(type, listener, options)
    }
}