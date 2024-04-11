import { JAPI } from './JAPI.js'

export class ContactAPI extends JAPI {
    constructor() {
        super()
    }

    get (id) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                'Contact',
                'get', 
                {uid: id}
            )
            .then(contact => {
                return resolve(contact)
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    search (search) {
        return new Promise((resolve, reject) => {
            this.API.exec(
                'Contact',
                'search',
                {search: search}
            )
            .then(contacts => {
                return resolve(contacts)
            })
            .catch(err => {
                return reject(err)
            })
        })
    }

    list () {
        return new Promise((resolve, reject) => {
            this.API.exec(
                'Contact',
                'list',
                {}
            )
            .then(contacts => {
                return resolve(contacts)
            })
            .catch(err => {
                return reject(err)
            })
        })
    }


}