import { PJApi } from './$script/vendor/pjAPI/src/pjapi.mjs'

export class JAPI {
    constructor() {
        this.API = PJApi.instance
        this.API.open(
            new URL('$api', window.location).toString(),
            80,
            {
                'Authorization': `Bearer ${localStorage.getItem('klogin-token')}`
            }
        )
    }
}