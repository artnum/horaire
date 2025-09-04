export default class Overlay {
  static #current = 0

  static get current() {
    return Overlay.#current
  }

  static stack() {

  }
}
