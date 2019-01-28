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
  'artnum/dojo/ButtonGroup',
  'artnum/dojo/Hour',
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

  djDomClass,
  djDate,
  djOn,
  djDomForm,
  ButtonGroup,
  Hour,
  Path,
  Query
) {
  return djDeclare('horaire.TimeBox', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, djEvented
  ], {
    templateString: template,
    baseClass: 'timeBox',
    lateDay: 2,

    _setProjectAttr: function (value) {
      this._set('project', value)
      if (value) {
        var url = Path.url('Project/' + value)
        Query.exec(url).then(function (json) {
          if (json.success) {
            this._set('_project', json.data)
            this.printTitle()
          }
        }.bind(this))
      } else {
        this._set('_process', null)
        this.printTitle()
      }
    },
    _setProcessAttr: function (value) {
      this._set('process', value)
      if (value) {
        var url = Path.url('Process/' + value)
        Query.exec(url).then(function (json) {
          if (json.success) {
            this._set('_process', json.data)
            this.printTitle()
          }
        }.bind(this))
      } else {
        this._set('_process', null)
        this.printTitle()
      }
    },
    printTitle: function () {
      var str = ''
      if (this.get('_project')) {
        str = '<span class="name project">' + this.get('_project').name + '</span>'
        if (this.get('_process')) {
          str += '::'
        }
      }

      if (this.get('_process')) {
        str += '<span class="name process">' + this.get('_process').name + '</span>'
      }
      window.requestAnimationFrame(function () {
        this.nTitle.innerHTML = str
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
      djOn(this.selectDay, 'change', function () {
        this.emit('changeday', this.selectDay.get('value'))
        this.nHour.focus()
      }.bind(this))
      djOn(this.nHour, 'keypress', function (event) {
        if (event.key === 'Enter') {
          this.eSubmit()
          this.nHour.set('value', '')
        }
      }.bind(this))
    },

    eSubmit: function (event) {
      this.emit('submit', {second: this.nHour.get('value'), date: this.selectDay.get('value'), comment: this.nRemark.value})
      this.nRemark.value = ''
      this.nHour.set('value', '')
      this.nHour.focus()
    }
  })
})
