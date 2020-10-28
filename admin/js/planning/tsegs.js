/* registry for tseg */
function TSegs(planning) {
    this.TSegs = {}
    this.TSegsByNode = {}
    this.TSegsByTravail = {}
    this.Planning = planning
}

TSegs.neededSegment = function (travail, person) {
    let workday = KAAL.work.getDay('s')
    if (person.workday) {
        workday = person.workday
    }
    let travailTime = travail.time * travail.force
    return Math.ceil((travailTime / person.efficiency) / workday)
}

TSegs.averageTime = function (travail, people) {
    if (!Array.isArray(people)) {
        people = [people]
    }

    let travailTime = travail.time * travail.force
    let averageTime = 0
    let smallestWorkDay = KAAL.work.getDay('s')
    for (let i = 0; i < people.length; i++) {
        averageTime += (travailTime / people[i].efficiency)
        if (people[i].workday && smallestWorkDay > people[i].workday) {
            smallestWorkDay = people[i].workday
        }
    }
    averageTime /= people.length

    return [averageTime, smallestWorkDay]
}

TSegs.prototype.getById = function (tsegid) {
    if (this.TSegs[tsegid]) {
        return this.TSegs[tsegid]
    }
    return undefined
}

TSegs.prototype.generateList = function (travail, people) {
    if (!Array.isArray(people)) {
        people = [people]
    }

    let [averageTime, smallestWorkDay] = TSegs.averageTime(travail, people)
    let segsNeeded = Math.ceil(averageTime / smallestWorkDay)
    let gHead = null // group head
    for (let i = 0; i < people.length; i++) {
        let head = null
        for (let j = 0; j < segsNeeded; j++) {
            let tseg = new TSeg({
                person: people[i].id,
                travail: travail.id,
                locked: false,
                time: averageTime - (j * smallestWorkDay)
            })
            if (head === null) {
                head = tseg
            } else {
                let c = head
                for (; c._next !== null; c = c._next);
                c._next = tseg
                tseg._previous = c
            }
        }
        if (gHead === null) {
            gHead = head
        } else {
            let c = gHead
            for (; c._down !== null; c = c._down);
            c._down = head
            head._up = c
        }
    }

    return gHead
}

TSegs.prototype.add = function (tseg) {
    if (!tseg || !tseg instanceof TSeg) { return }
    if (tseg.id && this.TSegs[tseg.id]) {
        this.TSegs[tseg.id].refresh(tseg)
        return
    }
    tseg.commit().then(() => {
        if (!this.TSegs[tseg.id]) {
            this.TSegs[tseg.id] = tseg
        } else {
            this.TSegs[tseg.id].refresh(tseg)
        }

        if (!this.TSegsByNode[WNode.idFromTSeg(tseg)]) {
            this.TSegsByNode[WNode.idFromTSeg(tseg)] = []
        }
        if (this.TSegsByNode[WNode.idFromTSeg(tseg)].indexOf(tseg.id) === -1) {
            this.TSegsByNode[WNode.idFromTSeg(tseg)].push(tseg.id)
        }

        if (!this.TSegsByTravail[tseg.travail]) {
            this.TSegsByTravail[tseg.travail] = []
        }
        if (this.TSegsByTravail[tseg.travail].indexOf(tseg.id) === -1) {
            this.TSegsByTravail[tseg.travail].push(tseg.id)
        }

        this._installEvents(tseg)
        let wnode = WNode.getWNodeById(WNode.idFromTSeg(tseg))
        if (wnode !== null) {
            wnode.addTSeg(tseg)
            tseg._label()
        }
    })
}

TSegs.prototype.draw = function () {
    for (let tsegId of Object.keys(this.TSegs)) {
        let wnode = WNode.getWNodeById(WNode.idFromTSeg(this.TSegs[tsegId]))
        if (wnode !== null) {
            wnode.addTSeg(this.TSegs[tsegId])
        }
    }
}

TSegs.prototype.highlightTravail = function (travail) {
    if (this.TSegsByTravail[travail]) {
        this.TSegsByTravail[travail].forEach(tseg => {
            this.TSegs[tseg].light(0)          
        })   
    }
}

TSegs.prototype.resetLight = function () {
    for(let id of Object.keys(this.TSegs)) {
        this.TSegs[id].nolight()
    }
}

TSegs.prototype._installEvents = function (tseg) {
    tseg.addEventListener('mouseover', event => {
        if (this.TSegs[event.target.id] === undefined) { return }
        let tseg = this.TSegs[event.target.id]
        if (tseg.selected) { return }
        tseg.highlight()
        if (this.TSegsByTravail[tseg.travail]) {
            this.TSegsByTravail[tseg.travail].forEach (id => {
                if (tseg.id !== id) {
                    this.TSegs[id].lowlight()
                }
            })
        }
    })
    tseg.addEventListener('mouseout', event => {
        if (this.TSegs[event.target.id] === undefined) { return }
        let tseg = this.TSegs[event.target.id]
        if (tseg.selected) { return }
        tseg.nolight()
        if (this.TSegsByTravail[tseg.travail]) {
            this.TSegsByTravail[tseg.travail].forEach (id => {
                if (tseg.id !== id) {
                    this.TSegs[id].nolight()
                }
            })
        }
    })
    tseg.addEventListener('click', event => {
        let select = true
        event.stopPropagation()
        if (this.TSegs[event.target.id] === undefined) { return }
        let tseg = this.TSegs[event.target.id]
        if (tseg.selected) { select = false }
        tseg.nolight()
        if (select) { tseg.light(1) }
        tseg.selected = select
        this.Planning.openSegment(tseg)
        if (event.shiftKey) {
            if (this.TSegsByTravail[tseg.travail]) {
                    this.TSegsByTravail[tseg.travail].forEach(id => {
                    if (tseg.id !== id) {
                        this.TSegs[id].nolight()
                        if (select) { this.TSegs[id].light(2) }
                        this.TSegs[id].selected = select
                        this.Planning.addToOpenSegment(this.TSegs[id])
                    }
                })
            }
        }
    })
}