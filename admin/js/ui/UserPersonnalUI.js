import l10n from '../../../js/lib/l10n.js'
import AVSUtil from '../../../js/lib/AVSUtil.js'
import { AccessDeniedError } from '../../../js/JAPI/content/Access.js'

export default class UserPersonalUI {
  constructor(app, userapi) {
    this.app = app
    this.userAPI = userapi
  }

  /**
   * @return {Promise<HTMLElement>}
   */
  form(user) {
    return new Promise((resolve, reject) => {
      this.app.access
        .can(this.userAPI, 'getPersonnalData')
        .then((_) => {
          l10n
            .load({
              personnalData: 'Données personnels',
              avsNumber: 'Numéro AVS',
              employeeNumber: 'Numéro Employé',
              birthday: 'Date de naissance',
              sex: 'Sexe' /* to cut any controversy, this is what is called in the
               * current swissdec standard (ELM v 5.0)
               */,
              nationality: 'Nationalité',
              cantonResidence: 'Canton de résidence',
              language: 'Langue',
              typeResidence: 'Permis de séjour',
              french: 'Français',
              german: 'Allemand',
              italian: 'Italien',
              english: 'Anglais',
              notApplicable: '-- pas concerné --',
              short: 'Permis de courte durée (L)',
              annual: 'Permis annuel (B)',
              establishement: 'Permis d’établissement (C)',
              lucrative: 'Permis de séjour (Ci)',
              front: 'Frontaliers (G)',
              asilum: 'Requérants d’asile (N)',
              protect: 'Personnes à protéger (S)',
              temp: 'Étrangers admis provisoirement (F)',
              day90: 'Courte durée (90 jours)',
              day120: 'Courte durée (120 jours)',
              other: 'Autres (hors Suisses)',
              male: 'Homme',
              female: 'Femme',
            })
            .then((t) => {
              const form = document.createElement('FORM')
              form.dataset.id = user.id
              form.name = 'personnalData'
              form.classList.add('personnal-data-form', 'data-form')
              form.innerHTML = `
                <h3>${t.personnalData}</h3>
                <label>
                  <span class="label">${t.employeeNumber}</span>
                  <input type="text" name="employee_number">
                </label>
                <label>
                  <span class="label">${t.avsNumber}</span>
                  <input type="text" name="avs_number">
                </label>
                <label>
                  <span class="label">${t.birthday}</span>
                  <input type="date" name="birthday">
                </label>
                <label>
                  <span class="label">${t.sex}</span>
                  <select name="sex">
                    <option value="m">${t.male}</option>
                    <option value="f">${t.female}</option>
                  </select>
                </label>
                <label>
                  <span class="label">${t.cantonResidence}</span>
                  <input type="text" minlength="2" maxlength="2" name="canton_residency">
                </label>
                <label>
                  <span class="label">${t.nationality}</span>
                  <input type="text" minlength="2" maxlength="2" name="nationality">
                </label>
                <label>
                  <span class="label">${t.language}</span>
                  <select name="language">
                    <option value="fr">${t.french}</option>
                    <option value="de">${t.german}</option>
                    <option value="it">${t.italian}</option>
                    <option value="en">${t.english}</option>
                  </select>
                </label>
                <label>
                  <span class="label">${t.typeResidence}</span>
                  <select name="residency_type">
                    <option value="0">${t.notApplicable}</option>
                    <option value="10">${t.establishement}</option>  
                    <option value="20">${t.annual}</option>  
                    <option value="30">${t.lucrative}</option>  
                    <option value="40">${t.front}</option>  
                    <option value="50">${t.temp}</option>  
                    <option value="60">${t.short}</option>  
                    <option value="70">${t.protect}</option>  
                    <option value="80">${t.asilum}</option>  
                    <option value="90">${t.day120}</option>  
                    <option value="100">${t.day90}</option>  
                    <option value="250">${t.other}</option>  
                  </select>
                </label>
              `
              this.app.access
                .can(this.userAPI, 'setPersonnalData')
                .then((_) => {
                  form.addEventListener('change', (event) => {
                    this.validate(event.target)
                  })
                  resolve(form)
                })
                .catch((e) => {
                  if (e instanceof AccessDeniedError) {
                    form
                      .querySelectorAll('[name]')
                      .forEach((e) => (e.disabled = true))
                    return resolve(form)
                  }
                  reject(e)
                })
            })
        })
        .catch((e) => {
          if (e.name === 'AccessDeniedError') {
            return
          }
          reject(e)
        })
    })
  }

  validate(node) {
    l10n
      .load({
        avsInvalid: 'Numéro AVS invalide',
        employeeNumberInvalid: "Le numéro d'employé doit être indiqué",
      })
      .then((t) => {
        switch (node.name) {
          case 'employee_number':
            {
              let validityString = ''
              if (node.value.length < 1) {
                validityString = t.employeeNumberInvalid
              }
              setTimeout(() => {
                node.setCustomValidity(validityString)
                node.reportValidity()
              }, 3)
            }
            break
          case 'avs_number':
            {
              let validityString = ''
              if (AVSUtil.check(node.value) || node.value.length === 0) {
                if (node.value.length > 0) {
                  node.value = AVSUtil.format(node.value)
                }
              } else {
                validityString = t.avsInvalid
              }
              setTimeout(() => {
                node.setCustomValidity(validityString)
                node.reportValidity()
              }, 3)
            }
            break
          case 'nationality':
            {
              const r = form.querySelector('select[name="residency_type"]')
              if (node.value.toLowerCase() === 'ch') {
                r.value = '0'
                r.disabled = true
              } else {
                r.disabled = false
              }
            }
            break
        }
      })
  }

  save(userid = null) {
    const personnalForm = this.app
      .getContentNode()
      .querySelector('form[name="personnalData"]')
    const personnalData = {}
    for (const pair of new FormData(personnalForm).entries()) {
      personnalData[pair[0]] = pair[1]
    }
    personnalData.id = userid === null ? personnalForm.dataset.id : userid
    return this.app.access
      .execute(this.userAPI, 'setPersonnalData', personnalData)
      .then((pdata) => this._populate(personnalForm, pdata))
  }

  _populate(form, pdata) {
    for (const key in pdata) {
      const node = form.querySelector(`[name="${key}"]`)
      if (node) {
        node.value = pdata[key]
      }
    }
    return pdata
  }

  popuplate(form = null) {
    const personnalForm =
      form === null
        ? this.app.getContentNode().querySelector('form[name="personnalData"]')
        : form
    if (!personnalForm) {
      return Promise.resolve()
    }
    if (personnalForm.dataset.id === '') {
      return Promise.resolve()
    }
    return this.app.access
      .execute(this.userAPI, 'getPersonnalData', personnalForm.dataset.id)
      .then((pdata) => this._populate(personnalForm, pdata))
      .catch((e) => {
        if (!(e instanceof Error)) {
          e = new Error(e)
        }
        this.app.showError(e)
      })
  }
}
