/* eslint-env browser,amd */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/text!./templates/People.html',
  'dojo/on',
  'dojo/parser',
  'dojo/dom-construct',
  'dojo/dom-class',

  'dijit/layout/StackContainer',
  'dijit/layout/ContentPane',
  'dijit/Dialog',
  'dijit/registry',

  'horaire/Button',
  'horaire/Entity',
  'horaire/_Result',
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
  djParser,
  djDomConstruct,
  djDomClass,

  dtStackContainer,
  DtContentPane,
  DtDialog,
  dtRegistry,

  hButton,
  HEntity,
  _Result,
  Log,
  Path,
  Query
) {
  return djDeclare('horaire.People', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
  ], {
    templateString: template,
    baseClass: 'people',
    postCreate: function () {
      var that = this

      var cp = new DtContentPane({ title: 'Accueil', id: 'home' })
      Query.exec(Path.url('Person')).then(function (body) {
        if (body.success && body.length > 0) {
          var frag = document.createDocumentFragment()
          for (var i = 0; i < body.length; i++) {
            var entry = body.data[i]
            var ecp = new DtContentPane({ id: 'P_' + entry.id, title: entry.name })
            var entity = new HEntity(entry, {pane: ecp, link: 'P_' + entry.id})
            that.own(entity)
            that.nContent.addChild(ecp)

            frag.appendChild(entity.domNode)
          }

          window.requestAnimationFrame(function () {
            that.nContent.addChild(cp)
            cp.set('content', frag)
            if (window.location.hash) {
              that.nContent.selectChild(window.location.hash.substr(1))
            } else {
              that.nContent.selectChild('home')
            }
            that.nContent.startup()
          })
        }
      })

      djOn(this.nNewProject, 'click', djLang.hitch(this, this.newProjectEvt))
      djOn(this.nNewPerson, 'click', djLang.hitch(this, this.newPersonEvt))
      djOn(this.nNewItem, 'click', djLang.hitch(this, this.newItemEvt))
      djOn(this.nHome, 'click', djLang.hitch(this, function () { window.location.hash = '#home' }))

      djOn(window, 'hashchange', djLang.hitch(this, function (e) {
        try {
          this.nContent.selectChild(window.location.hash.substr(1))
        } catch (e) {
          this.error('Destination inconnue')
        }
      }))
    },

    error: function (msg) {
      new Log({message: msg, timeout: 2}).show()
    },

    popForm: function (url, title, evts) {
      var that = this
      var body = document.getElementsByTagName('BODY')[0]

      djDomClass.add(body, 'waiting')
      fetch(url).then(function (result) { return result.text() }).then(function (html) {
        html = djDomConstruct.toDom(html)
        djParser.parse(html, {noStart: true}).then(function (dom) {
          var dialog = new DtDialog({title: title})
          dialog.addChild(dom[0])
          dialog.show()

          for (var k in evts) {
            var hitch = that
            if (evts[k].hitch) {
              hitch = evts[k].hitch
            }
            djOn(dialog.domNode.getElementsByTagName('FORM')[0], k, djLang.hitch(hitch, evts[k].func))
            djDomClass.remove(body, 'waiting')
          }
        })
      })
    },

    newItemEvt: function () {
      this.popForm(Path.url('html/newItem.html'), 'Nouvelle fourniture', {submit: {func: this.newItemEx.bind(this)}})
    },

    newItemEx: function (event) {
      event.preventDefault()
      var form = dtRegistry.byId(event.target.getAttribute('widgetid'))
      if (!form) {
        new Log({message: 'Erreur de traitement du formulaire', timeout: 2}).show()
        return
      }

      if (form.isValid()) {
        var value = form.getValues()

        var url = Path.url('Item', {params: {'search.deleted': '-', 'search.name': value.name}})
        Query.exec(url).then(function (json) {
          var proceed = false
          if (json.success && json.length === 0) {
            proceed = true
          } else {
            if (confirm('Une fourniture portant ce nom existe déjà. Créer quand même ?')) {
              proceed = true
            }
          }

          if (proceed) {
            url = Path.url('Item')
            Query.exec(url, {method: 'POST', body: value}).then(function (json) {
              if (json.success) {
                new Log({message: 'Nouvelle fourniture créée', timeout: 2, type: 'info'}).show()
                window.location.reload(true)
              }
            })
          }
        })
      }
    },

    newPersonEvt: function () {
      this.popForm(Path.url('html/newPerson.html'), 'Nouvelle personne', {submit: {func: this.newPersonEx.bind(this)}})
    },

    newPersonEx: function (event) {
      event.preventDefault()
      var form = dtRegistry.byId(event.target.getAttribute('widgetid'))
      if (!form) {
        new Log({message: 'Erreur de traitement du formulaire', timeout: 2}).show()
        return
      }

      if (form.isValid()) {
        var values = form.getValues()

        if (values.admin && values.admin.length > 0 && values.admin[0]) {
          values.admin = 255
        } else {
          values.admin = 1
        }
        var url = Path.url('Person', {params: {'search.deleted': '-', 'search.name': values.name}})
        Query.exec(url).then(function (json) {
          var proceed = false
          if (json.type === 'results' && json.data && json.data.length === 0) {
            proceed = true
          } else {
            if (confirm('Une personne du même nom existe déjà. Créer quand même ?')) {
              proceed = true
            }
          }

          if (proceed) {
            url = Path.url('Person')
            Query.exec(url, {method: 'POST', body: {name: values.name, level: values.admin}}).then(function (json) {
              if (json.success) {
                new Log({message: 'Nouvelle personne ajoutée', timeout: 2, type: 'info'}).show()
                window.location.reload(true)
              }
            })
          }
        })
      }
    },

    newProjectEvt: function () {
      this.popForm(Path.url('html/newProject.html'), 'Nouveau projet', {submit: {func: this.newProjectEx.bind(this)}})
    },
    newProjectEx: function (event) {
      event.preventDefault()
      var form = dtRegistry.byId(event.target.getAttribute('widgetid'))
      if (!form) {
        new Log({message: 'Erreur de traitement du formulaire', timeout: 2}).show()
        return
      }

      if (form.isValid()) {
        var values = form.getValues()

        var url = Path.url('Project', {params: {'search.name': values.pName}})
        Query.exec(url).then(function (json) {
          var proceed = false
          if (json.type === 'results' && json.data && json.data.length <= 0) {
            proceed = true
          } else {
            if (confirm('Un projet portant ce nom existe déjà. Créer quand même ?')) {
              proceed = true
            }
          }
          if (proceed) {
            var eDate = null
            if (values.pEndDate) {
              eDate = values.pEndDate.toISOString()
            }
            Query.exec(Path.url('Project'), {method: 'POST', body: {name: values.pName, targetEnd: eDate}}).then(function (results) {
              console.log(results)
              new Log({message: 'Nouveau projet créé', timeout: 2, type: 'info'}).show()
              window.location.reload(true)
            })
          }
        })
      }
    }

  })
})
