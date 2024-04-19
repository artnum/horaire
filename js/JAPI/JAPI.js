export class JAPI {
    constructor() {
        if (JAPI.Instance === undefined) {
            this.API = new PJApi()
            this.API.open(new URL('$api', window.location).toString())
            JAPI.JAPI_Instance = this
        }
        return JAPI.JAPI_Instance
    }
}