/* estlint-env browser */
/* global Artnum */
(function () {
  var global = Function('return this')() // eslint-disable-line
  var admin = {
    formatMoney: function (value, currency = 'chf') {
      value = parseFloat(value).toFixed(2)
      return `${String(value)} ${currency.toUpperCase()}`
    },
    clearForm: function (startNode) {
      if (!(startNode instanceof HTMLElement)) {
        startNode = document.getElementById(startNode)
      }

      let node = startNode.firstElementChild
      while (node) {
        let current = node
        node = node.nextElementSibling
        if (current.dataset.removeOnClean) {
          window.requestAnimationFrame(() => current.parentNode.removeChild(current))
        }
        if (current.firstElementChild) {
          this.clearForm(current)
        }
        switch (current.nodeName) {
          case 'INPUT':
            let type = current.getAttribute('type')
            if (type) {
              if (type.toLowerCase() === 'radio') {
                window.requestAnimationFrame(() => current.checked = false)
                break
              }
              if (type.toLowerCase() === 'checkbox') {
                window.requestAnimationFrame(() => current.checked = false)
                break
              }
              if (
                type.toLowerCase() === 'button' ||
                type.toLowerCase() === 'submit' ||
                type.toLowerCase() === 'reset'
              ) {
                break
              }
            }
          case 'TEXTAREA':
            let value = ''
            if (current.dataset.default) {
              value = current.dataset.default
            }
            if (current.dataset.value) {
              current.dataset.value = value
            }
            window.requestAnimationFrame(() => current.value = value)
            break
          case 'SELECT':
            window.requestAnimationFrame(() => current.selectedIndex = 0)
            break
        }
      }
    },

    loadForm: function (form) {
      ;['SELECT', 'TEXTAREA', 'INPUT'].forEach(function (elements) {
        var inputs = form.getElementsByTagName(elements)
        for (var i = 0; i < inputs.length; i++) {
          let opts = {label: '$name', id: 'id', parameters: {}}
          if (inputs[i].getAttribute('data-options')) {
            var _json = inputs[i].getAttribute('data-options').replace(/(['"])?([a-zA-Z0-9_\.]+)(['"])?:/g, '"$2": ') // eslint-disable-line
            _json = _json.replace(/'/g, '"')
            Object.assign(opts, JSON.parse(_json))
          }
          if (inputs[i].getAttribute('data-source') && elements === 'SELECT') {
            Artnum.Query.exec(Artnum.Path.url(inputs[i].getAttribute('data-source'), {params: opts.parameters})).then(function (result) {
              if (!result.success || result.length <= 0) { return }
              result.data.forEach(function (options) {
                var o = document.createElement('OPTION')
                if (options[opts.id]) {
                  if (this.value && String(options[opts.id]) === String(this.value)) {
                    o.setAttribute('selected', 'true')
                  }
                  o.setAttribute('value', options[opts.id])
                }

                let label = opts.label
                for (let k in options) {
                  label = label.replace('$' + k, options[k])
                }

                o.appendChild(document.createTextNode(label))
                this.appendChild(o)
              }.bind(this))
            }.bind(inputs[i]))
          }
        }
      })
    },
    setFormInputValue: function (form, inputName, inputValue = '') {
      ;['SELECT', 'TEXTAREA', 'INPUT'].every((element) => {
        let inputs = form.getElementsByTagName(element)
        for (let i = 0; i < inputs.length; i++) {
          if (inputName === '*') {
            inputs[i].value = inputValue
          } else {
            if (!inputs[i].getAttribute('name')) { continue }
            if (inputs[i].getAttribute('name').toLowerCase() === inputName.toLowerCase()) {
              inputs[i].value = inputValue
              return false
            }
          }
        }
        return true
      })
    },
    setFormInputInvalid: function (form, inputName, withMessage = 'error', remove = false) {
      ;['SELECT', 'TEXTAREA', 'INPUT'].every((element) => {
        let inputs = form.getElementsByTagName(element)
        for (let i = 0; i < inputs.length; i++) {
          if (inputName === '*') {
            if (remove) {
              inputs[i].setCustomValidity('')
              inputs[i].setAttribute('aria-invalid', 'false')
            } else {
              inputs[i].setCustomValidity(withMessage)
              inputs[i].addEventListener('change', (event) => {
                event.target.setCustomValidity('')
                event.target.setAttribute('aria-invalid', 'false')
              }, {once: true})
              inputs[i].setAttribute('aria-invalid', 'true')
            }
          } else {
            if (!inputs[i].getAttribute('name')) { continue }
            if (inputs[i].getAttribute('name').toLowerCase() === inputName.toLowerCase()) {
              if (remove) {
                inputs[i].setCustomValidity('')
                inputs[i].setAttribute('aria-invalid', 'false')
              } else {
                inputs[i].setCustomValidity(withMessage)
                inputs[i].addEventListener('change', (event) => {
                  event.target.setCustomValidity('')
                  event.target.setAttribute('aria-invalid', 'false')
                }, {once: true})
                inputs[i].setAttribute('aria-invalid', 'true')
              }
              inputs[i].reportValidity()
              return false
            }
          }
        }
        return true
      })
    },
    setFormInputClass: function (form, inputName, className, remove = false) {
      ;['SELECT', 'TEXTAREA', 'INPUT'].every((element) => {
        let inputs = form.getElementsByTagName(element)
        for (let i = 0; i < inputs.length; i++) {
          if (inputName === '*') {
            if (remove) {
              window.requestAnimationFrame(() => inputs[i].classList.remove(className))
            } else {
              window.requestAnimationFrame(() => inputs[i].classList.add(className))
            }
          } else {
            if (inputs[i].getAttribute('name').toLowerCase() === inputName.toLowerCase()) {
              if (remove) {
                window.requestAnimationFrame(() => inputs[i].classList.remove(className))
              } else {
                window.requestAnimationFrame(() => inputs[i].classList.add(className))
              }
              return false
            }
          }
        }
        return true
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
              if (inputs[i].dataset.value) {
                value = inputs[i].dataset.value
              } else if (inputs[i].value) {
                value = inputs[i].value
              }
              break
            case 'date':
              try {
                let v = inputs[i].dataset.value ? inputs[i].dataset.value : inputs[i].value
                if (inputs[i].valueAsDate) {
                  value = inputs[i].valueAsDate.toISOString().split('T')[0]
                } else {
                  value = (new Date(v)).toISOString().split('T')[0]
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
            if (entry.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              entry.firstElementChild.setAttribute('class', _tr.getAttribute('class'))
            } else {
              entry.setAttribute('class', _tr.getAttribute('class'))
            }
            window.requestAnimationFrame(() => { node.replaceChild(entry, _tr); resolve() })
            replaced = true
            break
          }
        }
        if (!replaced) {
          window.requestAnimationFrame(() => {
            node.insertBefore(entry, node.firstElementChild)
            let x = false
            for (let n = node.firstElementChild; n; n = n.nextElementSibling) {
              n.classList.remove('odd'); n.classList.remove('even')
              n.classList.add(x ? 'even' : 'odd')
              if (n.dataset.id) {
                x = !x
              }
            }
            resolve()
          })
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
        Artnum.Query.exec(Artnum.Path.url(store + '/' + id), {method: method, body: body})
        .then(function (result) {
          if (result.success) {
            var newid = id
            if (method !== 'DELETE' && result.length === 1) {
              newid = result.data[0].id
              Artnum.Query.exec(Artnum.Path.url(store + '/' + newid)).then(function (result) {
                if (result.success && result.length === 1) {
                  resolve(Array.isArray(result.data) ? result.data[0] : result.data)
                }
              })
            } else {
              resolve(result.success)
            }
          }
        })
      })
    },

    fetchPopup: function (link, title, options) {
      return new Promise((resolve, reject) => {
        fetch(link, window.location).then(response => {
          if (response.ok) {
            response.text().then(html => {
              resolve(this.popup(html, title, options))
            }, reason => reject(reason))
          } else {
            reject(new Error(`Query failed ${response.statusText}`))
          }
        }, reason => reject(reason))
      })
    },

    popup: function (html, title, options = {}) {
      if (!this._popupCount) { 
        this._popupCount = 0
      }
      if (options.modal === undefined) {
        options.modal = true
      }
      const underlayName = `ModalUnderlay${++this._popupCount}`
      if (options.modal) {
        let underlay = document.createElement('DIV')
        underlay.id = underlayName
        underlay.classList.add('ModalUnderlay')
        if (typeof KZ === 'function') {
          underlay.style.zIndex = KZ()
        }
        window.requestAnimationFrame(() => {
          document.body.appendChild(underlay)
          document.body.classList.add('withUnderlayActive')
        })
      }

      let popup = document.createElement('DIV')
      if (typeof KZ === 'function') { popup.style.zIndex = KZ() }
      else { popup.style.zIndex = 9999 }
      let titleNode = document.createElement('SPAN')
      titleNode.innerHTML = title

      popup.classList.add('popup')
      titleNode.classList.add('title')

      if (options.closable) {
        let close = document.createElement('SPAN')
        close.classList.add('close')
        close.addEventListener('click', function (event) {
          this.dispatchEvent(new Event('close'))
        }.bind(popup))
        titleNode.appendChild(close)
      }

      if (options.minWidth) {
        popup.style.minWidth = options.minWidth
      }

      if (options.supClasses && Array.isArray(options.supClasses)) {
        options.supClasses.forEach (c => {
          popup.classList.add(c)
        })
      }

      popup.insertBefore(titleNode, popup.firstChild)
      let content = document.createElement('DIV')
      if (html instanceof HTMLElement) {
        content.appendChild(html)
      } else {
        content.innerHTML = html
      }
      content.setAttribute('name', 'popup-content')
      content.classList.add('popup-content')
      if (options.classes && Array.isArray(options.classes)) {
        options.classes.forEach(c => {
          content.classList.add(c)
        })
      }

      popup.appendChild(content)

      content.close = function (event) {
        window.requestAnimationFrame(() => {
          this.parentNode.removeChild(this)
          const underlay = document.getElementById(underlayName)
          if (underlay) {
            underlay.parentNode.removeChild(underlay)
            if (!document.body.querySelector('.ModalUnderlay')) {
              document.body.classList.remove('withUnderlayActive')
            }
          }
        })
      }.bind(popup)

      content.loaded = function () {
        window.requestAnimationFrame(() => {
          this.classList.remove('loading')
        })
      }.bind(popup)

      if (options.loading) {
        popup.classList.add('loading')
      }
      popup.addEventListener('close', content.close)

      window.requestAnimationFrame(() => {
        document.body.appendChild(popup)
        let rect = popup.getBoundingClientRect()
        let w = window.innerWidth || document.body.clientWidth
        let h = window.innerHeight || document.body.clientHeight
        popup.style.left = `${Math.round((w - rect.width) / 2)}px`
        popup.style.top = `${Math.round((h - rect.height) / 2)}px`
      })
      const rObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          let node = entry.target
          new Promise((resolve, _) => {
            window.requestAnimationFrame(() => {
              let rect = node.getBoundingClientRect()
              let w = window.innerWidth || document.body.clientWidth
              let h = window.innerHeight || document.body.clientHeight
              node.style.left = `${Math.round((w - rect.width) / 2)}px`
              node.style.top = `${Math.round((h - rect.height) / 2)}px`
              resolve()
            })
          }).then(() => {
            let n = node.firstElementChild
            for (; n; n = n.nextElementSibling) {
              if (n.getAttribute('name') === 'popup-content') { break }
            }
            n.dispatchEvent(new CustomEvent('resize', {}))
          })
        }
      })
      rObserver.observe(popup)

      return content
    },
    parseDuration: function (text, to = 's') {
      const exp = /([0-9]+(?:[\.,][0-9]+)?)\s*([jJsSmMhH]?).*/
      const dayLength =  8640
      let x = 0.0
      let m
      if ((m = exp.exec(text)) !== null) {
        x = parseFloat(m[1].replace(',', '.'))
        switch(m[2]) {
          case 'm':
          case 'M':
            x *= dayLength * 30 // 30 days
            break;
          case 's':
          case 'S':
            x *= dayLength * 7 // 7 days
            break
          case 'j':
          case 'J':
            x *= dayLength
            break
          default:
          case 'h':
          case 'H':
            x *= 3600
            break
        }

        switch (to) {
          default: case 's': case 'S': break
          case 'h': case 'H': x /= 3600; break
          case 'm': case 'M': x /= 60; break
          case 'd': case 'D': x /= 8640; break
        }
      }

      return x
    },
    getUrl: function (parturl, params = {})  {
      return new Promise((resolve, reject) => {
        const klogin = new KLogin(KAAL.getBase())
        const url = new URL(parturl, KAAL.getBase())
        Object.keys(params).forEach(k => {
          url.searchParams.append(k, params[k])
        })
        klogin.getShareableToken(url.toString(), '', 600, true)
        .then((token) => {
          url.searchParams.append('access_token', token)
          resolve(url)
        })
        .catch(reason => {
          reject(new Error('Error', {cause: reason}))
        })
      })
    }
  }
  global.Admin = admin
})()
