import { SContactStore, SAddrList, FContact } from './contact.js'

const HtmlForm = `<label for="c:person"><input type="radio" value="person" name="type" name="c:person" checked /> Personne</label>
<label for="c:organization"><input type="radio" value="organization" name="type" name="c:organization" /> Organisation</label><br />
<label for="c:displayname">Nom à afficher</label><input type="text" name="c:displayname" /><span class="notice">Nom servant à identifier l'adresse sans en avoir les détails sous les yeux</span><br />
<label for="c:sn">Nom</label><input type="text" name="c:sn" /><label for="c:givenname">Prénom</label><input type="text" name="c:givenname" /><br />
<label for="c:o">Organisation</label><input type="text" name="c:o"><br />
<label for="c:postaladdress">Addresse</label><textarea name="c:postaladdress"></textarea><br />
<label for="c:postalcode">Code postal</label><input type="text" name="c:postalcode">
<label for="c:l">Localité</label><input type="text" name="c:l"><br />
<label for="c:telephonenumber">Téléphone</label><input type="text" name="c:telephonenumber"><span class="addMore"></span><br />
<label for="c:mobile">Mobile</label><input type="text" name="c:mobile"><span class="addMore"></span><br />
<label for="c:mail">E-mail</label><input type="text" name="c:mail"><span class="addMore"></span><br />
<button type="button" name="save">Enregistrer</button><button type="button" name="reset">Annuler</button><br />`

export class Address {
    constructor(node, options = { displayName: 'c:displayname', contactStore: '../Contact/' }) {
        this.options = options
        this.contactStore = new SContactStore(this.options.contactStore)
        if (node) {
            this.placeAt(node)
        }
    }

    reset () {
        let nodes = [...this.domNode.getElementsByTagName('INPUT'), ...this.domNode.getElementsByTagName('TEXTAREA')]
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].value !== undefined) { nodes[i].value = '' }
            window.requestAnimationFrame(() => {
                nodes[i].classList.remove('modified')
            })
        }
        delete this.domNode.dataset.id
    }

    save () {
        let body = {}
        let nodes = [...this.domNode.getElementsByTagName('INPUT'), ...this.domNode.getElementsByTagName('TEXTAREA')]
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].value === undefined) { continue }
            if (nodes[i].dataset.value === undefined) { nodes[i].dataset.value = '' }
            if (nodes[i].dataset.value !== nodes[i].value) {
                let name = nodes[i].getAttribute('name')
                if (name.indexOf('c:') === 0) {
                    name = name.split(':', 2)[1]
                    body[name] = nodes[i].value
                }
            }
        }
        console.log(body)
    }


    placeAt(node) {
        this.domNode = node
        let place = new Promise((resolve, reject) => {
            window.requestAnimationFrame(() => { node.innerHTML += HtmlForm; resolve() })
        })
        place.then(() => {
            let buttons = this.domNode.getElementsByTagName('BUTTON')
            console.log(buttons);
            for (let i = 0; i < buttons.length; i++) {
                switch(buttons[i].getAttribute('name')) {
                    case 'save': buttons[i].addEventListener('click', event => { this.save() }); break
                    case 'reset': buttons[i].addEventListener('click', event => { this.reset() }) ; break
                }
            }
            let nodes = this.domNode.getElementsByTagName('INPUT')
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].getAttribute('name') === this.options.displayName) {
                    this.displayName = nodes[i]
                    break
                }
            }
            this.domNode.addEventListener('change', (event) => {
                const node = event.target
                if (node.dataset.value !== node.value) {
                    node.classList.add('modified')
                } else {
                    node.classList.remove('modified')
                }
            })
            this.domNode.addEventListener('click', (event) => {
                if (event.target.classList.contains('addMore')) {
                    this.addMoreFrom(event.target)
                }
            })
            this.SAddr = new SAddrList(this.displayName)
            this.SAddr.addEventListener('select', (event) => {
                const contact = event.detail.object
                let fcontact = new FContact(this.domNode, 'c')
                fcontact.clear()
                fcontact.apply(contact)
            })
            this.keyupDisable = false
            this.displayName.addEventListener('keyup', (event) => {
                if (this.keyupDisable) {
                    this.keyupDisable = false
                    return
                }
                if (event.target.value.length > 0) {
                    this.searchAddress(event.target.value)
                }
            })
            this.displayName.addEventListener('keydown', (event) => {
                switch (event.key.toLowerCase()) {
                    case 'backspace':
                        if (event.target.value.length === 0) {
                            this.SAddr.hide()
                            let f = new FContact(document.getElementById('client'), 'c')
                            f.clear()
                        }
                        break
                    case 'tab':
                    case 'escape':
                        this.SAddr.hide()
                        this.keyupDisable = true
                        break
                    case 'arrowdown':

                        break
                    case 'arrowup':

                        break
                }
            })

        })
    }

    addMoreFrom(node) {
        const previous = node.previousElementSibling
        if (previous) {
            const node = previous.cloneNode(true)
            node.value = ''
            node.dataset.value = ''
            let id = /^([0-9a-zA-Z.:-_,;+]*)\[([0-9]+)\]$/.exec(node.id)
            if (id) {
                node.id = `${id[1]}[${parseInt(id[2]) + 1}]`
            } else {
                node.id = `${previous.id}[1]`
                previous.id = `${previous.id}[0]`
            }
            previous.parentNode.insertBefore(node, previous.nextSibling)
        }
    }

    searchAddress(value) {
        this.contactStore.search(event.target.value)
            .then((list) => {
                this.SAddr.showList(list)
            })
    }

    setAddressId (id) {
        if (id) {
            this.contactStore.get(id).then(json => {
                if (json) {
                    let c = new FContact(this.domNode, 'c')
                    c.clear()
                    c.apply(json)
                }
            })
        }
    }

    update () {
        this.SAddr.popper.update()
    }
}