function KAList (htmlElement, store) {
    this.domNode = htmlElement
    this.store = store
    this.disableMouseEvent = false
    this.domNode.setAttribute('autocomplete', 'off')

    this.domNode.addEventListener('focus', this.doSearch.bind(this), {passive: true})
    this.domNode.addEventListener('keyup', this.keyboard.bind(this), {passive: true})
    this.domNode.addEventListener('keydown', this.keyboardx.bind(this))
    this.domNode.addEventListener('mousemove', event => this.disableMouseEvent = false, {passive: true})
}

/* this one prevent default but do mostly nothing */
KAList.prototype.keyboardx = function (event) {
    if (this.noMoreSearch) { return }
    switch (event.key) {
        case 'Enter':
            this.select()
            // fall through
        case 'Escape':
        case 'Up':
        case 'ArrowUp':   
        case 'Down':
        case 'ArrowDown':
        case 'PageUp':
        case 'PageDown':
            this.disableMouseEvent = true
            event.preventDefault()
            break
    }
    return
}

/* this do not prevent default but modify dom */
KAList.prototype.keyboard = function (event) {
    switch (event.key) {
        case 'Enter': return // avoid repoping up after select
        case 'Up':
        case 'ArrowUp':
            if (event.shiftKey) { return this.move('up', Infinity) }
            return this.move('up', 1)
        case 'Down':
        case 'ArrowDown':
            if (event.shiftKey) { return this.move('down', Infinity) }
            return this.move('down', 1)
        case 'PageUp':
            if (event.shiftKey) { return this.move('up', 5) }
            return this.move('up', 3)
        case 'PageDown':
            if (event.shiftKey) { return this.move('down', 5) }
            return this.move('down', 3)
        default:
            if (this.lastValue) {
                if (this.lastValue === this.domNode.value) { return }
            }
            this.lastValue = this.domNode.value
            return this.doSearch()
    }
}

KAList.prototype.select = function () {
    this.domNode.value = this.currentSelectedElement.dataset.value
    this.close()

}

KAList.prototype.mouse = function (event) {
    if (this.disableMouseEvent) { return }
    let node = event.target
    while (node && !node.classList.contains('ka-result')) { node = node.parentNode }
    if (node) {
        this.previousSelectedElement = this.currentSelectedElement
        this.currentSelectedElement = node
    }
    this.highlightCurrent(true)
}

KAList.prototype.doSearch = function () {
    Promise.all([this.store.query(this.domNode.value), this.popper()])
    .then(([results, popper]) => {
        if (results.length < 1) { return this.close() }
        results.reverse() // add into dom reverse the array, so reverse it first
        const now = performance.now()
        const allSettled = []
        for (const result of results) {
            if (!result.domNode) {
                result.domNode = document.createElement('DIV')
                result.domNode.innerHTML = `${result.label}`
            }
            result.domNode.dataset.id = result.id
            result.domNode.dataset.value = result.value
            result.domNode.dataset.fresh = now
            result.domNode.classList.add('ka-result')
            result.domNode.addEventListener('mousemove', this.mouse.bind(this), {passive: true})
            result.domNode.addEventListener('mouseup', this.select.bind(this), {passive: true})
            let previous = null
            for (let node = popper.firstElementChild; node; node = node.nextElementSibling) {
                if (node.dataset.id === result.domNode.dataset.id) { previous = node; break}
            }
            allSettled.push(new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    if (previous && previous.parentNode) { popper.removeChild(previous) }
                    popper.insertBefore(result.domNode, popper.firstElementChild)
                    resolve()
                })
            }))
         
        }

        /* remove non-updated node */
        Promise.allSettled(allSettled)
        .then(_ => {
            let node = popper.firstElementChild
            while (node) {
                let next = node.nextElementSibling
                if (node.dataset.fresh !== String(now)) {
                    const n = node
                    window.requestAnimationFrame(() => {
                        popper.removeChild(n)
                    })
                }
                node = next
            }
        })
    })
}

KAList.prototype.highlightCurrent = function (dontMoveViewport = false) {
    const current = this.currentSelectedElement
    const previous = this.previousSelectedElement
    if (previous) {
        window.requestAnimationFrame(() => {
            previous.dataset.selected = '0'
            previous.classList.remove('ka-selected')
        })
    }
    window.requestAnimationFrame(() => {
        current.dataset.selected = '0'
        current.classList.add('ka-selected')
        if (!dontMoveViewport) {
            const currentBounding = current.getBoundingClientRect()
            this.htmlPopper.scrollTop = current.offsetTop - (currentBounding.height / 2 - currentBounding.height / 2)
        }
    })
}

KAList.prototype.move = function (direction, quantity) {
    if (!this.htmlPopper) { return }
    const previous = this.currentSelectedElement
    if (this.currentSelectedElement) {
        let current = this.currentSelectedElement
        if (direction === 'down') {
            if (quantity === Infinity) {this.currentSelectedElement = this.htmlPopper.lastElementChild }
            else {
                for (let i = 0; i < quantity; i++) {
                    if ( ! current.nextElementSibling) { current = this.htmlPopper.firstElementChild }
                    else { current = current.nextElementSibling}
                }
                this.currentSelectedElement = current
            }
        } else {
            if (quantity === Infinity) {this.currentSelectedElement = this.htmlPopper.firstElementChild }
            else {
                for (let i = 0; i < quantity; i++) {
                    if ( ! current.previousElementSibling) { current = this.htmlPopper.lastElementChild }
                    else { current = current.previousElementSibling}
                }
                this.currentSelectedElement = current
            }
        }
    } else {
        if (direction === 'down') {
            this.currentSelectedElement = this.htmlPopper.firstElementChild
        } else {
            this.currentSelectedElement = this.htmlPopper.lastElementChild
        }
    }
    this.previousSelectedElement = previous
    this.highlightCurrent() 
}


KAList.prototype.popper = function () {
    return new Promise(resolve => {
        if (this.htmlPopper) { resolve(this.htmlPopper); return }
        const popper = document.createElement('DIV')
        popper.style.setProperty('z-index', UIUtils.zMax())
        popper.classList.add('ka-popper')
        popper.addEventListener('mousemove', event => this.disableMouseEvent = false, {passive: true})
        this.htmlPopper = popper
        window.requestAnimationFrame(() => {
            document.body.appendChild( this.htmlPopper)
            Popper.createPopper(this.domNode,  this.htmlPopper, {placement: 'bottom-start'})
            resolve(this.htmlPopper)
        })
    })
}

KAList.prototype.close = function () {
    if (!this.htmlPopper) { return }
    const popper = this.htmlPopper
    const element = this.domNode
    this.htmlPopper = null

    window.requestAnimationFrame(() => {
        document.body.removeChild(popper)
    })
}
