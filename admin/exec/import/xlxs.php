<?PHP
require 'artnum/autoload.php';
require 'vendor/autoload.php';

/* à 1 pour tester sans faire de requête vers la base de données */
define ('NO_QUERY', false);

$content = file('source.list');
foreach ($content as $line) {
    $fields = explode(' ', $line, 2);
    if (is_numeric($fields[0]) && is_readable((substr($fields[1], 0, -1)))) {
        $files[$fields[0]] = substr($fields[1], 0, -1);
    }
}

if (count($files) === 0) {
    exit(0);
}

$reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
$reader->setReadDataOnly(true);

$invoices = [];
$F = [];
$jclient = new \artnum\JRestClient('http://rigserve/horaire/', 'Contact');

function cmpFacture($f1, $f2) {
    if ($f1['payable']->format('Y-m-d') !== $f2['payable']->format('Y-m-d')) { return false; }
    if ($f1['date']->format('Y-m-d') !== $f2['date']->format('Y-m-d')) { return false; }
    if ($f1['montant'] !== $f2['montant']) { return false; }
    if ($f1['chantier'] !== $f2['chantier']) { return false; }
    return true;
}

foreach ($files as $year => $file) {
    $sheet = $reader->load($file);
    /* *** Créancier *** */
    $sheet->setActiveSheetIndexByName('Créancier');
    $cre = $sheet->getActiveSheet();

    $i = 3;
    while ($cre->getCellByColumnAndRow(1, $i)->getValue() !== 'Date') {
        $i++;
    }

    for (; $i < $cre->getHighestRow(); $i++) {
        switch($cre->getCellByColumnAndRow(1, $i)->getDataType()) {
            case \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NULL:
            break 2;
            case \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC:
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($cre->getCellByColumnAndRow(1, $i)->getValue());
                $nfacture = trim($cre->getCellByColumnAndRow(2, $i)->getValue());
                $nchantier = trim($cre->getCellByColumnAndRow(3, $i)->getValue());
                $fournisseur = trim($cre->getCellByColumnAndRow(4, $i)->getValue());
                $due = $cre->getCellByColumnAndRow(5, $i)->getValue();
                if (!$due)  {
                    $due = 30;
                }
                $amount = trim($cre->getCellByColumnAndRow(6, $i)->getValue());
                $rep = trim($cre->getCellByColumnAndRow(7, $i)->getValue());
                $state = strtolower(trim($cre->getCellByColumnAndRow(11, $i)->getValue())) !== 'ouvert';
                
                $dp = new DateTime($dt->format(DateTimeInterface::ISO8601));
                $dp->add(new DateInterval('P' . $due . 'D'));
                if ($cre->getCellByColumnAndRow(9, $i)->getDataType() === \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC) {
                    $dp = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($cre->getCellByColumnAndRow(9, $i)->getValue());
                }

                if (empty($nfacture)) {
                    $nfacture = sha1(strtolower($fournisseur.$amount.$dt->format('Y-m-d')));
                }
                
                $facture = [
                    'repartition' => [],
                    'paiement' => [],
                    'reference' => $nfacture,
                    'chantier' => $nchantier,
                    'dbchantier' => '',
                    'adresse' => $fournisseur,
                    'dbaddress' => '',
                    'payable' => $dp,
                    'date' => $dt,
                    'montant' => abs(($amount === NULL || empty($amount)) ? floatval($rep) : floatval($amount)),
                    'etat' => $state,
                    'creancier' => true,
                    'annee' => intval($year),
                    'comment' => ''
                ];
                if ($nchantier && !NO_QUERY) {
                    $res = $jclient->search(['search.reference' => $nchantier, 'search.deleted' => '-'], 'Project');
                    if ($res['length'] === 1) {
                        $facture['dbchantier'] = $res['data'][0]['id'];
                    } else {
                        fprintf(STDERR, "CHANTIER INCONNU (C/$year/" . $cre->getCellByColumnAndRow(1, $i)->getCoordinate() . "):$nchantier" . PHP_EOL);
                    }
                }

                if (!isset($invoices[$nfacture])) {
                    if (!NO_QUERY) {
                        if (!isset($F[$fournisseur])) {
                            fprintf(STDERR, "<%s>\n", $fournisseur);
                            $_f = explode(' ', $fournisseur);
                            $search = ['search.name' => ['*' . $fournisseur . '*', '~' . $fournisseur], 'search._or' => '1'];
                            if (strchr($fournisseur, ' ')) {
                                $rf = implode(' ', array_reverse(explode(' ', $fournisseur)));
                                $search['search.name'][] = '*' . $rf . '*';
                                $search['search.name'][] = '~' . $rf;
                            }
                            $res = $jclient->search($search, 'Contact');
                            if ($res['length'] === 1) {
                                $F[$fournisseur] = $res['data'][0];
                                fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                            } else {
                                $sub = substr($fournisseur, 0, 3);            
                                $search['search.name'] = '*' . $sub . '*';
                                $res = $jclient->search($search, 'Contact');
                                if ($res['length'] > 1) {
                                    $filtered = [];
                                    foreach ($res['data'] as $entry) {
                                        if (stristr($entry['displayname'], $fournisseur)) {
                                            $filtered[] = $entry;
                                        }
                                    }
                                    
                                    if (count($filtered) === 1) {
                                        $F[$fournisseur] = $filtered[0];
                                        fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                        $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                                    } else {
                                        $match = [];
                                        foreach ($res['data'] as $entry) {
                                            $perc = 0;
                                            similar_text($entry['displayname'], $fournisseur, $perc);
                                            fprintf(STDERR, "#### %s, %s => %d\n", $fournisseur, $entry['displayname'], $perc);
                                            if ($perc > 75) {
                                                $match[] = [$perc, $entry];
                                            }
                                        }
                                        $highest = 0;
                                        $E = [];
                                        if (count($match) > 0) {
                                            foreach ($match as $m) {
                                                if($m[0] > $highest) {
                                                    $E = $m[1];
                                                    $highest = $m[0];
                                                } else if ($m[0] === $highest) {
                                                    if(count(array_keys($E)) < count(array_keys($m[1]))) {
                                                        $E = $m[1];
                                                    }
                                                }
                                            }
                                        
                                            $F[$fournisseur] = $E;
                                            fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                            $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                                        }
                                    }
                                } else if ($res['length'] === 1) {
                                    if (stristr($res['data'][0]['displayname'], $fournisseur)) {
                                        $F[$fournisseur] = $res['data'][0];
                                        fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                        $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                                    }
                                }
                            }
                        } else {
                            $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                        }
                    }
                    $invoices[$nfacture] = $facture;
                } else {
                    if (isset($invoices[$nfacture]) && !empty($rep)) {
                        if (empty($facture['dbchantier'])) {
                            if (!empty($facture['comment'])) { $facture['comment'] .= ', '; }
                            $facture['comment'] .= $facture['chantier'];
                        } else {    
                            $invoices[$nfacture]['repartition'][] = [
                                'chantier' => $facture['chantier'],
                                'dbchantier' => $facture['dbchantier'],
                                'montant' => $facture['montant']
                            ];
                        }
                    } else {
                        /* si la facture apparaît deux fois avec un état différent cela indique qu'une
                         * des apparitions est pour signaler le paiement de la facture */
                        if (cmpFacture($invoices[$nfacture], $facture)) {
                            if ($invoices[$nfacture]['etat'] != $facture['etat']) {
                                fprintf(STDERR, 'Changement d\'état ' .$fournisseur . PHP_EOL);
                                $invoices[$nfacture]['etat'] = true;
                            }
                        } else {
                            if ($invoices[$nfacture]['payable']->format('Y-m-d') !== $facture['payable']->format('Y-m-d')) {
                                fprintf(STDERR,  'Paiement multiple ' . $fournisseur . PHP_EOL);
                                $invoices[$nfacture]['paiement'][] = [
                                    'montant' => $facture['montant'],
                                    'date' => $facture['date']
                                ];
                            } else {
                                /* Cas de figure où la répartition a été indiquée sous le montant */
                                if ($facture['date']->format('Y-m-d') === $invoices[$nfacture]['date']->format('Y-m-d') &&
                                    $facture['chantier'] !== $invoices[$nfacture]['chantier']) {
                                        if (empty($facture['dbchantier'])) {
                                            if (!empty($facture['comment'])) { $facture['comment'] .= ', '; }
                                            $facture['comment'] .= $facture['chantier'];
                                        } else {    
                                            $invoices[$nfacture]['repartition'][] = [
                                                'chantier' => $facture['chantier'],
                                                'dbchantier' => $facture['dbchantier'],
                                                'montant' => $facture['montant']
                                            ];
                                        }
                                } else {
                                    if ($facture['annee'] !== $invoices[$nfacture]['annee']) {
                                        if ($facture['annee'] > $invoices[$nfacture]['annee']) {
                                            $facture['repartition'] = $invoices[$nfacture]['repartition'];
                                            $facture['paiement'] = $invoices[$nfacture]['paiement'];
                                            $invoices[$nfacture] = $facture;
                                        }
                                    } else {
                                        fprintf(STDERR, "PROBLEME (C/$year/" . $cre->getCellByColumnAndRow(1, $i)->getCoordinate() . "): Date(" . $dp->format('Y-m-d') . "), N° Facture($facture[reference]), Chantier($facture[chantier]), " .
                                        "Montant($facture[montant]), Fournisseur($facture[adresse]), Ouverte(" . ($facture['etat'] ? 'non' : 'oui') . "), Payable(". $dt->format('Y-m-d') . ")" . PHP_EOL);
                                    }
                                }
                            //    print_r($invoices[$nfacture]);
                              //  print_r($facture);
                            }
                        }
                    }
                }
                //echo "$fp : $state $nfacture, $nchantier, $fournisseur, $amount, ". $dt->format('Y-m-d') . PHP_EOL;
            break;
        }
        //\PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($cre->getCellByColumnAndRow(1, $i)->getValue());
        //echo '"' . $cre->getCellByColumnAndRow(1, $i)->getValue() . '"' . "\n";
    }
    /* *** Débiteur *** */
    $sheet->setActiveSheetIndexByName('Débiteur');
    $deb = $sheet->getActiveSheet();

    $i = 0;
    while (strtolower(trim($deb->getCellByColumnAndRow(1, $i)->getValue())) !== 'no de facture') {
        $i++;
    }
    $i++;
    for (; $i < $deb->getHighestRow(); $i++) {
        switch($deb->getCellByColumnAndRow(1, $i)->getDataType()) {
            case \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NULL:
            break 2;
            default:
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($deb->getCellByColumnAndRow(7, $i)->getValue());
                $nfacture = trim($deb->getCellByColumnAndRow(1, $i)->getValue());
                $nchantier = trim($deb->getCellByColumnAndRow(2, $i)->getValue());
                $fournisseur = trim($deb->getCellByColumnAndRow(3, $i)->getValue());
                $due = 30;
                $amount = trim($deb->getCellByColumnAndRow(5, $i)->getValue());
                $rep = null;
                $state = strtolower(trim($deb->getCellByColumnAndRow(9, $i)->getValue())) !== 'ouvert';
                
                $dp = new DateTime($dt->format(DateTimeInterface::ISO8601));
                $dp->add(new DateInterval('P' . $due . 'D'));
                
                $facture = [
                    'repartition' => [],
                    'paiement' => [],
                    'reference' => $nfacture,
                    'chantier' => $nchantier,
                    'dbchantier' => '',
                    'adresse' => $fournisseur,
                    'dbaddress' => '',
                    'payable' => $dp,
                    'date' => $dt,
                    'montant' => abs($amount === NULL ? floatval($rep) : floatval($amount)),
                    'etat' => $state,
                    'creancier' => false,
                    'annee' => intval($year),
                    'comment' => ''
                ];

                if ($nchantier && !NO_QUERY) {
                    $res = $jclient->search(['search.reference' => $nchantier, 'search.deleted' => '-'], 'Project');
                    if ($res['length'] === 1) {
                        $facture['dbchantier'] = $res['data'][0]['id'];
                    
                    } else {
                        fprintf(STDERR, "CHANTIER INCONNU (C/$year/" . $cre->getCellByColumnAndRow(1, $i)->getCoordinate() . "):$nchantier" . PHP_EOL);
                    }
                }

                if (!isset($invoices[$nfacture])) {
                    if (!NO_QUERY) {
                        if (!isset($F[$fournisseur])) {
                            fprintf(STDERR, "<%s>\n", $fournisseur);
                            $_f = explode(' ', $fournisseur);
                            $search = ['search.name' => ['*' . $fournisseur . '*', '~' . $fournisseur], 'search._or' => '1'];
                            if (strchr($fournisseur, ' ')) {
                                $rf = implode(' ', array_reverse(explode(' ', $fournisseur)));
                                $search['search.name'][] = '*' . $rf . '*';
                                $search['search.name'][] = '~' . $rf;
                            }
                            $res = $jclient->search($search, 'Contact');
                            if ($res['length'] === 1) {
                                $F[$fournisseur] = $res['data'][0];
                                fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                            } else {
                                $sub = substr($fournisseur, 0, 3);            
                                $search['search.name'] = '*' . $sub . '*';
                                $res = $jclient->search($search, 'Contact');
                                if ($res['length'] > 1) {
                                    $filtered = [];
                                    foreach ($res['data'] as $entry) {
                                        if (stristr($entry['displayname'], $fournisseur)) {
                                            $filtered[] = $entry;
                                        }
                                    }
                                    
                                    if (count($filtered) === 1) {
                                        $F[$fournisseur] = $filtered[0];
                                        fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                        $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                                    } else {
                                        $match = [];
                                        foreach ($res['data'] as $entry) {
                                            $perc = 0;
                                            similar_text($entry['displayname'], $fournisseur, $perc);
                                            fprintf(STDERR, "#### %s, %s => %d\n", $fournisseur, $entry['displayname'], $perc);
                                            if ($perc > 75) {
                                                $match[] = [$perc, $entry];
                                            }
                                        }
                                        $highest = 0;
                                        $E = [];
                                        if (count($match) > 0) {
                                            foreach ($match as $m) {
                                                if($m[0] > $highest) {
                                                    $E = $m[1];
                                                    $highest = $m[0];
                                                } else if ($m[0] === $highest) {
                                                    if(count(array_keys($E)) < count(array_keys($m[1]))) {
                                                        $E = $m[1];
                                                    }
                                                }
                                            }
                                        
                                            $F[$fournisseur] = $E;
                                            fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                            $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                                        }
                                    }
                                } else if ($res['length'] === 1) {
                                    if (stristr($res['data'][0]['displayname'], $fournisseur)) {
                                        $F[$fournisseur] = $res['data'][0];
                                        fprintf(STDERR, 'Trouvé ' . $F[$fournisseur]['displayname'] . ' pour ' . $fournisseur . PHP_EOL);
                                        $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                                    }
                                }
                            }
                        } else {
                            $facture['dbaddress'] = 'Contact/' . $F[$fournisseur]['IDent'];
                        }
                    }
                    $invoices[$nfacture] = $facture;
                } else {
                    if (isset($invoices[$nfacture]) && !empty($rep)) {
                        $invoices[$nfacture]['repartition'][] = [
                            'chantier' => $facture['chantier'],
                            'dbchantier' => $facture['dbchantier'],
                            'montant' => $facture['montant']
                        ];
                    } else {
                        /* si la facture apparaît deux fois avec un état différent cela indique qu'une
                            * des apparitions est pour signaler le paiement de la facture */
                        if (cmpFacture($invoices[$nfacture], $facture)) {
                            if ($invoices[$nfacture]['etat'] != $facture['etat']) {
                                fprintf(STDERR, 'Changement d\'état ' .$fournisseur . PHP_EOL);
                                $invoices[$nfacture]['etat'] = true;
                            }
                        } else {
                            if ($invoices[$nfacture]['payable']->format('Y-m-d') !== $facture['payable']->format('Y-m-d')) {
                                fprintf(STDERR, 'Paiement multiple ' . $fournisseur . PHP_EOL);
                                $invoices[$nfacture]['paiement'][] = [
                                    'montant' => $facture['montant'],
                                    'date' => $facture['date']
                                ];
                            } else {
                                /* Cas de figure où la répartition a été indiquée sous le montant */
                                if ($facture['date']->format('Y-m-d') === $invoices[$nfacture]['date']->format('Y-m-d') &&
                                    $facture['chantier'] !== $invoices[$nfacture]['chantier']) {
                                        $invoices[$nfacture]['repartition'][] = [
                                            'chantier' => $facture['chantier'],
                                            'dbchantier' => $facture['dbchantier'],
                                            'montant' => $facture['montant']
                                        ];
                                } else {
                                    /* Pour les débiteurs, prendre la dernière version trouvée : facture corrigée */
                                    if ($facture['annee'] !== $invoices[$nfacture]['annee']) {
                                        if ($facture['annee'] > $invoices[$nfacture]['annee']) {
                                            $facture['repartition'] = $invoices[$nfacture]['repartition'];
                                            $facture['paiement'] = $invoices[$nfacture]['paiement'];
                                            $invoices[$nfacture] = $facture;
                                        }
                                    } else {
                                        fprintf(STDERR, "PROBLEME (D/$year/" . $deb->getCellByColumnAndRow(1, $i)->getCoordinate() . "): Date(" . $dp->format('Y-m-d') . "), N° Facture($facture[reference]), Chantier($facture[chantier]), " .
                                        "Montant($facture[montant]), Fournisseur($facture[adresse]), Ouverte(" . ($facture['etat'] ? 'non' : 'oui') . "), Payable(". $dt->format('Y-m-d') . ")" . PHP_EOL);
                                    }
                                }
                            //    print_r($invoices[$nfacture]);
                                //  print_r($facture);
                            }
                        }
                    }
                }
                //echo "$fp : $state $nfacture, $nchantier, $fournisseur, $amount, ". $dt->format('Y-m-d') . PHP_EOL;
            break;
        }
    }
}

