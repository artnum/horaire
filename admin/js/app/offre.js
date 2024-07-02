import { AccountingDocAPI } from './$script/src/JAPI/AccountingDoc.js'
import { AccountingDocLineAPI } from './$script/src/JAPI/AccountingDocLine.js'
// import { ContactAPI } from './$script/src/JAPI/Contact.js'
import { ProjectAPI } from './$script/src/JAPI/Project.js'
import { JFormData } from './$script/vendor/js/formdata/src/formdata.js'
import { Barrier } from './$script/src/lib/barrier.js'
import { AccountingConditionAPI } from './$script/src/JAPI/AccountingCondition.js'
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

const params = new URLSearchParams(window.location.search)
const projectAPI = new ProjectAPI()
const accountingDocLineAPI = new AccountingDocLineAPI()
const AccountingDoc = new AccountingDocAPI()
const AccountingCondition = new AccountingConditionAPI()
//const Contact = new ContactAPI()

const Objects = new Map()
let textAreaCounter = 0

class AccountingDocUI {
    constructor () {
        this.doc = null
        this.lines = []
        this.project = null
    }

    renderDocBreadcrumbs (projectId, doc, force = false) {
        return new Promise((resolve, reject) => {
            const node = document.querySelector('.breadcrumbs')
            if (!node.dataset.invalid) {
                node.dataset.invalid = 'true'
            }
            if (node.dataset.invalid === 'false' && !force) { return resolve() }
            ;(() => {
                if (projectId) { return AccountingDoc.listByProject(projectId) }
                return AccountingDoc.listFromDocument(doc.id)
            })()
            .then(docs => {
                ; (new Barrier('accountingDocUI')).register()
                .then(_ => {
                    node.dataset.invalid = 'false'
                    if (docs.length > 0) { this.loadConditionBase(docs[docs.length - 1].id) }
                    const breadcrumbs = docs.toReversed()
                    .map(a => {
                        return `<div id="${a.id}" class="available">
                            ${a.reference}_${a.variant}
                        </div>`
                    })
                    switch (docs[0].type) {
                        case 'offer':
                            breadcrumbs.push('<div class="available" data-action="variant">Variante</div>')
                            breadcrumbs.push('<div class="available" data-action="next">Vers exécution</div>')
                            break
                        case 'order':
                            break
                        case 'execution':
                            break
                        case 'invoice':
                            break
                    }
                    node.innerHTML = breadcrumbs.join('<div class="spacer"> | </div>')
                    resolve()
                })
            })            
            .catch(cause => {
                reject(cause)
            })
        })
    }

    selectDocBreadcrumbs (docId) {
        const nodes = document.querySelectorAll('.breadcrumbs > div')
        nodes.forEach(node => {
            node.classList.remove('loading')
            if (node.id === docId) {
                node.classList.add('current')
            } else {
                node.classList.remove('current')
            }
        })
    }

