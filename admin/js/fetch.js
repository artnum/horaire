const __fetch_original = fetch
fetch = function (url, params = {}) {
  if (fetch.first === undefined) { 
      fetch.first = new Date()
  }
  fetch.last = new Date()
  fetch.count++
  if (params.headers === undefined) {
    params.headers = new Headers()
  }
  if (!(params.headers instanceof Headers)) {
    params.headers = new Headers(params.headers)
  }
  
  if (!params.headers.has('X-Request-Id')) {
    params.headers.set('X-Request-Id', `${new Date().toISOString()}-${performance.now()}-${fetch.count}`)
  }

  const klogin = new KLogin()
  return new Promise((resolve, reject) => {
    klogin.getToken()
    .then(token => {
      if (token) { params.headers.set('Authorization', `Bearer ${token}`)}
      return __fetch_original(url, params)
    })
    .then(response => {
        if (response.ok) { fetch.success++ }
        else { 
          fetch.failed++
        }
        /*try {
          const responseCopy = response.clone()
          responseCopy.json()
          .then(enveloppe => {
            if (enveloppe.debug) {
              console.group(`Server Debug Data %c${url}`, 'color: green;')
              let i = 0
              enveloppe.debug.forEach(debug =>{
                  console.log(debug.message)
                  debug.stack.forEach(stack => {
                    console.log(`\t(${++i})-> %c${stack.function} %c${stack.file}:${stack.line}`, 'font-weight:bold; color: red;', 'float: right; padding-right: 12px; border-right: 12px solid gray')
                  })
              })
              console.groupEnd()
            }
          })
        } catch (cause) {
          console.log(cause)
        }*/

        resolve(response)
    })
    .catch(e => {
      reject(e)
    })
  })
}

fetch.stats = function () {
    console.group('Fetch stats')
    console.log(`Fetch count ${fetch.count}, Failed[%] ${(100 * fetch.failed / fetch.count).toFixed(2)}, Success[%] ${(100 * fetch.success / fetch.count).toFixed(2)}`)
    let deltaTime = fetch.last.getTime() - fetch.first.getTime()
    console.log(`Fetch requests per seconds ${(fetch.count / deltaTime * 1000).toFixed(2)}`)
    console.groupEnd()
    return 0
}
fetch.count = 0
fetch.failed = 0
fetch.success = 0

function kafetch (url, params = {}) {
  return new Promise ((resolve, reject) => {
    if (params.body && typeof params.body === 'object') {
      params.body = JSON.stringify(params.body)
    }
    fetch (url, params)
    .then(response => {
      if (!response.ok) { reject('Erreur communication'); return }
      return response.json()
    })
    .then(result => {
      resolve(result)
    })
    .catch(cause => {
      reject(cause)
    })
  })
}

const KAFetchChannel = new BroadcastChannel('fetch-channel')

function kafetch2 (url, params = {}) {
  return new Promise((resolve, reject) =>{
    kafetch(url, params)
    .then(result => {
      if (result.softErrors.filter(e => e.service === 'bexio' && e.message === 'down').length > 0) {
        KAFetchChannel.postMessage('bexio-down')
      } else {
        KAFetchChannel.postMessage('bexio-up')
      }
      if (result.length === 0) { return resolve([]) }
      if (!result.data) { return resolve([]) }
      if (!Array.isArray(result.data)) { return resolve([result.data]) }
      return resolve(result.data)
    })
    .catch(cause => {
      reject(new Error('Erreur réseau', {cause}))
    })

  })
}