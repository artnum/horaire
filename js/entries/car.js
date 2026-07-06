import '../bootstrap/globals.js'
import '../admin-index.js'
import '../addr.js'
import KACarAdminUI from '../ui/ka-car-admin.js'

window.addEventListener('kcore-loaded', () => {
  const carUI = new KACarAdminUI()
  carUI.render()
    .then(list => {
      document.body.appendChild(list)
    })
})