function UIKAContactForm () {
    this.id = null
    this.type = 1
    this.fieldMapping = [
        ['company', 'name_1'],
        ['lastname', 'name_1'],
        ['complement', 'name_2'],
        ['firstname', 'name_2'],
        ['civility', 'salutation_id', 'int'],
        ['title', 'title_id', 'int'],
        ['address', 'address'],
        ['npa', 'postcode'],
        ['locality', 'city'],
        ['country', 'country_id', 'int'],
        ['email', 'mail'],
        ['email2', 'mail_second'],
        ['phone', 'phone_fixed'],
        ['phone2', 'phone_fixed_second'],
        ['mobile', 'phone_mobile'],
        ['fax', 'fax'],
        ['website', 'url'],
        ['skype', 'skype_name'],
        ['interlocutor', 'user_id', 'int'],
        ['owner', 'owner_id', 'int']
    ]
    this.domNode = document.createElement('FORM')
    this.domNode.classList.add('ka-contact-form')
    this.domNode.innerHTML = `
        <fieldset class="company"><legend>Donnée de base</legend>
            <label for="type"></label>
            <div class="company">
            <label for="company">Entreprise</label><input name="company"></input>
            <label for="complement">Complément</label><input name="complement"></input>
            </div>
            <div class="person">
            <label for="civility">Civilité</label><input name="civility"></input>
            <label for="title">Titre</label><input name="title"></input>
            <label for="lastname">Nom</label><input name="lastname"></input
            <label for="firstname">Prénom</label><input name="firstname"></input>
            </div>
            <label for="address">Adresse</label><textarea name="address"></textarea>
            <label for="npa">NPA</label><input type="text" name="npa"></input>
            <label for="locality">Localité</label><input type="text" name="locality"></input>
            <label for="country">Pays</label><input type="text" name="country" value="1"></input>
        </fieldset>
        <fieldset><legend>Communication</legend>
            <label for="email">E-mail</label><input name="email" type="text"></input>
            <label for="email2">E-mail 2</label><input name="email2" type="text"></input>
            <label for="phone">Téléphone</label><input name="phone" type="text"></input>
            <label for="phone2">Téléhpone 2</label><input name="phone2" type="text"></input>
            <label for="mobile">Mobile</label><input name="mobile" type="text"></input>
            <label for="fax">Fax</label><input name="fax" type="text"></input>
            <label for="website">Site web</label><input name="website" type="text"></input>
            <label for="skype">Skype</label><input name="skype" type="text"></input>
        </fieldset>
        <fieldset><legend>Information supplémentaires</legend>
            <label for="interlocutor">Interlocuteur</label><input type="text" name="interlocutor" value="1"></input>
            <label for="owner">Propriétaire</label><input type="text" name="owner" value="1"></input>
        </fieldset>
        <button type="submit">Enregistrer</button>
        <button type="reset">Annuler</button>
    `

    this.typeNode = this.domNode.querySelector('label[for="type"]')
    const typeButtons = [
        new KAButton('Entreprise', {group: 'type', selected: true}),
        new KAButton('Personne', {group: 'type'})
    ]

    this.kabuttonInstance = typeButtons
    this.kselectInstance = [
        new KSelectUI(this.domNode.querySelector('input[name="country"]'), new BXCountryStore(), { realSelect: true, allowFreeText: false }),
        new KSelectUI(this.domNode.querySelector('input[name="interlocutor"]'), new BXUserStore(), { realSelect: true, allowFreeText: false }),
        new KSelectUI(this.domNode.querySelector('input[name="owner"]'), new BXUserStore(), { realSelect: true, allowFreeText: false }),
        new KSelectUI(
            this.domNode.querySelector('input[name="civility"]'),
            new BXROGenericStore('BXSalutation', {idName: 'id', name: 'name'}), 
            { realSelect: true, allowFreeText: false }
        ),
        new KSelectUI(
            this.domNode.querySelector('input[name="title"]'),
            new BXROGenericStore('BXTitle', {idName: 'id', name: 'name'}), 
            { realSelect: true, allowFreeText: false }
        )
    ]

    this.typeNode.appendChild(typeButtons[0])
    this.typeNode.appendChild(typeButtons[1])

    typeButtons[0].addEventListener('submit', _ => {
        this.type = 1
        window.requestAnimationFrame(() => {
            this.domNode.firstElementChild.classList.remove('person')
            this.domNode.firstElementChild.classList.add('company')
        })
    })
    typeButtons[1].addEventListener('submit', _ => {
        this.type = 2
        window.requestAnimationFrame(() => {
            this.domNode.firstElementChild.classList.add('person')
            this.domNode.firstElementChild.classList.remove('company')
        })
    })

    this.domNode.addEventListener('submit', event => {
        event.preventDefault()
        window.requestAnimationFrame(() => {
            this.domNode.classList.add('sending')
        })
        const data = this.get()
        ; (() => {
            if (this.id === null) {
                /* CREATE */
                return kafetch2(`${KAAL.getBase()}/BXContacts`, {method: 'POST', body: data})
            } else {
                /* UPDATE */
                return kafetch2(`${KAAL.getBase()}/BXContacts/${this.id}`, {method: 'POST', body: data})
            }
        })()
        .then(response => {
            window.requestAnimationFrame(() => {
                this.domNode.classList.remove('sending')
            })
            if (response.length !== 1) {
                throw new Error(response.messsage)
            }
        })
        .catch(cause => {
            console.log(cause)
        })

    })
}

UIKAContactForm.prototype.get = function () {
    const formData = {contact_type_id: this.type}

    const fields = [
        ...this.domNode.querySelectorAll('input'), 
        ...this.domNode.querySelectorAll('textarea'),
        ...this.domNode.querySelectorAll('select')
    ]

    fields.forEach(field => {
        const name = field.name
        if (name === undefined) { return }

        if (this.type === 1 && ['firstname', 'lastname'].includes(name)) { return }
        if (this.type === 2 && ['company', 'complement'].includes(name)) { return }

        let value = field.value
        if (field.dataset.value) { value = field.dataset.value }
        if (value === undefined) { return }

        const map = this.fieldMapping.find(e => e[0] === name)
        console.log(map, name)
        if (!map) { return }

        if (!map[2]) { formData[map[1]] = value; return }
        switch(map[2]) {
            default: formData[map[1]] = value; return
            case 'int':
                value = parseInt(value)
                if (isNaN(value)) { return }
                formData[map[1]] = value
                return
        }
    })
    return formData
}

UIKAContactForm.prototype.load = function (contactId)
{
    return new Promise((resolve, reject) => {

    })
}