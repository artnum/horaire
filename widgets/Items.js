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
  'artnum/Log'
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
  Log
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
        var frag = document.createDocumentFragment()

        var node = document.createElement('TABLE')
        node.innerHTML = '<thead><tr><th class="name">Fourniture</th><th class="unit">Unité</th><th class="price">Prix</th><th>Description</th></tr></thead>'
        frag.appendChild(node)
        var tbody = document.createElement('TBODY')

        for (var i = 0; i < data.length; i++) {
          var tr = this.itemHtml(data[i], tbody)
          djOn(tr, 'click', this.selectItem.bind(this))
        }
        node.appendChild(tbody)

        window.requestAnimationFrame(function () {
          this.domNode.appendChild(frag)
        }.bind(this))
      }
    }
  })
})
