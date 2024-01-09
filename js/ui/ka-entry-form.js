function KAEntryForm (project, affaire, status, reservation = null) {
    const div = document.createElement('DIV')
    const kolor = new Kolor(status.color)
    div.classList.add('ka-project-entry')
    div.innerHTML = `
        <span>${project.reference}</span>
        <span style="background-color: ${status.color}; color: ${kolor.foreground()};">${status.name}</span>
        <span>${project.name}</span>
        <span>${affaire.reference}</span>
    `

    const button = new KAButton(div, {fat: true})

    button.addEventListener('click', event => {
        event.preventDefault()
        button.dispatchEvent(new CustomEvent('submit-data', {detail: {
            project, affaire, process: affaire.status, reservation
        }}))
    })

    return button
}