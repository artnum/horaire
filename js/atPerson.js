define([
	"dojo/_base/declare",
	"dojo/Deferred",
	"dojo/on",
	"dojo/dom-construct",
	"dojo/dom-form",
	"dojo/dom-attr",
	"dojo/_base/lang",
	"dojo/when",
	"dijit/InlineEditBox",
	"dijit/form/TextBox",
	"dijit/form/NumberTextBox",
	"dijit/layout/ContentPane",
	"airTime/Person"
  ], function(
	djDeclare,
	djDeferred,
	djOn,
	djDomConstruct,
	djDomForm,
	djDomAttr,
	djLang,
	djWhen,
	dijitInlineEditBox,
	dijitTextBox,
	dijitNumberTextBox,
	dijitContentPane,
	airTimePerson
  ) { return djDeclare(null,{
store: null,
constructor: function(store) {
	this.store = store;	
},
htmlList: function() {
	var deferred = new djDeferred();
	var contentPane = new dijitContentPane();

	this.store.filter({type: 'PERSON'}).forEach(djLang.hitch(this, function(person) {
		contentPane.addChild(this._htmlElement(person));
	})).then(function(){ 
		contentPane.startup();
		deferred.resolve(contentPane);
	});	
	
	return deferred;	
},
_htmlElement: function(person) {
	var names = person.commonName.split(' ');
	var firstname = names.shift();
	var lastname = names.join(' ');

	var personWidget = new airTimePerson({
		firstname: firstname,
		lastname: lastname,
		worktime: person.workTime,
		vacation: person.vacations
	});

	return personWidget;
}
	}); });
