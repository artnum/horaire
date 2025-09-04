import { AccessDeniedError } from "./content/Access"

export default class Privilege {
  constructor(accessAPI) {
    this.accessAPI = accessAPI
    this.cache = new Map()
  }

  clear() {
    this.cache.clear()
  }

  canAllNS(ns, operations) {
    return Promise.all(operations.map(op => this.can(ns, op)))
  }

  canAll(operations) {
    return Promise.all(operations.map(({ ns, op }) => this.can(ns, op)))
  }

  /**
   * @param namespace {String|object}
   * @param operation {String}
   */
  can(namespace, operation) {
    return new Promise((resolve, reject) => {
      if (typeof namespace !== 'string') {
        namespace = namespace.constructor.NS
      }
      const key = `${namespace}:${operation}`
      if (this.cache.has(key)) {
        if (this.cache.get(key)) {
          resolve()
        } else {
          reject(new AccessDeniedError())
        }
      }

      this.accessAPI.can(namespace, operation)
        .then(_ => {
          this.cache.set(key, true)
          return resolve()
        })
        .catch(e => {
          if (e instanceof AccessDeniedError) {
            this.cache.set(key, false)
          }
          reject(e)
        })
    })
  }

  /**
   * Execute action that are allowed by the server
   */
  execute(instance, operation, ...params) {
    return this.can(instance.constructor.NS, operation)
      .then(_ => {
        return instance[operation](...params)
      })
      .catch(e => {
        if (e instanceof AccessDeniedError) {
          return Promise.resolve()
        }
        return Promise.reject(e)
      })
  }


}
