function KAFieldsetUI (title, start = 'open') {
    const domNode = document.createElement('FIELDSET')
    domNode.classList.add('ka-fieldset')
    domNode.innerHTML = `<legend>${title}</legend>`
    domNode.dataset.state = start
    domNode.addEventListener('click', event => {
        if (event.target.tagName !== 'LEGEND') { return }
        const node = event.currentTarget
        if (!node) { return }
    
        if (node.dataset.state === 'open') {
            node.dataset.state = 'closed'
        } else {
            node.dataset.state = 'open'
        }
    })
    return domNode
}