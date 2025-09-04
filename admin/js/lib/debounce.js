export default class Debounce {
    constructor (fn, delay) {
        this.timeout = null
        return function(...args) {
            if (this.timeout) { clearTimeout(this.timeout) }
            this.timeout = setTimeout(() => {
                fn.call(this, ...args)
                this.timeout = null
            }, delay)    
        }
    }
}