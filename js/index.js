const imports = [
    [`${KAAL.getBase()}/admin/js/fetch.js`, 'script'],
    [`${KAAL.getBase()}/js/data/utils.js`, 'script'],
    [`${KAAL.getBase()}/js/data/project.js`, 'script'],
    [`${KAAL.getBase()}/js/data/travail.js`, 'script'],
    [`${KAAL.getBase()}/js/data/group.js`, 'script'],
    [`${KAAL.getBase()}/js/data/person.js`, 'script']
]

window.addEventListener('DOMContentLoaded', event => {
    for (const imp of imports) {
        const s = document.createElement('SCRIPT')
        s.type = "application/javascript"
        s.src = imp[0]
        document.body.appendChild(s)
    }
})