$count = 0;
$dbaddress = 0;

$ctotal = 0;
$dtotal = 0;
fprintf(STDERR, PHP_EOL . "Résultat" . PHP_EOL . '--------' . PHP_EOL . PHP_EOL);
foreach ($invoices as $k => $invoice) {
    $total = 0;
    $count++;
    if (!empty($invoice['dbaddress'])) {
        $dbaddress++;
    }
    foreach ($invoice['paiement'] as $p) {
        $total += $p['montant'];
    }
    if ($invoice['montant'] < $total) {
        //echo 'Correction paiement pour ' . $invoice['adresse'] . PHP_EOL;
        $invoices[$k]['paiement'][] = [
            'montant' => $invoice['montant'],
            'date' => $invoice['payable']
        ];            
        $invoices[$k]['montant'] += $total;
    }

    if ($invoice['creancier']) {
        $ctotal += $invoices[$k]['montant'];
        fprintf(STDERR,  "CREANCE($count): N°$invoice[reference], CHF $invoice[montant] du " . $invoice['date']->format('d.m.Y') . " de " . (!empty($invoice['dbaddress']) ? $F[$invoice['adresse']]['displayname'] . ' (C)' : $invoice['adresse']) . PHP_EOL);
    } else {
        $dtotal += $invoices[$k]['montant'];
        fprintf(STDERR, "DÉBITEUR($count): N°$invoice[reference], CHF $invoice[montant] du " . $invoice['date']->format('d.m.Y') . " de " . (!empty($invoice['dbaddress']) ? $F[$invoice['adresse']]['displayname'] . ' (C)' : $invoice['adresse']) . PHP_EOL);
    }
    foreach ($invoice['paiement'] as $p) {
        fprintf(STDERR, "\tPaiement de $p[montant] le " . $p['date']->format('d.m.Y') . PHP_EOL);
    }
    foreach ($invoice['repartition'] as $r) {
        fprintf(STDERR, "\tRéparti sur $r[chantier] ($r[dbchantier]) pour $r[montant]" . PHP_EOL);
    }
}

