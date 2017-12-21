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
	djDomConstruct,
	dtDialog,
	_Result
){
	return djDeclare('horaire.Entity', [
		_dtWidgetBase, _dtTemplatedMixin, _dtWidgetsInTemplateMixin
	],{
		templateString: template,
		baseClass: "entity",
		security: false,
		_passwordBoxHtml: '<div class="inputbox"><input type="password" placeholder="Mot de passe" /></div>',

		postCreate: function () {
			if( ! this.get('commonName')) {
				this.destroy();	
			}

			var cn = document.createTextNode(this.get('commonName'));
			this.nCommonName.appendChild(cn);

			djOn(this.nRoot, "click", djLang.hitch(this, this.open));
		},

		open: function() {
			if(this.security)	{
				if(! this.login()) {
					return;	
				}
			}

			var dialog = new dtDialog({ title: this.get('commonName'), style: "width: 100%; height: 100%;"});
			dialog.show();

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
