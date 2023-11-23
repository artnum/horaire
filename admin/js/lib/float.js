function KAFloat(value, precision = 2) {
    const precisionFactor = Math.pow(10, precision);
    value = parseFloat(value);
    if (isNaN(value)) { return 0 }
    value = value *= precisionFactor / precisionFactor;
    return value
}