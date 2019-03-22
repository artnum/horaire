/* estlint-env browser */
/* global Artnum */
(function () {
  var global = Function('return this')() // eslint-disable-line
  var admin = {
    loadForm: function (form) {
      var opts = {label: 'name', id: 'id', parameters: {}}
      ;['SELECT', 'TEXTAREA', 'INPUT'].forEach(function (elements) {
        var inputs = form.getElementsByTagName(elements)
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].getAttribute('data-options')) {
            var _json = inputs[i].getAttribute('data-options').replace(/(['"])?([a-zA-Z0-9_\.]+)(['"])?:/g, '"$2": ') // eslint-disable-line
            _json = _json.replace(/'/g, '"')
            var _opts = JSON.parse(_json)
            for (var k in _opts) {
              opts[k] = _opts[k]
            }
          }
          if (inputs[i].getAttribute('data-source') && elements === 'SELECT') {
            Artnum.Query.exec(Artnum.Path.url(inputs[i].getAttribute('data-source'), {params: opts.parameters})).then(function (result) {
              if (!result.success || result.length <= 0) { return }
              for (var k in opts) {
                if (this.getAttribute('data-source-' + k)) {
                  opts[k] = this.getAttribute('data-source-' + k)
                }
              }
              result.data.forEach(function (options) {
                if (!options[opts.label]) { return }
                var o = document.createElement('OPTION')
                if (options[opts.id]) {
                  if (this.value && String(options[opts.id]) === String(this.value)) {
                    o.setAttribute('selected', 'true')
                  }
                  o.setAttribute('value', options[opts.id])
                }
                o.appendChild(document.createTextNode(options[opts.label]))
                this.appendChild(o)
              }.bind(this))
            }.bind(inputs[i]))
          }
        }
      })
    },
    getForm: function (form) {
      var oform = {}
      ;['SELECT', 'TEXTAREA', 'INPUT'].forEach(function (element) {
        var inputs = form.getElementsByTagName(element)
        for (var i = 0; i < inputs.length; i++) {
          if (!inputs[i].getAttribute('name')) { continue }
          var value = null
          var name = inputs[i].getAttribute('name')
          switch (inputs[i].getAttribute('type')) {
            default:
              if (inputs[i].value) { value = inputs[i].value }
              break
            case 'date':
              try {
                if (inputs[i].valueAsDate) {
                  value = inputs[i].valueAsDate.toISOString().split('T')[0]
                } else {
                  value = (new Date(inputs[i].value)).toISOString().split('T')[0]
                }
              } catch (e) {
                value = null
              }
              break
            case 'checkbox':
              value = inputs[i].checked
              break
          }
          if (oform[name]) {
            if (Array.isArray(oform[name])) {
              oform[name].push(value)
            } else {
              oform[name] = [oform[name], value]
            }
          } else {
            oform[name] = value
          }
        }
      })
      return oform
    },
    insertEntry: function (entry, table) {
      var node = table
      for (node = node.firstChild; node && node.nodeName !== 'TBODY'; node = node.nextSibling);
      if (!node) { return }
      var replaced = false
      for (var _tr = node.firstChild; _tr; _tr = _tr.nextSibling) {
        if (_tr.getAttribute('data-id') === entry.getAttribute('data-id')) {
          node.replaceChild(entry, _tr)
          replaced = true
          break
        }
      }
      if (!replaced) {
        node.insertBefore(entry, node.firstChild)
      }
    },
    deleteEntry: function (store, id, undelete = false) {
      var body = {id: id}
      var method = 'DELETE'
      if (undelete) {
        body.deleted = null
        method = 'PATCH'
      }
      return new Promise(function (resolve, reject) {
        Artnum.Query.exec(Artnum.Path.url(store + '/' + id), {method: method, body: body}).then(function (result) {
          if (result.success) {
            var newid = id
            if (method !== 'DELETE' && result.length === 1) {
              newid = result.data[0].id
            }
            Artnum.Query.exec(Artnum.Path.url(store + '/' + newid)).then(function (result) {
              if (result.success && result.length === 1) {
                resolve(result.data)
              }
            })
          }
        })
      })
    }
  }
  global.Admin = admin
})()
