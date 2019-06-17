/* eslint-env browser */
function __Entry (baseUrl, data) {
  this.data = data
  this.baseUrl = baseUrl
}

__Entry.prototype.update = function () {
  return new Promise(function (resolve, reject) {
    fetch(this.getUrl())
      .then((response) => {
        if (response.ok) {
          response.json((json) => {
            if (json.success && json.length === 1) {
              this.data = json.data
              resolve(this)
            }
          })
        }
      }, (error) => reject(error))
  }.bind(this))
}

__Entry.prototype.getDisabled = function () {
  if (this.data.disabled === '0') {
    return false
  }
  return true
}

__Entry.prototype.getLabel = function () {
  return this.data.name
}

__Entry.prototype.getName = function () {
  return this.data.username
}

__Entry.prototype.getId = function () {
  return this.data.id
}

__Entry.prototype.getUrl = function () {
  let url = new URL(`${this.baseUrl}/${String(this.data.id)}`)
  return url
}

function Person (baseUrl, data) {
  this.baseUrl = baseUrl
  this.data = data
  this.pos = -1
}

Person.prototype.getNext = function () {
  this.pos++
  if (this.pos >= this.data.length) { return null }
  return new __Entry(this.baseUrl, this.data[this.pos])
}
