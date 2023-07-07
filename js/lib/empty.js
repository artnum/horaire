function isIntEmpty (int) {
    if (int === null || int === undefined || isNaN(parseInt(int))) return true
    return false
}

function isIdEmpty (id) {
    if (isIntEmpty(id) || parseInt(id) === 0) { return true }
    return false
}

function isStringEmpty (string) {
    if (string === null || string === undefined || String(string).length === 0 || String(string).trim().length === 0) { return true }
    return false
}

function isFloatEmpty (float) {
    if (float === null || float === undefined || isNaN(parseFloat(float))) { return true }
    return false
}