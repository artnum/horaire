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
      Query.exec(Path.url('Person', {params: {'search.deleted': '-', 'search.disabled': 0}})).then(function (body) {
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

      djOn(this.nHome, 'click', djLang.hitch(this, function () { window.location.hash = '#home' }))

      djOn(window, 'hashchange', djLang.hitch(this, function (e) {
        var nurl = new URL(e.newURL)
        try {
          this.nContent.selectChild(nurl.hash.substr(1))
        } catch (e) {
          this.error('Destination inconnue')
        }
      }))
    },

    error: function (msg) {
      new Log({message: msg, timeout: 2}).show()
    }
  })
})
