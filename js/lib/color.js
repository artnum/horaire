function Kolor(color) {
    this.color = color
    if (color.substr(0, 1) === '#') {
        this.r = parseInt(this.color.substr(1, 2), 16)
        this.g = parseInt(this.color.substr(3, 2), 16)
        this.b = parseInt(this.color.substr(5, 2), 16)
    }
}

Kolor.prototype.foreground = function () {
    const r = Math.pow(parseInt(this.color.substr(1, 2), 16) / 255, 2.2)
    const g = Math.pow(parseInt(this.color.substr(3, 2), 16) / 255, 2.2)
    const b = Math.pow(parseInt(this.color.substr(5, 2), 16) / 255, 2.2)
 
    if (0.2126 * r + 0.7151 * g + 0.721 * b < 0.4) {
        return '#FFFFFF'
    } 
    return '#000000'
}

Kolor.prototype.alpha = function (alpha) {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${alpha})`
}