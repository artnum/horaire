define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/_base/lang",
	"dojo/text!./templates/People.html",
	"dojo/request/xhr",
	"dojo/on",
	"dojo/parser",
	"dojo/dom-construct",

	"dijit/layout/StackContainer",
	"dijit/layout/ContentPane",
	"dijit/Dialog",
	"dijit/registry",


	"horaire/Entity",
	"horaire/_Result"
], function (
	djDeclare,
	_dtWidgetBase,
	_dtTemplatedMixin,
	_dtWidgetsInTemplateMixin,
	djLang,
	template,
	djXhr, 
	djOn,
	djParser,
	djDomConstruct,

	dtStackContainer,
	dtContentPane,
	dtDialog,
	dtRegistry,

	hEntity,
	_Result
){
	
	return djDeclare('horaire.People', [
		_dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
	],{
		templateString: template,
		baseClass: "people",
		postCreate: function () {
			var that = this;
			djXhr.get('/horaire/Entity', {handleAs: 'json'}).then( function ( results ) {
				results = new _Result(results);
				if(results.success()) {
					var frag = document.createDocumentFragment();
					results.whole().forEach( function ( entry ) {
						var entity = new hEntity(entry);
						that.own(entity);
						frag.appendChild(entity.domNode);
					});
					
					window.requestAnimationFrame(function () { that.nContent.appendChild(frag); });

				}
			});	
		
			djOn(this.nNewProject, "click", djLang.hitch(this, this.newProject));
		},

		newProject: function () {
			var that = this;
			djXhr.get('/horaire/html/newProject.html', {handleAs: "text" }).then( function (html) {
				var html = djDomConstruct.toDom(html);
				djParser.parse(html, { noStart: true }).then( function (dom) {
					var dialog = new dtDialog({title: "Nouveau projet"});
					dialog.addChild(dom[0]);
					dialog.show();
					
					djOn(dialog.domNode.getElementsByTagName('FORM')[0], 'submit', djLang.hitch(that, that.newProjectEx));
					
				}); 		
			});
		},
		newProjectEx: function(event) {
			event.preventDefault();
			var form = dtRegistry.byId(event.target.getAttribute('widgetid'));
			if(! form) { return ; }  /* not a widget ignore */

			if(form.isValid()) {
				var values = form.getValues();

				djXhr.get('/horaire/Project', { handleAs: "json", query: { "search.name": values.pName }}).then( function (results) {
					results = new _Result(results);
					var proceed = false;
					if(results.empty()) {
						proceed = true;	
					} else {
						console.log(results);
						if(confirm('Un projet portant ce nom existe déjà. Créer quand même ?')) {
							proceed = true;	
						}
					}
					if(proceed) {
						var eDate = null
						if(values.pEndDate) {
							eDate = values.pEndDate.toISOString();	
						}
						djXhr.post('/horaire/Project', { handleAs: "json", data: {
									name: values.pName, 
									targetEnd: eDate
								}}).then(function ( results ) { 
							results = new _Result(results);
							console.log(results);
						});
					}
				});
			}
		}
		

	});
});
