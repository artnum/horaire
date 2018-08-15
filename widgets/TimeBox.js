/* eslint-env browser,amd */
define([
  'dojo/_base/declare',
  'dojo/Evented',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/text!./templates/TimeBox.html',

  'dojo/dom-class',
  'dojo/date',
  'dojo/on',
  'dojo/dom-form',
  'artnum/ButtonGroup',
  'artnum/Hour'
], function (
  djDeclare,
  djEvented,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  template,

  djDomClass,
  djDate,
  djOn,
  djDomForm,
  ButtonGroup,
  Hour
) {
  return djDeclare('horaire.TimeBox', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, djEvented
  ], {
    templateString: template,
    baseClass: 'timeBox',
    lateDay: 5,

    postCreate: function () {
      var now = new Date(Date.now())
      var group = new ButtonGroup({name: 'day'})
      this.own(group)
      for (var i = this.lateDay - 1; i >= 0; i--) {
        var day = djDate.add(now, 'day', -i)
        group.addValue(day, { label: day.getDate() + '.' + (day.getMonth() + 1) })
      }

      this.nDays.appendChild(group.domNode)
      this.selectDay = group
    },

    eSubmit: function (event) {
      this.emit('submit', {second: this.nHour.get('value'), date: this.selectDay.get('value')})
    }
  })
})
