import QuoteList from './$script/admin/app/quote/list.js'
import ContactList from './$script/admin/app/contact/list.js'
import AccountingDocAPI from './$script/src/JAPI/AccountingDoc.js'
import l10n from './$script/src/lib/l10n.js'
import help from '../../../js/lib/help.js'
import App from '../app/app.js'

export default class QuoteUI {

  /**
   * @param app {App} 
   * @param main {HTMLElement}
   * @param nav {HTMLElement}
   */
  constructor(app, main, nav) {
    this.app = app
    this.mainParentNode = main
    this.navParentNode = nav
    this.qs = new QuoteList()
    this.api = new AccountingDocAPI()
  }

  init() {
    return Promise.resolve()
  }

  run() {
    return Promise.resolve()
  }

  navigate(where) {
    if (!this[where]) { return }
    this.nav.querySelector('div.selected')?.classList.remove('selected')
    this.nav.querySelector(`div[data-action="${where}"]`)?.classList.add('selected')
    this.mainParentNode.innerHTML = ''
    this[where]()
      .then(content => {
        this.mainParentNode.replaceChildren(content)
      })
  }

  navigation() {
    return new Promise((resolve) => {
      const nav = document.createElement('DIV')
      nav.addEventListener('click', event => {
        this.navigate(event.target.dataset.action)
      })
      nav.classList.add('ka-nav', 'ka-quoteui-nav')
      l10n.T(`
                <div data-action="list" class="item selected">$[Liste]</div>
                <div data-action="new" class="item">$[Nouvelle offre]</div>
            `)
        .then(content => {
          nav.innerHTML = content
          this.nav = nav
          return resolve(nav)
        })
    })
  }

  main() {
    return new Promise((resolve) => {
      this.api.listByType('offer')
        .then(list => {
          return this.qs.render(list)
        })
        .then(display => {
          return resolve(display)
        })
    })
  }

  new() {
    return new Promise((resolve) => {
      this.api.probableNextReference('offer')
        .then(reference => {
          const form = document.createElement('FORM')
          form.classList.add('ka-quote-new')
          l10n.T(`
                    <label>
                        <span class="label">$[Référence probable]${help.get('accountingDoc.probableReference')}</span>
                        <input type="text" readonly="true" value="${reference.reference}" />
                    </label>
                    <label><span class="label">$[Nom]</span><input name="name" type="text" /></label>
                    <label><span class="label">$[Vendeur]</span><input name="vendeur" type="text"></label>
                    <label><span class="label">$[Description]</span><textarea name="description"></textarea></label>
                    <label><span class="label">$[Contact]${help.get('accountingDoc.contactForNewQuote')}</span>
                        <select>
                            <option value="1">Architect</option>
                            <option value="2">Schtroumpf</option>
                        </select>
                        <input type="text" name="contact" />
                    </label>
                    <button type="submit">$[Créer]</button>
                `)
            .then(content => {
              form.innerHTML = content
              const contact = new ContactList(form.querySelector('input[name="contact"]'))
              form.addEventListener('submit', event => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                if (!data.get('contactid') || !data.get('name')) {
                  /* error */
                }

              })
              resolve(form)
            })
        })
    })
  }

  list() {
    return this.main()
  }
}
