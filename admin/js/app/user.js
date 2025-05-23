const base = window.location.pathname.split('/')
  while (!base[0]) { base.shift() }
  const KLoginInstance = (new KLogin(new URL(`${window.location.origin}/${base.shift()}/`)))

  function editUser(userId) {
    return new Promise((resolve, reject) => {
      ; (() => {
        if (userId) return kafetch2(`${KAAL.getBase()}/Person/${userId}`)
        return Promise.resolve({
          id: '',
          username: '',
          name: '',
          efficiency: 1,
          level: 256,
          workday: 'nyyyyyn',
          order: -1,
          disabled: 0
        })
      })()
        .then(userResponse => {
          const user = Array.isArray(userResponse) ? userResponse[0] : userResponse
          const popup = window.Admin.popup(`<form>
          <input type="hidden" value="${user.id}" name="user" />
          <label for="username">Nom d'utilisateur : <input type="text" name="username" value="${user.username}" /></label><br>
          <label for="name">Nom : <input type="text" name="name" value="${user.name}" /></label><br>
          <label for="bxuser">Utilisateur Bexio : <select type="text" name="bxuser">
            <option value="0"> -- Aucun -- </option>
            </select>
            </label><br>
          <label for="efficiency">Efficacité : <input name="efficiency" type="text" value="${user.efficiency}"></label> (min: 0.1, max: 2.0)<br>
          <label for="level">Niveau d'accèss : <select name="level">
              <option value="256" ${parseInt(user.level) === 256 ? 'selected' : ''}>Ajout temps</option>
              <option value="128" ${parseInt(user.level) === 128 ? 'selected' : ''}>Gestion projet</option>
              <option value="64" ${parseInt(user.level) === 64 ? 'selected' : ''}>Gestion projet et processus </option>
              <option value="32" ${parseInt(user.level) === 32 ? 'selected' : ''}>Gestion temps, projet et processus</option>
              <option value="16" ${parseInt(user.level) === 16 ? 'selected' : ''}>Gestion de tout</option>
          </select></label><br/>
    
          <label for="order">Ordre au planning : <input name="order" type="text" value="${user.order}"/><br>
            Jour de travail : <br>
            <label><input type="checkbox" ${user.workday.charAt(1) === 'y' ? 'checked' : ''} name="workday_1"> Lundi</label>
            <label><input type="checkbox" ${user.workday.charAt(2) === 'y' ? 'checked' : ''} name="workday_2"> Mardi</label>
            <label><input type="checkbox" ${user.workday.charAt(3) === 'y' ? 'checked' : ''} name="workday_3"> Mercredi</label><br>
            <label><input type="checkbox" ${user.workday.charAt(4) === 'y' ? 'checked' : ''} name="workday_4"> Jeudi</label>
            <label><input type="checkbox" ${user.workday.charAt(5) === 'y' ? 'checked' : ''} name="workday_5"> Vendredi</label>
            <label><input type="checkbox" ${user.workday.charAt(6) === 'y' ? 'checked' : ''} name="workday_6"> Samedi</label><br>
            <label><input type="checkbox" ${user.workday.charAt(0) === 'y' ? 'checked' : ''} name="workday_0"> Dimanche</label>
          <br>
          <fieldset><legend>Groupes</legend>
            <div name="groups"></div>
          </fieldset>
          <br>
          <button type="submit">Sauver</button><button type="reset">Annuler</button>
          </form>
        `, user.id ? `Modifier utilisateur ${user.name}` : `Ajouter un nouvel utilisateur`, { closable: true, loading: true })

          kafetch2(`${KAAL.getBase()}/GroupUser/_query`, { method: 'POST', body: { user: userId } })
            .then(currentGroups => {
              const ms = new KMultiSelectUI(new GroupStore(), currentGroups.map(g => g.group), () => {
                return new Promise(resolve => {
                  const newProjectForm = new UIKAGroupForm()
                  const popup = window.Admin.popup(newProjectForm.domNode, 'Ajouter un groupe', { closable: true })
                  newProjectForm.addEventListener('submit', event => {
                    event.preventDefault()
                    const gs = new GroupStore()
                    const formData = event.detail
                    gs.set({ name: formData.get('name'), description: formData.get('description') })
                      .then(_ => {
                        popup.close()
                        resolve()
                      })
                      .catch(cause => {
                        popup.close()
                        resolve()
                      })
                  })
                  newProjectForm.addEventListener('reset', event => {
                    event.preventDefault()
                    popup.close()
                    resolve()
                  })
                })
              })
              const node = popup.querySelector('div[name="groups"]')
              node.parentNode.replaceChild(ms.domNode, node)
              ms.render()
              return ms
            })
            .then(ms => {
              if (KAAL.bexio.enabled == 0) {
                return Promise.resolve(ms)
              }
              return new Promise((resolve, reject) => {
                kafetch2(`${KAAL.getBase()}/BXUser`)
                .then(bexioUsers => {
                  const select = popup.querySelector('select[name="bxuser"]')
                  bexioUsers.forEach(bx => {
                    const user = document.createElement('OPTION')
                    user.value = bx.id
                    user.innerHTML = `${bx.firstname} ${bx.lastname}`
                    select.appendChild(user)
                  })
                  kafetch2(`${KAAL.getBase()}/PersonLink/_query`, {method: 'POST', body: {uid: userId, service: 'bexio'}})
                  .then(relation => {
                    if (relation.length <= 0) { return resolve(ms) }
                    relation = relation[0]
                    const relationDomNode = select.querySelector(`option[value="${relation.extid}"]`)
                    if (relationDomNode) { relationDomNode.setAttribute('selected', '1') }
                    return resolve(ms)
                  })
                })
              })
            })
            .then(ms => {
              const form = popup.getElementsByTagName('form')[0]
              popup.loaded()
              form.addEventListener('reset', (event) => {
                popup.close()
              })
              form.addEventListener('keypress', (event) => {
                if (event.target.nodeName === 'INPUT' && event.target.name === 'password') {
                  let node = event.target
                  while (node && node.nodeName !== 'FORM') { node = node.parentNode }
                  let nodes = node.getElementsByTagName('SPAN')
                  for (let n of nodes) {
                    if (n.dataset.name && n.dataset.name === 'password-modified') {
                      window.requestAnimationFrame(() => { n.parentNode.removeChild(n) })
                      break
                    }
                  }
                }
              })

              form.addEventListener('submit', (event) => {
                event.preventDefault()
                let disconnect = false
                const content = window.Admin.getForm(event.target)

                new Promise((resolve, reject) => {
                  /* check if user exist */
                  kafetch2(`${KAAL.getBase()}/Person/_query`, { method: 'POST', body: { username: content.username } })
                    .then(user => {
                      if (user.length > 0 && String(user[0].id) !== String(content.user)) { return reject('Utilisateur existant') }
                      return resolve(content)
                    })
                })
                  .then(content => {
                    /* map content of form to query body */
                    let mapping = { username: 'username', name: 'name', efficiency: 'efficiency', level: 'level', order: 'order' }
                    let body = { disabled: content.disabled ? '1' : '0', workday: 'nyyyyyn' }
                    for (let i in mapping) {
                      if (content[i] && content[i] !== null) {
                        body[mapping[i]] = content[i]
                      } else {
                        body[mapping[i]] = ''
                      }
                    }
                    let workday = ['n', 'y', 'y', 'y', 'y', 'y', 'n']
                    content.workday_0 ? workday[0] = 'y' : workday[0] = 'n'
                    content.workday_1 ? workday[1] = 'y' : workday[1] = 'n'
                    content.workday_2 ? workday[2] = 'y' : workday[2] = 'n'
                    content.workday_3 ? workday[3] = 'y' : workday[3] = 'n'
                    content.workday_4 ? workday[4] = 'y' : workday[4] = 'n'
                    content.workday_5 ? workday[5] = 'y' : workday[5] = 'n'
                    content.workday_6 ? workday[6] = 'y' : workday[6] = 'n'
                    body.workday = workday.join('')
                    body.efficiency = parseFloat(body.efficiency)

                    if (body.efficiency < 0.1 || body.efficiency > 2.0) {
                      return reject(`Une efficacité de ${body.efficiency} n'est pas acceptable, la valeur doit être entre 0.1 et 2.0`)
                    }
                    body.level = parseInt(body.level)
                    if (content.user) { 
                      body.id = parseInt(content.user) 
                      if (isNaN(body.id)) { delete body.id }
                    }
                    /*
                    if (content.password) {
                      if (content.password.length < 6) {
                        return reject('Mot de passe trop court, veuillez entrer au moins 6 caractères')
                      }
                    }*/

                    return new Promise((resolve, reject) => {
                      /* change user in db */
                      const path = body.id ? `${KAAL.getBase()}/Person/${body.id}` : `${KAAL.getBase()}/Person`
                      kafetch2(path, {method: body.id ? 'PATCH' : 'POST', body: body})
                      .then(user => {
                        return kafetch2(`${KAAL.getBase()}/Person/${user[0].id}`)
                      })
                      .then(user => {
                        resolve(user[0])
                      })
                      .catch(cause => {
                        reject(cause)
                      })
                    })

                  })
                  .then(user => {
                    /* display new user, close popup */
                    user._connections = []
                    newEntry(user)
                    .then(html => {
                      replaceAddEntry(html)
                      let p = event.target
                      while (p && !p.classList.contains('popup')) { p = p.parentNode }
                      popup.close()
                    })
                    return user
                  })
                  .then(user => {
                    /* link user to external service id (only one yet) */
                    return new Promise((resolve, reject) => {
                        if (content.bxuser === '0') {
                          kafetch2(`${KAAL.getBase()}/PersonLink/${user.id},bexio`, {method: 'DELETE'})
                          .then(x => {
                            return resolve(user)
                          })
                          .catch(cause => {
                            reject(cause)
                          })
                        } else {
                          kafetch2(`${KAAL.getBase()}PersonLink/${user.id},bexio`, {method: 'POST', body:{
                            extid: content.bxuser,
                            service: 'bexio',
                            uid: user.id
                          }})
                          .then(_ => {
                            return resolve(user)
                          })
                          .catch(cause => {
                            reject(cause)
                          })
                        }
                    })
                  })
                  .then(user => {
                    /* set user groups */
                    return new Promise((resolve, reject) => {
                      Promise.all([
                        kafetch2(`${KAAL.getBase()}/GroupUser/_query`, { method: 'POST', body: { user: user.id } }),
                        ms.getSelected()
                      ])
                        .then(([currentGroups, selectedGroups]) => {
                          Promise.allSettled(currentGroups.map(g => {
                            if (selectedGroups.indexOf(String(g.group) === -1)) {
                              return kafetch2(`${KAAL.getBase()}/GroupUser/${g.uid}`, { method: 'DELETE' })
                            }
                          }))
                            .then(_ => {
                              selectedGroups = selectedGroups.filter(g => !currentGroups.find(c => String(c.group)) !== g)
                              return Promise.allSettled(selectedGroups.map(g => {
                                return kafetch2(`${KAAL.getBase()}/GroupUser`, { method: 'POST', body: { group: g, user: user.id } })
                              }))
                            })
                            .then(_ => {
                              return resolve()
                            })
                        })
                    })
                  })
                  .catch(cause => {
                    alert(cause)
                  })
              })
            })
        })
    })
  }

  function showConnections(userId, username) {
    return new Promise((resolve, reject) => {

      KLoginInstance.getActive(userId)
        .then(connections => {

          const popup = window.Admin.popup(`<form>
        <input type="hidden" value="${userId}" name="user" />
        <table>
          <tr><th>Temps</th><th>Navigateur</th><th>Adresse IP</th><th>Nom d'hote</th><th>Partage</th><th>Jusqu'à</th><th>URL</th><th>Commentaire</th><th></th></tr>
        </table>
        <button value="dis-user" type="submit">Déconnecter utilisateur</button>
        <button value="dis-share" type="submit">Déconnecter partages</button>
        <button value="dis-all" type="submit">Déconnecter tout</button>
        </form>
        `, `Connections pour ${username}`, { closable: true })

          const form = popup.getElementsByTagName('form')[0]
          form.addEventListener('submit', event => {
            event.preventDefault()
            const data = new FormData(event.target)
            switch (event.submitter.value) {
              default:
                if (!String(event.submitter.value).startsWith('dis-one-')) { break; }
                const parts = String(event.submitter.value).split('-')
                KLoginInstance.disconnectById(parts.pop())
                  .then(_ => {
                    getUser(data.get('user'))
                    popup.close()
                  })
                break
              case 'dis-user':
                KLoginInstance.disconnect(data.get('user'))
                  .then(_ => {
                    getUser(data.get('user'))
                    popup.close()
                  })
                break;
              case 'dis-all':
                KLoginInstance.disconnectAll(data.get('user'))
                  .then(_ => {
                    getUser(data.get('user'))
                    popup.close()
                  })
                break;
              case 'dis-share':
                KLoginInstance.disconnectShare(data.get('user'))
                  .then(_ => {
                    getUser(data.get('user'))
                    popup.close()
                  })
                break;
            }
          })
          const table = popup.getElementsByTagName('TABLE')[0]
          for (const connection of connections) {
            const time = new Date()
            let url = ''
            let share = 'Non'
            let duration = parseInt(connection.duration)
            switch (parseInt(connection.share)) {
              case 1:
                const aUrl1 = new URL(`https://${connection.url}`)
                aUrl1.searchParams.append('access_token', connection.auth)
                share = 'Permanent';
                duration = -1;
                url = `<a href="${aUrl1.toString()}">${connection.url}</a>`
                break
              case 2:
                const aUrl2 = new URL(`https://${connection.url}`)
                aUrl2.searchParams.append('access_token', connection.auth)
                share = 'Temporaire';
                url = `<a href="${aUrl2.toString()}">${connection.url}</a>`
                break
            }
            time.setTime(parseInt(connection.time) * 1000)
            if (duration === -1) { duration = '' }
            else {
              const upto = new Date()
              upto.setTime(time.getTime() + (parseInt(connection.duration) * 1000))
              duration = upto.toLocaleString()
            }
            time.setTime(parseInt(connection.time) * 1000)
            const tr = document.createElement('TR')
            tr.innerHTML = `
              <td>${time.toLocaleString()}</td>
              <td class="ka-ua">${connection.useragent}</td>
              <td>${connection.remoteip}</td>
              <td>${connection.remotehost}</td>
              <td>${share}</td>
              <td>${duration}</td>
              <td>${url}</td>
              <td>${connection.comment}</td>
              <td><button value="dis-one-${connection.uid}" type="submit">Déconnecter</button></type>`
            table.appendChild(tr)
          }
        })
    })
  }

  const levels = {
    256: 'Ajout de temps',
    128: 'Gestion de projet',
    64: 'Gestion de projet et processus',
    32: 'Gestion de temps, projet et processus',
    16: 'Gestion de tout'
  }

  function newEntry(entry, edit = false) {
    return new Promise((resolve, reject) => {
      let tr = null
      if (entry.id) {
        tr = document.createElement('TR')
        tr.setAttribute('data-id', entry.id)
        let level = ''
        let highest = 32768;
        for (let l in levels) {
          if (parseInt(l) >= parseInt(entry.level)) {
            if (parseInt(l) < highest) {
              level = levels[l]
              highest = parseInt(l)
            }
          }
        }
        let disabled = parseInt(entry.disabled)
        if (isNaN(disabled)) { disabled = 0 }

        tr.innerHTML = `
         <td>${entry.name}</td>
         <td>${entry.username}</td>
         <td>${entry.efficiency}</td>
         <td>${entry.price}</td>
         <td data-sort-value="${disabled}">${(disabled === 0 ? 'oui' : 'non')}</td>
         <td>${level}</td>
         <td>${entry.order}</td>
         <td>
         <button data-user="${entry.id}" data-username="${entry.name}" type="button" data-action="edit">Modifier</button>
         <button data-user="${entry.id}" data-username="${entry.name}" type="button" data-action="invitation">Inviter</button>
         <button data-user="${entry.id}" data-username="${entry.name}" type="button" data-action="pricing">Tarif horaire</button>
         <button data-user="${entry.id}" data-username="${entry.name}" type="button" data-action="connections">Connections (${entry._connections.length})</button>
         <button data-user="${entry.id}" data-username="${entry.name}" type="button" data-action="delete">Supprimer</button></td>`
      }
      resolve(tr)
    })
  }

  function getTable(source) {
    var tables = document.getElementsByTagName('TABLE')
    for (var i = 0; i < tables.length; i++) {
      if (tables[i].getAttribute('data-source') === source) {
        return tables[i]
      }
    }
    return null
  }

  function replaceAddEntry(tr) {
    var table = getTable('Person')
    var tbody = table.firstChild
    for (; tbody.nodeName != 'TBODY'; tbody = tbody.nextSibling);
    var id = tr.getAttribute('data-id')
    Admin.insertEntry(tr, table, id)
  }

  function setUserPrice(userId, username) {
    let url = new URL('../PrixHeure', window.location)
    url.searchParams.append('sort.validity', 'ASC')
    url.searchParams.append('search.person', userId)
    fetch(url, { headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${performance.now()}` }) }).then(response => {
      if (!response.ok) {
        alert('Indisponible')
      } else {
        response.json().then(result => {
          let html = ''
          for (let i = 0; i < result.length; i++) {
            let entry = result.data[i]
            let date = new Date(entry.validity)
            html += `<div data-id="${entry.id}" data-person="${userId}" data-date="${date.toISOString().split('T')[0]}" class="entry"><span class="begin">${date.fullDate()}</span><span class="amount">${parseFloat(entry.value)}</span><i class="fa fa-trash-o" aria-hidden="true"></i></div>`
          }
          html = `<div class="pricing">
              <div class="entry head"><span>Depuis</span><span>Montant</span></div>
              ${html === '' ? '<div class="nothing">Pas d\'horaire</div>' : html}
            </div>
            <form name="add">
              <label for="validity">Valable depuis </label><input type="date" name="validity" /><br />
              <label for="value">Prix horaire </label><input type="text" name="value">
              <input type="submit" value="Ajouter" /><input type="hidden" name="person" value="${userId}" />

            </form>`
          let popup = Admin.popup(html, `Tarif horaire - ${username}`, { closable: true, minWidth: '30ch' })
          popup.addEventListener('click', event => {
            if (event.target.classList.contains('fa-trash-o')) {
              let p = event.target.parentNode
              while (p && p.dataset.id === undefined) { p = p.parentNode }
              fetch(new URL(`../PrixHeure/${p.dataset.id}`, window.location), {
                method: 'DELETE',
                headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${p.dataset.id}` })
              }).then(response => {
                if (response.ok) {
                  window.requestAnimationFrame(() => p.parentNode.removeChild(p))
                  window.dispatchEvent(new CustomEvent('update', {
                    detail: {
                      type: 'user',
                      id: p.dataset.person
                    }
                  }))
                }
              })
            }
          }, { capture: true })
          popup.addEventListener('submit', (event) => {
            event.preventDefault()
            let pTable = event.target.parentNode.firstElementChild
            while (pTable && !pTable.classList.contains('pricing')) { pTable = pTable.nextElementSibling }

            let values = Admin.getForm(event.target)
            if (values.validity && values.value) {
              values.value = parseFloat(values.value)
              values.validity = new Date(values.validity)
              if (!isNaN(values.value) && !isNaN(values.validity.getTime())) {
                let url = new URL('../PrixHeure', window.location)
                fetch(url, {
                  method: 'POST',
                  body: JSON.stringify({ value: values.value, validity: values.validity, person: values.person }),
                  headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${performance.now()}` })
                }).then(response => {
                  if (response.ok) {
                    response.json().then(result => {
                      if (result.length === 1) {
                        window.dispatchEvent(new CustomEvent('update', {
                          detail: {
                            type: 'user',
                            id: values.person
                          }
                        }))
                        let id = Array.isArray(result.data) ? result.data[0].id : result.data.id
                        if (id) {
                          let date = new Date(values.validity)
                          let div = document.createElement('DIV')
                          div.dataset.id = id
                          div.dataset.date = date.toISOString().split('T')[0]
                          div.classList.add('entry')
                          div.innerHTML = `<span class="begin">${date.fullDate()}</span><span class="amount">${parseFloat(values.value)}</span><i class="fa fa-trash-o" aria-hidden="true"></i>`
                          if (
                            pTable.lastElementChild.classList.contains('nothing') ||
                            pTable.lastElementChild.classList.contains('head')
                          ) {
                            window.requestAnimationFrame(() => {
                              if (!pTable.lastElementChild.classList.contains('head')) {
                                pTable.removeChild(pTable.lastElementChild)
                              }
                              pTable.appendChild(div)
                            })
                          } else {
                            let added = false
                            for (let n = pTable.firstElementChild; n; n = n.nextElementSibling) {
                              if (n.dataset.date > div.dataset.date) {
                                window.requestAnimationFrame(() => pTable.insertBefore(div, n))
                                added = true
                                break
                              }
                            }
                            if (!added) {
                              window.requestAnimationFrame(() => pTable.appendChild(div))
                            }
                          }
                        }
                      }
                    })
                  }
                })
              }
            }
          }, { capture: true })

        })
      }
    })
  }

  function deleteUser(userId) {
    return new Promise((resolve, reject) => {
      kafetch(KAAL.url(`Person/${userId}`)).then((result) => {
        if (!result.success || result.length !== 1) { reject(new Error('Une erreur est survenue')); console.log(result); return }
        let user = Array.isArray(result.data) ? result.data[0] : result.data
        if (confirm(`Voulez-vous vraiment supprimer l'utilisateur ${user.name} ?`)) {
          KLoginInstance.disconnectAll(userId)
          kafetch(KAAL.url(`Person/${user.id}`), { method: 'DELETE', body: { id: user.id } }).then((result) => {
            if (result.success) { resolve(); return }
            reject()
          })
        }
      })
    })
  }

  function getUser(id) {
    fetch(new URL(`../Person/${id}`, window.location), {
      headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${id}` })
    }).then(response => {
      if (response.ok) {
        response.json().then(result => {
          if (result.length === 1) {
            const entry = Array.isArray(result.data) ? result.data[0] : result.data
            KLoginInstance.getActive(entry.id)
              .then(connections => {
                entry._connections = connections
                newEntry(entry)
                  .then(html => {
                    replaceAddEntry(html)
                  })
              })
          }
        })
      }
    })
  }
  function loadUsers() {
    return new Promise((resolve, reject) => {
      const url = KAAL.url('Person', { params: { 'search.deleted': '-' } })
      kafetch(url)
      .then(function (person) {
        if (person.success && person.length > 0) {
          for (var i = 0; i < person.length; i++) {
            const entry = person.data[i]
            KLoginInstance.getActive(entry.id)
              .then(connections => {
                entry._connections = connections
                newEntry(entry)
                  .then((html) => {
                    replaceAddEntry(html)
                  })
              })
          }
        }
      })
      .catch(function (cause) {
        console.log(cause)
        reject(cause)
      })
    })
  }

  function generate_invitation_link (userid)
  {
    KLoginInstance.generateInvitationCode(userid)
    .then(code => {
      const invitlink = KAAL.url(`?invitation=${code.invitation}`)
      window.Admin.popup(
        `Le lien d'invitation est <a href="${invitlink}">${invitlink}</a>`,
        'Lien d\'invitation', { closable: true }
      )
    })
    .catch(e => {
      MsgInteractUI('error', 'Erreur création du lien d\'invitation')
    })
  }

  window.addEventListener('load', function () {
    //const UserTable = new Artnum.DTable({ table: 'users' })
    window.addEventListener('update', (event) => {
      if (!event.detail) { return }
      if (!event.detail.type) { return }
      switch (event.detail.type) {
        case 'user':
          getUser(event.detail.id)
          break
      }
    })
    document.getElementById('users').addEventListener('click', (event) => {
      if (event.target.nodeName !== 'BUTTON') { return }
      let node = event.target
      while (node && node.nodeName !== 'TR') { node = node.parentNode }
      switch (event.target.dataset.action) {
        case 'edit':
          editUser(node.dataset.id)
          break
        case 'invitation':
          generate_invitation_link(node.dataset.id)
          break
        case 'delete':
          deleteUser(node.dataset.id).then(() => {
            window.requestAnimationFrame(() => node.parentNode.removeChild(node))
          })
          break
        case 'pricing':
          setUserPrice(node.dataset.id, event.target.dataset.username)
          break
        case 'connections':
          showConnections(node.dataset.id, event.target.dataset.username)
          break
      }
    })
    document.querySelector('button[name="addNewUser"]')
        .addEventListener('click', e => { editUser(null) })
    loadUsers()
  })