export default class dom {
  static isVisible(node) {
    return new Promise((resolve) => {
      /* do it in requestAnimationFrame because it trigger layer reflow */
      new Promise((resolve) => {
        window.requestAnimationFrame((_) => {
          return resolve([
            window.getComputedStyle(node),
            node.getBoundingClientRect(),
            [window.innerWidth, window.innerHeight],
          ])
        })
      }).then(([style, rect, winRect]) => {
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === 0
        ) {
          return resolve(false)
        }

        if (
          rect.top > winRect[1] ||
          rect.left > winRect[0] ||
          rect.bottom < 0 ||
          rect.right < 0
        ) {
          return resolve(false)
        }

        return resolve(true)
      })
    })
  }
}
