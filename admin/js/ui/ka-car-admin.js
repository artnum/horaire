function KACarAdminUI() {

}

KACarAdminUI.prototype = {
    list: function () {
        const KAPIStatus = new KAPI(`${KAAL.kairos.endpoint}/Status`)
        const KAPICarusage = new KAPI(`${KAAL.getBase()}/CarUsage`)
        return new Promise((resolve, reject) => {
            KAPIStatus.search({type: 100, deleted: '--'})
            .then(warnings => {
                KAPIStatus.search({type: 2, deleted: '--', group: 'Véhicule'})
                .then(cars => {
                    return Promise.all(cars.map(car => {
                        return new Promise((resolve) => {
                            KAPICarusage.search({car: car.id})
                            .then(usages => {
                                usages.sort((a, b) => {
                                    return b.km - a.km
                                })
                                car.defect = false
                                if (usages.length > 0) {
                                    car.defect = usages[0].defect > 0
                                }
                                usages = usages.map(usage => {
                                    if (usage.defect === 0) {
                                        usage.defect = {
                                            name: '',
                                            color: '',
                                            bgcolor: '',
                                            description: ''
                                        }
                                        return usage
                                    }
                                    const warning = warnings.find(warning => warning.id === usage.defect)
                                    if (warning) {
                                        usage.defect = warning
                                    } else {
                                        usage.defect = {
                                            name: 'Défaut non-spécifié',
                                            color: '',
                                            bgcolor: '',
                                            description: ''
                                        }
                                    }
                                    return usage
                                })
                                car.usages = usages

                                return resolve(car)
                            })
                            .catch(cause => {
                                car.defect = false
                                car.usages = []
                                resolve(car)
                            })
                        })
                    }))
                })
                .then(cars => {
                    resolve(cars)
                })
                .catch(cause => {
                    resolve([])
                })
            })
        })
    },

    renderHeader: function () {
        const div = document.createElement('DIV')
        div.classList.add('ka-car-header')
        div.innerHTML = `
            <span>Nom</span>
            <span>Immatriculation</span>
            <span>Kilométrage</span>
            <span>Défaut</span>
        `
        return div
    },

    renderList: function (cars) {
        const div = document.createElement('DIV')
        div.classList.add('ka-car-items')
        cars.forEach(car => {
            const divCar = document.createElement('DIV')
            divCar.classList.add('ka-car-item')
            if (car.defect) {
                divCar.classList.add('ka-defect')
            }
            divCar.innerHTML = `
                <span style="cursor: pointer">${car.name}</span>
                <span>${car.description}</span>
                <span>${car.usages.length > 0 ? car.usages[0].km : 0}</span>
                <span>${car.usages.length > 0 ? car.usages[0].defect.name : ''}</span>
            `
            divCar.firstElementChild.addEventListener('click', event => {
                const params = {
                    cid: car.id
                }
                Admin.getUrl('admin/exec/export/cars.php', params)
                .then(url => {
                  window.open(url)
                })
            })
            div.appendChild(divCar)
        })
        return div
    },

    renderDeleted: function () {
        const KAPIStatus = new KAPI(`${KAAL.kairos.endpoint}/Status`)
        const form = document.createElement('FORM')
        KAPIStatus.search({type: 2, group: 'Véhicule', deleted: '--'})
        .then(cars => {
            const select = document.createElement('SELECT')
            select.name = 'car'
            select.innerHTML = `
                <option value="">Sélectionner un véhicule</option>
            `
            cars.forEach(car => {
                const option = document.createElement('OPTION')
                option.value = car.id
                option.innerText = car.name
                select.appendChild(option)
            })
            form.appendChild(select)
        })

        const submitButton = document.createElement('BUTTON')
        submitButton.type = 'submit'
        submitButton.innerText = 'Supprimer'
        form.appendChild(submitButton)

        form.addEventListener('submit', event => {
            const select = event.target.car
            event.preventDefault()
            if (select.value === '') { return }
            KAPIStatus.delete(select.value)
            .then(car => {
                select.querySelector(`option[value="${select.value}"]`).remove()
                this.list()
                .then(cars => {
                    const div = this.renderList(cars)
                    document.querySelector('#ka-car-list .ka-car-items').replaceWith(div)
                })
            })
        })

        return form
    },

    renderAdd: function () {
        const KAPIStatus = new KAPI(`${KAAL.kairos.endpoint}/Status`)

        const form = document.createElement('FORM')
        form.classList.add('ka-car-add')
        form.innerHTML = `
            <input type="text" name="name" placeholder="Nom">
            <input type="text" name="description" placeholder="Immatriculation">
            <button type="submit">Ajouter</button>
        `
        form.addEventListener('submit', event => {
            event.preventDefault()
            const data = {
                type: 2,
                name: event.target.name.value,
                description: event.target.description.value,
                group: 'Véhicule'
            }
            KAPIStatus.write(data)
            .then(car => {
                console.log(car)
                this.list()
                .then(cars => {
                    const div = this.renderList(cars)
                    document.querySelector('#ka-car-list .ka-car-items').replaceWith(div)
                })
            })
        })
        return form
    },

    render: function () {
        return new Promise((resolve, reject) => {
            const section = document.createElement('SECTION')
            section.id = 'ka-car-admin'
            section.classList.add('ka-car-admin')
            section.innerHTML = `
                <h1>Véhicules</h1>
            `
            this.list()
            .then(cars => {
                const div = document.createElement('DIV')
                div.id = 'ka-car-list'
                div.classList.add('ka-car-list')
                div.appendChild(this.renderHeader())
                div.appendChild(this.renderList(cars))
                section.appendChild(div)

                const addTitle = document.createElement('H2')
                addTitle.innerText = 'Ajouter un véhicule'
                section.appendChild(addTitle)
                section.appendChild(this.renderAdd())

                const deletedTitle = document.createElement('H2')
                deletedTitle.innerText = 'Supprimer un véhicule'
                section.appendChild(deletedTitle)
                section.appendChild(this.renderDeleted())

                return resolve(section)      
            })
        })
    }
}