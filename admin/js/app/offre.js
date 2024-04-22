import { AccountingDocAPI } from './$script/src/JAPI/AccountingDoc.js'
import { ContactAPI } from './$script/src/JAPI/Contact.js'
import { JFormData } from './$script/vendor/js/formdata/src/formdata.js'
import { Barrier } from './$script/src/lib/barrier.js'

const params = new URLSearchParams(window.location.search)
const kaoffer = new KAOfferUI()
const AccountingDoc = new AccountingDocAPI()
const Contact = new ContactAPI()

Promise.all([
    kaoffer.getProject(params.get('project')),
    AccountingDoc.listByProject(params.get('project'))
])
.then(([project, accDocs]) => {
    console.log(accDocs)
    Promise.all([
        (() => {
            if (accDocs.length === 0) {
                return new Promise((resolve, reject) => {
                    AccountingDoc.create({project: project.id, type: 'offer'})
                    .then(accDoc => {
                        resolve([accDoc])
                    })
                    .catch(cause => {
                        reject(cause)
                    })
                })
            } else {
                return Promise.resolve(accDocs)
            }
        })(),
        project
    ])
    .then(([accDocs, project]) => {
        return Promise.all([
            accDocs,
            project,
            AccountingDoc.getLines(accDocs[0].id),
            (new Barrier('offre')).register()
        ])
    })
    .then(([accDocs, project, lines, _]) => {
        const accDoc = accDocs[0]
        console.log(accDocs)
        const p = new Promise(resolve => {
            const breadcrumbs = document.querySelector('.breadcrumbs')
            breadcrumbs.innerHTML = accDocs.toReversed()
                .map(a => {
                    return `<div id="${a.id}" class="${accDoc.id === a.id ? "current" : "available"}" href="?project=${project.id}&doc=${a.id}">
                        ${a.reference}
                    </div>`
                })
                .join('<div class="spacer"> | </div>')
        })

        switch (accDoc.type) {
            case 'offer':
                document.querySelector('account-lines[name="offer"]').setState('open'); break
            default:
                document.querySelector('account-lines[name="offer"]').setState('frozen'); break
        }
        let documentTitle = 'OFFRE'
        switch (accDoc.type) {
            case 'offer':
                documentTitle = `OFFRE`
                break
            case 'invoice':
                documentTitle = `FACTURE`
                break
            case 'order':
                documentTitle = `COMMANDE`
                break
            case 'execution':
                documentTitle = `EXECUTION`
                break
        }
        accDoc.name = `${documentTitle} pour ${project.name}`
        accDoc.update()
        const node = document.querySelector('account-lines')
        node.dataset.id = accDoc.id
        node.id = accDoc.id
        lines.forEach(line => {
            node.addLine(line)
        })
        node.addEventListener('update', event => {
            const data = new JFormData(event.target)
            AccountingDoc.updateLines(data.toJSON(), accDoc.id)
        })
        const title = `[${documentTitle} ${accDoc.reference}] ${project.reference} - ${project.name}`
        document.title = title
        document.querySelector('body > h1').textContent = title
    })
})

document.querySelector('button[name="freeze"]').addEventListener('click', event => {
    const node = document.querySelector('account-lines[name="offer"]')
    
    AccountingDoc.nextStep(node.dataset.id)
    .then(response => {
        node.setState(response.state)
        AccountingDoc.getLines(node.dataset.id)
        .then(lines => {
            lines.forEach(line => {
                node.addLine(line)
            })
        })
    })
})

document.querySelector('form').addEventListener('submit', event => {
    event.preventDefault()

    const formData = new JFormData(event.target)
    console.log('formData', formData)
})

window.addEventListener('load', () => {
    document.querySelector('button[name="setTarget"]').addEventListener('click', event => {
        const node = document.querySelector('account-summary[name="final"]')
        const targetValue = parseFloat(node.querySelector('input[name="targetTotal"]').value)
        const value = node.evaluate(`${targetValue} 1 $tvaPercent 100 / + / 1 $escomptePercent 100 / - / `)
        node.querySelector('input[name="arrondiBase"]').value = 0
        const percentRabais = node.evaluate(`100 ${value} 100 * $rplp / - 0.0001 mround`)
        node.querySelector('input[name="rabaisPercent"]').value = percentRabais
        node.update()
    })  
    
    const finalAccountSummary = document.querySelector('account-summary[name="final"]')
    finalAccountSummary.querySelector('[name="rabaisAbsolute"]').addEventListener('dblclick', event => {
        const nodeRabaisAbsolute = finalAccountSummary.querySelector('[name="rabaisAbsolute"]')
        if (nodeRabaisAbsolute.dataset.expression === undefined) { return }
        delete nodeRabaisAbsolute.dataset.expression
        delete nodeRabaisAbsolute.dataset.value
    
        const nodeRabaisPerc = finalAccountSummary.querySelector('input[name="rabaisPercent"]')
        const nodeRabais = finalAccountSummary.querySelector('[name="rabais"]')
        
        nodeRabaisPerc.disabled = true
        nodeRabais.dataset.expression = '$rplp $rabaisAbsoluteValue - ~INTERMEDIATE ~RABAIS cpr'
        nodeRabaisAbsolute.innerHTML = `<input type="text" name="rabaisAbsoluteValue">`
    })

    document.querySelectorAll('input[name="tvaPercent"]').forEach(node => node.value = getTVA())
    document.querySelectorAll('input[name="rplpValue"]').forEach(node => node.value = KAAL.taxes.rplp)
    ; (new Barrier('offre')).release()
})