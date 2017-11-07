define([
	"dojo/_base/declare",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/promise/all",
	"dojo/Deferred",
	"dojo/_base/lang",
	"dojo/when"
	], function(
	djDeclare,
	djDate,
	djStamp,
	djAll,
	djDeferred,
	djLang,
	djWhen
	) { return djDeclare(null, {
/* *** workTime */
WorkTime: 504, /* Default swiss work time 42h/weeks -> 504 minutes a day, 5 days a week */
ClosedDay: [ 6, 0 ], /* Default to Saturday, Sunday */
Holidays: [], /* No default */
Absences: [], /* No default */
WorkPercent: 100, /* Default to full time */
WorkDone: [],
HolidayCount: 25, /* Number of day for holidays, default to 5 weeks of 5 days */
HolidayCost: 0,
ClosedDayCost: 0,
Entries: [],
Id: '',
SpecialTimes: [],
timestore: null,
conditionstore: null,
entitystore: null,
workedDay: {},
lookingAt: [],
lastValidated: null,

constructor: function(id, entitystore, timestore, conditionstore, validationstore, options) {
	this.Id = id;
	this.Holidays = [];
	this.Absences = [];
	this.WorkDone = [];
	this.Entries = [];
	this.ClosedDay[6,0];
	this.WorkTime = 504;
	this.HolidayCount = 25;
	this.SpecialTime = [ [ 23, 6, 125 ]  ];
	this.workedDay = {};
	this.byMonth = {};
	this.lastValidated = null;
	this.lastRegistredDay = null;
	this.HolidayCost = 0;


	this.WorkTime = options.WorkTime;
	this.HolidayCount = options.HolidayCount ? options.HolidayCount : this.HolidayCount;
	this.ClosedDay = options.ClosedDay ? options.ClosedDay : this.ClosedDay;
	this.Holidays = options.Holidays ? options.Holidays : this.Holidays;
	this.Absences = options.Absences ? options.Absences : this.Absences;
	this.WorkPercent = options.WorkPercent ? options.WorkPercent : this.WorkPercent;
	this.SpecialTime = options.SpecialTime ? options.SpecialTime : this.SpecialTime;
	this.OfficialHolidays = options.OfficialHolidays;
	this.lookingAt = options.lookingAt;

	this.entitystore = entitystore;
	this.timestore = timestore;
	this.conditionstore = conditionstore;
	this.validationstore = validationstore;
},
destroy: function () {
	this.Id = null;
	this.Holidays = null;
	this.Absences = null;
	this.WorkDone = null;
	this.Entries = null;
	this.ClosedDay = null;
	this.WorkTime = null;
	this.HolidayCount = null;
	this.SpecialTime = null
	this.workedDay = null;
	this.byMonth = null;
	this.lastValidated = null;
	this.lastRegistredDay = null;
	this.HolidayCost = null;
	this.entitystore = null;
	this.timestore = null;
	this.conditionstore = null;
	this.validationstore = null;
},
round: function(number, precision) {
	var f = Math.pow(10, precision);
	return Math.round(number * f) / f;
},
clean: function() {
	this.Holidays = [];
	this.Absences = [];
	this.WorkDone = [];
	this.Entries = [];
	this.workedDay = {};
	this.byMonth = {};
	this.lastValidated = null;
},
load: function() {
	var def = new djDeferred();

	this.clean();

	this.loadCondition().then(djLang.hitch(this, function(){
		this.loadValidation().then(djLang.hitch(this, function() {
			djLang.hitch(this, this.update)(this.lookingAt[0], this.lookingAt[1]).then(function() { def.resolve(); });
		}));
	}));

	return def;
},
loadValidation: function() {
	var def = new djDeferred();
	this.lastValidated = null;

	this.validationstore.filter({ target: this.Id }).forEach( djLang.hitch(this, function (entry) {
		this.setValidatedValues(entry.year, entry.month, entry.worktime, entry.vacations, entry.todo, entry.overtime);

		if(this.lastValidated == null) {
			this.lastValidated = [ new Date(Date.UTC(entry.year, entry.month)), entry ];
		} else {
			if(djDate.compare(this.lastValidated[0], new Date(Date.UTC(entry.year, entry.month))) < 0) {
				this.lastValidated = [ new Date(Date.UTC(entry.year, entry.month)), entry ];	
			}	
		}
	})).then(djLang.hitch(this, function () {
		if(this.lastValidated != null) { this.lookingAt[0] = djDate.add(this.lastValidated[0], "month", 1).toISOString(); }
		def.resolve(); 
	}));

	return def;
},
loadCondition: function() {
	var def = new djDeferred();

	this.entitystore.get(this.Id).then(djLang.hitch(this, function(iam){
		var condition = '__default';
		iam = iam[0];
		if(iam.condition != null) {
			condition = iam.condition;
		}
		
		var conds = [];
		conds.push(this.conditionstore.get('__default'));
		if(condition != '__default') {
			conds.push(this.conditionstore.get(condition));
		}
		djAll(conds).then(djLang.hitch(this, function (c) {
			for(var cond = c.shift(); cond; cond = c.shift()) {
				cond = cond[0];
				if(cond.weekHours != null) { this.WorkTime = (cond.weekHours / 500 * 60) };
				if(cond.vacations != null) { this.HolidayCount = cond.vacations };
				if(cond.sundayCost != null) { this.ClosedDayCost = cond.sundayCost };
				if(cond.holidaysCost != null) { this.HolidayCost = cond.holidaysCost };
		
				/* Night time array (ok this is not that good) */
				var nighttime = new Array();
				if(cond.beginNight == null) { nighttime.push(2300); } else { nighttime.push(cond.beginNight); }
				if(cond.endNight == null) { nighttime.push(600); } else { nighttime.push(cond.endNight); }
				if(cond.nightCost == null) { nighttime.push(25); } else { nighttime.push(cond.nightCost); }
				this.SpecialTime = new Array(nighttime);
			}
		
			if(iam.vacations != null) { this.HolidayCount = iam.vacations; }
			if(iam.workTime != null) { this.WorkPercent = iam.workTime; }
			def.resolve();		
		}));		
	}));

	return def;
},
update: function(from, until) {
	var def = new djDeferred();
		djWhen(this.timestore.filter({from: from, until: until, target: this.Id}).forEach(djLang.hitch(this, function(entry) {

				var begin = djStamp.fromISOString(entry.begin);
				var end = null;
				switch(entry.type) {
					default:
						end =  djStamp.fromISOString(entry.end);
						break;
					case 'halfday':
						end = djDate.add(begin, "minute", this.GetHalfDay());
						break;
					case 'wholeday':
						end = djDate.add(begin, "minute", this.GetWholeDay());
						break;
				}

				this.add(entry.reason, entry.id, begin, end);
			})), function () { def.resolve(); });
	return def;
},
datestamp: function(date) {
	date = djDate.add(date, "minute", date.getTimezoneOffset());
	return date.getDate() + '-' + date.getMonth() + '-' + date.getFullYear();
},
add: function(type, id, start, end) {
	if(! this.addEntry(id)) { return; }

	if(this.lastRegistredDay == null) {
		this.lastRegistredDay = [ start, 1 ];	
	} else {
		if(djDate.compare(this.lastRegistredDay[0], start, "date") < 0) {
			this.lastRegistredDay = [ start, 1 ];
		}	else if(djDate.compare(this.lastRegistredDay[0], start, "date") == 0) {
			this.lastRegistredDay[1]++;	
		}
	}

	switch(type) {
		case 'work': case 'learning':
			/* verify if entry already exist under another id, maybe useless */
			if(this.WorkDone.findIndex( function (e) {
				if(djDate.compare(e.start, start, "datetime") == 0) { return true; }
			} ) != -1) { return; }
			
			this.WorkDone.push({id: id, start: start, end: end});
			if(! this.workedDay[this.datestamp(start)])	{ this.workedDay[this.datestamp(start)] = 0; }
			this.workedDay[this.datestamp(start)] += djDate.difference(start, end, "minute");
			break;
		case 'holiday':
			this.Holidays.push({id: id, start: start, end: end});
			break;
		case 'army': case 'health': case 'accident':
			this.Absences.push({id: id, start: start, end: end});
			break;
		default: case 'driving': case 'overtime': break;
	}

},
GetHalfDay: function() {
	return (this.WorkTime * this.WorkPercent / 100) / 2;
},
GetWholeDay: function() {
	return this.WorkTime;
},
setValidatedValues: function(year, month, workedtime, vacations, todo, overtime) {
	this.byMonth[year + '.' + month ] = {
			workedtime: workedtime, vacations: vacations, todo: todo, overtime : overtime
		};
},
isValidated: function(year, month) {
	return this.byMonth[year + '.' + month];
},
MinutesToDo: function(options) {
	var todo = 0;
	var to = options.To ? options.To : new Date(); /* Today if not set */
	var from = options.From ? options.From : new Date(to.getFullYear(), 0, 1);

	if(djDate.compare(from, to, "date") > 0) { console.log("Date in future"); return 0; }
	for(	var current = from;
				djDate.compare(current, to, "date") < 1;
				current = djDate.add(current, "day", 1)) {
	

		if( this.OfficialHolidays.every(function(e){ return djDate.compare(current, e, "date"); })) {
			if( this.ClosedDay.every(function(e){ return current.getDay() != e})) {
				if( this.Holidays.every(function(e) { return djDate.compare(e.start, current, "date"); })) { 
						todo += this.WorkTime;
				}
			}
		}
	}

	var toWork = todo * this.WorkPercent / 100;
	var x = toWork - (this.AbsenceDone(options) * this.WorkPercent / 100);
	return x;

},
_MinutesDone: function(options, t) {
	var done = 0;
	var to = options.To ? options.To : new Date();
	var from = options.From ? options.From : new Date(to.getFullYear(), 0, 1);

	var accountedValue = [];
	for(var i = 0; i < t.length; i++) {
		if(djDate.compare(from, t[i].start, "date") <=0 &&
			djDate.compare(to, t[i].start, "date") >= 0) {  
//				if( ! this.byMonth[t[i].start.getFullYear() + '.' + t[i].start.getMonth()]) {
					accountedValue.push(t[i]);
//				}
			}
	}

	var minutesPerDate = accountedValue.map(function(e) {
		return djDate.difference(e.start, e.end, "minute");
	});
	var x = minutesPerDate.reduce(function(p, c) { return p + c; }, 0);

	return x;
},	
OverTimeDone: function(options) {
	var me = this;
	var t = this.WorkDone;
	var to = options.To ? options.To : new Date();
	var from = options.From ? options.From : new Date(to.getFullYear(), 0, 1);
	var accountedValue = [];

	for(var i = 0; i < t.length; i++) {
		if(djDate.compare(from, t[i].start, "date") <=0 &&
			djDate.compare(to, t[i].start, "date") >= 0) {  accountedValue.push(t[i]); }
	}

	var minutesPerDate = accountedValue.map(function(e) {
		var real_start = new Date(Date.UTC());
		var real_stop = new Date(Date.UTC());
		real_start.setTime(e.start.getTime() + (e.start.getTimezoneOffset() * 60000) );
		real_stop.setTime(e.end.getTime() + (e.end.getTimezoneOffset() * 60000 ));
		
		if(me.OfficialHolidays.find( function ( holiday ) {
			if(djDate.compare(holiday, real_start, "date") == 0) {
				return true;	
			} return false; })) {
			var x = djDate.difference(real_start, real_stop, "minute") * (me.HolidayCost - 100) / 100;
			return x;
		}

		if(real_start.getDay() == 0) {
			var x = djDate.difference(real_start, real_stop, "minute") * (me.ClosedDayCost - 100) / 100;
			return x;
		}
		
		for(var i = 0; i < me.SpecialTime.length; i++) {
			var _h_start = Math.trunc(me.SpecialTime[i][0] / 100);
			var _m_start = (me.SpecialTime[i][0] - (_h_start * 100)) * 60;
			var _h_stop = Math.trunc(me.SpecialTime[i][1] / 100);
			var _m_stop = (me.SpecialTime[i][1] - (_h_stop * 100)) * 60;
			var ratio = me.SpecialTime[i][2] - 100;

			var dayOff = 0;
			if((real_start.getDate() == real_stop.getDate()) && real_start.getHours() < _h_stop) { dayOff = 1; }

			var start = new Date(Date.UTC(real_start.getFullYear(), real_start.getMonth(), real_start.getDate() - dayOff, _h_start, _m_stop));
			var stop = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate() + 1, _h_stop, _m_stop));
			
			var selectedStart = null;
			if(djDate.compare(start, real_start, "datetime")<=0 && djDate.compare(stop, real_start, "datetime")>=0) {
				selectedStart = real_start;
			}
			var selectedStop = null;
			if(djDate.compare(start, real_stop, "datetime")<=0 && djDate.compare(stop, real_stop, "datetime")>=0) {
				selectedStop = real_stop;	
			}

			if(selectedStop == null && selectedStart == null) return 0;
			if(selectedStop == null && selectedStart != null) { selectedStop = stop; }
			if(selectedStop != null && selectedStart == null) { selectedStart = start; }
		
			var x = (djDate.difference(selectedStart, selectedStop, "minute")) * ratio / 100;
			return x;
		}
	});
	if(this.lastValidated != null) {
		return minutesPerDate.reduce(function(p, c) { return p + c; }, 0) + parseInt(this.lastValidated[1].overtime);
	} else {
		return minutesPerDate.reduce(function(p, c) { return p + c; }, 0);
	}
},
RemainingHoliday: function(options) {
	var holidaysDone = this.Holidays.map(function(e){
		return djDate.difference(e.start, e.end, "minute");	
	});
	var x = holidaysDone.reduce(function(p, c) { return p + c;}, 0);

	return this.round(((this.GetWholeDay() * this.HolidayCount) - x) / this.GetWholeDay(), 2);
},
MinutesDone: function(options) {
	if(this.lastValidated == null) {
		return this._MinutesDone(options, this.WorkDone);
	} else {
		return this._MinutesDone(options, this.WorkDone) + parseInt(this.lastValidated[1].worktime);
	}
},
lastValidMonth: function() {
	if(this.lastValidated != null) {
		return this.lastValidated[0].getMonth();
	}

	return null;
},
HolidayDoneDay: function(options) {
	return this.round(this.HolidayDone(options) / this.GetWholeDay(), 2);
},
HolidayDone: function(options) {
	var x = this._MinutesDone(options, this.Holidays);
	if(this.lastValidated == null) {
		return x;	
	} else {
		return x +(parseInt(this.lastValidated[1].vacations) * this.GetWholeDay());
	}
},
AbsenceDone: function(options) {
		return this._MinutesDone(options, this.Absences);
},
printTime: function(minutes) {
	var neg = '';
	if(minutes < 0) {
		neg = '-';
		minutes = Math.abs(minutes);	
	}
	var h = Math.trunc(minutes / 60);
	var min = Math.round(((minutes / 60) - h) * 60);
	if(min<10) {
		return neg + h + ":0" + min;
	} else {
		return neg + h + ":" + min;	
	}
},
_addAbsences: function(id, start, end, target) {
	if(! this.addEntry(id)) { return; }
	this[target].push({ start: start, end: end, id: id}); 
},
AddHoliday: function(id, start, end) {
	this._addAbsences(id, start, end, "Holidays");	
},
AddAbsence: function(id, start, end) {
	this._addAbsences(id, start, end, "Absences");
},
AddWorkTime: function(id, start, end) {
	if(! this.addEntry(id)) { return; }
	if(this.WorkDone.findIndex(function(e){
		if(djDate.compare(e.start, start, "datetime") == 0)return true;
	}) == -1) {
		this.WorkDone.push({id: id, start: start, end: end});

		var dateStamp = start.getDate() + "-" +  start.getMonth() + "-" + start.getFullYear();
		if(! this.workedDay[dateStamp]) {
			this.workedDay[dateStamp] = djDate.difference(start, end, "minute"); 
		} else {
			this.workedDay[dateStamp] += djDate.difference(start, end, "minute"); 
		}
	}
},
addEntry: function(id) {
	if(this.Entries.indexOf(id) != -1) { return false; }
	this.Entries.push(id);
	return true;
},
forEachWorkedDay: function(func) {
	var me = this;
	for(var k in me.workedDay) {
		var dateSplit = k.split('-');
		var date = new Date(dateSplit[2], dateSplit[1], dateSplit[0], 12, 0);	

		func(date, me.workedDay[k]);
	}	
},
getTimeForWorkedDay: function(day) {
	if(this.workedDay[this.datestamp(day)])	{ return this.workedDay[this.datestamp(day)]; }
	return 0;
},
getTimeForAwayDay: function(day) {
	var time = 0;

	time += this._MinutesDone({ From: day, To: day}, this.Holidays);
	time += this._MinutesDone({ From: day, To: day}, this.Absences);
	
	return time;	
},
isHoliday: function(day) {
	if(this.OfficialHolidays.find( function (hday) {
		if(djDate.compare(hday, day, "date") == 0) { return true; }
	})) { return true; }
	return false;
}

})});
