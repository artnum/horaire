import '../bootstrap/globals.js'
import Item from '../item.js'
import '../stores.js'

window.addEventListener('DOMContentLoaded', async () => {
  const item = new Item('items')
  window.Item = item
  new Artnum.DTable({ table: 'items', sortOnly: true })
  item.load().then((loaded) => {
    loaded.display()
  })
})