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
      this.Group = group
      this.Process = process

      djOn(group, 'change', function (event) {
        window.requestAnimationFrame(function () {
          this.domNode.replaceChild(this.Process.domNode, this.Group.domNode)
        }.bind(this))
      }.bind(this))

      djOn(process, 'change', function (event) {
        this.emit('change', this.get('value'))
      }.bind(this))

      var url = Path.url('Project', {params: {'search.closed': '-', 'sort.opened': 'desc'}})
      Query.exec(url).then(function (results) {
        for (var i = 0; i < results.data.length; i++) {
          var entry = results.data[i]
          group.addValue(entry.id, {type: 'project', label: entry.name})
        }

        window.requestAnimationFrame(function () { that.domNode.appendChild(group.domNode) })
      })

      url = Path.url('Process', {params: {'search.deleted': '-'}})
      Query.exec(url).then(function (results) {
        if (results.success) {
          for (var i = 0; i < results.length; i++) {
            process.addValue(results.data[i].id, {type: 'process', label: results.data[i].name})
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
