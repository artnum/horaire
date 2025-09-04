import { JAPI } from './JAPI.js'


class CommunicationEndpoint {
    constructor (commEndpoint = {})
    {
        const {
            id = '',
            priority = '',
            name = '',
            type = '',
            value = ''
        } = commEndpoint

        Object.assign(this, {
            id: String(id),
            priority: parseInt(priority, 10) || 0,
            name,
            type,
            value
        })
    }

    toJSON () {
        return {
            id: this.id,
            priority: this.priority,
            name: this.name,
            type: this.type,
            value: this.value
        }
    }
}

class PhysicalAddress {
    constructor(address = {}) {
        const {
            id = '',
            priority = '',
            line1 = '',
            line2 = '',
            postal_code: postalCode = '',
            locality = '',
            country = '',
            house_number: houseNumber = ''
        } = address;

        Object.assign(this, {
            id: String(id),
            priority: parseInt(priority, 10) || 0,
            line1,
            line2,
            postalCode,
            locality,
            country,
            houseNumber
        });
    }

    toJSON() {
        const { postalCode, houseNumber, ...rest } = this;
        return {
            ...rest,
            postal_code: postalCode,
            house_number: houseNumber
        };
    }
}

class Contact {
    constructor(API, contact) {
        this.API = API
        this.bridgeId = String(contact.bridge_id)
        this.source = String(contact.source)
        this.CommunicationEndpoints = []
        this.physicalAddresses = []

        switch(this.source) {
            case 'bexio':   contact = Contact.bexioContact(contact);    break
            case 'ldap':    contact = Contact.ldapContact(contact);     break
        }
        this.id = String(contact.id)

        if (contact.physical_addresses) {
            if (Array.isArray()) {
                this.physicalAddresses = contact.physical_addresses
                    .map(a => new PhysicalAddress(a))
                    .sort((a, b) => a.priority - b.priority)
            } else {
                this.physicalAddresses = [new PhysicalAddress(contact.physical_addresses)]
            }
        }

        if (contact.communication_endpoints) {
            if (Array.isArray(contact.communication_endpoints)) {
                this.CommunicationEndpoints = contact.communication_endpoints
                    .map(c => new CommunicationEndpoint(c))
                    .sort((a, b) => a.priority - b.priority)
            } else {
                this.CommunicationEndpoints = [new CommunicationEndpoint(contact.communication_endpoints)]
            }
        }
    }

    static bexioContact (contact) 
    {
        return {
            id: contact.id,
            type: parseInt(contact_type_id, 10) === 1 ? 'legalperson' : 'naturalperson',
            physical_addresses: [
                {
                    priority: 1,
                    line1: contact.address ?? '',
                    line2: '',
                    postal_code: contact.postcode ?? '',
                    locality: contact.city ?? '',
                    country: contact.country ?? '',
                    house_number: ''
                }
            ],
            communication_endpoints: [
                {id: '', type: 'mail', priority: 1, name: 'Email principal', value: contact.mail ?? ''},
                {id: '', type: 'mail', priority: 10, name: 'Email secondaire', value: contact.mail_second ?? ''},
                {id: '', type: 'landline', priority: 1, name: 'Téléhphone principal', value: contact.phone_fixed ?? ''},
                {id: '', type: 'landline', priority: 10, name: 'Téléhphone secondaire', value: contact.phone_fixed_second ?? ''},
                {id: '', type: 'mobile', priority: 1, name: 'Mobile', value: contact.phone_mobile ?? ''},
                {id: '', type: 'fax', priority: 1, name: 'Fax', value: contact.fax ?? ''},
                {id: '', type: 'skype', priority: 1, name: 'Skype', value: contact.skype_name ?? ''},
                {id: '', type: 'www', priority: 1, name: 'Site web', value: contact.url ?? ''}
            ]
        }
    }

    static ldapContact (contact)
    {

        commEndpoint = []

        if (contact.telephonenumber) {
            if (!Array.isArray(contact.telephonenumber)) {
                contact.telephonenumber = [contact.telephonenumber]
            }
            
            contact.telephonenumber.forEach((t, index) => 
                commEndpoint.push({id: '', type: 'landline', priority: index + 1, name: 'Téléphone', value: t ?? ''})
            )
        }

        if (contact.mobile) {
            if (!Array.isArray(contact.mobile)) {
                contact.mobile = [contact.mobile]
            }
            contact.mobile.forEach((t, index) => {
                commEndpoint.push({id: '', type: 'mobile', priority: index + 1, name: 'Mobile', value: t ?? ''})
            })
        }

        if (contact.labeleduri) {
            if (!Array.isArray(contact.labeleduri)) {
                contact.labeleduri = [contact.labeleduri]
            }
            contact.labeleduri.forEach((t, index) => {
                commEndpoint.push({id: '', type: 'www', priority: index + 1, name: 'Site web', value: t ?? ''})
            })
        }

        if (contact.mail) {
            if (!Array.isArray(contact.mail)) {
                contact.mail = [contact.mail]
            }

            contact.mail.forEach((t, index) => {
                commEndpoint.push({id: '', type: 'mail', priority: index + 1, name: 'Email', value: t ?? ''})
            })
        }

        return {
            id: contact.IDent,
            type: String(contact.type) === 'organization' ? 'legalperson' : 'naturalperson',
            physical_addresses: [
                {
                    priority: 1,
                    line1: contact.postaladdress ?? '',
                    line2: '',
                    postal_code: contact.postalcode ?? '',
                    locality: contact.l ?? '',
                    country: contact.c ?? '',
                    house_number: ''
                }
            ],
            communication_endpoints: [
            ]
        }
    }

}

export class ContactAPI extends JAPI {
    constructor() {
        super()
    }

    createType(name) {
        return this.API.exec(
            'Contact',
            'createType',
            { name: name }
        )
    }

    listType() {
        return this.API.exec(
            'Contact',
            'listType',
            {}
        )
    }

    create(data) {
        return this.API.exec(
            'Contact',
            'create',
            data
        )
            .then(contact => new Contact(this, contact))
    }

    get(id) {
        return this.API.exec(
            'Contact',
            'get',
            { uid: id }
        )
            .then(contact => new Contact(this, contact))

    }

    search(search) {
        return this.API.exec(
            'Contact',
            'search',
            { search: search }
        )
            .then(contacts => contacts.map(contact => new Contact(this, contact)))
    }

    list() {
        return this.API.exec(
            'Contact',
            'list',
            {}
        )
            .then(contacts => contacts.map(contact => new Contact(this, contact)))
    }
}