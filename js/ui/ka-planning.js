/**
 * Widget to display upcoming taks.
 * @class
 * @param {number} userid  ID of user we want forecast
 * @param {number} [days=4] Number of days to show
 * @name KAPlanningUI
 */
function KAPlanningUI(userid, days = 9) {
  this.userid = userid
  this.days = days
  this.domNode = document.createElement('DIV')
  this.domNode.classList.add('ka-forecast')
  this.domNode.innerHTML = '<h1>Planning provisoire</h1>'
}

/**
 * Render the widget.
 * @param {Array.<object>} reservations List of reservation object
 * @returns {Promise.<HTMLElement>} Rendered node
 */
KAPlanningUI.prototype.render = function (reservations) {
  return new Promise((resolve, reject) => {
    const nodes = new Map()
    reservations.sort((a, b) =>
      String(a.dbegin).localeCompare(String(b.dbegin)),
    )
    reservations.forEach((e) => {
      const div = nodes.has(e.dbegin)
        ? nodes.get(e.dbegin)
        : document.createElement('DIV')
      if (!div.parentNode) {
        nodes.set(e.dbegin, div)
        div.innerHTML = `<h2>${DataUtils.textualShortDate(e.dbegin)}</h2>`
        window.requestAnimationFrame(() => {
          this.domNode.appendChild(div)
        })
      }

      const kolor = new Kolor(e.status.color)
      const content = document.createElement('DIV')
      const nosubdesc =
        e.affaire.project.reference.trim() === e.affaire.reference.trim()
      content.classList.add('ka-forecast-project')
      content.style.color = kolor.foreground()
      content.style.backgroundColor = kolor.hex()
      content.innerHTML = `
                <span class="reference">${e.affaire.project.reference} [${e.status.name}]</span>
                <span class="project">${e.affaire.project.name}</span>
                <span class="subreference" ${nosubdesc ? 'style="display: none"' : ''}>${e.affaire.reference}</span>
                <span class="description" ${nosubdesc ? 'style="grid-column-start: 1; grid-column-end: 3;"' : ''}>${e.affaire.description}</span>
            `
      if (e.allocations && e.allocations.length > 0) {
        e.allocations.forEach((a) => {
          const subkolor = new Kolor(a.status.color)
          content.innerHTML += `<span style="border: 2px solid ${kolor.foreground()};color: ${subkolor.foreground()}; background-color: ${subkolor.hex()};">${a.status.symbol} ${a.status.group}</span><span style="border: 2px solid transparent">${a.status.name}</span>`
        })
      }

      if (e.coworkers && e.coworkers.length > 0) {
        let w = '<i class="fas fa-users"></i> Avec'
        e.coworkers.forEach((c) => {
          content.innerHTML += `<span class="coworker">${w}</span><span class="coworker">${c}</span>`
          w = ''
        })
      }
      const managers = []
      if (e.affaire.manager) {
        managers.push(e.affaire.manager.name)
      }
      if (e.technician) {
        managers.push(e.technician.name)
      }
      if (managers.length > 0) {
        let w = '<i class="fas fa-drafting-compass"></i> Bureau'
        managers.forEach((m) => {
          content.innerHTML += `<span class="manager">${w}</span><span class="manager">${m}</span>`
          w = ''
        })
      }
      window.requestAnimationFrame(() => div.appendChild(content))
    })

    return resolve(this.domNode)
  })
}

KAPlanningUI.prototype._loadCoworker = function (reservations) {
  return new Promise((resolve) => {
    Promise.allSettled(
      reservations.map((e) =>
        kafetch(new URL('store/Reservation/_query', KAAL.kairos.url), {
          method: 'POST',
          body: JSON.stringify({
            affaire: e.affaire.id,
            dbegin: e.dbegin,
            target: ['!=', e.target],
          }),
        }),
      ),
    )
      .then((responses) => {
        return responses
          .filter((e) => e.status === 'fulfilled')
          .map((e) => e.value.data)
          .flat()
      })
      .then((others) => {
        return Promise.allSettled(
          others.map((e) =>
            kafetch(new URL(`Person/${e.target}`, KAAL.getBase())),
          ),
        )
          .then((responses) => {
            return responses
              .filter((e) => e.status === 'fulfilled')
              .map((e) => e.value.data[0])
          })
          .then((users) => {
            others.forEach((o) => {
              o.target =
                users[users.findIndex((u) => u.id === parseInt(o.target))]
            })
            return others
          })
      })
      .then((others) => {
        reservations.forEach((r, idx, array) => {
          others.forEach((o) => {
            if (o.affaire === r.affaire.id && o.dbegin === r.dbegin) {
              if (!array[idx].coworkers) {
                array[idx].coworkers = []
              }
              array[idx].coworkers.push(o.target.name)
            }
          })
        })
        return resolve(reservations)
      })
      .catch((cause) => {
        console.log(cause)
        return resolve(reservations)
      })
  })
}

KAPlanningUI.prototype._loadRAllocation = function (reservations) {
  return new Promise((resolve, reject) => {
    Promise.allSettled(
      reservations.map((e) =>
        kafetch(new URL('store/Rallocation/_query', KAAL.kairos.url), {
          method: 'POST',
          body: JSON.stringify({
            target: e.affaire.id,
            type: 'afftbcar',
            date: e.dbegin,
          }),
        }),
      ),
    )
      .then((responses) => {
        return responses
          .filter((e) => e.status === 'fulfilled')
          .map((e) => e.value.data)
          .flat()
      })
      .then((allocations) => {
        return [
          Promise.allSettled(
            allocations.map((e) =>
              kafetch(new URL(`store/Status/${e.source}`, KAAL.kairos.url)),
            ),
          ),
          allocations,
        ]
      })
      .then(([responses, allocations]) => {
        return responses.then((responses) => {
          const status = responses
            .filter((e) => e.status === 'fulfilled')
            .map((e) => e.value.data[0])
          allocations.forEach((a) => {
            a.status =
              status[
                status.findIndex((s) => {
                  if (!s) {
                    return false
                  }
                  return s.id === a.source
                })
              ]
            if (!a.status) {
              a.status = {
                id: 0,
                bgcolor: '#FFFFFF',
                color: '#000000',
                description: '',
                name: 'Inconnu',
              }
            }
          })
          return resolve(allocations)
        })
      })
      .catch((cause) => {
        reject(cause)
      })
  })
}

