function isIntEmpty (int) {
    if (int === null || int === undefined || isNaN(parseInt(int))) return true
    return false
}

function isIdEmpty (id) {
    if (isIntEmpty(id) || parseInt(id) === 0) { return true }
    return false
}

function isStringEmpty (string) {
    if (string === undefined) { return true }
    if (string === null) { return true }
    if (String(string).length === 0 || String(string).trim().length === 0) { return true }
    return false
}

function isFloatEmpty (float) {
    if (float === null || float === undefined || isNaN(parseFloat(float))) { return true }
    return false
}

function arrayFirstNonEmptyString (array) {
    return array.find(item => typeof item === 'string' && !isStringEmpty(item))
}