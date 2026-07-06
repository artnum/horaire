import '../bootstrap/globals.js'
import '../admin-index.js'
import checkBuildNumberAndReload from '../lib/revision.js'
import UIKAProjectList from '../ui/ka-project-list.js'

window.Conf = { workweek: 5, weekhours: 42 }
  window.Conf.workday = window.Conf.weekhours / window.Conf.workweek

  function initForm (form, buttonProject) {
    form.reset()
    buttonProject.dispatchEvent(new CustomEvent('select'))
    document.getElementById('inYear').value = String((new Date()).getFullYear())
  }

  function load() {
    checkBuildNumberAndReload('project')
    .then(() => {
      const projectList = new UIKAProjectList()
      return projectList.init()
    })
    .then(projectList => {
      const projectForm = document.getElementById('projectform')
      const contactOld = new UIKAContactOld()
      const buttons = [
            new KAButton(`Projet`, {group: 'reference', selected: true}),
            new KAButton(`Régie`, {group: 'reference'}),
        ]

     const yearExportButton = document.body.querySelector('input[name="exportyear"]')
     yearExportButton.addEventListener('click', event => {
       Admin.getUrl('/kexport/export-all-projects')
       .then(url => {
         window.open(url)
       })
     })


     const exportParams = document.body.querySelector('input[name="export-with-params"]')
     exportParams.addEventListener('click', event => {
       const params = {}

       const begin = document.body.querySelector('input[name="export-begin"]')
       const end = document.body.querySelector('input[name="export-end"]')
       if (begin.value != '') {
         params.begin = begin.value
       }
       if (end.value != '') {
         end.begin = end.value
       }
       Admin.getUrl('/kexport/export-all-projects', params)
       .then(url => {
         window.open(url)
       })
     })
    const billingExportButton = document.body.querySelector('input[name="exportbill"]')
    billingExportButton.addEventListener('click', event => {
    Admin.getUrl('/kexport/export-project-state')
       .then(url => {
         window.open(url)
       })
     })

      kafetch2(`${KAAL.getBase()}/Project/.nextReferences`)
      .then(r => {
        const node = document.body.querySelector('input[name="reference"]')

        buttons[0].addEventListener('submit', _ => {
          document.body.querySelector('input[name="type"]').value = 'project'
          kafetch2(`${KAAL.getBase()}/Project/.nextReferences`)
          .then(r => {
            node.value = `${r[0].project}`
          })
        })
        buttons[1].addEventListener('submit', _ => {
          document.body.querySelector('input[name="type"]').value = 'regie'
          kafetch2(`${KAAL.getBase()}/Project/.nextReferences`)
          .then(r => {
            node.value = `${r[0].regie}`
          })
        })
        

        node.value = r[0].project
        window.requestAnimationFrame(() => {
          node.parentNode.insertBefore(buttons[1], node.nextElementSibling)
          node.parentNode.insertBefore(buttons[0], node.nextElementSibling)
        })
      })

      window.requestAnimationFrame(() =>
      document.body.querySelector('.project-list-parent').appendChild(projectList.domNode))
      projectList.textSearch('*', true)

      window.requestAnimationFrame(() => document.body.querySelector('span[name="clientContainer"]').appendChild(contactOld.domNode))

      const managerSelect = new KSelectUI(document.getElementById('manager'), new STPerson(), { allowFreeText: false, realSelect: true })

      document.getElementById('inYear').value = String((new Date()).getFullYear())
      projectForm.addEventListener('submit', function (event) {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        
        const project = {
          year: data.get('year'),
          name: data.get('name'),
          client: `Contact/${contactOld.getClientId()}`,
          manager: managerSelect.value,
          price: data.get('price'),
          uncount: data.get('uncount') === 'on' ? 1 : 0,
          ordering: data.get('ordering')
        }
        kafetch2(`${KAAL.getBase()}/Project/.nextReferences`)
        .then(r => {
          project.reference = r[0][data.get('type')]
          return projectList.checkProjectData(project)
        })
        .then(project => {
          return kafetch2(`${KAAL.getBase()}/Project/`, {method: 'POST', body: project})

        })
        .then(project => {
          return kafetch2(`${KAAL.getBase()}/Project/${project[0].id}`)
        })
        .then(project => {
          ; (() => {
            if (!KAAL.ked.enabled) { return }
            const ked = new KED()
            const related = data.get('type') === 'project' ? 'Project' : 'Régie'
            ked.createProject(project[0].id, project[0].reference, related)
            .catch(_ => {
              //new MsgInteractUI('warning', 'Création du projet sur KED échouée')
            })
          })()
          return projectList.associateProject(project[0])
        })
        .then(project => {
          return projectList.renderProject(project)
        })
        .then(projectNode => {
          return projectList.insertProjectNode(projectNode, true)
        })
        .then(_ => {
          initForm(form, buttons[0])
          contactOld.clearResult()
          contactOld.unselectContact()
          new MsgInteractUI('info', 'Création du projet effectuée')
        })
        .catch(cause => {
          new MsgInteractUI('error', cause)
        })

      })
    })
  }
window.addEventListener('kcore-loaded', load)
