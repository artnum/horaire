define([
	"dojo/_base/declare",
	"dojo/Evented",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/_base/lang",
	"dojo/text!./templates/Projects.html",
	"dojo/request/xhr",
	"dojo/on",

	"dijit/layout/StackContainer",
	"dijit/layout/ContentPane",
	"dijit/registry",


	"artnum/Button",
	"artnum/ButtonGroup"
], function (
	djDeclare,
	djEvented,
	_dtWidgetBase,
	_dtTemplatedMixin,
	_dtWidgetsInTemplateMixin,
	djLang,
	template,
	djXhr, 
	djOn,

	dtStackContainer,
	dtContentPane,
	dtRegistry,

	Button,
	ButtonGroup
){
	
	return djDeclare('horaire.Projects', [
		_dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, djEvented
	],{
		templateString: template,
		baseClass: "project",

		postCreate: function () {
			var that = this;
			var group = new ButtonGroup(); this.own(group);
			
			djXhr.get('/horaire/Project', {handleAs: 'json', query: { 'search.closed': '-', 'sort.opened' : 'desc' } }).then( function ( results ) {
				results.data.forEach( function ( entry ) {
					group.addValue(entry.id, { type: 'project', label: entry.name});
				});
						
				window.requestAnimationFrame(function () { that.domNode.appendChild(group.domNode); });
			});	
		}
	});
});
