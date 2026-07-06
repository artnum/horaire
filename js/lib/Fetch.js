const outMimeTypeMap = {
    json: 'application/json',
    csv:  'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

export default class Fetch {
    #authHeader
    
    constructor(auth) {
        this.#authHeader = auth
    }

    getFilenameFromHeader(contentDisposition) {
      if (!contentDisposition) return null;

      let filename = null;

      // 1. Try to extract modern UTF-8 encoded filename (filename*)
      const filenameStarRegex = /filename\*=\s*([^\s;]+)/i;
      const matchesStar = filenameStarRegex.exec(contentDisposition);
      
      if (matchesStar && matchesStar[1]) {
        const parts = matchesStar[1].split("''");
        if (parts.length === 2) {
          // The second part is the URL-encoded filename
          filename = decodeURIComponent(parts[1]);
        }
      }

      // 2. Fallback to standard filename if filename* wasn't found
      if (!filename) {
        const filenameRegex = /filename=\s*(["'])(.*?)\1|filename=\s*([^\s;]+)/i;
        const matches = filenameRegex.exec(contentDisposition);
        
        // matches[2] handles quoted strings, matches[3] handles unquoted strings
        if (matches) {
          filename = matches[2] || matches[3];
        }
      }

      return filename;
    }

    run(url, method = 'GET', body = null, outtype = 'json') {
        return new Promise((resolve, reject) => {
            window.dispatchEvent(new CustomEvent('start-fetch'))
            const params = {
                method,
                headers: {
                    'Accept': outMimeTypeMap[outtype],
                    'Authorization': this.#authHeader
                }
            }
            if (body != null) {
                if(body && typeof body === 'object') {
                    try {
                        body = JSON.stringify(body)
                    } catch(e) {
                        return reject(e)
                    }
                }
                if (body) {
                    params.body = body
                }
            }
            fetch(url, params)
            .then(response => {
                if(!response.ok) { return reject(new Error('Erreur réseau')) }
                if(!response.headers) { return reject(new Error('Erreur réseau')) }
                if (response.headers.get('content-type') === 'application/json') {
                    response.json().then(result => {
                        if (!result.data) {
                            window.dispatchEvent(new CustomEvent('stop-fetch'))
                            return resolve(result) 
                        }
                        if (result.length == 0 || !result.data) { 
                            window.dispatchEvent(new CustomEvent('stop-fetch'))
                            return resolve([])
                        }
                        if (!Array.isArray(result.data)) { 
                            window.dispatchEvent(new CustomEvent('stop-fetch'))
                            return resolve([result.data]) 
                        }
                        window.dispatchEvent(new CustomEvent('stop-fetch'))
                        return resolve(result.data)
                    })
                } else if (response.headers.get('content-type') === 'plain/text') {
                    response.text().then(text => {
                        window.dispatchEvent(new CustomEvent('stop-fetch'))
                        return resolve(text)
                    })
                } else {
                    response.blob().then(blob => {
                        const theBlob = new File([blob],
                            this.getFilenameFromHeader(response.headers.get('content-disposition')) ?? '', 
                                                 {
                                                    type: response.headers.get('content-type')
                                                 }
                        )
                        window.dispatchEvent(new CustomEvent('stop-fetch'))
                        return resolve(theBlob)
                    })
                }
            })
            .catch(cause => {
                window.dispatchEvent(new CustomEvent('stop-fetch'))
                return reject('Erreur réseau', {cause}) 
            })
        })
    }

    post(url, body, outtype = 'json') {
        return this.run(url, 'POST', body, outtype)
    }

    get(url, outtype = 'json') {
        return this.run(url, 'GET', null, outtype)
    }

    delete(url, outtype = 'json') {
        return this.run(url, 'DELETE', null, outtype)
    }

    put(url, body, outtype = 'json') {
        return this.run(url, 'PUT', body, outtype)
    }
}
