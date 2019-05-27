require([
	"dojo/_base/lang",
	"dijit/layout/StackContainer", "dijit/layout/ContentPane",

	"airTime/Holiday"
],  function (
	djLang,
	dtStackContainer, dtContentPane,

	Holiday
) {

var sc = new dtStackContainer({ id: 'main', style: 'position: absolute; top: 0; left: 0; width: 100%; bottom: 50px'});

var cp = new dtContentPane({id: 'holidays', content: new Holiday('/horaire/store/Holiday')});
sc.addChild(cp);

window.requestAnimationFrame( function() {
	var body = document.getElementsByTagName('BODY')[0];
	body.appendChild(sc.domNode);
	sc.startup();
});

}); /* require */
