const imports = [
    ['$script/src/fetch.js', 'script'],
    ['$script/src/lib/login.js', 'script'],
    ['$script/src/lib/kapi.js', 'script'],
    ['$script/src/data/utils.js', 'script'],
    ['$script/src/data/project.js', 'script'],
    ['$script/src/data/group.js', 'script'],
    ['$script/src/data/temps.js', 'script'],
    ['$script/src/ui/utils.js', 'script'],
    ['$script/src/ui/list.js', 'script'],
    ['$script/src/ui/ka-button.js', 'script'],
    ['$script/src/ui/ka-entry-form.js', 'script'],
    ['$script/src/ui/ka-planning.js', 'script'],
    ['$script/src/lib/color.js', 'script'],
    ['$script/src/lib/empty.js', 'script'],
    ['$script/src/ui/msg-interact.js', 'script'],
    ['$script/src/ui/car-interact.js', 'script'],
    ['$script/src/ui/missing.js', 'script']

]

window.addEventListener('DOMContentLoaded', event => {
    Promise.all((() => {
        const l = []
        for (const imp of imports) {
            l.push(new Promise(resolve => {
                const s = document.createElement('SCRIPT')
                s.addEventListener('load', resolve)
                s.type = "application/javascript"
                s.src = imp[0]
                document.head.appendChild(s)
            }))
        }
        return l
    })()).then(() => window.dispatchEvent(new CustomEvent('load-scripts')))
})
