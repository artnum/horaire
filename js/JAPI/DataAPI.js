/**
 * UI components use this for operations
 */

export default class DataAPI {
  isWritable() {
    return false
  }

  /**
   * @return {Promise<Array<object>>}
   */
  list() {
    throw new Error('list() must be implemented')
  }

  /**
   * @param id {(string|number)}
   * @return {Promise<object>}
   */
  get(id) {
    throw new Error('get() must be implemented')
  }

  /**
   * @param terms {string[]}
   * @return {Promise<Array<object>>}
   */
  search(terms) {
    throw new Error('search() must be implemented')
  }

  /**
   * @param item {object}
   * @return {Promise<object>}
   */
  save(item) {
    throw new Error('save() must be implemented')
  }

  /**
   * @param id {(string|number)}
   * @return {Promise}
   */
  delete(id) {
    throw new Error('delete() must be implemented')
  }
}
