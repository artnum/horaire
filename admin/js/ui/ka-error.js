function KAErrorUI (msgOrError) {
    const div = document.createElement('div')
    div.classList.add('ka-error')
    if (msgOrError instanceof Error) {
        div.innerHTML = `${msgOrError.message}`
    } else {
        div.innerHTML = `${msgOrError}`
    }

    div.style.position = 'absolute'
    div.style.bottom = '0px'
    div.style.left = '0px'
    div.style.right = '0px'
    div.style.maxHeight = '20px'
    div.style.minHeight = '20px'
    div.style.border = '1px solid red'
    div.style.backgroundColor = 'lightpink'
    div.style.color = 'black'
    window.requestAnimationFrame(() => document.body.appendChild(div))
    setTimeout(() => window.requestAnimationFrame(() => document.body.removeChild(div)), 10000)
    div.addEventListener('click', _ => {
        window.requestAnimationFrame(() => document.body.removeChild(div))
    })
}