const imports = [
    [KAAL.url('admin/js/fetch.js'), 'script'],
    [KAAL.url('js/data/utils.js'), 'script'],
    [KAAL.url('js/data/project.js'), 'script'],
    [KAAL.url('js/data/travail.js'), 'script'],
    [KAAL.url('js/data/group.js'), 'script'],
    [KAAL.url('js/data/person.js'), 'script'],
    [KAAL.url('js/data/process.js'), 'script'],
    [KAAL.url('js/data/temps.js'), 'script'],
    [KAAL.url('js/ui/utils.js'), 'script'],
    [KAAL.url('js/ui/list.js'), 'script'],
    [KAAL.url('js/ui/time-interact.js'), 'script'],
    [KAAL.url('js/ui/user-interact.js'), 'script'],
    [KAAL.url('js/ui/msg-interact.js'), 'script']
]

window.addEventListener('DOMContentLoaded', event => {
    for (const imp of imports) {
        const s = document.createElement('SCRIPT')
        s.type = "application/javascript"
        s.src = imp[0]
        document.body.appendChild(s)
    }
})