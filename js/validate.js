define([
"dojo/_base/declare",

"dstore/Rest",
"dstore/Cache",

], function(
djDeclare

dRest,
dCache

) { return djDeclare( null, {

constructor: function ( targetStore ) {
	var CRest = djDeclare([ dRest, dCache]);
	this.store = new CRest({ target: targetStore});
},



	
});
});
