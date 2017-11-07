define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/_base/lang",
	"dojo/text!./templates/AddTime.html",

	"dojo/dom-form",
	"dojo/date",
	"dojo/date/stamp",
	"dijit/InlineEditBox",
	"dijit/form/TextBox",
	"dijit/form/NumberTextBox",
	"dijit/form/RadioButton",
	"dijit/form/DateTextBox",
	"dijit/form/TimeTextBox",
	"dijit/form/FilteringSelect",
	"dijit/form/Form",
	"dijit/form/Button"
], function(
	declare,
	_WidgetBase,
	_TemplatedMixin,
	_WidgetsInTemplateMixin,
	lang,
	template,
	
	domForm,
	date,
	datestamp,
	InlineEditBox,
	TextBox,
	NumberTextBox,
	RadioButton,
	DateTextBox,
	TimeTextBox,
	FilteringSelect,
	Form,
	Button
){ 
	return declare("airTime.AddTime", [ _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin ], {
		templateString: template,
		baseClass: "airTimeAddTime",
		addCallback: null,
		reasonStore: null,
		reasonValue: null,
		reasonAttr: null,
		selectedDate: null,
		timeStore: null,
		target: null,
		constructor: function(args) {
			lang.mixin(this, args);	
		},
		postCreate: function() {
			if(! this.reasonValue) { this.set("reasonValue", "work"); }
			if(! this.reasonAttr) { this.set("reasonAttr", "name")}
			if(! this.selectedDate) { this.set("selectedDate", new Date()); }
		},
		_setTargetAttr: { node: "formNode", type: "attribute", attribute: "data-airtime-target" },
		_setReasonStoreAttr: { node: "reasonNode", type: "attribute", attribute: "store" },
		_setReasonAttrAttr: { node: "reasonNode", type: "attribute", attribute: "searchAttr"},
		_setReasonValueAttr: { node: "reasonNode", type: "attribute", attribute: "value"},
		_setSelectedDateAttr: { node: "dateNode", type: "attribute", attribute: "value" },
		_onSubmit: function(e) {
			e.preventDefault();
			var errNodes = [];
			var error = false;

			var form = domForm.toObject(e.target);
			var begin = datestamp.fromISOString(form.airTimeAddTimeBeginDay + form.airTimeAddTimeBeginHour+"Z");
			if(form.airTimeAddTimeEndHour == 'T00:00:00') {
				form.airTimeAddTimeEndHour = 'T24:00:00';
			}
			var end = datestamp.fromISOString(form.airTimeAddTimeBeginDay + form.airTimeAddTimeEndHour+"Z");
			var midnight = date.add(datestamp.fromISOString(form.airTimeAddTimeBeginDay + "T00:00:00Z"), "day", 1);
			
			if(date.compare(end, begin, "datetime") <= 0) {
				end = date.add(end, "day", 1);	
			}

			var requestJson = {};
			switch(form.airTimeAddTimeTimeType) {
				case 'time':
					requestJson.type = "time";
					if( ! this._validateDate(begin) || ! this._validateDate(end)) {
						error = true;
						if( ! this._validateDate(begin)) {
							errNodes.push(this.beginNode);
						}
						if( ! this._validateDate(end)) {
							errNodes.push(this.endNode);
						}
					}
					break;
				case 'morning':
					begin = new Date(form.airTimeAddTimeBeginDay + "T06:00:00Z");
					end = begin;
					requestJson.type = "halfday";
					break;
				case 'evening':
					begin = new Date(form.airTimeAddTimeBeginDay + "T12:01:00Z");
					end = begin;
					requestJson.type = "halfday";
					break;
				case 'wholeday':
					begin = new Date(form.airTimeAddTimeBeginDay + "T06:00:00Z");
					end = begin;
					requestJson.type = "wholeday";
					break;
			}
		
			if( ! this._validateDate(new Date(form.airTimeAddTimeBeginDay))) {
				error = true;
				errNodes.push(this.dateNode);
			}
			if(! error) {
				requestJson.begin = begin.toISOString();
				requestJson.end = end.toISOString();
				requestJson.reason = form.airTimeAddTimeReason;
				requestJson.remark = form.airTimeAddTimeRemark;
				requestJson.target = this.target;
				this.timeStore.add(requestJson).then(lang.hitch(this, function (e) { 
					this.radioTimeNode.focus();
					this.timeStore.get(e.id).then(lang.hitch(this, function (entry) { 
						if(this.addCallback) {
							this.addCallback(entry[0]);	
						}
					}));
				}));
			} else {
				errNodes.forEach(function (e) { 
					e.set('state', 'Error');
					e.focus();
				});
			}
		},
		_radioChange: function (e) {
			if(e.target.value == "time" && e.target.checked) {
				this._showEndBegin();	
			} else {
				this._hideEndBegin();	
			}
		},
		_hideEndBegin: function () {
			this.beginNode.set("disabled", true);
			this.endNode.set("disabled", true);
		},
		_showEndBegin: function () {
			this.beginNode.set("disabled", false);
			this.endNode.set("disabled", false);
		},
		_validateDate: function (date) {
			if(Object.prototype.toString.call(date) === "[object Date]") {
				if( ! isNaN( date.getTime() )) {
					return true;	
				}
			}
			return false;
		}
		
}); /* return declare */
}); /* define */
