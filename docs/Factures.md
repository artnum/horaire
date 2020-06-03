Factures
========

Partie permettant de répartir la valeur d'une facture sur les projets. Aide mémoire sur le traitement des valeurs.

Date et payable
---------------

Les champs date et payable peuvent recevoir une date. 

Une date est exprimée sous la forme #Jour.#Mois.#Année. Le séparateur peut être un point (.), un slash (/), un tiret (-) ou encore un ou plusieurs espaces. L'année n'est pas nécessaire, dans ce cas c'est l'année en cours qui sera utilisée.

Le mois peut être nommé soit en français, allemand, italien ou anglais. Dans les langues accentuées, la version équivalente sans accent est supportée. Il n'est pas nécessaire d'inscrire le nom en entier. Un nom pouvant être identifié sans ambiguité à un mois dans une langue reconnue sera utilisé.

Payable
-------

Le champs payable peut aussi recevoir une durée. Si une date a été spécifiée, elle se base sur cette valeur sinon sur la date du jour.
Pour entrer une durée, le programme s'attend à avoir une valeur "#Nombre #Lettre". La présence ou non d'espace entre le nombre et la lettre est libre (0 jusqu'à une infinité). Les lettre connues sont :

| Lettre  | Origine   | Langue | Signification |
|---------|-----------|--------|---------------|
| a       | année     | fr     | Année         | 
| y       | year      | en     |               |
| ja      | jahre     | de     |               |
|         | anno      | it     |               |
|         |           |        |               |
| m       | mois      | fr     | Mois          |
|         | month     | en     |               |
|         | monat     | de     |               |
|         | mese      | it     |               |
|         |           |        |               |
| s       | semaine   | fr     | Semaine (7 j) |
| w       | week      | en     |               |
|         | woche     | de     |               |
|         | settimana | it     |               |
|         |           |        |               |
| j       | jour      | fr     | Jour          |
| d       | day       | en     |               |
| t       | tag       | de     |               |
| g       | giorno    | it     |               |

La lettre peut être suivie de n'importe quoi. De fait les mots complets sont reconnus correctement.

Un nombre seul est considéré comme une durée en jour.

Une durée en mois dépendra du mois d'origine. 1 mois après le 1 février donnera le 1 mars peut importe le nombre de jour entre ces deux dates. 4 mois après le 1 février donnera le 1 juin et ainsi de suite.

Répartition du montant
----------------------

La réparition du montant peut se décomposer en un nombre infini de valeur exprimée soit de manière absolue soit relativement.

Les valeurs relatives sont toujours calculées sur le montant restant après déduction des valeurs absolues. Si vous inscrivez 10 CHF, 10 CHF, 50 % pour un montant de 100 CHF les 50 % porteront sur (100 CHF - 10 CHF - 10 CHF) donc sur 80 CHF. La valeur sera donc de 40 CHF et il reste 40 CHF à répartir.

Le séparateur décimal des nombres flottant peut être soit français ",", soit anglais ".".

La compréhension de la valeur se déroule comme suit :

Un nombre entier (10, 20, 30, ...) sans autre indication est compris comme une valeur relative en pourcent. Si la valeur est plus grande que 100, elle est comprise comme une valeur absolue.

Un nombre à virgule (10.10, 20.20, 30.30, ...) sans autre indication est compris comme une valeur absolue.

Un nombre suivi d'un pourcent est compris comme une valeur relative en pourcent.

Le caractère § indique que la valeur restante après déduction de toutes les valeurs absolues et relatives. Si ce symbole est utilisé plusieurs fois, la valeur restante est répartie entre toutes les occurences. La dernière occurence est utilisée pour compenser les divers arrondis, il est donc possible d'avoir une valeur différente en dernière ligne.

Une valeur absolue entière peut être exprimée avec la syntax #Nombre.- : 10.-, 20.-, 30.-.

Une valeur absolue peut être suivie d'un symbole monétaire. Les symboles monétaires connus sont :

| Symbole   | Monnaie        |
|           |                |
| fr        | Franc suisse   |
| fr.       |                |
| frs       |                |
| chf       |                |
| ch        |                |
| sfr.      |                |
| sfr       |                |
|           |                |
| $         | US Dollar      |
| usd       |                |
| us        |                |
|           |                |
| £         | Livre sterling |
| gbp       |                |
| gb        |                |
|           |                |
| €         | Euro           | 
| eur       |                |
| eu        |                |
|           |                |
| ¥         | Yen            |
| jp¥       |                |
| jpy       |                |
| jp        |                |
