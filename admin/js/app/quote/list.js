import { ProjectAPI as ProjectAPIClass } from './$script/src/JAPI/content/Project.js'
import format from './$script/src/lib/format.js'
import l10n from './$script/src/lib/l10n.js'
import RouterHandler from './$script/admin/app/router.js'

const ProjectAPI = ProjectAPIClass.getInstance()

export default class List {
    constructor()
    {
        this.container = document.createElement('DIV')
        this.container.classList.add('ka-quote-list')
        this.init()
    }

    init() {
        this.container.innerHTML = `
            <div class="row header">
                <span class="reference">${l10n.t('Référence')}</span>
                <span class="name">${l10n.t('Nom')}</span>
                <span class="project reference">${l10n.t('Référence project')}</span>
                <span class="project name">${l10n.t('Nom projet')}</span>
            </div>
        `
    }

    render(list) {
        return new Promise(resolve => {
            this.init()
            list.sort((a, b) => a.id - b.id)
            list.forEach(element => {
                (() => {
                    return new Promise(resolve => {
                        const entry = document.createElement('DIV')
                        entry.id = `offer-${element.id}`
                        entry.classList.add('row')
                        if (!format.is_zero(element.related)) {
                            entry.dataset.related = element.related
                        }
                        entry.innerHTML = `
                            <span data-action="open:offer.${element.id}" class="reference">${element.freference}</span>
                            <span data-action="open:offer.${element.id}" class="name">${element.name}</span>
                            <span data-action="open:project.${element.project}" class="project reference"></span>
                            <span data-action="open:project.${element.project}" class="project name"></span>
                        `
                        entry.querySelectorAll('span[data-action]')
                            .forEach(element => RouterHandler.attachRoute(element))

                        if (!element.project) {
                            return resolve(entry)
                        }

                        ProjectAPI.get(element.project)
                        .then(project => {
                            entry.querySelector('span.project.reference').innerHTML = `${project.reference}`
                            entry.querySelector('span.project.name').innerHTML = `${project.name}`
                            return resolve(entry)
                        })
                    })
                })()
                .then(entry => {
                    const node = this.container.querySelector(`#offer-${entry.id}`)
                    if (node) {
                        this.container.replaceChild(entry, node)
                    } else {
                        this.container.appendChild(entry)
                    }
                })
            })
            return resolve(this.container)
        });
    }
}