/* eslint-env browser,amd */
/* global Hour */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/text!./templates/Entity.html',
  'dojo/request/xhr',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dijit/Dialog',
  'horaire/_Result',
  'horaire/Projects',
  'horaire/TimeBox',
  'horaire/TimeList',
  'artnum/Log'
], function (
  djDeclare,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  template,
  djXhr,
  djOn,
  djDomConstruct,
  djDomClass,
  dtDialog,
  _Result,
  HProjects,
  HTimeBox,
  HTimeList,
  Log
) {
  return djDeclare('horaire.Entity', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
  ], {
    templateString: template,
    baseClass: 'entity',
    security: false,
    pane: null,
    link: null,
    entry: null,
    _passwordBoxHtml: '<div class="inputbox"><input type="password" placeholder="Mot de passe" /></div>',

    constructor: function (entry, options) {
      this.entry = entry
      this.link = options.link
      this.pane = options.pane
    },

    postCreate: function () {
      var cn = document.createTextNode(this.get('commonName'))
      this.nCommonName.appendChild(cn)

      djDomClass.add(this.pane.domNode, 'desktop')

      this.open()
      djOn(this.nRoot, 'click', djLang.hitch(this, function () { window.location.hash = this.link }))
    },

    open: function () {
      if (this.security) {
        if (!this.login()) {
          return
        }
      }

      var prj = new HProjects({ class: 'section' })
      this.Project = prj
      this.pane.domNode.appendChild(prj.domNode)
      djOn(prj, 'change', function (event) {
        var url = this.TimeList.get('url')
        url.searchParams.set('search.project', event)
        this.TimeList.set('url', url)
        this.TimeList.refresh()
      }.bind(this))

      var tbx = new HTimeBox({ class: 'section' })
      this.pane.domNode.appendChild(tbx.domNode)

      var url = new URL(window.location.origin + '/horaire/Htime')
      url.searchParams.append('sort.created', 'DESC')
      url.searchParams.append('search.entity', this.entry.id)

      var list = new HTimeList({url: url})
      this.TimeList = list
      this.pane.domNode.appendChild(list.domNode)

      djOn(tbx, 'submit', function (event) {
        if (!event.date || !event.second || !prj.get('value')) {
          new Log({message: 'Entrée incomplète', timeout: 2}).show()
          return
        }
        var query = {entity: this.entry.id, project: prj.get('value'), value: event.second, day: event.date.toISOString()}

        fetch('/horaire/Htime', {method: 'post', body: JSON.stringify(query)}).then(function () {
          list.refresh()
        })
      }.bind(this))

      list.refresh()
    },

    closeLogin: function () {
      if (this.loginOpened) {
        var that = this
        var l = this.loginOpened
        this.loginOpened = null
        window.requestAnimationFrame(function () { that.nRoot.removeChild(l) })
      }
    },

    login: function () {
      if (this.loginOpened) { return }
      var that = this
      var frag = document.createDocumentFragment()
      var form = document.createElement('FORM')

      djOn(form, 'submit', alert('ok'))

      form.appendChild(djDomConstruct.toDom(this._passwordBoxHtml))
      frag.appendChild(form)
      this.loginOpened = form
      window.requestAnimationFrame(function () { that.nRoot.appendChild(frag) })
    }

  })
})
