const adminImports = [
    [KAAL.url('admin/js/ui/ka-project-list.js'), 'script'],
    [KAAL.url('admin/js/ui/ka-project-form.js'), 'script'],
    [KAAL.url('admin/js/ui/ka-contact-form.js'), 'script'],
    [KAAL.url('admin/js/ui/ka-contact.js'), 'script'],
    [KAAL.url('admin/js/ui/ka-contact-old.js'), 'script'],
    [KAAL.url('admin/js/ui/ka-group-form.js'), 'script'],
    [KAAL.url('admin/js/store/bx-country.js'), 'script'],
    [KAAL.url('admin/js/store/bx-user.js'), 'script'],
    [KAAL.url('admin/js/store/bx-rogeneric.js'), 'script'],
    [KAAL.url('admin/js/store/group.js'), 'script'],
    [KAAL.url('admin/js/string.js'), 'script']
]

window.addEventListener('DOMContentLoaded', event => {
    for (const imp of adminImports) {
        const s = document.createElement('SCRIPT')
        s.type = "application/javascript"
        s.src = imp[0]
        document.body.appendChild(s)
    }
})