/*
$facture = [
    'repartition' => [],
    'paiement' => [],
    'reference' => $nfacture,
    'chantier' => $nchantier,
    'adresse' => $fournisseur,
    'dbaddress' => '',
    'payable' => $dp,
    'date' => $dt,
    'montant' => abs($amount === NULL ? floatval($rep) : floatval($amount)),
    'etat' => $state,
    'creancier' => false,
    'annee' => intval($year)'
]; */
$id = 1;
foreach ($invoices as $facture) {
    echo "INSERT INTO facture (facture_id, facture_reference, facture_date, facture_duedate, facture_amount, facture_debt, facture_person, facture_comment) VALUES (" . 
        $id . ', "' . $facture['reference'] . '", "' . $facture['date']->format(DATE_ATOM) . '", "' . $facture['payable']->format(DATE_ATOM) . '", ' . 
        $facture['montant'] . ', ' . ($facture['creancier'] ? '1' : '2') . ', "' . (empty($facture['dbaddress']) ? $facture['adresse'] : $facture['dbaddress'] ) . '", "' .
        $facture['comment'] .'");' . PHP_EOL;
    
    if ($facture['etat'] && count($facture['paiement']) <= 0) {
        fprintf(STDERR, "Facture totalement payée" . PHP_EOL);
        echo "\tINSERT INTO paiement (paiement_facture, paiement_date, paiement_amount) VALUES (".
            $id . ', "' . $facture['payable']->format(DATE_ATOM) . '", ' . $facture['montant'] . '); -- Totalement payée' . PHP_EOL;
    } else if (count($facture['paiement']) > 0) {
        $total = 0;
        foreach ($facture['paiement'] as $p) {
            if (is_null($p['date'])) {
                fprintf(STDERR, 'ERREUR avec paiement sans date' . PHP_EOL);
            } else {
                echo "\tINSERT INTO paiement (paiement_facture, paiement_date, paiement_amount) VALUES (".
                $id . ', "' . $p['date']->format(DATE_ATOM) . '", ' . $p['montant'] . '); -- Répartition' . PHP_EOL;
            }
            
            $total += $p['montant'];
        }
        /* si la facture est payée mais que le montant total des paiements ne correspond pas, ajoute un versement à la date de fin
         * pour rendre les versements correct
         */
        if ($facture['etat'] && $total < $facture['montant']) {
            echo "\tINSERT INTO paiement (paiement_facture, paiement_date, paiement_amount) VALUES (".
            $id . ', "' . $facture['payable']->format(DATE_ATOM) . '", ' . ($facture['montant'] - $total) . '); -- totalement payée, répartition incomplète' . PHP_EOL;  
        }
    }

    foreach ($facture['repartition'] as $r) {
        echo "\tINSERT INTO repartition (repartition_facture, repartition_project, repartition_value) VALUES (" . 
            $id . ', ' . $r['dbchantier'] . ', ' . $r['montant'] .');' . PHP_EOL;
    }


    $id++; 
    fprintf(STDERR, PHP_EOL);
}


fprintf(STDERR, '--------' . PHP_EOL . PHP_EOL);
fprintf(STDERR, "Total débiteur $dtotal" . PHP_EOL);
fprintf(STDERR, "Total créancier $ctotal" . PHP_EOL);
fprintf(STDERR, "$count facture dont $dbaddress avec fournisseur trouvé en base de donnée." .PHP_EOL);
//print_r($invoices);
?>