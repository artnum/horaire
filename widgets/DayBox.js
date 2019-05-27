define([
	/* dojo base */
	"dojo/_base/declare",
	"dojo/_base/lang",
	
	/* dijit widget base */
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",

	/* widget template */
	"dojo/text!./templates/DayBox.html",

	/* utils */
	"dojo/date",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-class",

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

	/* widget template */
	_template,

	/* utils */
	djDate,
	djDomConstruct,
	djDomStyle,
	djDomClass

) { return djDeclare("airTime.dayBox", [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin ], {
	
	templateString: _template,
	baseClass: "dayBox",
	childs: [],
	date: null,
	workedTime: 0,
	drivedTime: 0,

	_setDateAttr: function (date) {
		var dateTxt = sprintf("%02d.%02d.%d", date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCFullYear());
		this._set("date", date);
		this.n_Date.innerHTML = dateTxt;

		if(date.getDay() == 6 || date.getDay() == 0) {
			this.set("class", this.baseClass + " " + this.baseClass + "WeekEnd");	
		}
	},
	_setHolidayAttr: function (isHoliday) {
		if(isHoliday) {
			djDomClass.add(this.domNode, this.baseClass + "Holiday");
		} else {
			djDomClass.remove(this.domNode, this.baseClass + "Holiday");
		}
	},
	_setWorkedTimeAttr: function (time) {
		this._set('workedTime', time);
		this.printTotalTime();
	},
	_setDrivedTimeAttr: function (time) {
		this._set('drivedTime', time);
		this.printTotalTime();
	},
	printTotalTime: function () {
      if (this.n_Total) {
		   if(this.drivedTime > 0) {
			   this.n_Total.innerHTML = this.printTime(this.drivedTime) + " / " + this.printTime(this.workedTime);
		   } else {
			   this.n_Total.innerHTML = this.printTime(this.workedTime);
		   }
		   if(this.drivedTime <= 0 && this.workedTim <= 0) {
			   djDomStyle.set(this.n_Total ,"display: none;");
		   } else {
			   djDomStyle.set(this.n_Total ,"display: block;");
		   }
      }
	},
	printTime: function (time) {
			var h = Math.trunc(time / 60);
		var m = Math.round(((time / 60) - h) * 60);
		if(time < 0) {
			return "-" + sprintf("%02d:%02d", h, m);		
		} else {
			return sprintf("%02d:%02d", h, m);		
		}
	},
	cssDay: function () {
		return sprintf("%02d_%02d_%d", this.date.getDate(), this.date.getMonth() + 1, this.date.getFullYear());	
	},
	addTime: function (timeEntry) {
		/*var childExist = -1;
		this.childs.forEach(function (c, idx) {
			if(c.airTimeId == timeEntry.airTimeId) {
					
			}
		});*/
		this.removeTime(timeEntry.airTimeId);
	
		this.childs.push(timeEntry);
		timeEntry.placeAt(this.n_Entries);
		this.own(timeEntry);
	},
	removeTime: function (entryId) {
		var tIdx = this._hasTimeEntry(entryId);
		if(tIdx >= 0) {
			var entry = this.childs[tIdx];
			this.childs.splice(tIdx, 1);
			entry.destroyRecursive(false);
			return true;
		}	
		return false;
	},
	hasTimeEntry: function (entryId) {
		if(this._hasTimeEntry(entryId) < 0) {
			return false;	
		}

		return true;
	},
	_hasTimeEntry: function (entryId) {
		var idx = -1;
		for(var i = 0; i < this.childs.length; i++) {
			if(this.childs[i].airTimeId == entryId) { 
				idx = i;
				break;
			}
		}
		return idx;
	}
});}); 
