export default class Popup
{
    constructor(node)
    {
        this.node = node
        this.left = 0
        this.top = 0
    }

    update (node, pbox) 
    {
        const tbox = node.getBoundingClientRect()
        let left = this.left + window.pageXOffset
        let top = this.top + window.pageYOffset
        console.log(top + tbox.height , window.innerHeight)
        if (top + tbox.height >= window.innerHeight) {
            top = pbox.top - tbox.height
        }
        window.requestAnimationFrame(() => {
            node.style.transform = `translate(${left}px, ${top}px)`
        })
    }

    placement(node, parent, where) 
    {
        const box = parent.getBoundingClientRect()
        switch(where) {
            case 'bottom':
                this.top = box.height + box.y
                this.left =  box.x
                break
            case 'bottom-middle':
                this.top = box.height + box.y
                this.left = box.x + (box.width / 2)
                break
            case 'bottom-left':
                this.top = box.height + box.y
                this.left =  box.x + box.width
                break
        }
        this.update(node, box)
    }

    show(parent, options = {}) {
        options = Object.assign(options, {
            placement: 'bottom'
        })

        this.node.style.position = 'fixed';
        this.node.style.left = '0px'
        this.node.style.top = '0px'
        if (!this.node.parentNode) {
            window.AppAppendChild((this.node))
        }
        this.placement(this.node, parent, options.placement)        
    }

    hide() {
        this.node.remove()
    }
}