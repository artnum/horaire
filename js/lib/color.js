/* some parts from chatgpt */
function Kolor(color) {
    this.color = [0, 0, 0, 1]
    color = String(color).toLowerCase()

    let ccolor = null
    ccolor = this.named2hex(color)
    if (ccolor === null) {
        ccolor = this.hsl2hex(color)
        if (ccolor === null) {
            ccolor = this.rgb2hex(color)
            if (ccolor === null) {
                ccolor = color.replace(/^#?/, '#');
                if (ccolor.length === 4) {
                    ccolor = ccolor[0] + ccolor[1] + ccolor[1] + ccolor[2] + ccolor[2] + ccolor[3] + ccolor[3];
                }
                if (ccolor.length === 7 ) {
                    ccolor = `${ccolor}ff`
                }
            }
        }
    }
    this.color[0] = parseInt(ccolor.substr(1, 2), 16)
    this.color[1] = parseInt(ccolor.substr(3, 2), 16)
    this.color[2] = parseInt(ccolor.substr(5, 2), 16)
    this.color[3] = parseInt(ccolor.substr(7, 2), 16)
}


Kolor.prototype.rgb2hex = function (color) {
    // Parse RGB values from string
    const rgbValues = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/);
    if (!rgbValues) {
        return null;
    }
    const r = parseInt(rgbValues[1]);
    const g = parseInt(rgbValues[2]);
    const b = parseInt(rgbValues[3]);
    const a = rgbValues[4] ? parseFloat(rgbValues[4]) : 1;

    // Convert RGB to HEX
    const toHex = (c) => {
        const hex = Math.round(c).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    const hexValue = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Add alpha channel to HEX value
    if (a < 1) {
        const alphaToHex = (alpha) => {
            const hex = Math.round(alpha * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        const alphaHex = alphaToHex(a);
        return `${hexValue}${alphaHex}`;
    } else {
        return `${hexValue}ff`;
    }
}

Kolor.prototype.hsl2hex = function (color) {
    // Parse HSL values from string
    const hslValues = color.match(/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/);
    if (!hslValues) {
        return null;
    }
    const h = parseInt(hslValues[1]) / 360;
    const s = parseInt(hslValues[2]) / 100;
    const l = parseInt(hslValues[3]) / 100;
    const a = hslValues[4] ? parseFloat(hslValues[4]) : 1;

    // Convert HSL to HEX
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hueToRgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }

    // Convert RGB to HEX
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    const hexValue = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Add alpha channel to HEX value
    if (a < 1) {
        const alphaToHex = (alpha) => {
            const hex = Math.round(alpha * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        const alphaHex = alphaToHex(a);
        return `${hexValue}${alphaHex}`;
    } else {
        return `${hexValue}ff`;
    }

}

Kolor.prototype.named2hex = function (color) {
    switch (color) {
        case 'aliceblue':
            return '#f0f8ffff';
        case 'antiquewhite':
            return '#faebd7ff';
        case 'aqua':
            return '#00ffffff';
        case 'aquamarine':
            return '#7fffd4ff';
        case 'azure':
            return '#f0ffffff';
        case 'beige':
            return '#f5f5dcff';
        case 'bisque':
            return '#ffe4c4ff';
        case 'black':
            return '#000000ff';
        case 'blanchedalmond':
            return '#ffebcdff';
        case 'blue':
            return '#0000ffff';
        case 'blueviolet':
            return '#8a2be2ff';
        case 'brown':
            return '#a52a2aff';
        case 'burlywood':
            return '#deb887ff';
        case 'cadetblue':
            return '#5f9ea0ff';
        case 'chartreuse':
            return '#7fff00ff';
        case 'chocolate':
            return '#d2691eff';
        case 'coral':
            return '#ff7f50ff';
        case 'cornflowerblue':
            return '#6495edff';
        case 'cornsilk':
            return '#fff8dcff';
        case 'crimson':
            return '#dc143cff';
        case 'cyan':
            return '#00ffffff';
        case 'darkblue':
            return '#00008bff';
        case 'darkcyan':
            return '#008b8bff';
        case 'darkgoldenrod':
            return '#b8860bff';
        case 'darkgray':
            return '#a9a9a9ff';
        case 'darkgrey':
            return '#a9a9a9ff';
        case 'darkgreen':
            return '#006400ff';
        case 'darkkhaki':
            return '#bdb76bff';
        case 'darkmagenta':
            return '#8b008bff';
        case 'darkolivegreen':
            return '#556b2fff';
        case 'darkorange':
            return '#ff8c00ff';
        case 'darkorchid':
            return '#9932ccff';
        case 'darkred':
            return '#8b0000ff';
        case 'darksalmon':
            return '#e9967aff';
        case 'darkseagreen':
            return '#8fbc8fff';
        case 'darkslateblue':
            return '#483d8bff';
        case 'darkslategray':
            return '#2f4f4fff';
        case 'darkturquoise':
            return '#00ced1ff';
        case 'darkviolet':
            return '#9400d3ff';
        case 'deeppink':
            return '#ff1493ff';
        case 'deepskyblue':
            return '#00bfffff';
        case 'dimgray':
            return '#696969ff';
        case 'dimgrey':
            return '#696969ff';
        case 'dodgerblue':
            return '#1e90ffff';
        case 'firebrick':
            return '#b22222ff';
        case 'floralwhite':
            return '#fffaf0ff';
        case 'forestgreen':
            return '#228b22ff';
        case 'fuchsia':
            return '#ff00ffff';
        case 'gainsboro':
            return '#dcdcdcff';
        case 'ghostwhite':
            return '#f8f8ffff';
        case 'gold':
            return '#ffd700ff';
        case 'goldenrod':
            return '#daa520ff';
        case 'gray':
            return '#808080ff';
        case 'grey':
            return '#808080ff';
        case 'green':
            return '#008000ff';
        case 'greenyellow':
            return '#adff2fff';
        case 'honeydew':
            return '#f0fff0ff';
        case 'hotpink':
            return '#ff69b4ff';
        case 'indianred':
            return '#cd5c5cff';
        case 'indigo':
            return '#4b0082ff';
        case 'ivory':
            return '#fffff0ff';
        case 'khaki':
            return '#f0e68cff';
        case 'lavender':
            return '#e6e6faff';
        case 'lavenderblush':
            return '#fff0f5ff';
        case 'lawngreen':
            return '#7cfc00ff';
        case 'lemonchiffon':
            return '#fffacdff';
        case 'lightblue':
            return '#add8e6ff';
        case 'lightcoral':
            return '#f08080ff';
        case 'lightcyan':
            return '#e0ffffff';
        case 'lightgoldenrodyellow':
            return '#fafad2ff';
        case 'lightgray':
            return '#d3d3d3ff';
        case 'lightgrey':
            return '#d3d3d3ff';
        case 'lightgreen':
            return '#90ee90ff';
        case 'lightpink':
            return '#ffb6c1ff';
        case 'lightsalmon':
            return '#ffa07aff';
        case 'lightseagreen':
            return '#20b2aaff';
        case 'lightskyblue':
            return '#87cefaff';
        case 'lightslategray':
            return '#778899ff';
        case 'lightslategrey':
            return '#778899ff';
        case 'lightsteelblue':
            return '#b0c4deff';
        case 'lightyellow':
            return '#ffffe0ff';
        case 'lime':
            return '#00ff00ff';
        case 'limegreen':
            return '#32cd32ff';
        case 'linen':
            return '#faf0e6ff';
        case 'magenta':
            return '#ff00ffff';
        case 'maroon':
            return '#800000ff';
        case 'mediumaquamarine':
            return '#66cdaaff';
        case 'mediumblue':
            return '#0000cdff';
        case 'mediumorchid':
            return '#ba55d3ff';
        case 'mediumpurple':
            return '#9370dbff';
        case 'mediumseagreen':
            return '#3cb371ff';
        case 'mediumslateblue':
            return '#7b68eeff';
        case 'mediumspringgreen':
            return '#00fa9aff';
        case 'mediumturquoise':
            return '#48d1ccff';
        case 'mediumvioletred':
            return '#c71585ff';
        case 'midnightblue':
            return '#191970ff';
        case 'mintcream':
            return '#f5fffaff';
        case 'mistyrose':
            return '#ffe4e1ff';
        case 'moccasin':
            return '#ffe4b5ff';
        case 'navajowhite':
            return '#ffdeadff';
        case 'navy':
            return '#000080ff';
        case 'oldlace':
            return '#fdf5e6ff';
        case 'olive':
            return '#808000ff';
        case 'olivedrab':
            return '#6b8e23ff';
        case 'orange':
            return '#ffa500ff';
        case 'orangered':
            return '#ff4500ff';
        case 'orchid':
            return '#da70d6ff';
        case 'palegoldenrod':
            return '#eee8aaff';
        case 'palegreen':
            return '#98fb98ff';
        case 'paleturquoise':
            return '#afeeeeff';
        case 'palevioletred':
            return '#db7093ff';
        case 'papayawhip':
            return '#ffefd5ff';
        case 'peachpuff':
            return '#ffdab9ff';
        case 'peru':
            return '#cd853fff';
        case 'pink':
            return '#ffc0cbff';
        case 'plum':
            return '#dda0ddff';
        case 'powderblue':
            return '#b0e0e6ff';
        case 'purple':
            return '#800080ff';
        case 'rebeccapurple':
            return '#663399ff';
        case 'red':
            return '#ff0000ff';
        case 'rosybrown':
            return '#bc8f8fff';
        case 'royalblue':
            return '#4169e1ff';
        case 'saddlebrown':
            return '#8b4513ff';
        case 'salmon':
            return '#fa8072ff';
        case 'sandybrown':
            return '#f4a460ff';
        case 'seagreen':
            return '#2e8b57ff';
        case 'seashell':
            return '#fff5eeff';
        case 'sienna':
            return '#a0522dff';
        case 'silver':
            return '#c0c0c0ff';
        case 'skyblue':
            return '#87ceebff';
        case 'slateblue':
            return '#6a5acdff';
        case 'slategray':
            return '#708090ff';
        case 'slategrey':
            return '#708090ff';
        case 'snow':
            return '#fffafaff';
        case 'springgreen':
            return '#00ff7fff';
        case 'steelblue':
            return '#4682b4ff';
        case 'tan':
            return '#d2b48cff';
        case 'teal':
            return '#008080ff';
        case 'thistle':
            return '#d8bfd8ff';
        case 'tomato':
            return '#ff6347ff';
        case 'turquoise':
            return '#40e0d0ff';
        case 'violet':
            return '#ee82eeff';
        case 'wheat':
            return '#f5deb3ff';
        case 'white':
            return '#ffffffff';
        case 'whitesmoke':
            return '#f5f5f5ff';
        case 'yellow':
            return '#ffff00ff';
        case 'yellowgreen':
            return '#9acd32ff';
        default:
            return null;
    }
}

Kolor.prototype.foreground = function (alpha = true) {
    const toHex = (c) => {
        const hex = Math.round(c).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }
    let r = Math.pow(this.color[0] / 255, 2.2)
    if (r <= 0.04045) { r = r / 12.92 } else { r = Math.pow(((r + 0.055) / 1.055), 2.4) }
    let g = Math.pow(this.color[1] / 255, 2.2)
    if (g <= 0.04045) { g = g / 12.92 } else { g = Math.pow(((g + 0.055) / 1.055), 2.4) }
    let b = Math.pow(this.color[2] / 255, 2.2)
    if (b <= 0.04045) { b = b / 12.92 } else { b = Math.pow(((b + 0.055) / 1.055), 2.4) }
    
    let hex = ''
    if ((0.2126 * r + 0.7152 * g + 0.722 * b) <= 0.179) {
        hex = '#ffffff'
    } else {
        hex = '#000000'
    }
    if (alpha) {
        return `${hex}${toHex(this.color[3])}`
    }
    return `${hex}ff`
}

Kolor.prototype.complementary = function (alpha = true) {
    const comp = [255,255,255,255]
    comp[0] = comp[0] - this.color[0]
    comp[1] = comp[1] - this.color[1]
    comp[2] = comp[2] - this.color[2]
    if (alpha) {
        comp[3] = this.color[3]
    }
    return this.hex(comp)
}

Kolor.prototype.hex = function (color = null) {
    if (!color) { color = this.color }
    const toHex = (c) => {
        const hex = Math.round(c).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(color[0])}${toHex(color[1])}${toHex(color[2])}${toHex(color[3])}`
}

Kolor.prototype.alpha = function (alpha) {
    return `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${alpha})`
}