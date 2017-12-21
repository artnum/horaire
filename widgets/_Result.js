define([
	"dojo/_base/declare",
	"dojo/_base/lang"
], function(
	djDeclare,
	djLang
){
return djDeclare(null, {

	_success: false,
	_data: null,

	constructor: function( raw ) {
		this._success = false;
		this._data = new Array();

		if(raw.type) {
			this._parseWithType(raw);
		} else if(raw.success) {
			this._parseWithSuccess(raw);	
		} else if(djLang.isArray(raw)) {
			this._parseArray(raw);	
		}


		djLang.mixin(this, raw);
	},
	
	_parseWithType: function (raw) {
		if(raw.type == 'results') {
			this._success = true;
			if(djLang.isArray(raw.data)) {
				this._data = raw.data;
			}	else {
				this._data = new Array(raw.data);	
			}
		} else if(raw.type == 'error') {
			this._success = false;			
		}
	},

	_parseWithSuccess: function (raw) {
		if(raw.success) {
			this._success = true;	
		} else {
			this._success = false;			
		}
	},

	_parseArray: function (raw) {
		if(raw.length > 0) {
			this._success = true;	
		} else {
			this._success = false;	
		}
		this._data = raw;
	},
	whole: function() {
		if(this._data.length > 0) {
			return this._data;
		}
		return new Array();
	},
	count: function() {
		return this._data.length;	
	},
	success: function() {
		if(this._success) { return true; }
		return false;	
	}	
});	
});
