define([
	"dojo/_base/declare",
	"dojo/Evented",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/_base/lang",
	"dojo/text!./templates/TimeBox.html",

	"dojo/dom-class",
	"dojo/date",
	"dojo/on",
	"artnum/ButtonGroup"
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
	ButtonGroup
){
	return djDeclare('horaire.TimeBox', [
		_dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, djEvented
	],{
		templateString: template,
		baseClass: "timeBox",
		lateDay: 5,

		postCreate: function() {
			var now = new Date(Date.now()), group = new ButtonGroup();
			this.own(group);
			for(var i = this.lateDay - 1; i >= 0; i--) {
				var day = djDate.add(now, 'day', -i);
				group.addValue(day, { label: day.getDate() + '.' + (day.getMonth() + 1) });
			}
			
			this.nDays.appendChild(group.domNode);
		}

	});
});
