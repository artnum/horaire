<?php

return [
    'groups' => [
        'user-rights' => [
            'name' => 'Droits sur les utilisateurs'
        ]
    ],
    'roles' => [
        'user' => [
            'name' => 'Créer et modifier',
            'group' => 'user-rights'
        ],
        'time' => [
            'name' => 'Ajout de temps'
        ],
        'project' => [
            'name' => 'Gestion de projets'
        ],
        'offer' => [
            'name' => 'Gestion des offres'
        ],
        'time-admin' => [
            'name' => 'Gestion des heures',
            'infer' => ['time'] /* if this one is set, so 'time' is set */
        ],
        'user-invite' => [
            'name' => 'Inviter',
            'help' => 'User.userInvite',
            'infer' => ['user'],
            'group' => 'user-rights'
        ],
        'user-access' => [
            'name' => 'Modifier les droits',
            'infer' => ['user', 'user-invite'],
            'group' => 'user-rights'
        ],
        'user-children' => [
            'name' => 'Gérer les enfants',
            'group' => 'user-rights'
        ],
        'user-address' => [
            'name' => 'Gérer les adresses',
            'group' => 'user-rights'
        ],
        'user-civil-status' => [
            'name' => 'Modifier l\'état civil',
            'group' => 'user-rights'
        ],
        'db-admin' => [
            'name' => 'Admin database',
            'help' => 'DBAdmin.isDBAdmin'
        ]
    ],
    'rpc' => [
        'Access' => [
            'setLegacyAccessLevel'  => ['user-access'],
            'deleteUserRoles' => ['user-access'],
            'setUserRoles' => ['user-access']
        ],
        'User' => [
            'getSelf' => [],
            'get' => ['user', 'time'],
            'set' => ['user'],
            'list' => ['user'],
            'reorder' => ['user'],
            'listPrice' => ['user'],
            'deletePrice' => ['user'],
            'setPrice' => ['user'],
            'setPersonnalData' => ['user'],
            'getPersonnalData' => ['user'],
            'setActiveState' => ['user'],
            'getInvitations' => ['user-invite'],
            'deleteInvitation' => ['user-invite'],
            'newInvitation' => ['user-invite'],
            'setPersonnalAddresses' => ['user-address'],
            'deletePersonnalAddresses' => ['user-address'],
            'getPersonnalAddresses' => ['user-address'],
            'setPricing' => ['user'],
            'setCivilStatuses' => ['user-civil-status'],
            'listCivilStatuses' => ['user-civil-status'],
            'setChildren' => ['user-children'],
            'listChildren' => ['user-children'],
            'listPhones' => ['user'],
            'setPhones' => ['user'],
            'listEmergencyPhones' => []
        ],
        'Project' => [
            'getOwn' => ['time'],
            'listOwn' => ['time'],
            'get' => ['user', 'offer', 'project'],
            'list' => ['user', 'offer', 'project'],
            'listDeleted' => ['project']
        ],
        'AccountingCondition' => [
            'lookup' => ['offer'],
            'create' => ['offer'],
            'get' => ['offer']
        ],
        'AccountingDoc' => [
            'tree' => ['offer'],
            'listFromDocument' => ['offer'],
            'createVariant' => ['offer'],
            'search' => ['offer'],
            'getOffers' => ['offer'],
            'getRawDocument' => ['offer'],
            'nextStep' => ['offer'],
            'get' => ['offer'],
            'getCurrent' => ['offer'],
            'listByType' => ['offer'],
            'listByProject' => ['offer'],
            'list' => ['offer'],
            'getProbableNextReference' => ['offer'],
            'create' => ['offer'],
            'update' => ['offer'],
            'delete' => ['offer'],
            'msword' => ['offer'],
            'pdf' => ['offer']
        ],
        'UserGroup' => [
            'get' => ['user'],
            'forUser' => ['user'],
            'list' => ['user'],
            'addUser' => ['user'],
            'set' => ['user']
        ],
        'Time' => [
            'getMyWritableDays' => [],
            'getMyMonth' => [],
            'setMyTime' => [],
            'getMonth' => ['time-admin'],
            'setTime' => ['time-admin']
        ]
    ]
];
