/* eslint-env browser,amd */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/text!./templates/Entity.html',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dijit/Dialog',
  'horaire/_Result',
  'horaire/Projects',
  'horaire/TimeBox',
  'horaire/TimeList',
  'horaire/Items',
  'artnum/dojo/Log',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  template,
  djOn,
  djDomConstruct,
  djDomClass,
  dtDialog,
  _Result,
  HProjects,
  HTimeBox,
  HTimeList,
  HItems,
  Log,
  Path,
  Query
) {
  return djDeclare('horaire/Entity', [
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
      var cn = document.createTextNode(this.get('name'))
      this.nCommonName.appendChild(cn)

      djDomClass.add(this.pane.domNode, 'desktop')

      this.open()
      djOn(this.nRoot, 'click', djLang.hitch(this, function () {
        window.location.hash = this.link
        this.TimeList.refresh()
        this.Items.refresh()
      }))
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

      this.Project = new HProjects({user: this.entry})
      this.own(this.Project)
      section1.appendChild(this.Project.domNode)

      this.TimeBox = new HTimeBox({user: this.entry})
      this.own(this.TimeBox)
      section2.appendChild(this.TimeBox.domNode)

      var url = Path.url('Htime')
      url.searchParams.append('sort.created', 'DESC')
      if (Number(this.entry.level) < 127) {
        url.searchParams.append('search.person', this.entry.id)
      }
      url.searchParams.set('search.deleted', '-')

      this.TimeList = new HTimeList({url: url, user: this.entry})
      this.own(this.TimeList)
      section2.appendChild(this.TimeList.domNode)

      url = Path.url('Item')
      url.searchParams.set('search.deleted', '-')
      this.Items = new HItems({url: url, user: this.entry})
      this.own(this.Items)
      section3.appendChild(this.Items.domNode)

      /* Attach events */
      djOn(this.Project, 'change', function (event) {
        var url = this.TimeList.get('url')
        url.searchParams.set('search.project', event)
        this.TimeList.set('project', event)
        this.TimeBox.set('project', event)
        this.Items.set('project', event)
        this.TimeList.set('url', url)
        this.TimeList.refresh()

        if (this.Quantity) {
          this.Quantity.destroy()
        }

        url = Path.url('Quantity', {params: {'search.project': event}})
        this.Quantity = new HItems({url: url, user: this.entry})
        this.own(this.Quantity)
        section3.insertBefore(this.Quantity.domNode, this.Items.domNode)
        this.Quantity.refresh()
      }.bind(this))

      djOn(this.TimeBox, 'submit', function (event) {
        if (!event.date || !event.second || !this.Project.get('value')) {
          new Log({message: 'Entrée incomplète', timeout: 2}).show()
          return
        }
        var query = {person: this.entry.id, project: this.Project.get('value'), value: event.second, day: event.date.toISOString()}

        Query.exec(Path.url('Htime'), {method: 'post', body: query}).then(function () {
          this.TimeList.refresh()
        }.bind(this))
      }.bind(this))

      djOn(this.Items, 'submit', function (event) {
        if (!event.project || !event.item) {
          new Log({message: 'Entrée incomplète', timeout: 2}).show()
          return
        }
        var url = Path.url('Quantity', {params: {'search.project': event.project, 'search.item': event.item}})
        Query.exec(url).then(function (json) {
          console.log(json)
          if (json.success && json.length > 0) {
            var addTo = json.data[0]
            var body = {id: addTo.id, value: Number(addTo.value) + Number(event.quantity)}
            Query.exec(Path.url('Quantity/' + addTo.id), {method: 'PUT', body: body}).then(function (response) {
              this.Items.refresh()
              if (this.Quantity) {
                this.Quantity.refresh()
              }
            }.bind(this))
          } else {
            Query.exec(Path.url('Quantity'), {method: 'POST', body: {value: event.quantity, project: event.project, item: event.item, person: this.entry.id}}).then(function (response) {
              this.Items.refresh()
              if (this.Quantity) {
                this.Quantity.refresh()
              }
            }.bind(this))
          }
        }.bind(this))
      }.bind(this))

      this.TimeList.refresh()
      this.Items.refresh()

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
