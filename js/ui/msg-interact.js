function MsgInteractUI (type = 'error', message) {
    if (message instanceof Error) {
        message = error.message
    }

    new Promise(resolve => {
        if (!document.getElementById('KAMsgLine')) {
            const div = document.createElement('DIV')
            div.id ='KAMsgLine'
            div.classList.add(`ka-${type}`)
            window.requestAnimationFrame(() => { document.body.appendChild(div); resolve() })
        } else {
            const div = document.getElementById('KAMsgLine')
            window.requestAnimationFrame(() => { div.className = `ka-${type}`; resolve() })
        }
    })
    .then(() => {
        const errLine = document.getElementById('KAMsgLine')
        errLine.innerHTML = `<span class="ka-message">${message}</span><span class="ka-close-icon">&#128473;</span>`
        window.requestAnimationFrame(() => {
            errLine.style.removeProperty('display')
        })
        const timeout = window.setTimeout(() => {
            errLine.style.setProperty('display', 'none')
        }, 5000)

        errLine.addEventListener('click', function (event) {
            window.clearTimeout(this)
            let node = event.target
            while (node && node.id !== 'KAMsgLine') { node = node.parentNode }
            window.requestAnimationFrame(() => {
                node.style.setProperty('display', 'none')
            })
        }.bind(timeout))
    })
}