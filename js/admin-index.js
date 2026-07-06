const adminImports = [
    ['$script/src/ui/ka-project-form.js', 'script'],
    ['$script/src/ui/ka-contact-form.js', 'script'],
    ['$script/src/ui/ka-contact.js', 'script'],
    ['$script/src/ui/ka-contact-old.js', 'script'],
    ['$script/src/ui/ka-group-form.js', 'script'],
    ['$script/src/ui/ka-error.js', 'script'],
    ['$script/src/ui/ka-fieldset.js', 'script'],
    ['$script/src/ui/ka-car-admin.js', 'script'],
    ['$script/src/store/bx-country.js', 'script'],
    ['$script/src/store/bx-user.js', 'script'],
    ['$script/src/store/bx-rogeneric.js', 'script'],
    ['$script/src/store/group.js', 'script'],
    ['$script/src/string.js', 'script'],
    ['$script/src/lib/kapi.js', 'script'],
    ['$script/src/lib/qrbill.js', 'script'],
    ['$script/src/lib/float.js', 'script'],
    ['$script/src/lib/tva.js', 'script']
]

window.addEventListener('DOMContentLoaded', event => {
    for (const imp of adminImports) {
        const s = document.createElement('SCRIPT')
        s.type = "application/javascript"
        s.src = imp[0]
        document.body.appendChild(s)
    }
})