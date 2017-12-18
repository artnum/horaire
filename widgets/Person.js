define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Person.html",

	"dijit/InlineEditBox",
	"dijit/form/TextBox",
	"dijit/form/DateTextBox",
	"dojo/date",
	"dojo/date/stamp",
	"dijit/form/NumberTextBox"
], function(
	declare,
	_WidgetBase,
	_TemplatedMixin,
	_WidgetsInTemplateMixin,
	template,
	InlineEditBox,
	TextBox,
	dtDateTextBox,
	djDate,
	djStamp,
	NumberTextBox
){ 
	return declare("airTime.Person", [ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin ], {
		templateString: template,
		baseClass: "airTimePerson",
		begin: null,
		_setBeginAttr: function( value ) {
			this._set('begin', value);
			this.nBegin.set('value', value);
		}

}); /* return declare */
}); /* define */
