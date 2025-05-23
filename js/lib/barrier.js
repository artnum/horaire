export class Barrier {
    constructor (name) {
        if (Barrier.instances === undefined) {
            Barrier.instances = {}
        }
        if (Barrier.instances[name] === undefined) {
            this.name = name
            this.waiters = []
            this.released = false
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
    }
}