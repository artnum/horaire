/* TODO : get this from somewhere */
const DAYS = [
  { type: 'absolute', day: '1.8', name: 'NationalFest' },
  { type: 'absolute', day: '19.3', name: 'SaintJoseph' },
  { type: 'easter-relative', day: 60, name: 'CorpusChristy' },
  { type: 'absolute', day: '15.8', name: 'Assumption' },
  { type: 'absolute', day: '1.11', name: 'AllSaintsDay' },
  { type: 'absolute', day: '8.12', name: 'ImmaculateConception' },
  { type: 'easter-relative', day: 39, name: 'AscensionDay' },
  { type: 'absolute', day: '25.12', name: 'Christmas' },
  { type: 'absolute', day: '1.1', name: 'NewYear' },
]
const DAY_LENGTH_MS = 86400000
export default class Holidays {
  #easter(year) {
    const C = Math.floor(year / 100)
    const N = year - 19 * Math.floor(year / 19)
    const K = Math.floor((C - 17) / 25)
    let I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15
    I = I - 30 * Math.floor(I / 30)
    I =
      I -
      Math.floor(I / 28) *
        (1 -
          Math.floor(I / 28) *
            Math.floor(29 / (I + 1)) *
            Math.floor((21 - N) / 11))
    let J = year + Math.floor(year / 4) + I + 2 - C + Math.floor(C / 4)
    J = J - 7 * Math.floor(J / 7)
    const L = I - J
    const month = 3 + Math.floor((L + 40) / 44)
    const day = L + 28 - 31 * Math.floor(month / 4)

    return new Date(year, month - 1, day, 12, 0, 0)
  }

  getHolidays(year) {
    const easter = this.#easter(year)
    const days = DAYS.map((day) => {
      switch (day.type) {
        case 'absolute': {
          const [d, m] = day.day.split('.')
          return new Date(year, parseInt(m) - 1, parseInt(d))
        }
        case 'easter-relative': {
          const d = new Date()
          d.setTime(easter.getTime() + parseInt(day.day) * DAY_LENGTH_MS)
          return d
        }
      }
    })
    const holidays = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
      10: [],
      11: [],
      12: [],
    }
    for (let i = 0; i < days.length; i++) {
      holidays[days[i].getMonth()].push(days[i].getDate())
    }
    return holidays
  }
}
