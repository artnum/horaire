import l10n from '../../../js/lib/l10n.js'
import help from '../../../js/lib/help.js'
import Multiselect from './widgets/Multiselect.js'
import { User as UserModelClass } from '../../../js/JAPI/content/User.js'
import { UserAPI } from '../../../js/JAPI/content/User.js'
import { UserGroupAPI as UserGroupClass } from '../../../js/JAPI/content/UserGroup.js'
import App from '../app/app.js'
import UserPersonnalUI from './UserPersonnalUI.js'
import {
  AccessAPI as AccessAPIClass,
  AccessDeniedError,
} from '../../../js/JAPI/content/Access.js'
import Serial from './widgets/Serial.js'
import SchemaModel from '../../../js/JAPI/SchemaModel.js'
import Tab from './widgets/Tab.js'
import { ConfigurationAPI } from '../../../js/JAPI/content/Configuration.js'
import Address from '../../../js/lib/widgets/Address.js'

const UserGroupAPI = UserGroupClass.getInstance()
const AccessAPI = new AccessAPIClass()
const NewItemUIChangeTimeout = 5000

export default class UserUI {
  #personnalAddress

  /**
   * @param app {App}
   */
  constructor(app, userapi = null) {
    this.app = app
    this.userAPI = UserAPI.getInstance()
    this.pc = new UserPersonnalUI(this.app, this.userAPI)
    this.idRandomPrefix = Math.floor(Math.random() * 100) + 1
    this.currentUser = null
  }

  run() {
    return this.navigate('new')
  }

  init() {
    this.app.setEventHandler('click', this.eventCaptureHandler.bind(this))
    return Promise.resolve()
  }

  eventCaptureHandler(event) {
    if (event.target.dataset.action == 'delete-invitation') {
      event.preventDefault()
      event.stopPropagation()
      const node = event.target
      this.userAPI
        .deleteInvitation(
          event.target.dataset.userid,
          event.target.dataset.invitation,
        )
        .then((result) => {
          return this.#renderInvitations(node.dataset.userid)
        })
        .then((node) => {
          const old = document.querySelector('div.invitation')
          old.replaceWith(node)
        })
    }
  }

  filterListOnKeypress(event) {
    const searchTerm = event.target.value.toLowerCase()
    document.querySelectorAll('[data-searchable]').forEach((item) => {
      const searchValue = item.getAttribute('data-searchable').toLowerCase()

      if (searchValue.includes(searchTerm)) {
        item.style.display = ''
      } else {
        item.style.display = 'none'
      }
    })
  }

  new() {
    return new Promise((_) => {
      l10n.load({ newUser: 'Nouvel utilisateur' }).then((content) => {
        return this.openUser(-1, content.newUser)
      })
    })
  }

  /**
   * @param user {object}
   */
  renderPriceList(user) {
    const pricing = new Serial(
      this.app,
      {
        validity: 'Depuis',
        value: 'Valeur',
      },
      {
        types: {
          validity: { type: 'date' },
        },
      },
    )
    return new Promise((resolve, reject) => {
      Promise.all([
        user.id.length > 0
          ? this.userAPI.listPrice({ person: user.id })
          : Promise.resolve([]),
        l10n.load({
          priceTitle: 'Coût horaire',
        }),
      ])
        .then(([prices, tr]) => {
          prices = prices.map((value) => {
            const order = value.validity.getTime()
            return {
              _id: value.id,
              _order: order,
              value: SchemaModel.toPrice(value.value),
              validity: value.validity,
            }
          })
          pricing.setData(prices)
          pricing.setDataCallback((values) => {
            let order = 0
            for (let i = 0; i < values.length; i++) {
              switch (values[i][0]) {
                case 'validity':
                  order = Date.parse(values[i][1])
                  values[i][1] = new Intl.DateTimeFormat().format(order)
                  break
                case 'value':
                  values[i][1] = SchemaModel.toPrice(values[i][1])
                  break
              }
            }
            values.push(['_order', order])
            return Promise.resolve(values)
          })
          return pricing.render()
        })
        .then((node) => resolve(node))
        .catch((e) => {
          console.log(e)
        })
    })
  }

