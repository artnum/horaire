import DataAPI from '../DataAPI.js'
import { JAPI } from './$script/src/JAPI/JAPI.js'

export class AccessDeniedError extends Error {
  constructor() {
    super('Access denied')
    this.name = 'AccessDeniedError'
  }
}

const NS = 'Access'

const TIMEOUT = 5000
export class AccessAPI extends JAPI {
  constructor(timeout = 0) {
    super()
    this.timeout = timeout === 0 ? TIMEOUT : timeout
  }

  static get NS() {
    return NS
  }

  setUserRoles(userid, roles) {
    return this.API.exec(
      AccessAPI.NS,
      'setUserRoles',
      { userid, roles }
    )
  }

  getUserRoles(userid) {
    return this.API.exec(
      AccessAPI.NS,
      'getUserRoles',
      { userid }
    )
  }
  getRoles() {
    return this.API.exec(
      AccessAPI.NS,
      'getRoles'
    )
  }


  can(ns, fn) {
    return Promise.race([
      this.API.exec(
        AccessAPI.NS,
        'can',
        { ns: ns, function: fn }
      ),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Access check timeout')), this.timeout)
      })
    ])
      .then(r => {
        if (!r.result) {
          throw new AccessDeniedError()
        }
      })
  }

  getDataAPI() {
    const api = this
    return new class extends DataAPI {
      list() {
        return new Promise((resolve, reject) => {
          api.getRoles()
            .then(roles => {
              const items = []
              let i = 0;
              for (const key in roles) {
                items.push({
                  name: roles[key].name,
                  id: key,
                  help: roles[key].help ? roles[key].help : '',
                  infer: roles[key].infer ? roles[key].infer : '',
                  order: ++i
                })
              }
              resolve(items)
            })
            .catch(e => reject(e))
        })
      }
    }
  }
}
