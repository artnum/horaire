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
        else { fetch.failed++}
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
    fetch (url, params)
    .then(response => {
      if (!response.ok) { reject('Erreur communication'); return }
      return response.json()
    })
    .then(result => {
      resolve(result)
    })
  })
}