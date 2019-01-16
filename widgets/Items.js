/* eslint-env amd, browser */
/* eslint no-template-curly-in-string: "off" */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/on',
  'dojo/parser',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dijit/Dialog',
  'horaire/LoaderWidget',
  'artnum/dojo/Log',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  djEvented,
  djOn,
  djParser,
  djDomConstruct,
  djDomClass,
  dtDialog,
  LoaderWidget,
  Log,
  Path,
  Query
) {
  return djDeclare('horaire.Items', [
    _dtWidgetBase, _dtTemplatedMixin, LoaderWidget, djEvented
  ], {
    baseClass: 'ItemsList',
    templateString: '<div class="${baseClass}"></div>',

    itemHtml: function (item, target) {
      var unit = item.unit
      if (!item.unit) {
        unit = ''
      }
      var reference = item.reference ? item.reference : ''
      var tr = document.createElement('TR')
      tr.setAttribute('data-item-id', item.id)
      tr.setAttribute('data-item-reference', reference)
      tr.setAttribute('class', 'item entry')
      tr.innerHTML = '<td>' + reference + '</td><td class="name">' + item.name + '</td><td class="unit">' + unit + '</td>'
      target.appendChild(tr)
      return tr
    },

    quantityHtml: function (quantity, target) {
      var reference = quantity._item ? (quantity._item.reference ? quantity._item.reference : '') : ''
      var unit = ''
      var name = ''
      if (quantity._item) {
        unit = quantity._item.unit
        if (!unit) {
          unit = ''
        }
        name = quantity._item.name
        if (!name) {
          name = ''
        }
      }

      var tr = document.createElement('TR')
      tr.setAttribute('data-quantity-id', quantity.id)
      tr.setAttribute('class', 'quantity entry')
      tr.innerHTML = '<td>' + reference + '</td><td class="name">' + name + '</td><td class="quantity"><input class="no-spinners" type="number" inputmode="decimal" min="0" step="any" value="' + quantity.value + '" /></td><td class="unit">' + unit + '</td>'

      djOn(tr.getElementsByTagName('INPUT')[0], 'change', function (event) {
        var pNode = event.target
        while (pNode && !pNode.getAttribute('data-quantity-id')) {
          pNode = pNode.parentNode
        }
        if (pNode) {
          var id = pNode.getAttribute('data-quantity-id')
          var value = Number(event.target.value)
          if (id) {
            if (value === 0) {
              Query.exec(Path.url('Quantity/' + id), { method: 'DELETE' }).then(function (response) {
                this.refresh()
              }.bind(this))
            } else {
              Query.exec(Path.url('Quantity/' + id), {method: 'PUT', body: {id: id, value: value}}).then(function (response) {
                this.refresh()
              }.bind(this))
            }
          }
        }
      }.bind(this))

      target.appendChild(tr)
    },

    selectItem: function (event) {
      var node = event.target

      while (node.nodeName !== 'TR') {
        node = node.parentNode
      }
      while (!node.getAttribute('data-item-id')) {
        node = node.previousSibling
      }

      this.emit('submit', {item: node.getAttribute('data-item-id'), quantity: 1, project: this.get('project'), process: this.get('process')})
    },

    draw: function () {
      if (this.loaded.data) {
        this.clear()
        var data = this.get('data')
        if (data.length === 0) {
          return
        }
        var tbody = document.createElement('TBODY')
        var itemHeader = true
        for (var i = 0; i < data.length; i++) {
          if (data[i]._project) {
            var tr = this.quantityHtml(data[i], tbody)
            itemHeader = false
          } else {
            tr = this.itemHtml(data[i], tbody)
            djOn(tr, 'click', this.selectItem.bind(this))
          }
        }

        var node = document.createElement('TABLE')
        if (itemHeader) {
          node.innerHTML = '<thead><tr><th>Référence</th><th class="name">Fourniture</th><th class="unit">Unité</th></tr>' +
            '<tr class="search"><th>Recherche</th><th colspan="2"><input type="text" name="refSearch" placeholder="Référence" /></thead>'
          node.addEventListener('keyup', function (event) {
            if (event.target.name !== 'refSearch') { return }
            var table = event.target
            var value = event.target.value
            while (table.nodeName !== 'TABLE') { table = table.parentNode }
            table = table.getElementsByTagName('TBODY')[0]
            for (var tr = table.firstChild; tr; tr = tr.nextSibling) {
              if (value === '') {
                window.requestAnimationFrame(function () {
                  this.removeAttribute('style')
                }.bind(tr))
              } else {
                if (tr.getAttribute('data-item-reference').toLowerCase().indexOf(value.toLowerCase()) !== 0) {
                  window.requestAnimationFrame(function () {
                    this.setAttribute('style', 'display: none')
                  }.bind(tr))
                } else {
                  window.requestAnimationFrame(function () {
                    this.removeAttribute('style')
                  }.bind(tr))
                }
              }
            }
          })
        } else {
          node.innerHTML = '<thead><tr><th>Référence</th><th class="name">Fourniture</th><th class="quantity">Quantité</th><th class="unit">Unité</th></tr></thead>'
        }

        var frag = document.createDocumentFragment()
        frag.appendChild(node)
        node.appendChild(tbody)

        window.requestAnimationFrame(function () {
          this.domNode.appendChild(frag)
        }.bind(this))
      }
    }
  })
})
