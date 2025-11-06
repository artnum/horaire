import PJApi from './$script/vendor/pjAPI/src/pjapi.mjs'

export class JAPI {
  constructor() {
    this.API = PJApi.instance
    this.API.open(new URL('$api', window.location).toString(), 160, {
      Authorization: `Bearer ${localStorage.getItem('klogin-token')}`,
    })
  }
}

export class JAPIIterator {
  constructor(callback, size = 20) {
    this.size = size
    this.offset = 0
    this.end = -1
    this.loaded = []
    this.callback = callback
  }

  next() {
    return new Promise((resolve, reject) => {
      if (this.offset === this.end) {
        return resolve([])
      }
      if (this.offset + this.size <= this.loaded.length) {
        this.offset += this.size
        return resolve(this.loaded.slice(this.offset - this.size, this.offset))
      }
      this.callback(this.offset, this.size)
        .then(([objects, last]) => {
          if (last) {
            this.end = this.offset + objects.length
          }
          this.loaded = [...this.loaded, ...objects]
          this.offset += objects.length
          return resolve(
            this.loaded.slice(this.offset - objects.length, this.offset),
          )
        })
        .catch((e) => reject(e))
    })
  }

  previous() {
    return new Promise((resolve, _) => {
      if (this.offset === 0) {
        return resolve([])
      }
      const previous = this.offset
      this.offset -= this.size
      if (this.offset < 0) {
        this.offset = 0
      }
      let _size = previous - this.offset
      return resolve(this.loaded.slice(this.offset, this.offset + _size))
    })
  }

  rewind() {
    this.offset = 0
    return this.next()
  }
}
