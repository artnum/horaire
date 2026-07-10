import dom from '../dom.js'
import ZMax from './ZMax.js'
import Timing from '../Timing.js'

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
      Timing.debounce((_) => {
        Placement.updatePlacement()
      }, 5),
      { capture: true },
    )
    window.addEventListener(
      'scroll',
      Timing.throttle((_) => {
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
      Timing.throttle((event) => {
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
        Placement.#setPosition(node)
      }
    })
  }

  static removeNode(node) {
    if (Placement.#nodesMap.has(node)) {
      const entry = Placement.#nodesMap.get(node)
      Placement.#nodesMap.delete(node)
      delete entry.relative.dataset.placementParentId
      Placement.#observer.disconnect(node)
      requestAnimationFrame((_) => {
        if (entry.position) {
          node.parentNode.remove()
        } else {
          node.remove()
        }
      })
    }
  }

  static #preplace(relative, node) {
    Placement.#nodesMap.forEach((entry) => {
      if (entry.relative === document.body && entry.node !== node) {
        Placement.removeNode(entry.node)
      }
    })
    Placement.#ticking = true
  }

  static #setModalPosition(position, node) {
    return new Promise((resolve) => {
      new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          resolve([window.innerHeight, window.innerWidth])
        })
      }).then(([windowHeight, windowWidth]) => {
        if (node.dataset.plResizeObserver) {
          requestAnimationFrame((_) => {
            Object.assign(node.parentNode.style, {
              minWidth: `${windowWidth}px`,
              minHeight: `${windowHeight}px`,
            })
          })
        } else {
          const bg = document.createElement('DIV')
          Object.assign(bg.style, {
            position: 'fixed',
            left: '0px',
            top: '0px',
            zIndex: ZMax.get(),
            minWidth: `${windowWidth}px`,
            minHeight: `${windowHeight}px`,
            border: 'none',
            backgroundColor: 'rgba(127,127,127,0.3)',
            display: 'flex',
            justifyContent: 'center',
          })

          const style = {
            visibility: 'visible',
            backgroundColor: 'var(--background-color, white)',
            color: 'var(--text-color, black)',
            boxSizing: 'border-box',
            transform: 'translateY(-2%)', // visual center, about 2% above the geometrical center
          }

          switch (String(position).toLowerCase()) {
            default:
            case 'bottom':
              bg.style.alignItems = 'flex-end'
              break
            case 'middle':
              bg.style.alignItems = 'center'
              break
            case 'top':
              bg.style.alignItems = 'flex-start'
              break
          }

          window.requestAnimationFrame(() => {
            Object.assign(node.style, style)
            bg.appendChild(node)
            document.body.appendChild(bg)
            resolve()
          })
        }
      })
    })
  }
  static #setFloatPosition(relative, node) {
    return new Promise((resolve) => {
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

        const style = {
          position: 'fixed',
          top: placeAbove
            ? `${box.y - tbox.height}px` // Place above
            : `${box.y + box.height}px`,
          left: placeLeft
            ? `${box.x - tbox.width}px` // Place to the left
            : `${box.x}px`, // Place aligned with left edge
          zIndex: ZMax.get(),
          visibility: 'visible',
        }

        window.requestAnimationFrame(() => {
          Object.assign(node.style, style)
          resolve()
        })
      })
    })
  }
  static #setPosition(node) {
    const entry = Placement.#nodesMap.get(node)
    if (entry.position) {
      return Placement.#setModalPosition(entry.position, entry.node)
    }
    return Placement.#setFloatPosition(entry.relative, entry.node)
  }

  static modal(position, node) {
    if (Placement.#ticking) return
    Placement.#preplace(document.body, node)

    Placement.#setModalPosition(position, node).then((_) => {
      if (!node.dataset.plResizeObserver) {
        Placement.#resizeObserver.observe(node)
        node.dataset.plResizeObserver = true
      }

      const observer = new MutationObserver(Placement.observeParentNode)
      observer.observe(document.body, {
        attributes: true,
      })
      Placement.#nodesMap.set(node, {
        relative: document.body,
        observer,
        node,
        position,
      })
      Placement.#placementId++
      node.dataset.placementId = Placement.#placementId
    })
  }

  static place(relative, node) {
    if (Placement.#ticking) return
    Placement.#preplace(relative, node)

    new Promise((resolve) => {
      Placement.#setFloatPosition(relative, node).then((_) => {
        if (!node.dataset.plResizeObserver) {
          Placement.#resizeObserver.observe(node)
          node.dataset.plResizeObserver = true
        }
        const observer = new MutationObserver(Placement.observeParentNode)
        observer.observe(relative, {
          attributes: true,
        })
        Placement.#nodesMap.set(node, { relative, observer, node })
        Placement.#placementId++
        node.dataset.placementId = Placement.#placementId
        Placement.#ticking = false
      })
    })
  }
}

Placement.init()
