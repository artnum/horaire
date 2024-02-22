function getTVA() {
    if (!KAAL.tva) { return 0.0 }
    let year = new Date().getFullYear()
    let tva = 0.0
    for (let y in KAAL.tva) {
        if (year >= y) {
            tva = KAAL.tva[y]
        }
    }
    return tva
}