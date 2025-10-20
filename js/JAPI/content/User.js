import { JAPI, JAPIIterator } from '../JAPI.js' //'./$script/src/JAPI/JAPI.js'
import SchemaModel from '../SchemaModel.js'
import UserKeyOpt from './UserKeyOpt.js'
import UserChildData from './UserChildData.js'
import DataAPI from '../DataAPI.js'
import { UserPersonnalData } from './UserPersonnalData.js'
import Address from '../content/Address.js'

const NS = 'User'
const listSize = 20

export class UserPrice extends SchemaModel {
  static schema = {
    id: [SchemaModel.toString, ''],
    validity: [SchemaModel.toDate, () => new Date()],
    value: [SchemaModel.toFloat, 0.0],
    person: [SchemaModel.toString, ''],
  }
}

export class UserInvitation extends SchemaModel {
  static schema = {
    invitation: [SchemaModel.toBase64, ''],
  }
}

export class User extends SchemaModel {
  static schema = {
    id: [SchemaModel.toString, ''],
    name: [SchemaModel.toString, ''],
    username: [SchemaModel.toString, ''],
    level: [SchemaModel.toInteger, 0],
    keyopt: [
      (val) => new UserKeyOpt(val),
      () => new UserKeyOpt(UserKeyOpt.createDefaults()),
    ],
    deleted: [SchemaModel.toInteger, 0],
    created: [SchemaModel.toInteger, 0],
    modified: [SchemaModel.toInteger, 0],
    disabled: [SchemaModel.toBoolean, false],
    efficiency: [SchemaModel.toFloat, 1.0],
    order: [SchemaModel.toInteger, 0],
    workday: [SchemaModel.toString, ''],
    extid: [SchemaModel.toString, ''],
    childs: [
      (val) =>
        Array.isArray ? val.map((item) => new UserChildData(item)) : [],
      [],
    ],
  }
}

export class UserAPI extends JAPI {
  constructor() {
    super()
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new UserAPI()
    }
    return this.instance
  }

  static get NS() {
    return NS
  }

  delete(userid) {
    return this.API.exec(UserAPI.NS, 'delete', { id: userid })
  }

  set(user) {
    return this.API.exec(UserAPI.NS, 'set', { user }).then(
      (user) => new User(user),
    )
  }

  activate(userid) {
    return this.API.exec(UserAPI.NS, 'setActiveState', {
      userid,
      active: true,
    }).then((user) => new User(user))
  }

  deactivate(userid) {
    return this.API.exec(UserAPI.NS, 'setActiveState', {
      userid,
      active: false,
    }).then((user) => new User(user))
  }

  setPersonnalData(pdata) {
    return this.API.exec(UserAPI.NS, 'setPersonnalData', {
      personnalData: pdata,
    }).then((pdata) => new UserPersonnalData(pdata))
  }

  getPersonnalData(user) {
    return this.API.exec(UserAPI.NS, 'getPersonnalData', {
      id: typeof user === 'object' ? user.id : user,
    }).then((pdata) => new UserPersonnalData(pdata))
  }

  getPersonnalAddresses(user) {
    return this.API.exec(UserAPI.NS, 'getPersonnalAddresses', { id: user })
  }
  /**
   * @param {Object|Number|String} user
   * @param {Array} addresses
   */
  setPersonnalAddresses(user, addresses) {
    return this.API.exec(UserAPI.NS, 'setPersonnalAddresses', {
      id: user,
      addresses,
    })
  }

  deletePersonnalAddresses(user, deletedAddress) {
    return this.API.exec(UserAPI.NS, 'deletePersonnalAddresses', {
      id: user,
      addresses: deletedAddress,
    })
  }

  list() {
    return this.API.exec(UserAPI.NS, 'list').then((users) =>
      users.map((user) => new User(user)),
    )
  }

  /**
   * @param id {string}
   */
  get(id) {
    return this.API.exec(UserAPI.NS, 'get', { id }).then(
      (user) => new User(user),
    )
  }

  getSelf() {
    return this.API.exec(UserAPI.NS, 'getSelf').then((user) => new User(user))
  }

  /**
   * @param visible {Array}
   * @param hidden {Array}
   */
  reorder(visible, hidden) {
    return this.API.exec(UserAPI.NS, 'reorder', { visible, hidden })
  }

  /**
   * @param userid {string}
   */
  listPrice(userid) {
    return this.API.exec(UserAPI.NS, 'listPrice', { price: userid }).then(
      (prices) => prices.map((price) => new UserPrice(price)),
    )
  }

  /**
   * @param priceid {string}
   */
  deletePrice(priceid) {
    return this.API.exec(UserAPI.NS, 'deletePrice', { id: priceid })
  }

  /**
   * @param price {object}
   */
  setPrice(price) {
    return this.API.exec(UserAPI.NS, 'setPrice', price)
  }

  setPricing(userid, prices) {
    return this.API.exec(UserAPI.NS, 'setPricing', {
      user: userid,
      prices: prices,
    })
  }

  getInvitations(id) {
    return this.API.exec(UserAPI.NS, 'getInvitations', { userid: id })
  }

  generateInvitation(id) {
    return this.API.exec(UserAPI.NS, 'newInvitation', { userid: id })
  }

  deleteInvitation(userid, invitation) {
    return this.API.exec(UserAPI.NS, 'deleteInvitation', {
      userid,
      invitation,
    })
  }

  setCivilStatuses(userid, statuses) {
    return this.API.exec(UserAPI.NS, 'setCivilStatuses', {
      userid,
      statuses,
    })
  }
  listCivilStatuses(userid) {
    return this.API.exec(UserAPI.NS, 'listCivilStatuses', { userid })
  }

  /**
   * @return DataAPI
   */
  getDataAPI() {
    const api = this
    return new (class extends DataAPI {
      list() {
        return api.list()
      }
    })()
  }
}
