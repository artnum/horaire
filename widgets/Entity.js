/* eslint-env browser,amd */
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

      var entity = document.createElement('DIV')
      entity.setAttribute('class', 'EntityPanel')
      var section1 = document.createElement('SECTION')
      var section2 = document.createElement('SECTION')
      var section3 = document.createElement('SECTION')
      entity.appendChild(section1)
      entity.appendChild(section2)
      entity.appendChild(section3)

      this.Project = new HProjects()
      this.own(this.Project)
      section1.appendChild(this.Project.domNode)

      this.TimeBox = new HTimeBox()
      this.own(this.TimeBox)
      section2.appendChild(this.TimeBox.domNode)

      var url = new URL(window.location.origin + '/horaire/Htime')
      url.searchParams.append('sort.created', 'DESC')
      url.searchParams.append('search.entity', this.entry.id)

      this.TimeList = new HTimeList({url: url})
      this.own(this.TimeList)
      section2.appendChild(this.TimeList.domNode)

      /* Attach events */
      djOn(this.Project, 'change', function (event) {
        var url = this.TimeList.get('url')
        url.searchParams.set('search.project', event)
        this.TimeList.set('url', url)
        this.TimeList.refresh()
      }.bind(this))

      djOn(this.TimeBox, 'submit', function (event) {
        if (!event.date || !event.second || !this.Project.get('value')) {
          new Log({message: 'Entrée incomplète', timeout: 2}).show()
          return
        }
        var query = {entity: this.entry.id, project: this.Project.get('value'), value: event.second, day: event.date.toISOString()}

        fetch('/horaire/Htime', {method: 'post', body: JSON.stringify(query)}).then(function () {
          this.TimeList.refresh()
        }.bind(this))
      }.bind(this))

      this.TimeList.refresh()

      window.requestAnimationFrame(function () {
        this.pane.domNode.appendChild(entity)
      }.bind(this))
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
