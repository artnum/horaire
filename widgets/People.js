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
  'artnum/dojo/Log'
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
  Log
) {
  return djDeclare('horaire.People', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
  ], {
    templateString: template,
    baseClass: 'people',
    postCreate: function () {
      var cp = new DtContentPane({ title: 'Accueil', id: 'home' })
      fetch(`${KAAL.getBase()}/Person/_query`, {method: 'POST', body: JSON.stringify({
        '#and': {
          disabled: 0,
          deleted: '-'
        }
      })})
      .then(response => {
        if (!response.ok) { throw new Error('Erreur de chargement') }
        return response.json()
      })
      .then(body => {
        if (body.length < 1) { return }
        
        const frag = document.createDocumentFragment()
        for (let i = 0; i < body.length; i++) {
          var entry = body.data[i]
          var ecp = new DtContentPane({ id: 'P_' + entry.id, title: entry.name })
          var entity = new HEntity(entry, {pane: ecp, link: 'P_' + entry.id})
          this.own(entity)
          this.nContent.addChild(ecp)

          frag.appendChild(entity.domNode)
        }

        window.requestAnimationFrame(() => {
          this.nContent.addChild(cp)
          cp.set('content', frag)
          if (window.location.hash) {
            this.nContent.selectChild(window.location.hash.substring(1))
          } else {
            this.nContent.selectChild('home')
          }
          this.nContent.startup()
        })
      })
      .catch(error => {
        console.log(error)
      })

      djOn(this.nHome, 'click', djLang.hitch(this, function () { window.location.hash = '#home' }))

      djOn(window, 'hashchange', djLang.hitch(this, function (e) {
        var nurl = new URL(e.newURL)
        try {
          this.nContent.selectChild(nurl.hash.substring(1))
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
