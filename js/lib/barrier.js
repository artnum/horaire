export class Barrier {
    /* maxInstanceTime is in second */
    constructor (name, maxInstanceTime = 30) {
        if (Barrier.instances === undefined) {
            Barrier.instances = {}
        }
        if (Barrier.instances[name] === undefined) {
            this.name = name
            this.waiters = []
            this.released = false
            this.maxInstanceTime = maxInstanceTime * 1000
            Barrier.instances[name] = this
        }
        return Barrier.instances[name]

    }

    register () {
        if (this.released) {
            return Promise.resolve()
        }
        return new Promise((resolve, reject) => {
            this.waiters.push(resolve)
        })
    }

    release () {
        this.waiters.forEach(waiter => {
            waiter()
        })
        this.waiters = []
        this.released = true
    
        setTimeout(() => {
            delete Barrier.instances[this.name]
        }, this.maxInstanceTime)
    }
}