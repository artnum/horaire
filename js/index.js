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
    ['$script/admin/fetch.js', 'script'],
    ['$script/admin/lib/login.js', 'script'],
    ['$script/admin/lib/kapi.js', 'script'],
    ['$script/src/data/utils.js', 'script'],
    ['$script/src/data/project.js', 'script'],
    ['$script/src/data/travail.js', 'script'],
    ['$script/src/data/group.js', 'script'],
    ['$script/src/data/person.js', 'script'],
    ['$script/src/data/process.js', 'script'],
    ['$script/src/data/temps.js', 'script'],
    ['$script/src/ui/utils.js', 'script'],
    ['$script/src/ui/list.js', 'script'],
    ['$script/src/ui/ka-button.js', 'script'],
    ['$script/src/ui/ka-entry-form.js', 'script'],
    ['$script/src/ui/ka-planning.js', 'script'],
    ['$script/src/lib/color.js', 'script'],
    ['$script/src/lib/empty.js', 'script'],
    ['$script/src/ui/time-interact.js', 'script'],
    ['$script/src/ui/user-interact.js', 'script'],
    ['$script/src/ui/msg-interact.js', 'script'],
    ['$script/src/ui/car-interact.js', 'script']
]

window.addEventListener('DOMContentLoaded', event => {
    for (const imp of imports) {
        const s = document.createElement('SCRIPT')
        s.type = "application/javascript"
        s.src = imp[0]
        document.body.appendChild(s)
    }
})