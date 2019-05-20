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
    findInput: function (form, inputName) {
      let elements = ['INPUT', 'TEXTAREA', 'SELECT']
      for (let i = 0; i < elements.length; i++) {
        let e = form.getElementsByTagName(elements[i])
        for (let j = 0; j < e.length; j++) {
          if (inputName === e[j].getAttribute('name')) { return e[j] }
        }
      }
      return null
    },
    insertEntry: function (entry, table, id = null) {
      return new Promise((resolve, reject) => {
        let entryId = id !== null ? id : entry.getAttribute('data-id')
        let node = table
        for (node = node.firstChild; node && node.nodeName !== 'TBODY'; node = node.nextSibling);
        if (!node) { return }
        var replaced = false
        for (let _tr = node.firstElementChild; _tr; _tr = _tr.nextElementSibling) {
          if (_tr.getAttribute('data-id') === entryId) {
            window.requestAnimationFrame(() => { node.replaceChild(entry, _tr); resolve() })
            replaced = true
            break
          }
        }
        if (!replaced) {
          window.requestAnimationFrame(() => { node.insertBefore(entry, node.firstChild); resolve() })
        }
      })
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
    },
    popup: function (html, title) {
      let popup = document.createElement('DIV')
      popup.innerHTML = html
      let titleNode = document.createElement('SPAN')
      titleNode.innerHTML = title

      popup.classList.add('popup')
      titleNode.classList.add('title')
      popup.insertBefore(titleNode, popup.firstChild)
      popup.addEventListener('close', function (event) {
        window.requestAnimationFrame(() => this.parentNode.removeChild(this))
      }.bind(popup))
      window.requestAnimationFrame(() => {
        document.body.appendChild(popup)
      })
      return popup
    }
  }
  global.Admin = admin
})()
