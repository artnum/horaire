/* registry for tseg */
function TSegs () {
    this.TSegs = {}
    this.TSegsByNode = {}
    this.TSegsByTravail = {}
}

TSegs.prototype.add = function (tseg, toId) {
    if (!tseg || !tseg instanceof TSeg) { return }
    
    tseg.commit().then(() => {
        if (!this.TSegs[tseg.id]) {
            this.TSegs[tseg.id] = tseg
        } else {
            this.TSegs[tseg.id].refresh(tseg)
        }
    let node = document.getElementById(`${tseg.get('person')}+${tseg.get('date')}`)
    if (node) {
        if (!this.TSegs[node.id]) {
        this.TSegs[node.id] = []
        }

        let found = false
        if (tseg.get('id') !== null) {
        for (let i in this.TSegs[node.id]) {
            if (this.TSegs[node.id][i].get('id') === tseg.get('id')) {
            found = true
            this.TSegs[node.id][i].fromObject(tseg.toObject())
            }
        }
        }
        if (!tseg.data.domNode) {
        let node = document.getElementById(tseg.data.id)
        if (node) {
            tseg.data.domNode = node
        }
        }
        let segDom
        if (found) {
        segDom = tseg.data.domNode
        } else {
        this.TSegs[node.id].push(tseg)
        if(!this.TSegByTravail[tseg.data.travail]) {
            this.TSegByTravail[tseg.data.travail] = []
        }
        this.TSegByTravail[tseg.data.travail].push(tseg)
        this.nodeAddTime(node, tseg.get('time'))

        segDom = tseg.newDom()
        window.requestAnimationFrame(() => {
            node.appendChild(segDom)
        })
        }
        if (!segDom) { return }

        segDom.addEventListener('mouseover', event => {
        window.requestAnimationFrame(() => {
            event.target.style.backgroundColor = 'green'
        })
        if (this.TSegByTravail[event.target.dataset.travail]) {
            this.TSegByTravail[event.target.dataset.travail].forEach(tseg => {
            window.requestAnimationFrame(() => tseg.data.domNode.style.backgroundColor = 'green')
            })
        }
        })
        segDom.addEventListener('mouseout', event => {
        window.requestAnimationFrame(() => {
            event.target.style.backgroundColor = ''
            if (this.TSegByTravail[event.target.dataset.travail]) {
            this.TSegByTravail[event.target.dataset.travail].forEach(tseg => {
                window.requestAnimationFrame(() => tseg.data.domNode.style.backgroundColor = '')
            })
            }
        })
        })
    }
    })

  }