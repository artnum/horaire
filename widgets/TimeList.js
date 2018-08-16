/* eslint-env amd, browser */
/* eslint no-template-curly-in-string: "off" */
/* global Hour */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/request/xhr',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dijit/Dialog',
  'horaire/_Result',
  'artnum/Log'
], function (
  djDeclare,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  djXhr,
  djOn,
  djDomConstruct,
  djDomClass,
  dtDialog,
  _Result,
  Log
) {
  return djDeclare('horaire.TimeList', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
  ], {
    baseClass: 'HTimeList',
    templateString: '<div class="${baseClass}"></div>',

    constructor: function () {
      this.loaded = { data: false }
      this.inherited(arguments)
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
              if (json.type === 'results' && json.data.length > 0) {
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

    draw: function () {
      if (this.loaded.data) {
        this.clear()
        var data = this.get('data')
        var frag = document.createDocumentFragment()

        var node = document.createElement('DIV')
        node.setAttribute('class', 'entries head')
        node.innerHTML = '<span class="day">Jour</span><span class="time">Durée</span><span class="project">Projet</span>'
        frag.appendChild(node)
        for (var i = 0; i < data.length; i++) {
          if (data[i].hProject.closed) {
            continue
          }
          node = document.createElement('DIV')
          node.setAttribute('class', 'entries')
          var txt = '<span class="day">' + (new Date(data[i].day)).shortDate() + '</span>'
          txt += '<span class="time">' + (new Hour(data[i].value).toMinStr()) + '</span>'
          txt += '<span class="project">' + data[i].hProject.name + '</span>'

          node.innerHTML = txt
          frag.appendChild(node)
        }

        window.requestAnimationFrame(function () {
          this.domNode.appendChild(frag)
        }.bind(this))
      }
    },

    refresh: function () {
      this.load().then(function () {
        this.draw()
      }.bind(this))
    }

  })
})
