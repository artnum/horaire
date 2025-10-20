import dom from '../dom.js'
import ZMax from './ZMax.js'

function debounce(func, wait) {
  let timeout

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
function throttle(func, wait) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= wait) {
      lastCall = now
      func(...args)
    }
  }
}

export default class Placement {
  static #initialized = false
  static #nodesMap = new Map()
  static #placementId = 0
  static #observer = new MutationObserver(Placement.observeDom)
  static #resizeObserver = new ResizeObserver(Placement.resizeObserveDom)
  static #ticking = false

  static resizeObserveDom(entries) {
    Placement.updatePlacement()
  }

  static observeParentNode(events) {
    events.forEach((event) => {
      if (event.target.getAttribute('aria-selected') === 'false') {
        Placement.#nodesMap.forEach((entry) => {
          if (entry.relative === event.target) {
            Placement.removeNode(entry.node)
          }
        })
      } else {
        dom.isVisible(event.target).then((visible) => {
          if (!visible) {
            Placement.#nodesMap.forEach((entry) => {
              if (entry.relative === event.target) {
                Placement.removeNode(entry.node)
              }
            })
          }
        })
      }
    })
  }

  static observeDom(events) {
    for (let i = 0; i < events.length; i++) {
      if (events[i].removedNodes.length <= 0) {
        continue
      }
      const removedNodes = events[i].removedNodes

      for (let j = 0; j < removedNodes.length; j++) {
        if (removedNodes[j].nodeType !== Node.ELEMENT_NODE) {
          continue
        }
        if (Placement.#nodesMap.has(removedNodes[j])) {
          Placement.removeNode(removedNodes[j])
          continue
        }
        for (const item of Placement.#nodesMap) {
          const parentNodes = removedNodes[j].querySelectorAll(
            '[data-placement-parent-id]',
          )
          for (let k = 0; k < parentNodes.length; k++) {
            if (parentNodes.item(k) === item[1].relative) {
              Placement.removeNode(item[0])
              break
            }
          }
        }
      }
    }

    Placement.#nodesMap.forEach((entry) => {
      Promise.all([
        dom.isVisible(entry.node),
        dom.isVisible(entry.relative),
      ]).then(([node, relative]) => {
        if (!node || !relative) {
          window.requestAnimationFrame((_) => entry.node.remove())
          Placement.removeNode(node)
        }
      })
    })
  }

  static init() {
    if (Placement.#initialized) {
      return
    }
    Placement.#initialized = true
    Placement.#observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })
    window.addEventListener(
      'resize',
      debounce((_) => {
        Placement.updatePlacement()
      }, 5),
      { capture: true },
    )
    window.addEventListener(
      'scroll',
      throttle((_) => {
        Placement.updatePlacement()
      }, 50),
      { capture: true },
    )
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' || event.code === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          Array.from(document.querySelectorAll('[data-placement-id]')).forEach(
            (node) => Placement.removeNode(node),
          )
        }
      },
      { capture: true },
    )

    window.addEventListener(
      'mousedown',
      throttle((event) => {
        const eventNode = event.target

        Placement.#nodesMap.forEach((entry) => {
          const node = entry.node

          /* check if target node is child of our entry node. When using
           * element like <SELECT>, the option list may appear outside the
           * the node bounding rectangle, so don't kill the node in that
           * case
           */
          let x = eventNode
          while (x) {
            if (x === node) {
              return
            }
            x = x.parentNode
          }
          const mousepos = {
            x: event.clientX,
            y: event.clientY,
          }
          window.requestAnimationFrame(() => {
            const rect = node.getBoundingClientRect()
            if (mousepos.x < rect.left || mousepos.x > rect.right) {
              return Placement.removeNode(node)
            }
            if (mousepos.y < rect.top || mousepos.y > rect.bottom) {
              return Placement.removeNode(node)
            }
          })
        })
      }, 50),
      { capture: true },
    )
  }

  static updatePlacement() {
    const nodes = document.querySelectorAll('[data-placement-id]')
    nodes.forEach((node) => {
      if (Placement.#nodesMap.has(node)) {
        const relative = Placement.#nodesMap.get(node).relative
        Placement.place(relative, node)
      }
    })
  }

  static removeNode(node) {
    if (Placement.#nodesMap.has(node)) {
      const entry = Placement.#nodesMap.get(node)
      Placement.#nodesMap.delete(node)
      delete entry.relative.dataset.placementParentId
      Placement.#observer.disconnect(node)
      requestAnimationFrame((_) => node.remove())
    }
  }
  static place(relative, node) {
    if (Placement.#ticking) return

    Placement.#nodesMap.forEach((entry) => {
      if (entry.relative === relative && entry.node !== node) {
        Placement.removeNode(entry.node)
      }
    })

    if (!node.dataset.plResizeObserver) {
      Placement.#resizeObserver.observe(node)
      node.dataset.plResizeObserver = true
    }
    Placement.#ticking = true
    new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        const box = relative.getBoundingClientRect()
        const tbox = node.getBoundingClientRect()
        resolve([box, tbox, window.innerHeight, window.innerWidth])
      })
    }).then(([box, tbox, windowHeight, windowWidth]) => {
      // Check if there's enough space below the relative node
      const spaceBelow = windowHeight - (box.y + box.height)
      const placeAbove = spaceBelow < tbox.height && box.y > tbox.height

      // Check if node overflows window's right edge
      const rightEdge = box.x + tbox.width
      const placeLeft = rightEdge > windowWidth && box.x >= tbox.width

      const observer = new MutationObserver(Placement.observeParentNode)
      observer.observe(relative, {
        attributes: true,
      })
      Placement.#nodesMap.set(node, { relative, observer, node })
      Placement.#placementId++
      node.dataset.placementId = Placement.#placementId
      relative.dataset.placementParentId = Placement.#placementId
      window.requestAnimationFrame(() => {
        Object.assign(node.style, {
          position: 'fixed',
          zIndex: ZMax.get(),
          top: placeAbove
            ? `${box.y - tbox.height}px` // Place above
            : `${box.y + box.height}px`,
          left: placeLeft
            ? `${box.x - tbox.width}px` // Place to the left
            : `${box.x}px`, // Place aligned with left edge
          visibility: 'visible',
        })
        Placement.#ticking = false
      })
    })
  }
}

Placement.init()
