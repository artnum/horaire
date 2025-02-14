const adminImports = [
    ['$script/admin/ui/ka-project-form.js', 'script'],
    ['$script/admin/ui/ka-contact-form.js', 'script'],
    ['$script/admin/ui/ka-contact.js', 'script'],
    ['$script/admin/ui/ka-contact-old.js', 'script'],
    ['$script/admin/ui/ka-group-form.js', 'script'],
    ['$script/admin/ui/ka-error.js', 'script'],
    ['$script/admin/ui/ka-fieldset.js', 'script'],
    ['$script/admin/ui/ka-car-admin.js', 'script'],
    ['$script/admin/store/bx-country.js', 'script'],
    ['$script/admin/store/bx-user.js', 'script'],
    ['$script/admin/store/bx-rogeneric.js', 'script'],
    ['$script/admin/store/group.js', 'script'],
    ['$script/admin/string.js', 'script'],
    ['$script/admin/lib/kapi.js', 'script'],
    ['$script/admin/lib/qrbill.js', 'script'],
    ['$script/admin/lib/float.js', 'script'],
    ['$script/admin/lib/tva.js', 'script']
]

window.addEventListener('DOMContentLoaded', event => {
    for (const imp of adminImports) {
        const s = document.createElement('SCRIPT')
        s.type = "application/javascript"
        s.src = imp[0]
        document.body.appendChild(s)
    }
})