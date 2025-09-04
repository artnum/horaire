import l10n from './$script/src/lib/l10n.js'

export default class ContactUI {
  constructor() {

  }

  init() {
    return Promise.resolve()
  }

  new() {
    return new Promise((resolve) => {
      const form = document.createElement('FORM')
      form.classList.add('ka-contact-new')
      l10n.T(`
                    <label><span class="label">$[Type]</span></label>
                    <label><span class="label">$[Nom]</span><input type="text" name="name" /></label>
                `
      ).then(content => {
        form.innerHTML = content
      })
    })
  }

}
