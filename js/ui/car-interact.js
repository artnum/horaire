function KCarInteractUI() {
}

KCarInteractUI.prototype = {
    getCars: function () {
        const KAPIStatus = new KAPI(`${KAAL.kairos.endpoint}/Status`)
        return new Promise((resolve, reject) => {
            KAPIStatus.search({type: 2, deleted: 0, group: 'Véhicule'})
            .then(cars => {
                resolve(cars)
            })
            .catch(cause => {
                resolve([])
            })
        })
    },
    getDefects: function () {
        const KAPIStatus = new KAPI(`${KAAL.kairos.endpoint}/Status`)
        return new Promise((resolve, reject) => {
            KAPIStatus.search({type: 100, deleted: 0})
            .then(defects => {
                resolve(defects)
            })
            .catch(cause => {
                resolve([])
            })
        })
    },
    render: function (htime = null) {
        return new Promise((resolve, reject) => {
            (() => {
                if (htime == null) {
                    return Promise.resolve({
                        car: null,
                        km: 0,
                        defect: 0,
                        comment: ''
                    })
                }
                return new Promise ((resolve, reject) => {
                    const KAPICarusage = new KAPI(`${KAAL.getBase()}/CarUsage`)
                    KAPICarusage.search({htime: htime})
                    .then(carusage => {
                        if (carusage.length > 0) {
                            return resolve(carusage[0])
                        }
                        return resolve({
                            car: null,
                            km: 0,
                            defect: 0,
                            comment: ''
                        })
                    })
                })
            })()
            .then(usage => {
                return new Promise(resolve => {
                    Promise.all([
                        this.getCars(),
                        this.getDefects()
                    ])
                    .then(results => {
                        const cars = results[0]
                        const defects = results[1]
                        resolve({
                            usage: usage,
                            cars: cars,
                            defects: defects
                        })
                    })
                })
            })
            .then(content => {
                this.content = content
                const node = document.createElement('DIV')
                node.classList.add('ka-input')
                node.innerHTML = `<label for="car">Véhicule</label>`
                const select = document.createElement('SELECT')
                node.appendChild(select)
                select.addEventListener('change', (event) => { this.showCarForm(event.currentTarget) })
                select.classList.add('ka-car-select')
                const empty = document.createElement('OPTION')
                empty.value = 0
                empty.innerHTML = 'Aucun'
                select.appendChild(empty)
                content.cars.forEach(car => {
                    const option = document.createElement('OPTION')
                    option.value = car.id
                    if (content.usage.car === car.id) {
                        option.selected = true
                    }
                    option.innerHTML = `${car.name} ${car.description !== '' ? `(${car.description})` : ''}`
                    select.appendChild(option)
                })
                return resolve(node)
            })
        })
    },
    showCarForm: function (select) {
        const content = this.content
        const car = select.options[select.selectedIndex].value
        if (this.content.usage.id) { select.dataset.id = this.content.usage.id }
        ; (() => {
            return new Promise(resolve => {
                let node = document.querySelector('div.ka-car').firstElementChild.nextSibling
                while(node) {
                    const next = node.nextSibling
                    node.remove()
                    node = next
                }
                resolve()
            })
        })()
        .then(_ => {
            if (parseInt(car) === 0) { 
                return
            }
            const content = this.content
            const kmNode = document.createElement('DIV')
            kmNode.classList.add('ka-input')
            kmNode.innerHTML = `<label for="km">Kilométrage</label>`
            const km = document.createElement('INPUT')
            km.type = 'number'
            km.min = 0
            km.max = 999999
            km.value = content.usage.km
            km.classList.add('ka-car-km')
            kmNode.appendChild(km)
            select.parentNode.parentNode.appendChild(kmNode)

            const defectNode = document.createElement('DIV')
            defectNode.classList.add('ka-input')
            defectNode.innerHTML = `<label for="km">Voyant</label>`
            const defect = document.createElement('SELECT')
            defect.classList.add('ka-car-defect')
            const empty = document.createElement('OPTION')
            empty.value = 0
            empty.innerHTML = 'Aucun'
            defect.appendChild(empty)
            defectNode.appendChild(defect)
            this.content.defects.forEach(def => {
                const option = document.createElement('OPTION')
                option.value = def.id
                if (content.usage.defect === def.id) {
                    option.selected = true
                }
                option.innerHTML = `${def.name} ${def.description !== '' ? `(${def.description})` : ''}`
                defect.appendChild(option)
            })
            select.parentNode.parentNode.appendChild(defectNode)
        })
    },
    save: function (htime, node) {
        return new Promise((resolve, reject) => {
            const car = node.querySelector('.ka-car-select').options[node.querySelector('.ka-car-select').selectedIndex].value
            const KAPICarusage = new KAPI(`${KAAL.getBase()}/CarUsage`)
            
            const km = node.querySelector('.ka-car-km')?.value
            if (parseInt(car) === 0 || km === '' || km === null || km === undefined || km == 0) {
                ; (() => {
                    return new Promise(resolve => {
                        KAPICarusage.search({htime: htime})
                        .then(carusage => {
                            if (carusage.length <= 0) { return Promise.resolve() }
                            return Promise.all(carusage.map(x => KAPICarusage.delete(x.id)))
                        })
                        .then(_ => { return resolve() })
                    })
                })()
                .then(_ => {
                    return resolve()
                })
                return
            }

            const defect = node.querySelector('.ka-car-defect').options[node.querySelector('.ka-car-defect').selectedIndex].value
            const kusage = {
                htime: htime,
                car: car,
                km: km,
                defect: defect
            }
            if (node.querySelector('.ka-car-select').dataset.id) {
                kusage.id = node.querySelector('.ka-car-select').dataset.id
            }
            ; (() => {
                if (kusage.id) { return KAPICarusage.write(kusage, kusage.id) }
                return KAPICarusage.write(kusage)
            })()
            .then(carusage => {
                resolve(carusage)
            })
            .catch(cause => {
                reject(cause)
            })
        })
    }
}