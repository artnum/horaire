import Debounce from "./$script/admin/lib/debounce.js"
import Popup from './$script/src/lib/popup.js'

export default class List {
    constructor(attachNode) {
        if (!attachNode || !(attachNode instanceof HTMLElement)) {
            throw new Error('Invalid attach point')
        }
        this.attachNode = attachNode
        this.attachNode.addEventListener('keyup', new Debounce(event => {
            this.runSearch(this.attachNode.value)
        }, 150))

    }

    runSearch (value)
    {
        if (!value || value.length <= 0 || value === '') {
            if (this.popup) {
                this.popup.hide()
            }
            return
        }
        if (this.abortController) {
            this.abortController.abort()
        }
        this.abortController = new AbortController()
        return Promise.allSettled([
            kafetch(`${KAAL.getBase()}/BXContacts/_query`, { method: 'POST', body: { 'name_1': ['~', value] }, signal: this.abortController.signal}),
            kafetch(`${KAAL.getBase()}/BXContacts/_query`, { method: 'POST', body: { 'name_2': ['~', value] }, signal: this.abortController.signal}),
            kafetch(`${KAAL.getBase()}/BXContacts/_query`, { method: 'POST', body: { 'address': ['~', value] }, signal: this.abortController.signal}),
            kafetch(`${KAAL.getBase()}/BXContacts/_query`, { method: 'POST', body: { 'city': ['~', value] }, signal: this.abortController.signal}),
            kafetch(`${KAAL.getBase()}/BXContacts/_query`, { method: 'POST', body: { 'mail': ['~', value] }, signal: this.abortController.signal}),
            kafetch(`${KAAL.getBase()}/BXContacts/_query`, { method: 'POST', body: { 'mail_second': ['~', value] }, signal: this.abortController.signal})
        ])
        .then(responses => {
            return responses.filter(response => response.status === 'fulfilled' && response.value.length > 0)
                .map(response => response.value.data)
                .flat()
                .filter((item, index, self) => index === self.findIndex(t => t.id === item.id))
                .map(contact => this.renderLine(contact))
                
        })
        .then(responses => {
            this.abortController = null
            if (this.popupNode) {
                this.popupNode.innerHTML = ''
            } else {
                this.popupNode = document.createElement('DIV')
                this.popupNode.classList.add('ka-contact-list')
                this.popupNode.addEventListener('click', event => {
                    let node = event.target
                    while(node && !node.classList.contains('contact')) node = node.parentNode
                    if (!node) return

                    this.select(node)
                    this.popupNode.remove()
                })
            }
 
            responses.forEach(e => this.popupNode.appendChild(e))
            if (!this.popup) {
                this.popup = new Popup(this.popupNode)
            }
            this.popup.show(this.attachNode)
        })
        .catch(e => {
            console.log(e)
        })
    }

    init () {

    }

    select(node) {
        const entry = JSON.parse(node.dataset.content)
        this.attachNode.value = `${entry.name} - ${entry.locality}`
        let valueNode = this.attachNode.querySelector('input[name="contactid"]')
        if (!valueNode) {
            valueNode = document.createElement('INPUT')
            valueNode.type = 'hidden'
            valueNode.name = 'contactid'
            this.attachNode.parentNode.appendChild(valueNode)
        }
        valueNode.value = entry.bridge_id
    }

    renderLine(contact) {
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

        nodeLine.id = `contact-${contact.id}`
        nodeLine.dataset.id = contact.id
        nodeLine.dataset.content = JSON.stringify(
            {name: name, locality: locality, id: contact.id, source: contact.source, bridge_id: contact.bridge_id}
        )
        nodeLine.innerHTML = `
            <div class="name">${name}</div>
            <div class="address">${address}</div>
            <div class="postalcode">${npa}</div>
            <div class="locality">${locality}</div>
            <div class="mobile">${mobile}</div>
            <div class="phone">${phone}</div>
            <div class="email">${email}</div>
        `
        return nodeLine
    }
    reset() {
        window.requestAnimationFrame(() => {
            this.searchInput.value = ''
            this.resultSet.innerHTML = ''
        })
    }
    addEventListener(type, listener, options) {
        switch (type) {
            default: return this.domNode.addEventListener(type, listener)
            case 'submit': return this.eventTarget.addEventListener(type, listener, options)
        }
    }
}



