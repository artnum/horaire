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
  this.nodes = new Map()
}

/**
 * Render the widget.
 * @returns {Promise.<HTMLElement>} Rendered node
 */
KAPlanningUI.prototype.render = function () {
  return new Promise((resolve, reject) => {
    import('../JAPI/JAPI.js').then((japiModule) => {
      const japi = new japiModule.JAPI()

      japi.API.exec('Planning', 'myForecast').then((forecast) => {
        console.log(forecast)
        forecast.forEach((planDay) => {
          const div = this.nodes.has(planDay.date)
            ? this.nodes.get(planDay.date)
            : document.createElement('DIV')
          if (!div.parentNode) {
            div.innerHTML = `<h2>${DataUtils.textualShortDate(planDay.date)}</h2>`
            this.domNode.appendChild(div)
            this.nodes.set(planDay.date, div)
          }

          const content = document.createElement('DIV')
          content.classList.add('ka-forecast-project')
          const kolor = new Kolor(planDay.status.color)
          content.style.color = kolor.foreground()
          content.style.backgroundColor = kolor.hex()
          content.innerHTML = `
                <span class="reference">${planDay.reference} [${planDay.status.name}]</span>
                <span class="project">${planDay.name}</span>
                <span class="description" style="grid-column-start: 1; grid-column-end: 3;">${planDay.description}</span>
            `
          planDay.coworkers = Array.from(planDay.coworkers)
          if (planDay.coworkers && planDay.coworkers.length > 0) {
            let w = '👥 Avec'
            planDay.coworkers.forEach((c) => {
              content.innerHTML += `<span class="coworker">${w}</span><span class="coworker">${c}</span>`
              w = ''
            })
          }
          if (planDay.cars.length > 0) {
            planDay.cars.forEach((car) => {
              let w = '🚗 Véhicule'
              content.innerHTML += `<span class="coworker">${w}</span><span class="coworker">${car.status.name}</span>`
              w = ''
            })
          }
          if (planDay.managers.length > 0) {
            let w = '👽 Bureau'
            planDay.managers.forEach((m) => {
              content.innerHTML += `<span class="manager">${w}</span><span class="manager">${m}</span>`
              w = ''
            })
          }

          div.appendChild(content)
        })
        return resolve(this.domNode)
      })
    })
  })
}

KAPlanningUI.prototype.load = function () {
  return Promise.resolve()
}
