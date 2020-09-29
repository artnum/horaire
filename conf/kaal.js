window.KAAL = {
    domId: function () {
        if (KAAL.domIdCount === undefined) {
            KAAL.domIdCount = 0
        }
        return `kaal-auto-${++KAAL.domIdCount}`
    },
    work: {
        day: 504.0, // minutes
        min: 15.0, // minimal job time, minutes
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
    fetch: window.fetch.bind(window), // fonction pour les requêtes
    fetchOpts: {}, // parametre pour fetch
}