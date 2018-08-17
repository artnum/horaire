/* eslint-env amd, browser */
/* eslint no-template-curly-in-string: "off" */
/* global Hour */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/request/xhr',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dijit/Dialog',
  'horaire/_Result',
  'horaire/LoaderWidget',
  'artnum/Log'
], function (
  djDeclare,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  djXhr,
  djOn,
  djDomConstruct,
  djDomClass,
  dtDialog,
  _Result,
  LoaderWidget,
  Log
) {
  return djDeclare('horaire.TimeList', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, LoaderWidget
  ], {
    baseClass: 'HTimeList',
    templateString: '<div class="${baseClass}"></div>',

    draw: function () {
      if (this.loaded.data) {
        this.clear()
        var data = this.get('data')
        var frag = document.createDocumentFragment()

        if (this.user.level > 127 && this.get('project')) {
          var a = document.createElement('A')
          var url = new URL(window.location.origin + '/horaire/exec/export/project.php')
          url.searchParams.set('pid', this.get('project'))
          a.setAttribute('href', url)
          a.appendChild(document.createTextNode('Export .xlsx'))
          frag.appendChild(a)
        }

        var table = document.createElement('TABLE')
        var thead = document.createElement('THEAD')
        thead.setAttribute('class', 'entries head')
        thead.innerHTML = '<tr><th class="day">Jour</th><th class="time">Durée</th><th class="project">Projet</th><th></th>'
        var totalTime = 0
        var tbody = document.createElement('TBODY')
        for (var i = 0; i < data.length; i++) {
          if (data[i]._projects.closed) {
            continue
          }
          var tr = document.createElement('TR')
          tr.setAttribute('class', 'entries')
          var project = data[i]._projects.name
          if (this.user.id !== data[i].person) {
            tr.setAttribute('class', 'entries foreign')
            project += '<span class="person">' + data[i]._person.name + '</span>'
          } else {
            tr.setAttribute('class', 'entries')
          }
          totalTime += Number(data[i].value)
          tr.innerHTML = '<td class="day">' + (new Date(data[i].day)).shortDate() + '</td><td class="time">' + (new Hour(data[i].value).toMinStr()) + '</td><td class="project">' + project + '</td>'

          var td = document.createElement('TD')
          td.setAttribute('class', 'delete')
          td.innerHTML = '<i class="fas fa-eraser" data-time-id="' + data[i].id + '" />'
          djOn(td, 'click', function (event) {
            var url = new URL(window.location.origin + '/horaire/Htime/' + event.target.getAttribute('data-time-id'))
            fetch(url, {method: 'DELETE', body: JSON.stringify({id: event.target.getAttribute('data-time-id')})}).then(function (response) {
              console.log(url, response)
              this.refresh()
            }.bind(this))
          }.bind(this))
          tr.appendChild(td)
          tbody.appendChild(tr)
        }

        this.set('total', new Hour(totalTime))

        var tfoot = document.createElement('TFOOT')
        tfoot.innerHTML = '<tr><td>Total</td><td class="time">' + (new Hour(totalTime).toMinStr()) + '</td><td></td><td></tr>'

        table.appendChild(thead)
        table.appendChild(tbody)
        table.appendChild(tfoot)
        frag.appendChild(table)

        window.requestAnimationFrame(function () {
          this.domNode.appendChild(frag)
        }.bind(this))
      }
    }
  })
})
