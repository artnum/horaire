import help from "../help.js";
import l10n from "../l10n.js";
import Tab from "../../../admin/js/ui/widgets/Tab.js";
import format from "../format.js";
import checksum from "../checksum.js";

const DefaultAddress = {
  id: "new",
  postal_code: "",
  locality: "",
  country: "",
  name: "",
  str_or_line1: "",
  num_or_line2: "",
  ext1: "",
  ext2: "",
  type: "STRUCTURED",
  since: "0001-01-01",
};
const DefaultChecksum = checksum.ckObject(DefaultAddress);

export default class Address {
  #App;
  #Options;
  #AddressTabs;
  #Form;
  constructor(app, options = { readonly: false }) {
    this.#App = app;
    this.#Options = options;
    this.#AddressTabs = new Tab();
    this.#AddressTabs.setDefaultTab("current|new-address");
    if (!options.readonly) {
      this.form().then((f) => {
        this.#AddressTabs.addTab("new-address", "+", f, -1);
      });
    }
  }

  getValues(entityId) {
    const address = this.#AddressTabs.getTabs().map((e) => {
      const address = Object.assign(
        DefaultAddress,
        Object.fromEntries(new FormData(e.content.element)),
      );
      if (address._checksum) {
        address._previous_checksum = address._checksum;
      }
      address._checksum = checksum.ckObject(address);
      return address;
    });
    return address;
  }

  popuplate(addresses) {
    return new Promise((resolve, reject) => {
      const today = new Date();
      addresses = addresses
        .map((addr) => {
          addr.since = new Date(addr.since);
          return addr;
        })
        .sort((a, b) => {
          return a.since.getTime() - b.since.getTime();
        });
      const x = addresses.map((value, idx, array) => {
        let n = null;
        if (array.length > idx + 1) {
          n = array[idx + 1].since;
          n.setTime(n.getTime() - 86400000);
          array[idx]._to = n;
        }

        return n
          ? `${format.date(n)} - ${format.date(value.since)}`
          : ` - ${format.date(value.since)}`;
      });

      let i = 0;
      const chain = Promise.resolve();
      x.reverse().forEach((t, idx, array) => {
        let name = t;
        if (
          today.getTime() > addresses[idx].since.getTime() &&
          addresses[idx]._to &&
          addresses[idx]._to.getTime() > today.getTime()
        ) {
          name = "current";
        }
        chain.then(
          (_) =>
            new Promise((resolve, reject) => {
              this.form(addresses[idx]).then((f) => {
                for (const k in addresses[idx]) {
                  const n = f.querySelector(`[name="${k}"]`);
                  if (n) {
                    if (k === "since") {
                      n.value = format.html_date(addresses[idx][k]);
                    } else {
                      n.value = addresses[idx][k];
                    }
                  }
                }
                this.#AddressTabs.addTab(name, t, f, i++);
                resolve();
              });
            }),
        );
      });
      chain.then((_) => resolve());
    });
  }

  form() {
    return new Promise((resolve, reject) => {
      l10n
        .load({
          postalCode: "Code postal",
          locality: "Localité",
          country: "Pays",
          name: "Nom",
          houseNumber: "Numéro de rue",
          street: "Rue",
          ext1: "Extension 1",
          ext2: "Extension 2",
          since: "Depuis",
        })
        .then((tr) => {
          const form = document.createElement("FORM");
          this.#Form = form;
          form._instance = this;
          form.name = "addressData";
          form.classList.add("address-data", "data-form");
          form.innerHTML = `
            <input type="hidden" name="id" value="new">
            <input type="hidden" name="_checksum" value="${DefaultChecksum}">
            <label class="restart-line">
              <span class="label">${tr.name}</span>
              <input type="text" name="name" maxlength="70">
            </label>
            <label class="unwanted restart-line">
              <span class="label">${tr.ext1} ${help.get("Address.ext1")}</span>
              <input type="text" name="ext1" maxlength="70">
            </label>
            <label class="unwanted">
              <span class="label">${tr.ext2} ${help.get("Address.ext2")}</span>
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
            <label>
              <span class="label restart-line">${tr.postalCode}</span>
              <input type="text" name="postal_code" style="max-width: 17ch;"  maxlength="16">
            </label>
            <label>
              <span class="label">${tr.locality}</span>
              <input type="text" name="locality" maxlength="35">
            </label>
            <label class="restart-line">
              <span class="label">${tr.country} ${help.get("Address.country")}</span>
              <input type="text" style="max-width: 3ch;" name="country" maxlength="2">
            </label>
            <label class="restart-line">
              <span class="label">${tr.since} ${help.get("Address.since")}</span>
              <input type="date" style="max-width: 25ch;" name="since">
            </label>
          `;
          return resolve(form);
          /*          this.#AddressTabs.addTab("new-address", "Nouvelle", form);
          return resolve(this.#AddressTabs.container);*/
        });
    });
  }
  add(name, label, node, order) {
    this.#AddressTabs.addTab(name, label, node, order);
  }
  getDomNode() {
    return this.#AddressTabs.container;
  }
}
