function checkBuildNumberAndReload(suffix = 'main') {
    return new Promise(resolve => {
        fetch(`${KAAL.getBase()}/revision.php`)
            .then(response => {
                if (!response.ok) { throw new Error() }
                return response.json()
            })
            .then(r => {
                const current = localStorage.getItem(`kaal-revision-${suffix}`)
                if (r.revision !== current) {
                    window.location.reload()
                    localStorage.setItem(`kaal-revision-${suffix}`, r.revision)
                    return
                }
                resolve()
            })
            .catch(_ => {
                resolve()
            })
    })
}