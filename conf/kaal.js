window.KAAL = {
    base: '/horaire/',
    domId: function () {
        if (KAAL.domIdCount === undefined) {
            KAAL.domIdCount = 0
        }
        return `kaal-auto-${++KAAL.domIdCount}`
    },
    work: {
        day: 504.0, // minutes
        min: 30.0, // minimal job time, minutes
        getDay: function (unit = 's') {
            switch (unit) {
                default: case 's': case 'S': return KAAL.work.day * 60
                case 'm': case 'M': return KAAL.work.day
                case 'h': case 'H': return KAAL.work.day / 60
            }
        },
        getMin: function (unit = 's') {
            switch(unit) {
                default: case 's': case 'S': return KAAL.work.min * 60
                case 'm': case 'M': return KAAL.work.min
                case 'h': case 'H': return KAAL.work.min / 60
            }
        }
    },
    search: {
        liveLimit: '20' // les recherches lors de la saisie sont limitées en nombre de résultat
    },
    getBase: () => {
        return `${window.location.origin}/${KAAL.base}`
    },
    fetch: (url, options = {}) => {
        if (options.headers === undefined) {
            options.headers = new Headers({'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})
        } else {
            if (!options.headers.has('X-Request-Id')) {
                options.headers.append('X-Request-Id', `${new Date().getTime()}-${performance.now()}`)
            }
        }
        return fetch(url, options)
    }
}