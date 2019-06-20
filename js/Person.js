/* eslint-env browser */
function __Entry (baseUrl, data) {
  this.data = data
  this.baseUrl = baseUrl
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
  return new URL(`${String(this.baseUrl)}/${this.getId()}`)
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
