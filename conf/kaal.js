window.KAAL = {
    search: {
        liveLimit: '20' // les recherches lors de la saisie sont limitées en nombre de résultat
    },
    fetch: window.fetch.bind(window), // fonction pour les requêtes
    fetchOpts: {}, // parametre pour fetch
}