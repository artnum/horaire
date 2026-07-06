import '../bootstrap/globals.js'
import KAPI from '../lib/kapi.js'

const KAPIBXInvoice = new KAPI(`${KAAL.getBase()}/BXInvoice`)
const KAPIRepartition = new KAPI(`${KAAL.getBase()}/Repartition`)
const KAPIFacture = new KAPI(`${KAAL.getBase()}/Facture`)
const KAPIProject = new KAPI(`${KAAL.getBase()}/Project`)

KAPIProject.query({ 'deleted': '--', 'extid': '*' })
  .then((projects) => {
    Promise.allSettled(projects.map(project => {
      return KAPIRepartition.query({ 'project': project.id })
    }))
      .then((results) => {
        return results.filter(result => result.status === 'fulfilled')
          .map(result => result.value)
      })
      .then(repartitions => {
        repartitions = repartitions.flat()
        Promise.allSettled(repartitions.map(repartition => {
          return KAPIFacture.get(repartition.facture)
        }))
          .then(bills => {
            return bills.filter(bill => bill.status === 'fulfilled')
              .map(bill => bill.value)
              .filter(bill => bill.type === 2)
              .filter(bill => bill.deleted === 0)
          })
          .then(bills => {
            projects.forEach(project => {
              project.repartitions = repartitions.filter(repartition => repartition.project === project.id)
              project.bills = bills.filter(bill => project.repartitions.find(repartition => repartition.facture === bill.id))
            })
            return projects
          })
          .then(projects => {
            KAPIBXInvoice.query({ 'kb_item_status_id': ['>', 7], 'kb_item_status_id:1': ['<', 10] })
              .then(bxinvoices => {
                projects.forEach(project => {
                  project.bills.push(...bxinvoices.filter(bxinvoice => bxinvoice.project_id === project.extid))
                })
                projects.forEach(project => {
                  project.bills.sort((a, b) => {
                    const amountA = parseFloat(a.contact_id ? a.total : a.amount)
                    const amountB = parseFloat(b.contact_id ? b.total : b.amount)
                    if (amountA - amountB === 0) {
                      const dateA = new Date(a.contact_id ? a.is_valid_from : a.date)
                      const dateB = new Date(b.contact_id ? b.is_valid_from : b.date)
                      return dateA - dateB
                    }
                    return amountA - amountB
                  })
                })
                return projects
              })
              .then(projects => {
                projects.filter(project => project.bills.length > 1)
                  .forEach(project => {
                    const factureBexio = function (bill) {
                      const date = new Date(bill.is_valid_from)
                      return `<div class="facture-bexio facture">
                                    <div>Facture BEXIO</div>
                                    <div class="amount">${parseFloat(bill.total).toFixed(2)}</div>
                                    <div>${bill.title}</div>
                                    <div>${date.toLocaleDateString()}</div>
                                    <div>${bill.document_nr}</div>
                                    <div></div></div>`
                    }
                    const factureKaal = function (bill) {
                      const date = new Date(bill.date)
                      return `<div id="bill_${bill.id}" class="facture-kaal facture">
                                    <div>Facture KAAL</div>
                                    <div class="amount">${parseFloat(bill.amount).toFixed(2)}</div>
                                    <div>${bill.number}</div>
                                    <div>${date.toLocaleDateString()}</div>
                                    <div>${bill.comment}</div>
                                    <div><button type="button" data-bill-id="${bill.id}"">Supprimer</button></div></div>`
                    }
                    const domNode = document.createElement('div')
                    domNode.innerHTML = `
                                <div class="project">${project.reference} ${project.name}</div>
                                <div>
                                    ${project.bills.map(bill => {
                      if (bill.contact_id) { return factureBexio(bill) }
                      else { return factureKaal(bill) }
                    }).join('')}
                                </div>
                            `
                    domNode.addEventListener('click', event => {
                      if (event.target.dataset.billId) {
                        const billid = event.target.dataset.billId
                        KAPIFacture.write({ id: billid, deleted: (new Date().getTime()) }, billid)
                          .then(result => {
                            if (parseInt(result.id) === parseInt(billid)) {
                              document.getElementById(`bill_${billid}`).remove()
                            }
                          })
                      }
                    })
                    document.querySelector('body').appendChild(domNode)
                  })
              })
          })
      })
  })