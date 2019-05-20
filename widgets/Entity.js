/* eslint-env browser,amd */
/* global sjcl */
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
    security: true,
    pane: null,
    link: null,
    entry: null,
    _passwordBoxHtml: '<div class="inputbox"><input type="password" placeholder="Mot de passe" name="password" /><input type="submit" value="Ok"/></div>',

    constructor: function (entry, options) {
      this.entry = entry
      this.link = options.link
      this.pane = options.pane
    },

    postCreate: function () {
      var cn = document.createTextNode(this.get('name'))
      this.nCommonName.appendChild(cn)

      djDomClass.add(this.pane.domNode, 'desktop')

      djOn(this.nRoot, 'click', djLang.hitch(this, function () {
        if (this.security) {
          this.login()
        } else {
          this.open()
        }
      }))
    },

    open: function () {
      window.location.hash = this.link

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

      var today = new Date()
      var lastMonth = new Date()
      lastMonth.setMonth(today.getMonth() - 1)
      url.searchParams.append('sort.created', 'DESC')
      url.searchParams.append('search.person', this.entry.id)
      url.searchParams.append('search.day', `${lastMonth.toISOString().split('T')[0]}`)
      url.searchParams.set('search.deleted', '-')

      this.TimeList = new HTimeList({url: url, user: this.entry})
      this.own(this.TimeList)
      section2.appendChild(this.TimeList.domNode)

      djOn(this.TimeBox, 'changeday', function (day) {
        var url = Path.url('Htime')
        url.searchParams.append('sort.created', 'DESC')
        url.searchParams.append('search.person', this.entry.id)
        url.searchParams.append('search.day', day.toISOString().split('T')[0])
        url.searchParams.set('search.deleted', '-')
        this.TimeList.url = url
        this.TimeList.refresh()
      }.bind(this))

      url = Path.url('Item')
      url.searchParams.set('search.deleted', '-')
      this.Items = new HItems({url: url, user: this.entry})
      this.own(this.Items)
      section3.appendChild(this.Items.domNode)

      /* Attach events */
      djOn(this.Project, 'change', function (event) {
        var url = this.TimeList.get('url')
        url.searchParams.set('search.project', event.project)
        this.TimeList.set('project', event.project)
        this.TimeBox.set('project', event.project)
        this.TimeBox.set('process', event.process)
        this.Items.set('project', event.project)
        this.TimeList.set('url', url)
        this.TimeList.refresh()

        if (this.Quantity) {
          this.Quantity.destroy()
        }

        url = Path.url('Quantity', {params: {'search.project': event.project}})
        this.Quantity = new HItems({url: url, user: this.entry})
        this.own(this.Quantity)
        section3.insertBefore(this.Quantity.domNode, this.Items.domNode)
        this.Quantity.refresh()
      }.bind(this))

      djOn(this.TimeBox, 'submit', function (event) {
        var project = this.Project.get('value')
        console.log(this, project)
        if (!event.date || !event.second || !project.project || (!project.process && !project.travail)) {
          new Log({message: 'Entrée incomplète', timeout: 2}).show()
          return
        }
        var query = {person: this.entry.id, project: project.project, value: event.second, day: event.date.toISOString().split('T')[0], process: project.process, comment: event.comment, travail: project.travail}

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
            Query.exec(Path.url('Quantity'), {method: 'POST', body: {value: event.quantity, project: event.project, process: event.process, item: event.item, person: this.entry.id}}).then(function (response) {
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
        this.pane.domNode.innerHTML = ''
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
      if (this.loginOpened) {
        return
      } else {
        this.loginOpened = true
      }
      var that = this
      var frag = document.createDocumentFragment()
      var form = document.createElement('FORM')

      form.appendChild(djDomConstruct.toDom(this._passwordBoxHtml))
      frag.appendChild(form)
      form.addEventListener('submit', function (event) {
        event.preventDefault()
        var nodeForm = event.target
        for (; nodeForm.nodeName !== 'FORM'; nodeForm = nodeForm.parentNode);
        var inputs = nodeForm.getElementsByTagName('INPUT')
        var password = null
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].getAttribute('name') === 'password') {
            password = inputs[i].value
            inputs[i].value = ''
            break
          }
        }
        if (password) {
          var keyopt = this.entry.keyopt.split(' ', 2)
          if (sjcl.codec.base64.fromBits(sjcl.misc.pbkdf2(password, sjcl.codec.base64.toBits(keyopt[1]), parseInt(keyopt[0]))) === this.entry.key) {
            this.open()
          } else {
            (new Log({message: 'Erreur d\'autentification', type: 'warn', timeout: 2})).show()
          }
        } else {
            (new Log({message: 'Erreur d\'autentification', type: 'warn', timeout: 2})).show()
        }
      }.bind(this))
      window.requestAnimationFrame(function () { that.nRoot.appendChild(frag) })
    }

  })
})
