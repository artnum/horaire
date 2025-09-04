export default class AVSUtil {
  static format(avs) {
    avs = avs.replace(/\./g, '')
    if (avs.length !== 13 || !/^\d{13}$/.test(avs)) {
      throw new Error('AVS must be a 13-digit numeric string')
    }
    return `${avs.slice(0, 3)}.${avs.slice(3, 7)}.${avs.slice(7, 11)}.${avs.slice(11, 13)}`
  }

  static check(avs) {
    avs = avs.replace(/\./g, '')
    if (avs.length !== 13 || !/^\d{13}$/.test(avs)) {
      return false
    }
    if (avs.slice(0, 3) !== '756') {
      return false
    }

    let sum = 0
    for (let i = 0; i < avs.length - 1; i++) {
      sum += parseInt(avs[i], 10) * (i % 2 === 0 ? 1 : 3)
    }
    const check = (10 - (sum % 10)) % 10
    return check === parseInt(avs[12], 10)
  }
}
