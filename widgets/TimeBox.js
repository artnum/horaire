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
            this._set('_project', Array.isArray(json.data) ? json.data[0] : json.data)
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
      now.setHours(12, 0, 0, 0)
      var group = new ButtonGroup({name: 'day'})
      this.own(group)

      let start = djDate.add(now, 'day', -(this.lateDay - 1))
      /* if on sunday or saturday, you can input up to the previous friday */
      if (start.getDay() === 0) {
        start = djDate.add(start, 'day', -2)
      } else if (start.getDay() === 6) {
        start = djDate.add(start, 'day', -1)
      }
      while (start.getTime() <= now.getTime()) {
        group.addValue(start, {label: start.getDate() + '.' + (start.getMonth() + 1)})
        start = djDate.add(start, 'day', 1)
      }

      this.nDays.appendChild(group.domNode)
      this.selectDay = group
      djOn(this.selectDay, 'change', function () {
        this.emit('changeday', this.selectDay.get('value'))
        this.nHour.focus()
      }.bind(this))
      djOn(this.nHour, 'keyup', function (event) {
        if (event.key === 'Enter') {
          this.eSubmit()
          this.nHour.set('value', '')
        } else {
          let seconds = this.nHour.get('value')
          let h = Math.trunc(seconds / 3600)
          let m = Math.trunc(Math.round(((seconds / 3600) - h) * 60))
          let txt = `${h < 10 ? '0' + h : h} h ${m < 10 ? '0' + m : m} m`
          this.nHour.domNode.nextElementSibling.innerHTML = txt
        }
      }.bind(this))
    },

    eSubmit: function (event) {
      this.emit('submit', {second: this.nHour.get('value'), date: this.selectDay.get('value'), comment: this.nRemark.value})
    },
    clear: function () {
      this.nRemark.value = ''
      this.nHour.set('value', '')
      this.nHour.focus()
      if (this.nHour.domNode.nextElementSibling) {
        this.nHour.domNode.nextElementSibling.innerHTML = ''
      }
    }
  })
})
