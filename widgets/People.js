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
	"dojo/dom-class",

	"dijit/layout/StackContainer",
	"dijit/layout/ContentPane",
	"dijit/Dialog",
	"dijit/registry",

	"horaire/Button",
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
	djDomClass,

	dtStackContainer,
	dtContentPane,
	dtDialog,
	dtRegistry,

	hButton,
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

			var cp = new dtContentPane({  title: 'Accueil', id: "home" });
			djXhr.get('/horaire/Entity', {handleAs: 'json'}).then( function ( results ) {
				results = new _Result(results);
				if(results.success()) {
					var frag = document.createDocumentFragment();
					results.whole().forEach( function ( entry ) {
						var ecp = new dtContentPane({ id: 'P_' + entry.id, title: entry.commonName });
						var entity = new hEntity(entry, { pane: ecp, link: 'P_' + entry.id} );
						that.own(entity);
						that.nContent.addChild(ecp);
						
						frag.appendChild(entity.domNode);
					});
					
					window.requestAnimationFrame(function () {
						that.nContent.addChild(cp); 
						cp.set('content', frag); 
						if(window.location.hash) {
							that.nContent.selectChild(window.location.hash.substr(1));
						} else {
							that.nContent.selectChild('home'); 
						}
						that.nContent.startup(); 
					});
				}
			});	
		
			djOn(this.nNewProject, "click", djLang.hitch(this, this.newProjectEvt));
			djOn(this.nNewPerson, "click", djLang.hitch(this, this.newPersonEvt));
			djOn(this.nHome, "click", djLang.hitch(this, function() { window.location.hash = '#home'; }));

			djOn(window, "hashchange", djLang.hitch(this, function(e) { 
				try {
					this.nContent.selectChild(window.location.hash.substr(1));
				} catch (e) {
					this.error('Destination inconnue');
				}
			}));
		},

		error: function (msg) {
			console.log(msg);
		},

		popForm: function (url, title, evts) {
			var that = this;
			var body = document.getElementsByTagName('BODY')[0];
			
			djDomClass.add(body, "waiting");
			djXhr.get(url, { handleAs: "text"}).then (function (html) {
				var html = djDomConstruct.toDom(html);
				djParser.parse(html, { noStart: true}).then(function (dom) {
					var dialog = new dtDialog({title: title});
					dialog.addChild(dom[0]);
					dialog.show();
					
					for(var k in evts) {
						var hitch = that;
						if(evts[k].hitch)	 {
							hitch = evts[k].hitch;	
						}
						
						djOn(dialog.domNode.getElementsByTagName('FORM')[0], k, djLang.hitch(hitch, evts.func));
						djDomClass.remove(body, "waiting");
					}
				});			
			});
		},

		newPersonEvt: function() {
			
		},

		newProjectEvt: function () {
			var that = this;
			this.popForm('/horaire/html/newProject.html', 'Nouveau Projet', {
					"submit" : { "func" : this.newProjectEx }
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
