define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/_base/lang",
	"dojo/text!./templates/People.html",
	"dojo/request/xhr",

	"dijit/layout/StackContainer",
	"dijit/layout/ContentPane",


	"horaire/Entity"
], function (
	djDeclare,
	_dtWidgetBase,
	_dtTemplatedMixin,
	_dtWidgetsInTemplateMixin,
	djLang,
	template,
	djXhr, 

	dtStackContainer,
	dtContentPane,

	hEntity
){
	
	return djDeclare('horaire.Projects', [
		_dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
	],{
		templateString: template,
		baseClass: "people",
		postCreate: function () {
			var that = this;
			djXhr.get('/horaire/Project', {handleAs: 'json', query: {'search.open': true }}).then( function ( results ) {
				var frag = document.createDocumentFragment();
				results.forEach( function ( entry ) {
					var entity = new hEntity(entry);
					that.own(entity);
					frag.appendChild(entity.domNode);
				});
				
				window.requestAnimationFrame(function () { that.nContent.appendChild(frag); });

			});	
		}
	});
});
