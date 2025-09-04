function UIKABXProjectList() {
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('ka-bxproject-list')
    this.domNode.innerHTML = `
        <input type="text" name="bxproject" />
    `
}