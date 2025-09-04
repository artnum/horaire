let CurrentLanguage = null

export default class l10n {
  static setLanguage(language) {
    CurrentLanguage = language
  }

  static t(value, ...args) {
    let i = 0;
    while (value.indexOf('{}') !== -1) {
      value = `${value.substring(0, value.indexOf('{}'))}${args[i++]}${value.substring(value.indexOf('{}') + 2)}`
    }
    return value
  }

  static hash_key(key) {
    return new Promise((resolve) => {
      crypto.subtle.digest('SHA-256', (new TextEncoder()).encode(key))
        .then(buffer => {
          return resolve(
            [Array.from(new Uint8Array(buffer))
              .map(byte => byte.toString(16).padStart(2, '0'))
              .join(''), key]
          )
        })
    })
  }

  /**
   * @param toTranslate {object}
   */
  static load(toTranslate) {
    /* TODO implement this */
    return Promise.resolve(toTranslate)
  }

  /**
   * @param template {string}
   */
  static T(template, ...args) {
    return new Promise((resolve, reject) => {
      let current = ''
      const parts = []
      const keys = []
      let state = 0
      for (let i = 0; i < template.length; i++) {
        if (template[i] === '$' && state === 0) {
          state = 1
        } else if (template[i] === '[' && state === 1) {
          if (current.length > 0) { parts.push(current) }
          current = ''
          state = 2
        } else if (template[i] === ']' && state === 2) {
          state = 0
          parts.push({ key: current })
          keys.push(parts.length - 1)
          current = ''
        } else {
          if (state === 1) {
            current += '$'
          }
          current += template[i]
        }
      }
      if (current) {
        if (state === 2) { parts.push({ key: current }) }
        else { parts.push(current) }
      }


      Promise.all(keys.map(index => {
        return l10n.hash_key(parts[index].key)
      }))
        .then(hashed => {
          return Promise.allSettled(
            hashed
              .map((value, index) => {
                const cachedTranslation = sessionStorage.getItem(`translation/${value[0]}`)
                if (cachedTranslation) {
                  return Promise.resolve(cachedTranslation)
                }
                parts[keys[index]].hash = value[0]
                return fetch(`$translation/${value[0]}`, {
                  method: 'POST',
                  body: JSON.stringify({ key: value[1], to: CurrentLanguage ?? navigator.language })
                })
              })
          )
        })
        .then(translation => {
          return Promise.all(translation.map(e => {
            if (e.status !== 'fulfilled') { return Promise.resolve('') }
            if (typeof e.value === 'string') { return e.value }
            if (!e.value.ok) { return Promise.resolve('') }
            return e.value.text()
          }))
        })
        .then(translation => {
          translation.forEach((t, index) => {
            if (t === '') {
              parts[keys[index]] = parts[keys[index]].key
            } else {
              sessionStorage.setItem(`translation/${parts[keys[index]].hash}`, t)
              parts[keys[index]] = t
            }
          })
          return resolve(parts.join(''))
        })
        .catch(e => {
          reject(e)
        })
    })
  }
}
