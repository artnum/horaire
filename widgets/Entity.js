define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/_base/lang",
	"dojo/text!./templates/Entity.html",
	"dojo/request/xhr",
	"dojo/on",
	"dojo/dom-construct",
	"dijit/Dialog",
	"horaire/_Result",
	"horaire/Projects"
], function (
	djDeclare,
	_dtWidgetBase,
	_dtTemplatedMixin,
	_dtWidgetsInTemplateMixin,
	djLang,
	template,
	djXhr,
	djOn,
	djDomConstruct,
	dtDialog,
	_Result,
	hProjects
){
	return djDeclare('horaire.Entity', [
		_dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
	],{
		templateString: template,
		baseClass: "entity",
		security: false,
		pane: null,
		link: null,
		entry: null,
		_passwordBoxHtml: '<div class="inputbox"><input type="password" placeholder="Mot de passe" /></div>',

		constructor: function (entry, options) {
			this.entry = entry;
			this.link = options.link;
			this.pane = options.pane;
		},

		postCreate: function () {
			var cn = document.createTextNode(this.get('commonName'));
			this.nCommonName.appendChild(cn);

			this.open();
			djOn(this.nRoot, "click", djLang.hitch(this, function () { window.location.hash = this.link; }));
		},

		open: function() {
			if(this.security)	{
				if(! this.login()) {
					return;	
				}
			}

			var prj = new hProjects();
			this.pane.domNode.appendChild(prj.domNode);

			djOn(prj, "change", function (e) { console.log(e); });
		},

		closeLogin: function() {
			if(this.loginOpened) {
				var that = this;
				var l = this.loginOpened;
				this.loginOpened = null;
				window.requestAnimationFrame(function() { that.nRoot.removeChild(l);  });
			}
		},

		login: function() {
			if(this.loginOpened) { return; }
			var that = this;
			var frag = document.createDocumentFragment();
			var form = document.createElement('FORM');

			djOn(form, 'submit', alert('ok'));

			form.appendChild(djDomConstruct.toDom(this._passwordBoxHtml));
			frag.appendChild(form);
			this.loginOpened = form;
			window.requestAnimationFrame( function() { that.nRoot.appendChild(frag); });
				
		}

	});
});
