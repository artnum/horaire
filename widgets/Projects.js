/* eslint-env browser, amd */
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
  'artnum/Query'
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
  Query

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

      djOn(this.domNode, 'keyup', function (event) {
        if (event.target.name !== 'searchRef') { return }
        if (this.On === 'process') {
          this.Process.filterWith(event.target.value)
        } else {
          this.Group.filterWith(event.target.value)
        }
      }.bind(this))

      djOn(group, 'change', function (event) {
        this.On = 'process'
        this.emit('change', this.get('value'))
        window.requestAnimationFrame(function () {
          this.content.replaceChild(this.Process.domNode, this.Group.domNode)
          var back = document.createElement('DIV')
          back.setAttribute('class', 'artnumButton')
          back.setAttribute('style', 'margin-bottom: 14px')
          back.innerHTML = '← Retour'
          this.content.insertBefore(back, this.Process.domNode)

          djOn(back, 'click', function () {
            this.On = 'group'
            this.Process.set('value', null)
            this.emit('change', this.get('value'))
            window.requestAnimationFrame(function () {
              this.content.removeChild(this.content.firstChild)
              this.content.replaceChild(this.Group.domNode, this.Process.domNode)
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

    _getValueAttr: function () {
      return {project: this.Group.get('value'), process: this.Process.get('value')}
    },
    _getNameAttr: function () {
      return {project: this.Group.get('label'), process: this.Process.get('label')}
    }
  })
})
