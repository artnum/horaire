export default class DataUtils  {
    static toId (uid) {
        if (typeof uid === 'number') return String(uid)
        uid = String(uid)
        return uid.split('/').pop()
    }
    
    static empty (value) {
        if (value === undefined) { return true }
        if (value === null || value === '') { return true }
        return false
    }

    static str (value) {
        if (value === undefined) { return '' }
        if (value === null) { return '' }
        return String(value)
    }

    static html (value) {
        return value
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('/', '&#47;')
            .replaceAll(/(?:\r\n|\r|\n)/g, '<br>')
    }
    
    static textualShortDate (date) {
      if (typeof date === 'string') {
        date = new Date(date)
      }
      return `${Intl.DateTimeFormat(navigator.language, {weekday: 'long'}).format(date).capitalize()}, ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
    }

    static shortDate (date) {
        if (typeof date === 'string') {
            date = new Date(date)
        }
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
    }
    
    static longDate (date) {
        if (typeof date === 'string') {
            date = new Date(date)
        }
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
    }

    static dbDate (date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    static secToHour (value) {
        const hour = Math.floor(value / 3600)
        const minute = Math.round(((value / 3600) - hour) * 60)
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }

    static strToDuration (value) {
        const rExp = /\s*([0-9]*)\s*(?:(?:([m|M]|[h|H]){1}\s*([0-9]*))|(?:([.:,]{1})\s*([0-9]*))){0,1}\s*/
        let intValue
        if (rExp.test(value)) {
          value = rExp.exec(value)
          if (!value[2] && !value[4]) {
            intValue = Number(value[1])
          } else if (String(value[2]).toLowerCase() === 'h' || String(value[2]).toLowerCase() === 'm') {
            intValue = Number(value[1]) * Number(String(value[2]).toLowerCase() === 'h' ? 60 : 1)
            if (String(value[2]).toLowerCase() === 'h' && value[3]) {
              if (value[3].length === 1) {
                value[3] += '0'
              } else if (value[3].length > 2) {
                value[3] = value[3].substr(0, 2)
              }
              intValue += Number(value[3])
            }
          } else {
            intValue = Number(value[1]) * 60
            if (value[5].length === 1) {
              value[5] += '0'
            } else if (value[5].length > 2) {
              value[5] = value[5].substr(0, 2)
            }
            switch (value[4]) {
              case ':':
                if (value[5]) {
                  intValue += Number(value[5])
                }
                break
              case ',': case '.':
                if (value[5]) {
                  intValue += 0.6 * Number(value[5])
                }
                break
            }
          }
        }
    
        return intValue * 60
    }

    static durationToStr (value) {
        const h = Math.trunc(value / 3600)
        const m = Math.trunc(Math.round(((value / 3600) - h) * 60))
        return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}min`
    }

    static durationToStrTime (value) {
        const h = Math.trunc(value / 3600)
        const m = Math.trunc(Math.round(((value / 3600) - h) * 60))
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
}
