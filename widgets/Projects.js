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


	"horaire/Button"
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

	hButton
){
	
	return djDeclare('horaire.Projects', [
		_dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin, djEvented
	],{
		templateString: template,
		baseClass: "project",
		current: null,

		_getValueAttr: function () {
			if(! this.current) { return ''; }

			return this.current.get('value');
		},

		postCreate: function () {
			var that = this;
			djXhr.get('/horaire/Project', {handleAs: 'json', query: { 'search.closed': '-', 'sort.opened' : 'desc' } }).then( function ( results ) {
				var frag = document.createDocumentFragment();
				results.data.forEach( function ( entry ) {
					var btn = new hButton({ name: entry.name, class: 'project', value: entry.id});
					djOn(btn, 'click', djLang.hitch(that, that.selectBtn));
					that.own(btn);
					frag.appendChild(btn.domNode);
				});
				
				window.requestAnimationFrame(function () { that.domNode.appendChild(frag); });

			});	
		},

		selectBtn: function (event) {
			var w = dtRegistry.getEnclosingWidget(event.target);
			if(this.current) { this.current.set('selected', false); }
			this.current = w;
			w.set('selected', true);

			this.emit('change', w.get('value'));
		}
	});
});