    render (doc, lines, project) {
        document.querySelector('account-lines').getEvaluator().reset()
        this.renderDocBreadcrumbs(project ? project.id : null, doc)
        .then(_ => {
            this.selectDocBreadcrumbs(doc.id)
        })

        ; (new Barrier('accountingDocUI')).register()
        .then(_ => {
            const node = document.querySelector('account-lines')
            if (!doc) { doc = this.doc }
            if (!lines) { lines = this.lines }
            if (!project) { project = this.project }
            if (doc) {
                switch (doc.type) {
                    case 'offer':
                        document.querySelector('account-lines[name="accountingDocContent"]').setState('open'); break
                    default:
                        document.querySelector('account-lines[name="accountingDocContent"]').setState('frozen'); break
                }
                let documentTitle = 'OFFRE'
                switch (doc.type) {
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
                const node = document.querySelector('account-lines')
                node.dataset.id = doc.id
                node.id = doc.id
                const title = `[${documentTitle} ${doc.reference}_${doc.variant}] ${project ? project.reference + ' - ' : ''}${project ? project.name : ''}`
                document.title = title
                document.querySelector('body > h1').textContent = title
            }
            if (lines) {
                node.clearLines()
                node.loadLines(lines)
            }
        })
    }

    loadDocument (docId, project = null) {
        return new Promise((resolve, reject) => {
            AccountingDoc.get(docId)
            .then(doc => {
                return Promise.all([
                    (project === null 
                            ? ( 
                                doc.project 
                                    ? projectAPI.get(doc.project)
                                    : Promise.resolve(null)
                              ) 
                            : Promise.resolve(project)),
                    AccountingDoc.getLines(doc.id),
                    Promise.resolve(doc)
                ])
            })
            .then(([project, lines, doc])=> {
                this.loadConditionFinal(doc.id)
                this.render(doc, lines, project)
                resolve()
            })
            .catch(cause => {
                reject(cause)
            })
        })
    }

    load(projectId) {
        Promise.all([
            projectAPI.get(projectId),
            AccountingDoc.getCurrent(projectId)
        ])
        .then(([project, doc]) => {
            ; (() => {
                if (doc === null) {
                    return AccountingDoc.create({project: project.id, type: 'offer'})
                }
                return Promise.resolve(doc)
            })()
            .then(doc => {
                return this.loadDocument(doc, project)
            })
        })
    }

    loadConditionBase (docId) {
        this._loadCondition(docId, 'base')
    }
    loadConditionFinal (docId) {
        this._loadCondition(docId, 'final')
        .then(_ => {
            const final = document.querySelector(`account-summary[name="final"]`)
            if (final.dataset.id === document.querySelector(`account-summary[name="base"]`)?.dataset.id) {
                final.parentNode.style.display = 'none'
            } else {
                final.parentNode.style.display = 'block'
            }
        })
    }

    createTextEditor (node) {
        const textAreaId = node.dataset.id
        const value = Objects.get(textAreaId)
        const textArea = document.createElement('textarea')
        node.innerHTML = ''
        node.dataset.type = 'textarea'
        node.appendChild(textArea)

        const mde = new EasyMDE({
            element: textArea,
            initialValue: value,
            spellChecker: false,
            status: false,
            toolbar: [
                'bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link',  '|', 'preview', '|', 
                {
                    name: "done",
                    action: (editor) => {
                        this.createRenderedEditor(node, editor.value(), false)
                        Objects.set(textAreaId, editor.value())
                        editor.cleanup()
                    },
                    className: "fa fa-check",
                    title: "Done"
                }
            ]
        })

        mde.codemirror.focus()
        mde.codemirror.setCursor(mde.codemirror.lineCount(), 0);
        
        Objects.set(textAreaId, mde)
    }

    createRenderedEditor (content, value, folded = true) {
        Objects.set(content.dataset.id, value)
        delete content.dataset.started
        content.innerHTML = ''
        const textNode = document.createElement('span')
        content.appendChild(textNode)
        textNode.innerHTML = marked.parse(value, {gfm: true, breaks: true})
        const unfold = document.createElement('span')

        if (folded) {
            unfold.classList.add('unfold')
            unfold.innerHTML = '<span class="material-symbols-outlined">unfold_more</span>'
            unfold.dataset.folded = 'false'
    
            if (textNode.firstElementChild) {
                textNode.innerHTML = textNode.firstElementChild.innerHTML
            }
        } else {
            unfold.classList.add('unfold')
            unfold.innerHTML = '<span class="material-symbols-outlined">unfold_less</span>'
            unfold.dataset.folded = 'true'
        }

        content.insertBefore(unfold, content.firstChild)

        unfold.addEventListener('click', event => {
            if (unfold.dataset.folded === 'false') {
                content.lastElementChild.innerHTML = marked.parse(value, {gfm: true, breaks: true})
                unfold.innerHTML = '<span class="material-symbols-outlined">unfold_less</span>'
                unfold.dataset.folded = 'true'
            } else {
                if (content.lastElementChild.firstElementChild) {
                    content.lastElementChild.innerHTML = content.lastElementChild.firstElementChild.innerHTML
                }
                unfold.innerHTML = '<span class="material-symbols-outlined">unfold_more</span>'
                unfold.dataset.folded = 'false'
            }
        })
       
    }

    _loadCondition (docId, nodeName) {
        const defaultCondition = {
            RPLP: 2.2,
            TAX: 8.1,
            RABAIS: 0,
            ROUNDING: 0.05,
            ESCOMPTE: 0
        }
        return new Promise((resolve, reject) => {
            AccountingCondition.lookup(docId)
            .then(condition => {
                const node = document.querySelector(`account-summary[name="${nodeName}"]`)
                if (node) {
                    node.dataset.id = docId
                    condition.content = Object.assign(defaultCondition, condition.content)
                    for (const key in condition.content) {
                        node.querySelector(`input[name="${key}"]`).value = condition.content[key]
                    }
                    node.update()
                }
                resolve()
            })
            .catch(cause => {
                reject(cause)
            })
        })
    
    }

}

window.addEventListener('load', () => {
    const UI = new AccountingDocUI()
    if (!params.has('project') && params.has('doc')) {
        UI.loadDocument(params.get('doc'))
    } else {
        UI.load(params.get('project'))
    }

    /* install event listeners */
    document.querySelector('div.breadcrumbs').addEventListener('click', 
    event => {
        event.target.classList.add('loading')
        if (event.target.dataset.action === 'next') {
            const node = document.querySelector('account-lines[name="accountingDocContent"]')
            AccountingDoc.nextStep(node.id)
            .then(doc => {
                UI.loadDocument(doc.id)
                .then(_ => {
                    return UI.renderDocBreadcrumbs(doc.project, null, true)
                    
                })
                .then(_ => {
                    UI.selectDocBreadcrumbs(doc.id)
                })
            })
            return 
        }
        if (event.target.dataset.action === 'variant') {
            const node = document.querySelector('account-lines[name="accountingDocContent"]')
                AccountingDoc.createVariant(node.id)
                .then(doc => {
                    UI.loadDocument(doc.id)
                    .then(_ => {
                        return UI.renderDocBreadcrumbs(doc.project, null, true)
                        
                    })
                    .then(_ => {
                        UI.selectDocBreadcrumbs(doc.id)
                    })
                })
    

            return
        }
        UI.loadDocument(event.target.id)
    })
    
    /*
    document.querySelector('button[name="pdf"]').addEventListener('click', event => {
        AccountingDoc.msword(document.querySelector('account-lines[name="accountingDocContent"]').id)
        .then(pdf => {
            const binString = atob(pdf);
            return Uint8Array.from(binString, (m) => m.codePointAt(0));
        })
        .then(pdf => {
            console.log(pdf)
            const url = URL.createObjectURL(new Blob([pdf], {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}))
            window.open(url, '_blank')
        })
    })
    */

    document.querySelector('button[name="save"]').addEventListener('click', event => {
        const node = document.querySelector('form[name="accountingDocForm"]')
        const data = new JFormData(node)._data
        data.accountingDocContent.lines = data.accountingDocContent.lines.map(line => {
            const rawData = document.getElementById(line.id)?.dataset.rawLineData
            if (rawData) {
                line = Object.assign(JSON.parse(rawData), line)
            }
            return line
        })
        
        const baseConditionNode = document.querySelector('account-summary[name="base"]')
        const finalConditionNode = document.querySelector('account-summary[name="final"]')
        const baseCondition = {docid: baseConditionNode.dataset.id, content: {}}
        const finalCondition = {docid: finalConditionNode.dataset.id, content: {}}

        baseConditionNode.querySelectorAll('input').forEach(node => {
            baseCondition.content[node.name] = parseFloat(node.value)
        })
        finalConditionNode.querySelectorAll('input').forEach(node => {
            finalCondition.content[node.name] = parseFloat(node.value)
        })

        Promise.all([
            (() => {
                AccountingCondition.set(baseCondition)
                .then(_ => {
                    if (finalCondition.docid !== baseCondition.docid) {
                        AccountingCondition.set(finalCondition)
                        .then(_ => {
                            return Promise.resolve()
                        })
                    } else {
                        return Promise.resolve()
                    }
                })
            })(),
            AccountingDoc.updateLines(data.accountingDocContent.lines, data.accountingDocContent.id)
        ])
        .then(_ => {
            UI.loadDocument(data.accountingDocContent.id)
        })
    })

    const accDoc = document.querySelector('account-lines[name="accountingDocContent"]')
    accDoc.getTextareaValue = (object) => {
        const mde = Objects.get(object.dataset.id)
        if (typeof mde === 'object') {
            if (mde === null) { return }
            const value = mde.value()
            mde.cleanup()
            if (value === '') { return }
            return value
        }
        if (mde === '') { return }
        return mde
    }

    accDoc.installTextarea = 
    function (node, isNotLocked = true) {
        const text = node.value
        const content = document.createElement('div')
        content.dataset.id = ++textAreaCounter
        content.setAttribute('tabindex', node.getAttribute('tabindex'))
        content.dataset.name = node?.dataset.name || node.getAttribute('name')
        content.dataset.type = 'textarea'
        node.parentNode.replaceWith(content)
        this.createRenderedEditor(content, text)
        content.addEventListener('dblclick', event => {
            if (content.dataset.readonly === 'true') { return }
            if (content.dataset.started) { return }
            content.dataset.started = 'true'
            this.createTextEditor(event.currentTarget)
        })
        content.addEventListener('keydown', event => {
            if (content.dataset.readonly === 'true') { return }
            if (content.dataset.started) { return }
            content.dataset.started = 'true'
            if (event.key === 'Tab') { return }
            this.createTextEditor(event.currentTarget)
        })
        return content
    }.bind(UI)

    document.querySelector('account-lines').addEventListener('lock-line', event => {
        accountingDocLineAPI.update(event.detail)
        .then(x => {
            accountingDocLineAPI.lock(event.detail.id)
        })
    })
    document.querySelector('account-lines').addEventListener('unlock-line', event => {
        accountingDocLineAPI.unlock(event.detail.id)
    })

    document.querySelectorAll('input[name="tvaPercent"]').forEach(node => node.value = getTVA())
    document.querySelectorAll('input[name="rplpValue"]').forEach(node => node.value = KAAL.taxes.rplp)
    ; (new Barrier('accountingDocUI')).release()
})