  deleteUser(node) {
    const userForm = this.app
      .getContentNode()
      .querySelector('form[name="user"]')
    if (!userForm.dataset.id) {
      return
    }
    this.userAPI
      .delete(userForm.dataset.id)
      .then((_) => {
        this.app.removeFromNavigation(`.item[data-id="${userForm.dataset.id}"]`)
        return this.new()
      })
      .then((_) => {
        Promise.resolve(true)
      })
      .catch((e) => {
        console.log(e)
        Promise.resolve(false)
      })
  }

  setActivationState(user) {
    return user.disabled
      ? this.userAPI.activate(user.id)
      : this.userAPI.deactivate(user.id)
  }

  renderUserForm(user) {
    function getFirstLastName(nameArray) {
      // Sort by length while keeping track of original indices
      const indexedArray = nameArray.map((name, index) => ({ name, index }))

      // Sort by length (descending) and original index (ascending)
      indexedArray.sort((a, b) => {
        if (b.name.length !== a.name.length) {
          return b.name.length - a.name.length // Longer names first
        }
        return a.index - b.index // Keep original order for same length
      })

      // Take top 2 longest names
      const topTwo = indexedArray.slice(0, 2)

      // Sort back to original order based on index
      topTwo.sort((a, b) => a.index - b.index)

      // Return just the names
      return topTwo.map((item) => item.name)
    }

    return new Promise((resolve) => {
      KLogin.instance.getUser().then((me) => {
        const form = document.createElement('FORM')
        form.name = 'user'
        form.classList.add('data-form')
        form.dataset.id = user.id
        l10n
          .T(
            `
                    <label>
                        <span class="label">$[Nom]</span>
                        <input name="name" type="text"value="${user.name}" />
                    </label>
                    <label>
                        <span class="label">$[Nom d'utilisateur]${help.get('User.username')}</span>
                        <input name="username" type="text" value="${user.username}" />
                    </label>
                `,
          )
          .then((content) => {
            this.app.clearMainAction()
            l10n
              .load({
                save: 'Enregistrer',
                create: 'Créer',
                modifyPw: 'Modifier le mot de passe',
                activate: 'Activer',
                deactivate: 'Désactiver',
                delete: 'Supprimer',
              })
              .then((actionStrings) => {
                this.app.addMainAction(
                  user.id ? actionStrings.save : actionStrings.create,
                  (node) => {
                    this.saveUser().then((user) => {
                      this.putNodeInActiveZone(this.#renderNavigationUser(user))
                      this.currentUser = user
                      this.openUser(user.id)
                    })
                  },
                )
                if (user.id) {
                  if (me === user.id) {
                    this.app.addMainAction(actionStrings.modifyPw, (node) =>
                      console.log(node),
                    )
                  }
                  if (me !== user.id) {
                    this.app.addMainActionWithState(
                      user.disabled ? 0 : 1,
                      [actionStrings.activate, actionStrings.deactivate],
                      (node) => {
                        return new Promise((resolve, reject) => {
                          if (this.currentUser == null) {
                            return Promise.resolve(0)
                          }
                          this.setActivationState(this.currentUser).then(
                            (user) => {
                              this.currentUser = user
                              const userNode =
                                this.navigationNode.querySelector(
                                  `.item[data-id="${user.id}"]`,
                                )
                              if (this.currentUser.disabled) {
                                this.putNodeInInactiveZone(userNode)
                              } else {
                                this.putNodeInActiveZone(userNode)
                              }
                              resolve(this.currentUser.disabled ? 0 : 1)
                            },
                          )
                        })
                      },
                    )

                    this.app.addMainAction(
                      `${actionStrings.delete} ${help.get('User.delete')}`,
                      (node) => this.deleteUser(node),
                      true,
                    )
                  }
                }
              })
            form.innerHTML = content
            form.addEventListener('change', (event) => {
              if (event.target.name === 'name') {
                const usernameNode =
                  event.currentTarget.querySelector('[name="username"]')
                if (usernameNode.value === '') {
                  const parts = getFirstLastName(event.target.value.split(' '))
                  if (parts.length > 1) {
                    let usernameGuess = `${parts.shift().toLowerCase()}.${parts.shift().toLowerCase()}`
                    usernameNode.value = usernameGuess
                  }
                }
              }
            })
            return resolve(form)
          })
      })
    })
  }

  /*.then(pdata => {
     const node = this._renderNavigationUser(user)
     const previousNode = this.navigationNode.querySelector(`[data-id="${user.id}"]`)
     if (previousNode) {
       previousNode.parentNode.replaceChild(node, previousNode)
     } else {
       const nodes = this.navigationNode.querySelectorAll('[data-order]')
       for (let i = 0; i < nodes.length; i++) {
         if (parseInt(nodes[i].dataset.order) < parseInt(node.dataset.order)) {
           this.navigationNode.insertBefore(node, nodes[i])
           break
         }
       }
       node.scrollIntoView()
     }
     this.navigateFromNode(node)
       .then(_ => {
         const personnalForm = this.app.getContentNode().querySelector('form[name="personnalData"]')
         for (const key in pdata) {
           const node = personnalForm.querySelector(`[name="${key}"]`)
           if (node) {
             node.value = pdata[key]
           }
         }
       })
   })
   .catch(e => {
     this.app.setBlockError(e, personnalForm)
   })*/

  #saveUser() {
    const userForm = this.app
      .getContentNode()
      .querySelector('form[name="user"]')

    const user = {}
    for (const pair of new FormData(userForm).entries()) {
      user[pair[0]] = pair[1]
    }
    if (userForm.dataset.id.length > 0) {
      user.id = userForm.dataset.id
    }
    return this.app.access.execute(this.userAPI, 'set', user)
  }

