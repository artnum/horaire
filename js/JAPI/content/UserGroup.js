import { JAPI } from '../JAPI.js'
import SchemaModel from "../SchemaModel.js"
import DataAPI from "../DataAPI.js"
const NS = "UserGroup"


export class UserGroup extends SchemaModel {
  static schema = {
    id: [SchemaModel.toString, ''],
    name: [SchemaModel.toString, ''],
    description: [SchemaModel.toString, ''],
    help: [SchemaModel.toString, ''],
  }
}

export class UserGroupAPI extends JAPI {
  constructor() {
    super()
  }

  static get NS() {
    return NS
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new UserGroupAPI()
    }
    return this.instance
  }

  save(item) {
    return this.API.exec(
      UserGroupAPI.NS,
      'set',
      { ugroup: item }
    ).then(userGroup => new UserGroup(userGroup))
  }

  get(id) {
    return this.API.exec(
      UserGroupAPI.NS,
      'get',
      { id }
    ).then(userGroup => new UserGroup(userGroup))
  }

  list() {
    return this.API.exec(
      UserGroupAPI.NS,
      'list'
    )
      .then(groups => groups.map(group => new UserGroup(group)))
  }

  setGroups(userid, groups) {
    return this.API.exec(
      UserGroupAPI.NS,
      'setUserGroups',
      { userid, groups }
    )
  }

  /**
   * @param userid {string}
   */
  forUser(userid) {
    return this.API.exec(
      UserGroupAPI.NS,
      'forUser',
      { userid }
    )
      .then(groups => groups.map(group => new UserGroup(group)))
  }

  /**
   * @return DataAPI
   */
  getDataAPI() {
    const api = this
    return new class extends DataAPI {
      isWritable() {
        return true
      }

      list() {
        return api.list()
      }

      /**
       * @param item {object} 
       */
      save(item) {
        return api.save(item)
      }
    }
  }

}
