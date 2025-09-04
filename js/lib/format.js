export default class format {
  static printf(fmt, ...vars) {
    let outString = ''
    let paramCount = 0
    fmt = fmt.split('')
    for (let i = 0; i < fmt.length; i++) {
      if (fmt[i] !== '%' || i + 1 >= fmt.length) {
        outString += fmt[i]
        continue
      }
      if (!vars[paramCount]) {
        outString += fmt[i]
        continue
      }
      switch (fmt[i + 1]) {
        case 'c':
        case 's': outString += `${vars[paramCount++]}`; break;
        case 'd': outString += `${parseInt(vars[paramCount++])}`; break;
        case 'f': outString += `${parseFloat(vars[paramCount++])}`; break;
      }

      i++
    }
    return outString
  }

  static is_zero(value) {
    if (value === undefined || value === null) return true
    if (value === false) return true
    if (value === '') return true
    if (parseInt(value) === 0) return true
    if (parseFloat(value) === 0.0) return true
    return false
  }

  /**
   * @param date {Date}
   * @return {string}
   */
  static date(date) {
    const y = String(date.getFullYear())
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${d}.${m}.${y}`
  }

  /**
   * @param value {number}
   * @return {string}
   */
  static price(value) {
    return value.toFixed(2)
  }
}
