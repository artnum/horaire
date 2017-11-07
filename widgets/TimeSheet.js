define([
	/* dojo base */
	"dojo/_base/declare",
	"dojo/_base/lang",
	
	/* dijit widget base */
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	/* widget template */
	"dojo/text!./templates/TimeSheet.html",

	/* utils */
	"dojo/dom-construct",
	"dojo/Evented",
	"dojo/on",
	"dojo/Deferred",
	"dojo/when",

	/* widgets */
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"dijit/form/Select"

	/* generic script injection */

], function (
	/* dojo basa */
	djDeclare,
	djLang,
	
	/* dijit widget base */
	dtWidgetBase,
	dtTemplatedMixin,
	dtWidgetsInTemplateMixin,

	/* widget template */
	_template,

	/* utils */
	djDomConstruct,
	djEvented,
	djOn,
	djDeferred,
	djWhen,

	/* widgets */
	dtTabContainer,
	dtContentPane,
	dtFormSelect

) { return djDeclare("airTime.TimeSheet", [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {

	templateString: _template,
	baseClass: "TimeSheet",
	month: 0,
	addFormNode: null,
	year: 2017,
	doValidate: null,
	isValidated: null,
	lockDef: null,
	firstRun: true,
	addWorktime: function(wt) {
		this.own(wt);
		this.workTime = wt;
	},
	lock: function() {
		if(this.lockDef == null) {
			this.lockDef = new djDeferred();
			return new djDeferred().resolve();
		} else {
			var x = this.lockDef;
			this.lockDef = new djDeferred();	
			x.reject('in progress');
			return x;
		}
	},
	unlock: function() {
		if(this.lockDef != null) {
			this.lockDef.resolve();	
			this.lockDef = null;
		}
	},
	_setTitleAttr: { node: "n_Title", type: "innerHTML" },
	_setWorkedAttr: function (value) {
		this.n_WdTime.innerHTML = this.formatTime(value);
	},
	_setOverAttr: function (value) {
		this.n_OrTime.innerHTML = this.formatTime(value);
	}, 
	_setTodoAttr: function (value) {
		this.n_ToTime.innerHTML = this.formatTime(value);
	},
	_setSoldAttr: function (value) {
		this.n_Sold.innerHTML = this.formatTime(value);
	},
	_setVacationsAttr: function(value) {
		this.n_Vacations.innerHTML = value;
	},
	_setTotalVacationsAttr: function(value) {
		this.n_TotalVacations.innerHTML = value;
	},
	_setToMonthAttr: function(value) {
		this.month = value;
		this.n_toMonth.set('value', value);
		this.firstRun = false;
	},
	days: {},
	workTime: null,
	constructor: function(args) {
		this.workTime = null;
		this.days = {};
		djLang.mixin(this, args);
	},
	formatTime: function(value) {
		var hour = 0, minute = 0, neg = 0;
		if(value < 0) { neg = 1; }
		value = Math.abs(value) / 60;
		
		hour = Math.trunc(value);
		minute = Math.round((value - hour) * 60);

		if(minute < 10) { minute = '0' + minute; }
		if(hour < 10) { hour = '0' + hour; }
		
		return neg ? '-' + hour + ':' + minute : hour + ':' + minute;
	},
	addForm: function (title, form) {
		var cp = new dtContentPane({ title: title });
		this.own(cp);
		cp.placeAt(this.n_Forms);
		if(djLang.isArray(form)) {
			form.forEach(function (e) {
				djDomConstruct.place(e, cp.domNode);
			});
		} else {
			form.placeAt(cp);
			this.addFormNode = form;
		}
		
	},
	setSelectedDate: function (value) {
		this.addFormNode.set('selectedDate', value);
	},
	addDay: function (dayWidget) {
			this.own(dayWidget);
			this.days[dayWidget.cssDay()] = dayWidget;
			djDomConstruct.place(dayWidget.domNode, this.n_Details);
	},
	addEntry: function (entryWidget) {
		var day = this.days[entryWidget.cssDay()];
		if(day) {
			day.addTime(entryWidget);
			this.own(entryWidget);
		}
	},
	removeEntry: function (entryId) {
		for(var idx in this.days) {
			if(this.days[idx].removeTime(entryId)) {
				break;	
			}
		}	
	},
	checkValidation: function () {
		if(this.workTime) {
			if(this.workTime.isValidated(this.year, this.month)) {
				this.n_Validate.set('value', true);	
			}	else {
				this.n_Validate.set('value', false);	
			}
		}
	},
	postCreate: function() {
		this.inherited(arguments);
		this.n_toMonth.set('value', this.month);

		djOn(this.n_toMonth, "change", djLang.hitch(this, function (e) {
			if(this.month != e) {
				this.month = e;
				this.emit("change-month", this);
			}	
		}));

		djOn(this.n_Validate, "click", djLang.hitch(this, function (e) {
			if(this.doValidate) {
				this.doValidate(this.n_Validate.get('value'), parseInt(this.month), parseInt(this.year));	
			}
		}));

	},
	_onChange: function (e) {
		
	}

});}); 
