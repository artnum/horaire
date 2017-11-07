define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Person.html",

	"dijit/InlineEditBox",
	"dijit/form/TextBox",
	"dijit/form/NumberTextBox"
], function(
	declare,
	_WidgetBase,
	_TemplatedMixin,
	_WidgetsInTemplateMixin,
	template,
	InlineEditBox,
	TextBox,
	NumberTextBox
){ 
	return declare("airTime.Person", [ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin ], {
		templateString: template,
		baseClass: "airTimePerson"
		
}); /* return declare */
}); /* define */
