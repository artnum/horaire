import UserInteractUI from './js/ui/user-interact.js'
import TimeInteractUI from './js/ui/time-interact.js'

/* workaround for browser caching ... don't think it's still useful */
function checkBuildNumberAndReload() {
  return new Promise((resolve) => {
    const currentBuild = localStorage.getItem('kaal-build-number')
    fetch(new URL(`build_number`, window.location))
      .then((response) => {
        if (!response.ok) {
          throw new Error()
        }
        return response.text()
      })
      .then((buildNumber) => {
        localStorage.setItem('kaal-build-number', buildNumber)
        if (parseInt(currentBuild) !== parseInt(buildNumber)) {
          window.location.reload(true)
        }
        resolve()
      })
      .catch(e => {
        console.log(e)
      })
  })
}

window.addEventListener('load-scripts', (event) => {
  checkBuildNumberAndReload()
    .then(() => {
      const missing = new Missing()
      return missing.init()
    })
    .then((_) => {
      document.title = KAAL.title
      const userUI = new UserInteractUI()
      userUI.run().then((user) => {
        if (new Missing().isMissing(user.uid)) {
          const infoBox = document.createElement('DIV')
          infoBox.classList.add('MissingInfoBox')
          infoBox.innerHTML = `Des heures sont manquantes sur certains
                    projets. Veuillez vérifier et remplir le formulaire si des
                    corrections sont nécessaire`
          infoBox.addEventListener('click', (event) => {
            event.currentTarget.parentNode.removeChild(event.currentTarget)
          })
          document.body.insertBefore(
            infoBox,
            document.body.firstElementChild,
          )
        }
        const timeUI = new TimeInteractUI(user.uid, user.workday)
        window.KAALTimeUI = timeUI
        timeUI.run()
        timeUI.addEventListener('user-logout', (event) => {
          userUI.run()
        })
      })
    })
})

