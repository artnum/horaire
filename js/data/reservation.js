import Fetch from '../lib/Fetch.js'

const F = new Fetch(`Bearer ${localStorage.getItem('klogin-token')}`)

export default class KReservation {
    #endpoint
   
    constructor(endpoint) {
        this.#endpoint = endpoint
    }
    
    listActiveForUserBetween(user, begin, end) {
        return F.post(this.#endpoint + '/_query', {
            '#and': {
              target: user,
              deleted: '--',
              '#and': {
                dbegin: ['<=', end.toISOString().split('T')[0], 'str'],
                dend: ['>=', begin.toISOString().split('T')[0], 'str'],
              }
            }
        })
    }
}
