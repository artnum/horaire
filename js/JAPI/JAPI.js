export class JAPI {
    constructor() {
        this.API = new PJApi()
        this.API.open(new URL('$', window.location).toString())
    }
}