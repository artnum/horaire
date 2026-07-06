/* <legend>
RPLP <input name="RPLP">            
<span data-expression="~RPLP ldr"></span>
<span name="rplp" data-expression="$gross $RPLP %+ ~INTERMEDIATE ~RPLP cpr"></span>
</legend>
<legend>
Rabais <input name="RABAIS">
<span data-expression="~RABAIS ldr"></span>
<span name="rabais" data-expression="$rplp $RABAIS %- ~INTERMEDIATE ~RABAIS cpr"></span>
</legend>
<legend>
Escompte <input name="ESCOMPTE">
<span data-expression="~ESCOMPTE ldr"></span>
<span name="escompte" data-expression="$rabais $ESCOMPTE %- ~INTERMEDIATE ~ESCOMPTE cpr"></span>
</legend>
<legend>
TVA <input name="TAX">
<span data-expression="~TVA ldr"></span>
<span name="tva" data-expression="$escompte $TAX %+ ~INTERMEDIATE ~TVA cpr "></span>
</legend>
<legend>Arrondi 
<input value="0.05" name="ROUNDING">
<span data-expression="~UNROUNDED ldr"></span>
<span name="arrondi" data-expression="$tva $ROUNDING { jmpz mround ~INTERMEDIATE ~UNROUNDED cpr }"></span>
</legend> */

class ConditionUI {

    constructor (node, options = {}) {
        const defaults = {
            startValue: 'gross'
        }
        options = { ...defaults, ...options }
        this.startValue = options.startValue
        this.node = node;
        this.init();
    }

    init () {
    }

    addLine (position, previous, label, value, type, relation) {
        const name = `VALUE${position}`
        const op = (() => {
            switch (type) {
                case 'absolute':
                    if (relation === 'add') { return '+' }
                    if (relation === 'sub') { return '-' }
                    return 'nope'
                case 'percent':
                    if (relation === 'add') { return '%+' }
                    if (relation === 'sub') { return '%-' }
                    return 'nope'
                case 'subtotal':
                    return 'subtotal'
            }
        })();
        if (op === 'nope') { return false }

        if (op === 'subtotal') {
            const legend = document.createElement('legend');
            legend.appendChild(document.createTextNode(label));
            const span1 = document.createElement('span');
            legend.appendChild(span1);
            const span3 = document.createElement('span');
            legend.appendChild(span3);
            const span2 = document.createElement('span');
            span2.setAttribute('name', name);
            span2.setAttribute('data-expression', `$${previous === -1 ? `${this.startValue}` : `VALUE${previous}`}`);
            legend.appendChild(span2);
            this.node.appendChild(legend);
            return true
        }

        const legend = document.createElement('legend');
        legend.appendChild(document.createTextNode(label));
        const input = document.createElement('input');
        input.setAttribute('name', `${name}input`);
        input.value = value;
        legend.appendChild(input);
        const span1 = document.createElement('span');
        span1.setAttribute('data-expression', `~${name} ldr`);
        legend.appendChild(span1);
        const span2 = document.createElement('span');
        span2.setAttribute('name', name);
        if (type === 'rounding') {
            span2.setAttribute('data-expression', `$${previous === -1 ? `${this.startValue}` : `VALUE${previous}`} $${name}input { jmpz mround ~INTERMEDIATE ~${name} cpr }`);
        } else {
            span2.setAttribute('data-expression', `$${previous === -1 ? `${this.startValue}` : `VALUE${previous}`} $${name}input ${op} ~INTERMEDIATE ~${name} cpr`);
        }
        legend.appendChild(span2);
        this.node.appendChild(legend)

        return true
    }

    load (data) {
        data.sort((a, b) => a.position - b.position);
        let previous = -1
        data.forEach(element => {
            if (this.addLine(element.position, previous, element.name, element.value, element.type, element.relation)) {
                previous = element.position
            }
        });
        this.node.update()
    }
}

window.addEventListener('load', () => {
    console.log('loaded')
    const c = new ConditionUI(document.querySelector('account-summary[name="test"]'));
    c.load([
        { name: 'RPLP', value: 2, type: 'percent', relation: 'add', position: 0 },

        { name: 'Rabais 1', value: 5, type: 'percent', relation: 'sub', position: 1 },
        { name: 'Rabais 2', value: 4, type: 'percent', relation: 'sub', position: 2 },
        { name: 'Rabais 3', value: 200, type: 'absolute', relation: 'sub', position: 4 },

        { name: 'Sous-total', value: 0, type: 'subtotal', position: 5 },
        { name: 'TVA', value: 20, type: 'percent', relation: 'add', position: 6 },
        { name: 'Arrondi', value: 0.05, type: 'rounding', relation: 'add', position: 7 }
    ])

    console.log(c)
})