/**
 * Load planning data. Associate project, affaire and users to reservations.
 * @returns {Promise.<Array.<object>>} Array of reservations
 */
KAPlanningUI.prototype.load = function () {
  return new Promise((resolve, reject) => {
    const day = new Date()
    day.setHours(12, 0, 0, 0)

    const requests = []
    for (let i = 0; i < this.days; i++) {
      day.setTime(day.getTime() + 86400000)
      if (day.getDay() === 0 || day.getDay() === 6) {
        --i
      }
      requests.push(
        kafetch(new URL('store/Reservation/_query', KAAL.kairos.url), {
          method: 'POST',
          body: JSON.stringify({
            dbegin: day.toISOString().split('T')[0],
            target: this.userid,
            deleted: '--',
          }),
        }),
      )
    }

    Promise.allSettled(requests)
      .then((responses) => {
        return responses
          .filter((e) => e.status === 'fulfilled')
          .map((e) => e.value.data)
          .flat()
      })
      .then((reservations) => {
        const affaires = reservations
          .map((e) => e.affaire)
          .filter((e, idx, array) => array.indexOf(e) === idx)
        return Promise.allSettled(
          affaires.map((e) => kafetch(new URL(`Travail/${e}`, KAAL.getBase()))),
        )
          .then((responses) => {
            return responses
              .filter((e) => e.status === 'fulfilled')
              .map((e) => e.value.data[0])
          })
          .then((affaires) => {
            reservations.forEach((e) => {
              e.affaire =
                affaires[affaires.findIndex((a) => a.id === e.affaire)]
            })
            return reservations
          })
      })
      .then((reservations) => {
        const projects = reservations
          .map((e) => e.affaire.project)
          .filter((e, idx, array) => array.indexOf(e) === idx)
        return Promise.allSettled(
          projects.map((e) => kafetch(new URL(`Project/${e}`, KAAL.getBase()))),
        )
          .then((responses) => {
            return responses
              .filter((e) => e.status === 'fulfilled')
              .map((e) => e.value.data[0])
          })
          .then((projects) => {
            reservations.forEach((e) => {
              if (typeof e.affaire.project !== 'number') {
                return
              }
              e.affaire.project =
                projects[projects.findIndex((p) => p.id === e.affaire.project)]
            })
            return reservations
          })
      })
      .then((reservations) => {
        return new Promise((resolve, reject) => {
          reservations.forEach((e, idx, array) =>
            e.technician
              ? (array[idx].technician = parseInt(e.technician))
              : (array[idx].technician = null),
          )
          Promise.allSettled(
            [
              reservations.map((e) => parseInt(e.technician)),
              reservations.map((e) => parseInt(e.affaire.project.manager)),
            ]
              .flat()
              .filter((e) => typeof e === 'number')
              .filter((e, idx, array) => array.indexOf(e) === idx)
              .map((e) => kafetch(new URL(`Person/${e}`, KAAL.getBase()))),
          )
            .then((responses) =>
              responses
                .filter((e) => e.status === 'fulfilled')
                .map((e) => e.value.data[0]),
            )
            .then((users) => {
              return resolve([reservations, users])
            })
            .catch((cause) => {
              reject(cause)
            })
        })
      })
      .then(([reservations, users]) => {
        reservations.forEach((e) => {
          if (!e.status) {
            e.status = e.affaire.status
          }
          if (typeof e.status !== 'number') {
            e.status = parseInt(e.status)
          }
          e.technician = users[users.findIndex((u) => u.id === e.technician)]
          if (typeof e.affaire.project.manager !== 'number') {
            return
          }
          e.affaire.manager =
            users[users.findIndex((u) => u.id === e.affaire.project.manager)]
        })
        Promise.allSettled(
          reservations.map((e) =>
            kafetch(new URL(`store/Status/${e.status}`, KAAL.kairos.url)),
          ),
        )
          .then((response) => {
            return response
              .filter((e) => e.status === 'fulfilled')
              .map((e) => e.value.data[0])
          })
          .then((status) => {
            reservations.forEach((e) => {
              e.status =
                status[
                  status.findIndex((s) => {
                    if (!s) {
                      return false
                    }
                    return s.id === e.status
                  })
                ]
              if (e.status === undefined) {
                e.status = {
                  id: 0,
                  bgcolor: '#FFFFFF',
                  color: '#000000',
                  description: '',
                  name: 'Inconnu',
                }
              }
            })
            this._loadRAllocation(reservations).then((allocations) => {
              reservations.forEach((r) => {
                allocations.forEach((a) => {
                  if (a.date === r.dbegin && a.target === r.affaire.id) {
                    if (!r.allocations) {
                      r.allocations = []
                    }
                    r.allocations.push(a)
                  }
                })
              })
              return resolve(this._loadCoworker(reservations))
            })
          })
      })
      .catch((cause) => {
        reject(new Error('Erreur chargement du planning', { cause }))
      })
  })
}
