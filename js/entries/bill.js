import '../bootstrap/globals.js'
import UIKABXFactureList from '../ui/ka-bxfacture-list.js'

function load() {
  const factureUI = new UIKABXFactureList()
  factureUI.render().then(() => {
    document.body.appendChild(factureUI.domNode)
  })
}

window.addEventListener('kcore-loaded', load)