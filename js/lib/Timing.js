export default class Timing {
    static throttle (fn, delay) {
        let timeout = null
        return function(...args) {
            if (timeout) { return }
            timeout = setTimeout(() => {
                fn.call(this, ...args)
                timeout = null
            }, delay)
        }
    }

    static debounce (fn, delay) {
        let timeout = null
        return function(...args) {
            if (timeout) { clearTimeout(timeout) }
            timeout = setTimeout(() => {
                fn.call(this, ...args)
                timeout = null
            }, delay)    
        }
    }
}

