function KAEntryForm (project, affaire, status, reservation = null) {
    const form = document.createElement('FORM')
    form.classList.add('ka-form')
    form.innerHTML = `
        <label class="ka-time">Temps</label><input type="text" name="time" />
        ${KAAL.work.managementProcess ? '<label class="ka-regie">Régie</label><input type="text" name="regie" />' : '' }
        <label class="ka-remark">Remarque</label><input type="text" name="comment" />
        <label class="ka-total">Total</label><span class="ka-total-show">0h</span>
        <button type="submit">Enregistrer</button>
        <button type="reset">Annuler</button>
    `
    const div = document.createElement('DIV')
    div.classList.add('ka-project-entry')
    div.innerHTML = `
        <span>${project.reference}</span>
        <span style="background-color: ${status.color}">${status.name}</span>
        <span>${project.name}</span>
        <span>${affaire.reference}</span>
    `

    form.querySelector('input[name="time"]').addEventListener('keyup', event => {
        const regieBox = form.querySelector('input[name="regie"]')
        const regie = DataUtils.strToDuration(regieBox.value)
        const time = DataUtils.strToDuration(event.target.value)
        form.querySelector('label.ka-time').innerHTML = `Temps : ${DataUtils.durationToStr(time)}`
        form.querySelector('span.ka-total-show').innerHTML = `${DataUtils.durationToStr(time + regie)}`
    })

    form.querySelector('input[name="regie"]').addEventListener('keyup', event => {
        const timeBox = form.querySelector('input[name="time"]')
        const time = DataUtils.strToDuration(timeBox.value)
        const regie = DataUtils.strToDuration(event.target.value)

        form.querySelector('label.ka-regie').innerHTML = `Régie : ${DataUtils.durationToStr(regie)}`
        form.querySelector('span.ka-total-show').innerHTML = `${DataUtils.durationToStr(time + regie)}`
    })

    const button = KAButton(div, {group: 'project', foldable: form, fat: true})

    form.addEventListener('submit', event => {
        event.preventDefault()
        button.dispatchEvent(new CustomEvent('submit-data', {detail: {
            project, affaire, process: affaire.status, reservation, form
        }}))
    })

    return button
}