  #saveGoups(userid) {
    const groupForm = this.app
      .getContentNode()
      .querySelector('form[name="groups"]')
    const selected = Multiselect.getSelectedFromForm(groupForm)
    if (selected.length <= 0) {
      return Promise.resolve()
    }
    return UserGroupAPI.setGroups(userid, selected)
  }

  #saveAccessRight(userid) {
    const accessRightsForm = this.app
      .getContentNode()
      .querySelector('form[name="accessRights"]')
    const selected = Multiselect.getSelectedFromForm(accessRightsForm)
    return AccessAPI.setUserRoles(userid, selected)
  }

  #savePricing(userid) {
    const pricingForm = this.app
      .getContentNode()
      .querySelector('[data-name="pricing"]')
    return this.userAPI.setPricing(userid, Serial.getFormValue(pricingForm))
  }

  #saveCivilStatus(userid) {
    return new Promise((resolve) => {
      this.app.access
        .can(this.userAPI, 'setCivilStatuses')
        .then((_) => {
          this.userAPI
            .setCivilStatuses(
              userid,
              Serial.getFormValue(
                this.app
                  .getContentNode()
                  .querySelector('[data-name="civil-status"]'),
              ),
            )
            .then((_) => resolve())
        })
        .catch((_) => {
          resolve()
        })
    })
  }

  putNodeInActiveZone(node) {
    node.classList.add('new-item')
    node.classList.remove('disabled')
    const ipoint = document.getElementById(
      `new-user-insert-after-${this.idRandomPrefix}`,
    )
    const previousNode = ipoint.parentNode.querySelector(
      `.item[data-id="${node.dataset.id}"]`,
    )
    if (!previousNode) {
      ipoint.after(node)
      ipoint.scrollIntoView()
      setTimeout(() => {
        node.classList.remove('new-item')
      }, NewItemUIChangeTimeout)
    } else {
      node = null
    }
  }

  putNodeInInactiveZone(node) {
    node.classList.add('new-item', 'disabled')
    const ipoint = document.getElementById(
      `inactive-zone-separation-point-${this.idRandomPrefix}`,
    )
    ipoint.after(node)
    ipoint.scrollIntoView()
    setTimeout(() => {
      node.classList.remove('new-item')
    }, NewItemUIChangeTimeout)
  }

  saveUser() {
    return new Promise((resolve, reject) => {
      this.#saveUser()
        .then((user) => {
          this.currentUser = user
          return Promise.all([
            Promise.resolve(user),
            this.pc.save(user.id),
            this.#savePersonnalAddresses(user.id),
            this.#saveGoups(user.id),
            this.#saveAccessRight(user.id),
            this.#savePricing(user.id),
            this.#saveCivilStatus(user.id),
          ])
        })
        .then(([user, pcuser, personnalAddresss, groups, access, pricing]) => {
          resolve(user)
        })
        .catch((e) => {
          console.log(e)
        })
    })
  }

  #savePersonnalAddresses(userid) {
    return new Promise((resolve) => {
      this.app.access
        .can(this.userAPI, 'setPersonnalAddresses')
        .then((_) => {
          const addresses = this.#personnalAddress
            .getValues()
            .filter(
              (address) => address._checksum != address._previous_checksum,
            )
          const deletedAddress = this.#personnalAddress.getDeleted()

          Promise.all([
            this.userAPI.setPersonnalAddresses(userid, addresses),
            this.userAPI.deletePersonnalAddresses(userid, deletedAddress),
          ]).then((_) => {
            resolve()
          })
        })
        .catch((_) => {
          resolve()
        })
    })
  }

  #renderQrInvitation(node, invitation) {
    l10n.load({ delete: "Supprimer l'invitation" }).then((strings) => {
      node.innerHTML = `<p><a href="${invitation.url}"><img src="data:image/png;base64,${invitation.qrimage}"></a>
          <br>
          <a href="#" data-action="delete-invitation"
            data-invitation="${invitation.invitation}"
            data-userid="${invitation.user}">${strings.delete}</a>
        </p>`
    })
  }

  #renderInvitations(id) {
    return new Promise((resolve, reject) => {
      const node = document.createElement('DIV')
      node.classList.add('invitation')
      if (id < 0 || id === null) {
        return resolve(node)
      }
      Promise.all([
        l10n.load({
          generateInvitation: 'Générer une invitation',
          invitation: 'Invitation',
        }),
        this.userAPI.getInvitations(id),
      ]).then(([tr, invitations]) => {
        if (invitations.length === 0) {
          node.innerHTML = `<h3>${tr.invitation}</h3>
            <a href="#">${tr.generateInvitation}</a>`
          node.addEventListener('click', (event) => {
            event.preventDefault()
            this.userAPI.generateInvitation(id).then((invitation) => {
              this.#renderQrInvitation(node, invitation)
            })
          })
        } else {
          const lastInvitation = invitations.pop()
          this.#renderQrInvitation(node, lastInvitation)
        }
        resolve(node)
      })
    })
  }

  #homeAddressModule(user, translations, container) {
    return new Promise((resolve) => {
      this.app.access
        .can(this.userAPI, 'getPersonnalAddresses')
        .then((_) => {
          const msAddress = new Address(this.app)
          const addressFormTitle = document.createElement('H3')
          addressFormTitle.innerHTML = `${translations.personAddress} ${help.get('Address.general')}`
          container.appendChild(addressFormTitle)
          container.appendChild(msAddress.getDomNode())
          this.#personnalAddress = msAddress
          resolve()
          if (user.id !== '') {
            this.userAPI.getPersonnalAddresses(user).then((addresses) => {
              msAddress.popuplate(addresses)
            })
          }
        })
        .catch((e) => {
          resolve()
        })
    })
  }

  #childrenModule(user, translations, container) {
    return new Promise((resolve) => {
      resolve()
    })
  }

  #civilStatusModule(user, translations, container) {
    return new Promise((resolve) => {
      this.app.access
        .can(this.userAPI, 'listCivilStatuses')
        .then((_) => {
          Promise.all([
            l10n.load({
              civilStatus: 'État civil',
              UNKNOWN: 'Inconnu',
              SINGLE: 'Célibataire',
              MARRIED: 'Marié(e)',
              WIDOWED: 'Veuve/veuf',
              DIVORCED: 'Divorcé(e)',
              SEPARATED: 'Séparé(e)',
              REG_PARTNER: 'Parternariat enregistré',
              DISS_PART_JUD: 'Parternariat dissous judiciairement',
              DISS_PART_DEC: 'Parternariat dissous par décès',
              PART_ABSENCE:
                "Parternariat dissous ensuite de déclartion d'absence",
            }),
            (() => {
              if (user.id === '') {
                return Promise.resolve([])
              }
              return this.userAPI.listCivilStatuses(user)
            })(),
          ]).then(([tr, statuses]) => {
            const s = new Serial(
              this.app,
              {
                status: 'État civil',
                since: 'Depuis',
              },
              {
                types: {
                  since: {
                    type: 'date',
                  },
                  status: {
                    type: 'select',
                    options: {
                      values: {
                        UNKNOWN: tr.UNKNOWN,
                        SINGLE: tr.SINGLE,
                        MARRIED: tr.MARRIED,
                        WIDOWED: tr.WIDOWED,
                        DIVORCED: tr.DIVORCED,
                        SEPARATED: tr.SEPARATED,
                        REG_PARTNER: tr.REG_PARTNER,
                        DISS_PART_JUD: tr.DISS_PART_JUD,
                        DISS_PART_DEC: tr.DISS_PART_DEC,
                        PART_ABSENCE: tr.PART_ABSENCE,
                      },
                    },
                  },
                },
              },
            )
            s.setData(statuses)
            s.render().then((n) => {
              container.addTab('civil-status', tr.civilStatus, n, 0)
              resolve()
            })
          })
        })
        .catch((_) => {
          resolve()
        })
    })
  }

  /**
   * @param id {(null|number)}
   * @param title {string}
   */
  openUser(id = null, title = '') {
    return new Promise((resolve) => {
      ;(() => {
        if (id === null) {
          return this.userAPI.getSelf()
        }
        if (id > 0) {
          return this.userAPI.get(id)
        }
        return Promise.resolve(
          new UserModelClass(UserModelClass.createDefaults()),
        )
      })().then((user) => {
        this.currentUser = user
        const tabInterface = new Tab()
        tabInterface.setDefaultTab('pricing')
        const msGroups = new Multiselect(
          this.app,
          UserGroupAPI.getDataAPI(),
          'groups',
        )
        const msAccess = new Multiselect(
          this.app,
          AccessAPI.getDataAPI(),
          'accessRights',
        )

        Promise.all([
          l10n.load({
            groups: 'Groupes',
            civilStatus: 'État civil',
            accessRight: "Droits d'accès",
            priceTitle: "Prix de l'heure",
            childs: 'Enfants',
            personAddress: 'Adresse personnelle',
          }),
          this.renderUserForm(user),
          this.pc.form(user),
          this.#renderInvitations(id),
        ]).then(([tr, userForm, personnalDataForm, invitationForm]) => {
          tabInterface.addPlaceholderTab('pricing', tr.priceTitle, 0)
          tabInterface.addPlaceholderTab(
            'groups',
            `${tr.groups} ${help.get('User.groups')}`,
            99,
          )
          tabInterface.addPlaceholderTab(
            'rights',
            `${tr.accessRight} ${help.get('User.accessRights')}`,
            98,
          )

          const node = document.createElement('DIV')
          node.classList.add('user-ui-content')
          {
            title.length > 0
              ? (node.innerHTML = `<h2>${title}</h2>`)
              : (node.innerHTML = `<h2>${user.name}</h2>`)
          }

          node.appendChild(userForm)
          if (personnalDataForm) {
            this.pc.popuplate(personnalDataForm)
            node.appendChild(personnalDataForm)
          }

          this.#homeAddressModule(user, tr, node)
            .then((_) => this.#childrenModule(user, tr, node))
            .then((_) => this.#civilStatusModule(user, tr, tabInterface))
            .then((_) => {
              node.appendChild(invitationForm)
              this.renderPriceList(user).then((priceList) => {
                tabInterface.addTab('pricing', tr.priceTitle, priceList)
              })
              tabInterface.addTab(
                'childs',
                tr.childs,
                document.createElement('DIV'),
                2,
              )

              Promise.all([
                msGroups.render(),
                user.id ? UserGroupAPI.forUser(user.id) : Promise.resolve([]),
              ]).then(([groupMulti, forUserSelected]) => {
                msGroups.setSelected(forUserSelected)
                tabInterface.addTab(
                  'groups',
                  `${tr.groups} ${help.get('User.groups')}`,
                  groupMulti,
                  99,
                )
              })

              Promise.all([
                msAccess.render(),
                user.id ? AccessAPI.getUserRoles(user.id) : Promise.resolve([]),
              ]).then(([accessMulti, userRoles]) => {
                tabInterface.addTab(
                  'rights',
                  `${tr.accessRight} ${help.get('User.accessRights')}`,
                  accessMulti,
                  98,
                )
                msAccess.setSelected(userRoles)
              })
              node.appendChild(tabInterface.container)
              this.app.setContent(node)
              resolve()
            })
        })
      })
    })
  }

  navigateFromNode(node) {
    const parentNode = node.parentNode
    return this.navigate(node.dataset.action).then((succeed) => {
      if (!succeed) {
        node.classList.add('broken')
        return
      }
      parentNode.querySelector('.selected')?.classList.remove('selected')
      node.classList.add('selected')
      if (node.classList.contains('broken')) {
        node.classList.remove('broken')
      }
    })
  }

  navigate(where) {
    return new Promise((resolve) => {
      if (!where) {
        return resolve(false)
      }
      this.currentUser = null
      const commandline = where.split(':')
      const action = commandline.shift()
      if (!this[action]) {
        return resolve(false)
      }
      this.app.events.emit('navigate')
      this[action](...commandline)
        .then((_) => {
          return resolve(true)
        })
        .catch((_) => {
          return resolve(false)
        })
    })
  }

  order() {
    return new Promise((resolve) => {
      const nodeViewable = document.createElement('DIV')
      const nodeHidden = document.createElement('DIV')
      const itemToHtml = (item) => {
        const node = document.createElement('DIV')
        node.draggable = true
        node.dataset.id = item.id
        node.classList.add('item', 'orderable')
        node.innerHTML = `<span>${item.name}</span>`
        node.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('id', node.dataset.id)
          e.currentTarget.classList.add('dragged')
          const clonedNode = e.currentTarget.cloneNode(true)
          document.body.appendChild(clonedNode)
          e.dataTransfer.setDragImage(clonedNode, 10, 10)
          e.dataTransfer.effectAllowed = 'move'
          setTimeout((_) => {
            clonedNode.remove()
          }, 1)
        })

        return node
      }
      const dragEndHandler = (event) => {
        this.app
          .getContentNode()
          .querySelector('.drag-over')
          ?.classList.remove('drag-over')
        this.app
          .getContentNode()
          .querySelector('.dragged')
          ?.classList.remove('dragged')
      }
      const dragEnterHandler = (event) => {
        event.preventDefault()
        this.app
          .getContentNode()
          .querySelector('.drag-over')
          ?.classList.remove('drag-over')
        const dragEnterElement = event.target.closest('[data-id]')
        if (dragEnterElement) {
          dragEnterElement.classList.add('drag-over')
        }
      }
      const dropEventHandler = (event) => {
        event.preventDefault()
        this.app
          .getContentNode()
          .querySelector('.drag-over')
          ?.classList.remove('drag-over')
        this.app
          .getContentNode()
          .querySelector('.dragged')
          ?.classList.remove('dragged')
        const draggedElement = this.app
          .getContentNode()
          .querySelector(`[data-id="${event.dataTransfer.getData('id')}"]`)
        const dropTarget = event.target.closest('[data-id]')

        if (dropTarget === draggedElement) {
          return
        }

        const parentNode = event.currentTarget
        const nextSibling = dropTarget?.nextSibling || null
        const previousSibling = dropTarget?.previousSibling || null

        if (!nextSibling || !dropTarget) {
          draggedElement.remove()
          parentNode.appendChild(draggedElement)
        } else {
          if (previousSibling === draggedElement) {
            draggedElement.remove()
            dropTarget.after(draggedElement)
          } else {
            draggedElement.remove()
            dropTarget.before(draggedElement)
          }
        }

        const visible = []
        nodeViewable.querySelectorAll('[data-id]').forEach((item) => {
          visible.push(item.dataset.id)
        })
        const hidden = []
        nodeHidden.querySelectorAll('[data-id]').forEach((item) => {
          hidden.push(item.dataset.id)
        })
        this.userAPI.reorder(visible, hidden)
      }

      this.userAPI
        .list()
        .then((list) => {
          if (!list) {
            return []
          }
          return list
            .filter((a) => !a.disabled)
            .sort((a, b) => a.order - b.order)
        })
        .then((list) => {
          this.viewable = []
          this.hidden = []
          list.forEach((item) => {
            if (item.order < 0) {
              this.hidden.push(item.id)
            } else {
              this.viewable.push(item.id)
            }
          }, this)
          nodeViewable.append(
            ...list.filter((item) => item.order >= 0).map(itemToHtml),
          )
          nodeHidden.append(
            ...list.filter((item) => item.order < 0).map(itemToHtml),
          )
          nodeViewable.classList.add('ka-order-container', 'viewable')
          nodeHidden.classList.add('ka-order-container', 'hidden')
          nodeViewable.addEventListener('dragover', (e) => e.preventDefault())
          nodeHidden.addEventListener('dragover', (e) => e.preventDefault())
          nodeViewable.addEventListener('drop', dropEventHandler)
          nodeHidden.addEventListener('drop', dropEventHandler)
          nodeViewable.addEventListener('dragenter', dragEnterHandler)
          nodeHidden.addEventListener('dragenter', dragEnterHandler)
          nodeViewable.addEventListener('dragend', dragEndHandler)
          nodeHidden.addEventListener('dragend', dragEndHandler)

          l10n
            .load({
              order: 'Ordre les utilisateurs',
              visible: 'Visible sur le planning',
              invisible: 'Invisible sur le planning',
            })
            .then((strings) => {
              const title = document.createElement('h2')
              title.innerHTML = strings.order
              const subtitle1 = document.createElement('h3')
              subtitle1.innerHTML = strings.visible
              const subtitle2 = document.createElement('h3')
              subtitle2.innerHTML = strings.invisible
              this.app.clearContent()
              this.app.appendContent(title)
              this.app.appendContent(subtitle1)
              this.app.appendContent(nodeViewable)
              this.app.appendContent(subtitle2)
              this.app.appendContent(nodeHidden)
              resolve()
            })
        })
        .catch((e) => {
          resolve()
          console.log(e)
        })
    }).catch((e) => {
      console.log(e)
      resolve()
    })
  }

  #renderNavigationUser(user) {
    const node = document.createElement('DIV')
    node.setAttribute('aria-role', 'menuitem')
    node.setAttribute('tabindex', '0')
    node.classList.add('item')
    if (user.disabled) {
      node.classList.add('disabled')
    }
    node.dataset.searchable = user.name.toLowerCase()
    node.dataset.action = `openUser:${user.id}`
    node.dataset.id = `${user.id}`
    node.dataset.order = user.order
    node.innerHTML = `${user.name}`
    return node
  }

  navigation() {
    return new Promise((resolve, reject) => {
      this.app.access.can(this.userAPI, 'list').then((_) => {
        const nav = document.createElement('div')
        this.navigationNode = nav
        nav.setAttribute('aria-role', 'menuitem')
        nav.setAttribute('tabindex', '0')
        this.navigationNode = nav
        nav.classList.add('ka-nav', 'ka-userui-nav')
        nav.addEventListener('click', (event) => {
          const selectedNode = event.target.closest('[data-action]')
          if (selectedNode) {
            this.navigateFromNode(selectedNode)
          }
        })
        l10n
          .T(
            `
                <div data-action="new" class="item">$[Nouvel utilisateur]</div>
                <div data-action="order" class="item">$[Ordre des utilisateurs]</div>
            `,
          )
          .then((content) => {
            nav.innerHTML = content
            const node = document.createElement('DIV')
            node.setAttribute('aria-role', 'searchbox')
            node.innerHTML = '<input placeholder="Recherche" />'
            nav.appendChild(node)
            node.addEventListener('keyup', (event) =>
              this.filterListOnKeypress(event),
            )

            const sep = document.createElement('DIV')
            sep.classList.add('item', 'separator')
            sep.id = `new-user-insert-after-${this.idRandomPrefix}`
            sep.setAttribute('aria-role', 'none')
            nav.appendChild(sep)

            this.userAPI
              .list()
              .then((list) => {
                if (!list) {
                  return
                }
                list.sort((a, b) => {
                  if (a.disabled > b.disabled) {
                    return 1
                  }
                  if (a.disabled < b.disabled) {
                    return -1
                  }
                  return b.order - a.order
                })
                let inactiveStart = false
                list.forEach((u) => {
                  const node = this.#renderNavigationUser(u)
                  if (u.disabled && !inactiveStart) {
                    inactiveStart = true
                    const sep = document.createElement('DIV')
                    sep.classList.add('item', 'separator')
                    sep.id = `inactive-zone-separation-point-${this.idRandomPrefix}`
                    sep.setAttribute('aria-role', 'none')
                    nav.appendChild(sep)
                  }
                  nav.appendChild(node)
                })
              })
              .then((_) => {
                return resolve(nav)
              })
              .catch((e) => {
                console.log(e)
              })
          })
          .catch((e) => {
            if (e instanceof AccessDeniedError) {
              return this.app.setBlockError(
                new Error('Perimision denied'),
                this.app.getNavigationNode(),
              )
            }
            reject(e)
          })
      })
    })
  }

  main() {
    return new Promise((resolve, reject) => {
      this.app.access
        .can(this.userAPI, 'get')
        .then((_) => {
          const main = document.createElement('div')
          return resolve(main)
        })
        .catch((e) => {
          if (e instanceof AccessDeniedError) {
            return this.app.setBlockError(
              new Error('Perimision denied'),
              this.app.getContentNode(),
            )
          }
          reject(e)
        })
    })
  }

  destroy() {
    return Promise.resolve()
  }
}
