import { SContactStore, SAddrList, FContact } from './contact.js'

const HtmlForm = `<label><input type="radio" value="person" name="c:type" checked /> Personne</label>
<label><input type="radio" value="organization" name="c:type" /> Organisation</label><br />
<label for="c:displayname">Nom à afficher</label><input type="text" name="c:displayname" /><br />
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
            let type = nodes[i].getAttribute('type')
            if (nodes[i].dataset.cloned) { nodes[i].parentNode.removeChild(nodes[i]); continue }
            if (type) { type = type.toLowerCase() }
            if (nodes[i].disabled !== undefined) { nodes[i].disabled = false }
            switch(type) {
                case 'radio':
                case 'checkbox':
                    nodes[i].dataset.value = ''
                    break
                default:
                    if (nodes[i].value !== undefined) { nodes[i].value = '' }
                    delete nodes[i].dataset.value
                    window.requestAnimationFrame(() => {
                        nodes[i].classList.remove('modified')
                    })
                    break
            }
        }
        delete this.domNode.dataset.id
    }

    save () {
        let cntBodyElement = {}
        let bodyOrig = {}
        let bodyCurr = {}
        let nodes = [...this.domNode.getElementsByTagName('INPUT'), ...this.domNode.getElementsByTagName('TEXTAREA')]
        for (let i = 0; i < nodes.length; i++) {
            let name = nodes[i].getAttribute('name')
            if (name === undefined) { continue }
            if (name.indexOf('c:') !== 0) { continue }
            name = name.split(':', 2)[1]
            if (cntBodyElement[name] === undefined) {
                cntBodyElement[name] = 0
            }
            switch(nodes[i].getAttribute('type')) {
                case 'radio':
                    if (nodes[i].checked) {
                        if (nodes[i].value !== nodes[i].dataset.value) {
                            bodyCurr[name] = nodes[i].value
                            bodyOrig[name] = nodes[i].dataset.value                        }
                    }
                    break
                default:
                    if (nodes[i].value === undefined) { continue }
                    if (nodes[i].dataset.value === undefined) { nodes[i].dataset.value = '' }

                    if (cntBodyElement[name] === 0) {
                        bodyCurr[name] = nodes[i].value
                        bodyOrig[name] = nodes[i].dataset.value
                    } else if (cntBodyElement[name] === 1) {
                        bodyCurr[name] = [bodyCurr[name], nodes[i].value]
                        bodyOrig[name] = [bodyOrig[name], nodes[i].dataset.value]
                    } else {
                        bodyCurr[name].push(nodes[i].value)
                        bodyOrig[name].push(nodes[i].dataset.value)
                    }
                    cntBodyElement[name]++
                    break
            }
                    
        }
        let mod = {}
        for (let k in bodyOrig) {
            if (Array.isArray(bodyOrig[k])) {
                for (let i = 0; i < bodyOrig[k].length; i++) {
                    if (bodyOrig[k][i] !== bodyCurr[k][i]) {
                        mod[k] =bodyCurr[k]
                        break
                    }
                }
            } else {
                if (bodyCurr[k] !== bodyOrig[k]) {
                    mod[k] = bodyCurr[k]
                }
            }
        }

        for(let k in mod) {
            if (Array.isArray(mod[k])) {
                let out = []
                for (let i = 0; i < mod[k].length; i++) {
                    if (mod[k][i] !== '') {
                        out.push(mod[k][i])
                    }
                }
                mod[k] = out
            } else {
                if (mod[k] === '') {
                    delete mod[k]
                    mod[`-${k}`] = '1'
                }
            }
        }

        if (this.domNode.dataset.id) {
            mod['IDent'] = this.domNode.dataset.id
            this.contactStore.update(this.domNode.dataset.id, mod).then(success => {
                if (success) {
                    this.setAddressId(mod['IDent'])
                }
            })
        } else {
            if (mod.type === 'person' && !mod.cn) {
                mod.cn = mod.displayname
            }
            this.contactStore.create(mod).then(id => {
                if (id) {
                    this.setAddressId(id)
                }
            })
        }       
    }


    placeAt(node) {
        this.domNode = node
        let place = new Promise((resolve, reject) => {
            window.requestAnimationFrame(() => { node.innerHTML += HtmlForm; resolve() })
        })
        place.then(() => {
            let buttons = this.domNode.getElementsByTagName('BUTTON')
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
                this.reset()
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