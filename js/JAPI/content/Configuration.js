import { JAPI } from "../JAPI";

const NS = 'Configuration'
export class ConfigurationAPI extends JAPI {
  constructor() {
    super()
  }

  static get NS() {
    return NS
  }

  /**
   * @param {string} confPath
   *
   * @return {string}
   */
  get(confPath) {
    return this.API.exec(
      ConfigurationAPI.NS,
      'get',
      { confPath }
    ).then(configuration => configuration.confPath)
  }
}
