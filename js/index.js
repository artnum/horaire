function _throttle (fn, delay) {
    let timeout = null
    return function(...args) {
        if (timeout) { return }
        timeout = setTimeout(() => {
            fn.call(this, ...args)
            timeout = null
        }, delay)
    }
}

function _debounce (fn, delay) {
    let timeout = null
    return function(...args) {
        if (timeout) { clearTimeout(timeout) }
        timeout = setTimeout(() => {
            fn.call(this, ...args)
            timeout = null
        }, delay)    
    }
}

const imports = [
    [KAAL.url('admin/js/fetch.js'), 'script'],
    [KAAL.url('admin/js/lib/login.js'), 'script'],
    [KAAL.url('js/data/utils.js'), 'script'],
    [KAAL.url('js/data/project.js'), 'script'],
    [KAAL.url('js/data/travail.js'), 'script'],
    [KAAL.url('js/data/group.js'), 'script'],
    [KAAL.url('js/data/person.js'), 'script'],
    [KAAL.url('js/data/process.js'), 'script'],
    [KAAL.url('js/data/temps.js'), 'script'],
    [KAAL.url('js/ui/utils.js'), 'script'],
    [KAAL.url('js/ui/list.js'), 'script'],
    [KAAL.url('js/ui/ka-button.js'), 'script'],
    [KAAL.url('js/ui/ka-entry-form.js'), 'script'],
    [KAAL.url('js/ui/ka-planning.js'), 'script'],
    [KAAL.url('js/lib/color.js'), 'script'],
    [KAAL.url('js/lib/empty.js'), 'script'],
    [KAAL.url('js/ui/time-interact.js'), 'script'],
    [KAAL.url('js/ui/user-interact.js'), 'script'],
    [KAAL.url('js/ui/msg-interact.js'), 'script'],
]

window.addEventListener('DOMContentLoaded', event => {
    for (const imp of imports) {
        const s = document.createElement('SCRIPT')
        s.type = "application/javascript"
        s.src = imp[0]
        document.body.appendChild(s)
    }
})