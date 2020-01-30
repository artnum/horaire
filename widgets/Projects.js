/* eslint-env browser, amd */
/* global mod10key */
define([
  'dojo/_base/declare',
  'dojo/Evented',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/text!./templates/Projects.html',
  'dojo/on',
  'dojo/date',

  'dijit/layout/StackContainer',
  'dijit/layout/ContentPane',
  'dijit/registry',

  'artnum/dojo/Button',
  'artnum/dojo/ButtonGroup',
  'artnum/Path',
  'artnum/Query',
  'artnum/dojo/Log'
], function (
  djDeclare,
  djEvented,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  template,
  djOn,
  djDate,

  dtStackContainer,
  dtContentPane,
  dtRegistry,

  Button,
  ButtonGroup,
  Path,
  Query,
  Log
) {
  return djDeclare('horaire.Projects', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, djEvented
  ], {
    templateString: template,
    baseClass: 'project',

    postCreate: function () {
      var that = this
      var group = new ButtonGroup({moveNode: false}); this.own(group)
      var process = new ButtonGroup({moveNode: false}); this.own(process)
      this.On = 'group'
      this.Group = group
      this.Process = process
      this.Travaux = null

      djOn(this.domNode, 'keyup', function (event) {
        if (event.target.name !== 'searchRef') { return }
        event.stopPropagation()
        let value = event.target.value
        /* from code bar */
        let values = new Promise((resolve, reject) => {
          if (value.length !== 14) {
            resolve(null)
            return
          }
          let check = mod10key(value.substr(0, 13))
          if (parseInt(value[13]) !== check) {
            resolve(null)
            return
          }
          let type = parseInt(value.substr(0, 4))
          let id = parseInt(value.substr(4, 9))
          switch (type) {
            case 1:
              Query.exec(Path.url(`Travail/${id}`)).then((result) => {
                if (!result.success || result.length === 0) { resolve(null); return }
                let travail = result.data
                if (travail.closed !== '0') { resolve(null) }
                Query.exec(Path.url(`Project/${travail.project}`)).then((result) => {
                  if (!result.success || result.length === 0) { resolve(null); return }
                  if (result.data.deleted || result.data.closed) { resolve(null); return }
                  resolve({travail: travail.id, project: result.data.id})
                })
              })
              break
            case 2:
              Query.exec(Path.url(`Project/${id}`)).then((result) => {
                if (!result.success || result.length === 0) { resolve(null); return }
                let project = result.data
                if (project.deleted || project.closed) { resolve(null); return }
                resolve({travail: null, project: project.id})
              })
              break
            default: resolve(null)
          }
        })
        values.then(function (v) {
          if (!v) {
            if (this.On === 'process') {
              if (!this.Process.get('value')) {
                this.Process.filterWith(value)
              }
              if (this.Travaux) {
                if (!this.Travaux.get('value')) {
                  this.Travaux.filterWith(value)
                }
              }
            } else {
              this.Group.filterWith(value)
            }
          } else {
            this.setValues(v)
          }
        }.bind(this))
      }.bind(this))

      djOn(group, 'change', function (event) {
        this.On = 'process'
        this.emit('change', this.get('value'))
        let GTravaux = this.travail(this.get('value').project)
        window.requestAnimationFrame(function () {
          this.content.replaceChild(this.Process.domNode, this.Group.domNode)
          var back = document.createElement('DIV')
          back.setAttribute('class', 'artnumButton')
          back.setAttribute('style', 'margin-bottom: 14px')
          back.innerHTML = '← Retour'
          this.content.insertBefore(back, this.Process.domNode)
          let dNode = this.Process.domNode
          GTravaux.then((n) => {
            this.Travaux = n
            let title = document.createElement('H2')
            title.appendChild(document.createTextNode('Avec bon de travail'))
            window.requestAnimationFrame(() => {
              dNode.parentNode.insertBefore(n.domNode, dNode.nextElementSibling)
              dNode.parentNode.insertBefore(title, dNode.nextElementSibling)
            })
          })

          djOn(back, 'click', function (event) {
            this.On = 'group'
            this.Process.set('value', null)
            this.Group.set('value', null)
            this.emit('change', this.get('value'))
            let nodes = []
            let n = event.target
            while (n) {
              nodes.push(n)
              n = n.nextSibling
            }
            window.requestAnimationFrame(function () {
              nodes.forEach((n) => {
                n.parentNode.removeChild(n)
              })
              this.content.appendChild(this.Group.domNode)
            }.bind(this))
          }.bind(this))
        }.bind(this))
      }.bind(this))

      djOn(process, 'change', function (event) {
        this.emit('change', this.get('value'))
      }.bind(this))

      var url = Path.url('Project', {params: {'search.closed': '-', 'sort.opened': 'desc', 'search.deleted': '-', 'sort.reference': 'asc'}})
      Query.exec(url).then(function (results) {
        for (var i = 0; i < results.data.length; i++) {
          var entry = results.data[i]
          var label = entry.reference ? '(' + entry.reference + ') ' + entry.name : entry.name
          group.addValue(entry.id, {type: 'project', label: label, filterValue: entry.reference ? [ entry.reference, entry.name ] : entry.name})
        }

        window.requestAnimationFrame(function () { that.content.appendChild(group.domNode) })
      })

      url = Path.url('Process', {params: {'search.deleted': '-'}})
      Query.exec(url).then(function (results) {
        if (results.success) {
          for (var i = 0; i < results.length; i++) {
            process.addValue(results.data[i].id, {type: 'process', label: results.data[i].name, filterValue: results.data[i].name})
          }
        }
      })
    },

    travail: function (pid) {
      return new Promise(function (resolve, reject) {
        Query.exec(Path.url(`Project/${pid}`)).then((projet) => {
          Query.exec(Path.url('Travail', {params: {'search.project': pid, 'search.closed': 0}})).then(function (travaux) {
            if (!travaux.success || travaux.length <= 0) { reject(new Error('Pas de travaux')); return }
            let GTravaux = new ButtonGroup({moveNode: false})
            travaux.data.forEach((travail) => {
              GTravaux.addValue(travail.id, {type: 'travail', label: `Bon : "${projet.data.reference}.${travail.id}"`, filterValue: [travail.reference, travail.id, projet.data.reference]})
            })
            resolve(GTravaux)
          })
        })
      })
    },

    setValues: function (values) {
      this.On = 'process'
      this.resetMenu()
      if (values.project) { this.Group.set('value', values.project) }
      let GTravaux = this.travail(this.Group.get('value'))
      window.requestAnimationFrame(function () {
        if (this.Group.domNode) {
          this.content.replaceChild(this.Process.domNode, this.Group.domNode)
        }
        var back = document.createElement('DIV')
        back.setAttribute('class', 'artnumButton')
        back.setAttribute('style', 'margin-bottom: 14px')
        back.innerHTML = '← Retour'
        this.content.insertBefore(back, this.Process.domNode)
        let dNode = this.Process.domNode
        GTravaux.then((n) => {
          this.Travaux = n
          let title = document.createElement('H2')
          title.appendChild(document.createTextNode('Avec bon de travail'))
          window.requestAnimationFrame(() => {
            dNode.parentNode.insertBefore(n.domNode, dNode.nextElementSibling)
            dNode.parentNode.insertBefore(title, dNode.nextElementSibling)
            if (values.travail) { this.Travaux.set('value', values.travail) }
          })
        })
      }.bind(this))
    },

    resetMenu: function () {
      this.Process.filterWith('')
      this.Group.filterWith('')
      if (this.Travaux) { this.Travaux.filterWith('') }
      this.Process.set('value', null)
      this.Group.set('value', null)
      if (this.Travaux) { this.Travaux.set('value', null) }
      let nodes = []
      let n = this.content.firsElementChild
      while (n) {
        nodes.push(n)
        n = n.nextSibling
      }
      window.requestAnimationFrame(function () {
        this.content.innerHTML = ''
        this.content.appendChild(this.Group.domNode)
      }.bind(this))
    },
    emptyBox: function (event) {
      event.target.value = ''
      this.Process.filterWith('')
      this.Group.filterWith('')
      if (this.Travaux) { this.Travaux.filterWith('') }
    },
    _getValueAttr: function () {
      return {project: this.Group.get('value'), process: this.Process.get('value'), travail: this.Travaux ? this.Travaux.get('value') : null}
    },
    _getNameAttr: function () {
      return {project: this.Group.get('label'), process: this.Process.get('label'), travail: this.Travaux ? this.Travaux.get('label') : null}
    }
  })
})
