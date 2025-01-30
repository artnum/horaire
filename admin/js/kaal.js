KAAL.message = function (msg, level = 'error') {
    let messageBox = document.getElementById('KAALGeneralMessageBox')
    let addInDom = false
    let timeout = 1200
    if (!messageBox) {
        messageBox = document.createElement('DIV')
        messageBox.id = 'KAALGeneralMessageBox'
        addInDom = true
    }
    switch (level.toLocaleLowerCase()) {
        case 'error': level = 'error'; break
        default:
        case 'info': level = 'info'; break
        case 'warning': level = 'warning'; break
        case 'transaction': level = 'transaction'; timeout = 10000; break
    }
    let msgBox = document.createElement('SPAN')
    msgBox.classList.add(level, 'message')
    msgBox.innerHTML = `${msg}`
    window.requestAnimationFrame(() => {
        if (addInDom) { document.body.appendChild(messageBox) }
        messageBox.appendChild(msgBox)
    })
    
    let timeoutId = setTimeout(() => {
        window.requestAnimationFrame(() => {
            msgBox.parentNode.removeChild(msgBox)
        })
    }, timeout)
    return [msgBox, timeoutId]
}

KAAL.error = function (msg) {
    KAAL.message(msg, 'error')
}

KAAL.info = function (msg) {
    KAAL.message(msg, 'info')
}

KAAL.warning = function (msg) {
    KAAL.message(msg, 'warning')
}

KAAL.transaction = function (msg = 'Opération en cours') {
    let [msgBox, timeoutId] = KAAL.message(msg, 'transaction')
    let rmMsgBox = () => {
        window.requestAnimationFrame(() => {
            msgBox.parentNode.removeChild(msgBox)
        })
    }

    let dots = ''
    let interval = setInterval(() => {
        if (!msgBox.parentNode) {
            /* no more in dom, we are cancelled */
            clearInterval(interval)
            return;
        }
        window.requestAnimationFrame(() => {
            msgBox.innerHTML = `${msg} ${dots}`
        })
        if (dots === '...') {
            dots = ''
        } else {
            dots = dots + '.'
        }
    }, 500)

    return {
        end: () => {
            clearInterval(interval)
            clearTimeout(timeoutId)
            rmMsgBox()
        },
        error: msg => { 
            KAAL.error(msg)
            clearInterval(interval)
            clearTimeout(timeoutId)
            rmMsgBox()
        },
        info: msg => {
            KAAL.info(msg)
            clearInterval(interval)
            clearTimeout(timeoutId)
            rmMsgBox()
        },
        warning: msg => {
            KAAL.warning(msg)
            clearInterval(interval)
            clearTimeout(timeoutId)
            rmMsgBox()
        }
    }
}