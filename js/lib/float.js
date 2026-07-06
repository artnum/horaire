function KAFloat(value, precision = 4) {
    const precisionFactor = Math.pow(10, precision);
    if (typeof value !== 'number') { value = parseFloat(value) }
    if (isNaN(value)) { return 0 }
    value = Math.round(value * precisionFactor) / precisionFactor
    return value
}