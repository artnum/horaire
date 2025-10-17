import help from '../help.js'
import l10n from '../l10n.js'
import Tab from '../../../admin/js/ui/widgets/Tab.js'
import format from '../format.js'
import checksum from '../checksum.js'

const DefaultAddress = {
  id: 'new',
  postal_code: '',
  locality: '',
  country: '',
  name: '',
  str_or_line1: '',
  num_or_line2: '',
  ext1: '',
  ext2: '',
  type: 'STRUCTURED',
  since: '',
  kind: 'HOMEADDR',
}
const DefaultChecksum = checksum.ckObject(DefaultAddress)

export default class Address {
  #App
  #Options
  #AddressTabs
  #RemovedTabs
  #Form
  constructor(app, options = { readonly: false }) {
    this.#App = app
    this.#Options = options
    this.#RemovedTabs = []
    this.#AddressTabs = new Tab({
      buttonsAction: true,
      ctxmenu: this.handleCtxEvent.bind(this),
    })
    this.#AddressTabs.setDefaultTab('current|new-address')
    if (!options.readonly) {
      this.form().then((f) => {
        this.#AddressTabs.addTab('new-address', '+', f, -1)
      })
    }
  }

  handleCtxEvent(button, form) {
    return new Promise((resolve) => {
      if (!button.classList.contains('active')) {
        return resolve([])
      }
      if (form.dataset.name == 'new-address') {
        return resolve([])
      }
      l10n.load({ deleteEntry: 'Supprimer' }).then((tr) => {
        return resolve([
          {
            label: tr.deleteEntry,
            action: (form) => {
              if (!this.#RemovedTabs.includes(form)) {
                this.#RemovedTabs.push(form)
              }
              this.remove(form)
            },
          },
        ])
      })
    })
  }

  #checksum(address) {
    if (address._checksum) {
      address._previous_checksum = address._checksum
    }
    address._checksum = checksum.ckObject(address)
    return address
  }

  /**
   * Get all the addresses in tabbed addresses
   * @return {Array<Object>}
   */
  getValues(entityId) {
    const address = this.#AddressTabs.getTabs().map((e) => {
      return this.#checksum(
        Object.assign(
          {},
          DefaultAddress,
          Object.fromEntries(new FormData(e.content.element)),
        ),
      )
    })
    return address
  }

  /**
   * Get addresses that have been deleted
   * @return {Array<Object>}
   */
  getDeleted() {
    return this.#RemovedTabs.map((form) =>
      this.#checksum(
        Object.assign(
          {},
          DefaultAddress,
          Object.fromEntries(new FormData(form)),
        ),
      ),
    )
  }

  validate() {
    return new Promise((resolve, reject) => {
      let errors = false
      this.#AddressTabs.resetErrors()
      this.#AddressTabs.getTabs().forEach((e) => {
        if (e.name == 'new-address') {
          return
        }
        const data = new FormData(e.content.element)
        ;['name', 'postal_code', 'locality'].forEach((fieldname) => {
          if (data.get(fieldname).length === 0) {
            this.#AddressTabs.setTabError(e.name)
            window.requestAnimationFrame((_) =>
              e.content.element
                .querySelector(`[name="${fieldname}"]`)
                .parentNode.classList.add('error'),
            )
            errors = true
          }
        })
      })

      return resolve(errors)
    })
  }

  popuplate(addresses) {
    return new Promise((resolve, reject) => {
      const today = new Date()
      addresses = addresses
        .map((addr) => {
          addr = this.#checksum(addr)
          addr.since = new Date(addr.since)
          return addr
        })
        .sort((a, b) => {
          return a.since.getTime() - b.since.getTime()
        })
      const x = addresses.map((value, idx, array) => {
        let n = null
        if (array.length > idx + 1) {
          n = new Date(array[idx + 1].since)
          n.setTime(n.getTime() - 86400000)
          array[idx]._to = n
        }

        return n
          ? `${format.date(n)} - ${format.date(value.since)}`
          : `… ${format.date(value.since)}`
      })

      /* ok, a bit hackish but it works ... and unlikely someone gonna change address every day for 90 years */
      let i = 999999
      const chain = Promise.resolve()
      x.forEach((t, idx) => {
        chain.then(
          (_) =>
            new Promise((resolve, reject) => {
              this.form(addresses[idx]).then((f) => {
                let name = t
                if (
                  today.getTime() > addresses[idx].since.getTime() &&
                  (!addresses[idx]._to ||
                    addresses[idx]._to.getTime() >= today.getTime())
                ) {
                  name = 'current'
                }
                if (addresses.length === 1) {
                  name = 'current'
                }

                for (const k in addresses[idx]) {
                  const n = f.querySelector(`[name="${k}"]`)
                  if (n) {
                    if (k === 'since') {
                      n.value = format.html_date(addresses[idx][k])
                    } else {
                      n.value = addresses[idx][k]
                    }
                  }
                }
                this.#AddressTabs.addTab(name, t, f, i--)
                if (name === 'current') {
                  this.#AddressTabs.showTab(name)
                }
                resolve()
              })
            }),
        )
      })
      chain.then((_) => resolve())
    })
  }

  form() {
    return new Promise((resolve, reject) => {
      l10n
        .load({
          postalCode: 'Code postal',
          locality: 'Localité',
          country: 'Pays',
          name: 'Nom',
          houseNumber: 'Numéro de rue',
          street: 'Rue',
          ext1: 'Extension 1',
          ext2: 'Extension 2',
          since: 'Depuis',
        })
        .then((tr) => {
          const form = document.createElement('FORM')
          this.#Form = form
          form._instance = this
          form.name = 'addressData'
          form.classList.add('address-data', 'data-form')
          form.innerHTML = `
            <input type="hidden" name="id" value="new">
            <input type="hidden" name="_checksum" value="${DefaultChecksum}">
            <input type="hidden" name="kind" value="HOMEADDR">
            <label class="restart-line must">
              <span class="label">${tr.name}</span>
              <input type="text" name="name" maxlength="70">
            </label>
            <label class="unwanted restart-line">
              <span class="label">${tr.ext1} ${help.get('Address.ext1')}</span>
              <input type="text" name="ext1" maxlength="70">
            </label>
            <label class="unwanted">
              <span class="label">${tr.ext2} ${help.get('Address.ext2')}</span>
              <input type="text" name="ext2" maxlength="70">
            </label>
            <label class="restart-line">
              <span class="label">${tr.street}</span>
              <input type="text" name="str_or_line1" maxlength="70">
            </label>
            <label>
              <span class="label">${tr.houseNumber}</span>
              <input type="text" name="num_or_line2" style="max-width: 17ch;" maxlength="16">
            </label>
            <label class="restart-line must">
              <span class="label">${tr.postalCode}</span>
              <input type="text" name="postal_code" style="max-width: 17ch;"  maxlength="16">
            </label>
            <label class="must">
              <span class="label">${tr.locality}</span>
              <input type="text" name="locality" maxlength="35">
            </label>
            <label class="restart-line">
              <span class="label">${tr.country} ${help.get('Address.country')}</span>
              <input type="text" style="max-width: 3ch;" name="country" maxlength="2">
            </label>
            <label class="restart-line">
              <span class="label">${tr.since} ${help.get('Address.since')}</span>
              <input type="date" style="max-width: 25ch;" name="since">
            </label>
          `
          return resolve(form)
        })
    })
  }
  add(name, label, node, order) {
    this.#AddressTabs.addTab(name, label, node, order)
  }
  remove(name) {
    this.#AddressTabs.removeTab(name)
  }
  getDomNode() {
    return this.#AddressTabs.container
  }
}
