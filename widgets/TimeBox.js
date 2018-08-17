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

    _setProjectAttr: function (value) {
      this._set('project', value)
      var url = new URL(window.location.origin + '/horaire/Project/' + value)
      fetch(url).then(function (response) { return response.json() }).then(function (json) {
        if (json.type === 'results' && json.data) {
          this.nTitle.innerHTML = json.data.name
          this._set('_project', json.data)
        }
      }.bind(this))
    },

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
      djOn(this.selectDay, 'change', function () { this.nHour.focus() }.bind(this))
      djOn(this.nHour, 'keypress', function (event) {
        if (event.key === 'Enter') {
          this.eSubmit()
          this.nHour.set('value', '')
        }
      }.bind(this))
    },

    eSubmit: function (event) {
      this.emit('submit', {second: this.nHour.get('value'), date: this.selectDay.get('value')})
      this.nHour.focus()
    }
  })
})
