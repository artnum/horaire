/* eslint-env amd, browser */
/* Routine to load and refresh data */
define([
  'dojo/_base/declare'
], function (
  djDeclare
) {
  return djDeclare('artnum.loader', [], {
    constructor: function () {
      this.loaded = { data: false }
    },

    _setUrlAttr: function (value) {
      this.clear()
      this._set('url', value)
    },

    load: function () {
      return new Promise(function (resolve, reject) {
        this.loaded.data = false
        if (this.get('url')) {
          fetch(this.get('url')).then(function (response) {
            response.json().then(function (json) {
              if (json.type === 'results' && json.data) {
                this.set('data', json.data)
                this.loaded.data = true
                resolve(this.get('data'))
              }
            }.bind(this))
          }.bind(this))
        }
      }.bind(this))
    },

    clear: function () {
      window.requestAnimationFrame(function () {
        if (this.domNode) {
          this.domNode.innerHTML = ''
        }
      }.bind(this))
    },

    refresh: function () {
      this.load().then(function () {
        this.draw()
      }.bind(this))
    }
  })
})
