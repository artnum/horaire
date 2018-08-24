/* eslint-env amd, browser */
/* eslint no-template-curly-in-string: "off" */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/request/xhr',
  'dojo/on',
  'dojo/parser',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dijit/Dialog',
  'horaire/LoaderWidget',
  'artnum/dojo/Log',
  'artnum/Path'
], function (
  djDeclare,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  djEvented,
  djXhr,
  djOn,
  djParser,
  djDomConstruct,
  djDomClass,
  dtDialog,
  LoaderWidget,
  Log,
  Path
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
      var price = item.price
      if (!item.price) {
        price = ''
      }
      var description = item.description
      if (!item.description) {
        description = ''
      }

      var tr = document.createElement('TR')
      tr.setAttribute('data-item-id', item.id)
      tr.setAttribute('class', 'item entry')
      tr.innerHTML = '<td class="name">' + item.name + '</td><td class="unit">' + unit + '</td><td class="price">' + price + '</td><td class="description">' + description + '</td>'
      target.appendChild(tr)
      return tr
    },

    quantityHtml: function (quantity, target) {
      var unit = ''
      var name = ''
      if (quantity._items) {
        unit = quantity._items.unit
        if (!unit) {
          unit = ''
        }
        name = quantity._items.name
        if (!name) {
          name = ''
        }
      }

      var tr = document.createElement('TR')
      tr.setAttribute('data-quantity-id', quantity.id)
      tr.setAttribute('class', 'quantity entry')
      tr.innerHTML = '<td class="name">' + name + '</td><td class="quantity"><input class="no-spinners" type="number" inputmode="decimal" min="0" step="any" value="' + quantity.value + '" /></td><td class="unit">' + unit + '</td>'

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
              fetch(Path.url('Quantity/' + id), { method: 'DELETE' }).then(function (response) {
                this.refresh()
              }.bind(this))
            } else {
              fetch(Path.url('Quantity/' + id), {method: 'PUT', body: JSON.stringify({id: id, value: value})}).then(function (response) {
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

      this.emit('submit', {item: node.getAttribute('data-item-id'), quantity: 1, project: this.get('project')})
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
          if (data[i]._projects) {
            var tr = this.quantityHtml(data[i], tbody)
            itemHeader = false
          } else {
            tr = this.itemHtml(data[i], tbody)
            djOn(tr, 'click', this.selectItem.bind(this))
          }
        }

        var node = document.createElement('TABLE')
        if (itemHeader) {
          node.innerHTML = '<thead><tr><th class="name">Fourniture</th><th class="unit">Unité</th><th class="price">Prix</th><th>Description</th></tr></thead>'
        } else {
          node.innerHTML = '<thead><tr><th class="name">Fourniture</th><th class="quantity">Quantité</th><th class="unit">Unité</th></tr></thead>'
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
