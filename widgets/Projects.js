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
      this.Group = group

      djOn(group, 'change', function (event) {
        this.emit('change', event)
      }.bind(this))

      var url = Path.url('Project', {params: {'search.closed': '-', 'sort.opened': 'desc'}})
      Query.exec(url).then(function (results) {
        for (var i = 0; i < results.data.length; i++) {
          var entry = results.data[i]
          group.addValue(entry.id, {type: 'project', label: entry.name})
        }

        window.requestAnimationFrame(function () { that.domNode.appendChild(group.domNode) })
      })
    },

    _getValueAttr: function () {
      return this.Group.get('value')
    },
    _getNameAttr: function () {
      return this.Group.get('label')
    }
  })
})
