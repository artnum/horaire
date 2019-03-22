/* eslint-env amd, browser */
/* eslint no-template-curly-in-string: "off" */
/* global Hour */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dijit/Dialog',
  'horaire/_Result',
  'horaire/LoaderWidget',
  'artnum/dojo/Log',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  _dtWidgetBase,
  _dtTemplatedMixin,
  _dtWidgetsInTemplateMixin,
  djLang,
  djOn,
  djDomConstruct,
  djDomClass,
  dtDialog,
  _Result,
  LoaderWidget,
  Log,
  Path,
  Query
) {
  return djDeclare('horaire.TimeList', [
    _dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, LoaderWidget
  ], {
    baseClass: 'HTimeList',
    templateString: '<div class="${baseClass}"></div>',

    draw: function () {
      var today = new Date()
      var lastMonth = new Date()
      lastMonth.setMonth(today.getMonth() - 1)
      var url = Path.url('Htime')
      url.searchParams.append('sort.day', 'DESC')
      url.searchParams.append('search.person', this.user.id)
      url.searchParams.append('search.day', `>${lastMonth.toISOString().split('T')[0]}`)
      url.searchParams.append('search.day', `<=${today.toISOString().split('T')[0]}`)
      Query.exec(url).then(function (result) {
        if (result.success && result.length > 0) {
          var table = `<h2>Dernières entrées (du ${lastMonth.shortDate()} au  ${today.shortDate()})</h2><table>
               <thead><tr><th>Jour</th><th>Durée</th><th>Projet</th><th>Processus</th></tr></thead><tbody>`
          for (var i = 0; i < result.length; i++) {
            var e = result.data[i]
            var tr = `<tr><td>${new Date(e.day).shortDate()}</td><td>${(new Hour(e.value)).toMinStr()}</td><td>${e._project.reference} - ${e._project.name}</td><td>${e._process.name}</td></tr>`
            table += tr
          }
          table += '</tbody>'
        }
        window.requestAnimationFrame(function () {
          if (this.domNode.lastChild && this.domNode.lastChild.nodeNamei === 'DIV') {
            this.domNode.lastChild.innerHTML = table
          } else {
            this.domNode.appendChild(document.createElement('DIV'))
            this.domNode.lastChild.setAttribute('class', 'lastentry')
            this.domNode.lastChild.innerHTML = table
          }
        }.bind(this))
      }.bind(this))
      if (this.loaded.data) {
        this.clear()
        var data = this.get('data')
        var frag = document.createDocumentFragment()

        var table = document.createElement('TABLE')
        var thead = document.createElement('THEAD')
        thead.setAttribute('class', 'entries head')
        thead.innerHTML = '<tr><th class="day">Jour</th><th class="time">Durée</th><th class="project">Projet</th><th></th></tr>'
        var totalTime = 0
        var tbody = document.createElement('TBODY')
        for (var i = 0; i < data.length; i++) {
          if (data[i]._project.closed) {
            continue
          }
          var tr = document.createElement('TR')
          tr.setAttribute('class', 'entries')
          var project = data[i]._project.name
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
          td.setAttribute('data-time-id', data[i].id)
          td.innerHTML = '<i class="fas fa-eraser" />'
          djOn(td, 'click', function (event) {
            var node = event.target
            while (node.nodeName !== 'TD') { node = node.parentNode }
            console.log(node)
            var url = Path.url('Htime/' + node.getAttribute('data-time-id'))
            Query.exec(url, {method: 'DELETE', body: {id: event.target.getAttribute('data-time-id')}}).then(function (response) {
              this.refresh()
            }.bind(this))
          }.bind(this))
          tr.appendChild(td)
          tbody.appendChild(tr)

          if (data[i].comment) {
            tr = document.createElement('TR')
            tr.setAttribute('class', 'comment')
            tr.innerHTML = '<td colspan="4">' + data[i].comment + '</td>'
            tbody.appendChild(tr)
          }
        }

        this.set('total', new Hour(totalTime))

        var tfoot = document.createElement('TFOOT')
        tfoot.innerHTML = '<tr><td>Total</td><td class="time">' + (new Hour(totalTime).toMinStr()) + '</td><td></td><td></tr>'

        table.appendChild(thead)
        table.appendChild(tbody)
        table.appendChild(tfoot)
        frag.appendChild(table)

        window.requestAnimationFrame(function () {
          this.domNode.insertBefore(frag, this.domNode.lastChild)
        }.bind(this))
      }
    }
  })
})
