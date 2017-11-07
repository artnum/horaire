define([
	/* dojo base */
	"dojo/_base/declare",
	"dojo/_base/lang",
	
	/* dijit widget base */
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_OnDijitClickMixin",

	/* widget template */
	"dojo/text!./templates/TimeEntry.html",

	/* event */
	"dojo/Evented",

	/* utils */
	"dojo/date",
	"dojo/on",

	/* widgets */
	"dijit/Menu",
	"dijit/MenuItem",
	"dijit/Dialog",

	/* generic script injection */
	"//cdn.rawgit.com/alexei/sprintf.js/master/src/sprintf.js"

], function (
	/* dojo basa */
	djDeclare,
	djLang,
	
	/* dijit widget base */
	dtWidgetBase,
	dtTemplatedMixin,
	dtWidgetsInTemplateMixin,
	dtOnDijitClickMixin,

	/* widget template */
	_template,

	/* event */
	djEvented,

	/* utils */
	djDate,
	djOn,

	/* widgets */
	dtMenu,
	dtMenuItem,
	dtDialog

) { return djDeclare("airTime.TimeEntry", [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, dtOnDijitClickMixin, djEvented ], {
	
	templateString: _template,
	baseClass: "timeEntry",
	jsonEntry: null,
	reasonStore: null,
	dayDuration: 504, /* legal swiss workday [min] */
	begin: null,
	end: null,
	timeStore: null,

	constructor: function (args) {
		if(! args.jsonEntry) { throw "No entry"; }
		if(! args.jsonEntry.id) { throw "No id"; }
		
		djLang.mixin(this, args);
	},
	postCreate: function () {
		this.set("text", this.jsonToText(this.jsonEntry));
		this.set("airTimeId", this.jsonEntry.id);	

		this.begin = new Date(this.jsonEntry.begin);
		this.set("airTimeOrder", sprintf("%d%d", this.begin.getUTCHours(), this.begin.getUTCMinutes()));
		this.set("airTimeBegin", this.begin.toISOString());
		this.end = new Date(this.jsonEntry.end);
		this.set("airTimeEnd", this.end.toISOString());
	
		this.n_timeMenu.set("targetNodeIds", [ this.id ]);
		this.n_timeMenu.set("leftClickToOpen", true);
		this.n_timeMenu.bindDomNode(this.domNode);

		this.own(
			djOn(this.n_timeMenuDelete.domNode, "click", djLang.hitch(this, "_onDelete")),
			djOn(this.n_timeMenuDetails.domNode, "click", djLang.hitch(this, "_onDetails"))
		);
	},
	_onDetails: function (e) {
		var dial = new dtDialog({
			title: this.jsonEntry.id,
			content: "Remarque : \"" + this.jsonEntry.remark + "\"<br />" +
				"Début : " + this.begin.toISOString() + "<br />" +
				"Fin : " + this.end.toISOString() + "<br/ >" +
				"Type : " + this.jsonEntry.type + "<br />" +
				"ID : " + this.jsonEntry.id
		});
		dial.startup();
		dial.show();
		this.own(dial);
	},
	_onDelete: function (e) {
		if(confirm("Voulez-vous vraiment supprimer l'entrée \"" + this.jsonEntry.id + "\"")) {
			this.timeStore.remove(this.jsonEntry.id).then(djLang.hitch(this, function () { this.emit("removed", this.jsonEntry); this.destroy();}));
		}
	},
	destroy: function () {
		this.jsonEntry = null;

		this.inherited(arguments);
	},
	_setTextAttr: { node: "n_timeEntry", type: "innerHTML" },
	_setAirTimeIdAttr: { node: "n_timeEntry", type: "attribute", attribute: "data-airtime-entry" },
	_setAirTimeOrderAttr: { node: "n_timeEntry", type: "attribute", attribute: "data-airtime-order" },
	_setAirTimeBeginAttr: { node: "n_timeEntry", type: "attribute", attribute: "data-airtime-begin" },
	_setAirTimeEndAttr: { node: "n_timeEntry", type: "attribute", attribute: "data-airtime-end" },
	jsonToText: function (json) {
		var begin = new Date(json.begin);
		var end = new Date(json.end);

		var dayType = null;
		switch(json.type) {
			case 'halfday': end = djDate.add(begin, "minute", this.dayDuration); dayType = "Demi-journée"; break;
			case 'wholeday': end = djDate.add(begin, "minute", this.dayDuration); dayType ="Journée"; break;
		}

		var beginTxt = sprintf("%02d:%02d", begin.getUTCHours(), begin.getUTCMinutes());
		var endTxt = sprintf("%02d:%02d", end.getUTCHours(), end.getUTCMinutes());
		var reasonTxt = this.reasonStore.get(json.reason);
		reasonTxt = reasonTxt ? reasonTxt.name : json.reason;
		if( ! dayType) {
			return beginTxt + " - " + endTxt + ", " + reasonTxt;
		} else {
			return dayType + ", " + reasonTxt;	
		}
	},
	cssDay: function () {
		return sprintf("%02d_%02d_%d", this.begin.getUTCDate(), this.begin.getUTCMonth() + 1, this.begin.getUTCFullYear());	
	}
	
});}); 
