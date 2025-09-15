class KaalEvent {
  constructor(event, node) {
    this.target = node;
    this.type = event.type;
    if (!event.dataset) {
      this.data = node.dataset || {};
    } else {
      this.data = event.dataset;
    }
    this.kaalSource = event.kaalSource;
  }
}

export default class KaalEvents {
  static #instance;
  static #events;
  static #handlers;
  static #uuid;
  static #counter;

  constructor() {
    if (KaalEvents.#instance) {
      return KaalEvents.#instance;
    }
    /* this will be used to pass event by broadcast channel, so prepare for
     * it (uuid is used to check if it comes from another instance or from
     * this one, avoiding running events twice (or in a loop)).
     */
    KaalEvents.#uuid = crypto.randomUUID();
    KaalEvents.#handlers = [];
    KaalEvents.#events = new WeakMap();
    KaalEvents.#instance = this;
    KaalEvents.#counter = 1;
  }

  eventHandler(event) {
    if (event.kaalSource && event.kaalSource === KaalEvents.#uuid) {
      return;
    }
    if (!event.kaalSource) {
      event.kaalSource = KaalEvents.#uuid;
    }
    let node = event.target;
    if (node instanceof HTMLElement && !node.dataset.kaalEventsId) {
      node = node.closest("[data-kaal-events-id]");
    }
    if (KaalEvents.#events.has(node)) {
      KaalEvents.#events.get(node)[event.type]?.(new KaalEvent(event, node));
    }
  }

  exec(node, type, data = {}) {
    if (KaalEvents.#events.has(node)) {
      KaalEvents.#events
        .get(node)
        [
          type
        ]?.(new KaalEvent({ type, kaalSource: KaalEvents.#uuid, dataset: data }, node));
    }
  }

  set(node, type, callback) {
    if (node instanceof HTMLElement && !node.dataset.kaalEventsId) {
      node.dataset.kaalEventsId = KaalEvents.#counter++;
    }
    if (!Array.isArray(type)) {
      type = [type];
    }
    for (let i = 0; i < type.length; i++) {
      if (!KaalEvents.#handlers.includes(type[i])) {
        document.addEventListener(type[i], this.eventHandler, {
          capture: false,
        });
        KaalEvents.#handlers.push(type[i]);
      }

      if (KaalEvents.#events.has(node)) {
        KaalEvents.#events.get(node)[type[i]] = callback;
      } else {
        KaalEvents.#events.set(node, { [type[i]]: callback });
      }
    }
  }
  remove(node, type) {
    if (KaalEvents.#events.has(node)) {
      delete KaalEvents.#events.get(node)[type];
    }
  }
}
