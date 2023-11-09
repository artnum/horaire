function KAButton (content, options = {group: null, foldable: null, fat: false, click: false, small: false, selected: false, classNames: []}) {
    if (!KAButton.__groups) { KAButton.__groups = new Map() }
    if (!KAButton.__count) { KAButton.__count = 0 }
    
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('ka-button')
    if (options.fat) {
        this.domNode.classList.add('ka-fat')
    }
    if (options.small) {
        this.domNode.classList.add('ka-small')
    }
    if (options.classNames === undefined) { options.classNames = [] }
    if (!Array.isArray(options.classNames)) { options.classNames = [options.classNames] }   
    options.classNames.forEach(c => {
        this.domNode.classList.add(c)
    })
    this.domNode.id = `kabutton${++KAButton.__count}`
    if (options.value) {
        this.value = options.value
        this.domNode.dataset.value = options.value
    }
    
    let interactPart = this.domNode

    if (options.foldable) {
        this.domNode.classList.add('ka-foldable')
        const fold = document.createElement('DIV')
        interactPart = fold
        fold.classList.add('ka-foldtop')
        if (content instanceof HTMLElement) {
            fold.appendChild(content)
        } else {
            fold.innerHTML = content
        }
        content = fold
    }

    if (content instanceof HTMLElement) {
        this.domNode.appendChild(content)
    } else {
        this.domNode.innerHTML = content
    }

    if (options.foldable) {
        const fold = document.createElement('DIV')
        fold.classList.add('ka-foldbottom')
        if (options.foldable instanceof HTMLElement) {
            fold.appendChild(options.foldable)
        } else {
            fold.innerHTML = options.foldable
        }
        this.domNode.appendChild(fold)
    }


    if (options.group) {
        if (!KAButton.__groups.has(options.group)) { KAButton.__groups.set(options.group, []) }
        KAButton.__groups.get(options.group).push(this.domNode)
        this.domNode.dataset.group = options.group
    }

    const ctx = {
        options,
        node: this.domNode
    }
    this.domNode.dataset.open = '0'
    if (options.selected) { this.domNode.dataset.open = '1' }
    interactPart.addEventListener('click', KAButton.toggleButton.bind(ctx))
    interactPart.addEventListener('select', KAButton.selectButton.bind(ctx))
    if (!options.click) {
        window.addEventListener('close-all-kabutton', function(event) {
            const node = this
            let group = []
            if (node.dataset.group) {
                if (KAButton.__groups.has(node.dataset.group)) {
                    group = KAButton.__groups.get(node.dataset.group)
                }
            }
            window.requestAnimationFrame(() => {
                for (const n of group) { n.classList.remove('ka-open'); n.dataset.open = '0'}
                node.classList.remove('ka-open')
                node.dataset.open = '0'
            })
            for (const n of group) {
                n.dispatchEvent(new SubmitEvent('reset'))
            }
            node.dispatchEvent(new SubmitEvent('reset'))
        }.bind(this.domNode))
    }

    this.domNode.setButton = this.setButton.bind(this)
    this.domNode.unsetButton = this.unsetButton.bind(this)
    this.domNode.getValue = this.getValue.bind(this)
    this.domNode.isset = this.isset.bind(this)
    return this.domNode
}

KAButton.toggleButton = function () {
    const node = this.node
    let group = []
    if (node.dataset.group) {
        if (KAButton.__groups.has(node.dataset.group)) {
            group = KAButton.__groups.get(node.dataset.group)
        }
    }

    if (node.dataset.open === '1') {
        node.dataset.open = '0'
        window.requestAnimationFrame(() => {
            node.classList.remove('ka-open')
        })
        node.dispatchEvent(new SubmitEvent('reset'))
        return
    }
    if (!this.options.click) {
        for (const n of group) {
            if (n.dataset.open === '1') { n.dispatchEvent(new SubmitEvent('reset')) }
            n.dataset.open = '0'
        }
        node.dataset.open = '1'
    }
    node.dispatchEvent(new SubmitEvent('submit'))
    if (this.options.click) { return }
    window.requestAnimationFrame(() => {
        for (const n of group) { n.classList.remove('ka-open')}
        node.classList.add('ka-open')
    })
}

KAButton.selectButton = function () {
    const node = this.node
    let group = []
    if (node.dataset.group) {
        if (KAButton.__groups.has(node.dataset.group)) {
            group = KAButton.__groups.get(node.dataset.group)
        }
    }

    if (!this.options.click) {
        for (const n of group) {
            if (n.dataset.open === '1') { n.dispatchEvent(new SubmitEvent('reset')) }
            n.dataset.open = '0'
        }
        node.dataset.open = '1'
    }
    node.dispatchEvent(new SubmitEvent('submit'))
    if (this.options.click) { return }
    window.requestAnimationFrame(() => {
        for (const n of group) { n.classList.remove('ka-open')}
        node.classList.add('ka-open')
    })
}

KAButton.prototype.setButton = function () {
    const node = this.domNode
    let group = []
    if (node.dataset.group) {
        if (KAButton.__groups.has(node.dataset.group)) {
            group = KAButton.__groups.get(node.dataset.group)
        }
    }

    for (const n of group) {
        n.dataset.open = '0'
    }
    node.dataset.open = '1'
}

KAButton.prototype.unsetButton = function () {
    const node = this.domNode
    let group = []
    if (node.dataset.group) {
        if (KAButton.__groups.has(node.dataset.group)) {
            group = KAButton.__groups.get(node.dataset.group)
        }
    }

    for (const n of group) {
        n.dataset.open = '0'
    }
    node.dataset.open = '0'
}

KAButton.prototype.getValue = function () {
    if (this.value) { return this.value }
    return undefined
}

KAButton.prototype.isset = function () {
    return this.domNode.dataset.open === '1'
}