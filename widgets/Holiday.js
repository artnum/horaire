/* holiday: 
			id INTEGER 
			year INTEGER 
			list TEXT 
			name TEXT */
define([ 
	"dojo/_base/declare", "dojo/_base/lang", "dojo/Evented", "dojo/Deferred",
	"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Holiday.html", "dojo/text!./templates/Holiday/Form.html",

	"dojo/on", "dojo/dom-form",
	"dijit/form/Button", "dijit/Dialog",

	"artnum/dojo/Request"
], function( 
	djDeclare, djLang, djEvented, djDeferred, 
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin,
	_template, _tform,

	djOn,djDomForm,
	dtButton, dtDialog,

	request
) {

return djDeclare("artnum.Holiday", [
	dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ],
{

	baseClass: "holiday",
	templateString: _template,
	store: '',

	constructor: function (storePath) {
		this.store = storePath;
	},

	postCreate: function () {
		request.get(this.store).then( function ( result ) {
			
		});
	},

	parseList: function(list) {
		var date = new Array();

		list.split(/\s/).forEach( function (a) {
			if(/([0-9]{1,2}\.[0-9]{1,2})/.test(a)) {
				date.push(a.trim());
			}
		});
		return date;
	},

	openAddForm: function(event) {
		var that = this;

		var form = document.createElement('FORM');
		djOn(form, 'submit', djLang.hitch(this, function (event) {
			event.preventDefault();
			
			var values = djDomForm.toObject(event.target);
			var dates = this.parseList(values.list);
			if(!values.name && !values.year) {
				return;
			}

			var valid = true;
			for(var i = 0; i < dates.length; i++) {
				if(! new Date(dates[i] + values.year + 'T00:00:00.0000Z')) {
					valid = false;
				}
			}
			
			if(valid) {
				request.post(this.store, { data: { name: values.name, year: values.year, list: values.list} });	
			}

		}));

		var e = document.createElement('TEMPLATE'); e.innerHTML = _tform;
		form.appendChild(e.content);

		e = new dtButton({ label: "Créer", type: "submit" });
		form.appendChild(e.domNode);

		var d = new dtDialog({ title: "Création liste", content: form });

		d.show();
	}


}); /* djDeclare */
}); /* define */
