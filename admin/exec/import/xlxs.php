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

$F = [];
$jclient = new \artnum\JRestClient('http://rigserve/horaire/', 'Contact');

function cmpFacture($f1, $f2) {
    if ($f1['payable']->format('Y-m-d') !== $f2['payable']->format('Y-m-d')) { return false; }
    if ($f1['date']->format('Y-m-d') !== $f2['date']->format('Y-m-d')) { return false; }
    if ($f1['montant'] !== $f2['montant']) { return false; }
    if ($f1['chantier'] !== $f2['chantier']) { return false; }
    return true;
}

function intoFacture ($year, $MSSheet, $line, $sheet = 'c') {
    $sheetId = $sheet . $line;
    $activeSheet = null;
    $dt = null; $nfacture = null; $nchantier = null; $fournisseur = null; $due = null; $amount = null; $rep = null; $state = null;

    if ($sheet !== 'c') {
        $MSSheet->setActiveSheetIndexByName('Débiteur');
        $activeSheet = $MSSheet->getActiveSheet();

        $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($activeSheet->getCellByColumnAndRow(7, $line)->getValue());
        $nfacture = strtolower(trim($activeSheet->getCellByColumnAndRow(1, $line)->getValue()));
        $nchantier = trim($activeSheet->getCellByColumnAndRow(2, $line)->getValue());
        $fournisseur = trim($activeSheet->getCellByColumnAndRow(3, $line)->getValue());
        $due = 30;
        $amount = trim($activeSheet->getCellByColumnAndRow(5, $line)->getValue());
        $rep = null;
        $state = strtolower(trim($activeSheet->getCellByColumnAndRow(9, $line)->getValue())) !== 'ouvert';
        
        $dp = new DateTime($dt->format(DateTimeInterface::ISO8601));
        $dp->add(new DateInterval('P' . $due . 'D'));
    } else {
        $MSSheet->setActiveSheetIndexByName('Créancier');
        $activeSheet = $MSSheet->getActiveSheet();

        $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($activeSheet->getCellByColumnAndRow(1, $line)->getValue());
        $nfacture = strtolower(trim($activeSheet->getCellByColumnAndRow(2, $line)->getValue()));
        $nchantier = trim($activeSheet->getCellByColumnAndRow(3, $line)->getValue());
        $fournisseur = trim($activeSheet->getCellByColumnAndRow(4, $line)->getValue());
        $due = $activeSheet->getCellByColumnAndRow(5, $line)->getValue();
        if (!$due)  {
            $due = 30;
        }
        $amount = trim($activeSheet->getCellByColumnAndRow(6, $line)->getValue());
        $rep = trim($activeSheet->getCellByColumnAndRow(7, $line)->getValue());
        $state = strtolower(trim($activeSheet->getCellByColumnAndRow(11, $line)->getValue())) !== 'ouvert';
        
        $dp = new DateTime($dt->format(DateTimeInterface::ISO8601));
        $dp->add(new DateInterval('P' . $due . 'D'));
        if ($activeSheet->getCellByColumnAndRow(9, $line)->getDataType() === \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC) {
            $dp = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($activeSheet->getCellByColumnAndRow(9, $line)->getValue());
        }
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
        'montant' => abs(empty($amount) ? floatval($rep) : floatval($amount)),
        '_isRepartition' => (empty($amount) ? true : false),
        'etat' => $state,
        'creancier' => $sheet === 'c' ? true : false,
        'annee' => intval($year),
	'comment' => '',
	'_id' => $sheetId
    ];

    $jclient = new \artnum\JRestClient('http://rigserve/horaire/', 'Contact');
    if (!empty($facture['chantier']) && !NO_QUERY) {
        $res = $jclient->search(['search.reference' => $facture['chantier'], 'search.deleted' => '-'], 'Project');
        if ($res['length'] === 1) {
            $facture['dbchantier'] = $res['data'][0]['id'];
        
        } else {
            fprintf(STDERR, "CHANTIER INCONNU (C/$year/" . $activeSheet->getCellByColumnAndRow(1, $line)->getCoordinate() . "):$nchantier" . PHP_EOL);
        }
    }

    if (!NO_QUERY) {
        if (!isset($F[$fournisseur])) {
            fprintf(STDERR, "<%s>\n", $fournisseur);
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

    return $facture;
}

class Invoices {
    private $invoices;
    private $repartitions;

    function __construct() {
        $this->invoices = [];
        $this->repartitions = [];
    }

    function hasInvoice ($id) {
        return !empty($this->invoices[$id]);
    }

    function addInvoice ($invoice) {
        if (!empty($this->invoices[$invoice['reference']])) {
            /* two differente state of the same invoice, so it is a paid one if it is not a repartition */
            if (cmpFacture($this->invoices[$invoice['reference']], $invoice)) {
                if ($this->invoices[$invoice['reference']]['etat'] !== $invoice['etat']) {
                    $invoice['etat'] = true;
                } else if ($this->invoices[$invoice['reference']]['payable']->format('Y-m-d') !== $invoice['payable']->format('Y-m-d')) {
                    $this->invoices[$invoice['reference']]['paiement'][] = $invoice;
                }
            }
            if ($invoice['_isRepartition']) {
                $this->invoices[$invoice['reference']]['repartition'][] = $invoice;
            }
        } else {
            if ($invoice['_isRepartition']) {
                $this->repartitions[$invoice['_id']] = $invoice;
            } else {
                $this->invoices[$invoice['reference']] = $invoice;
            }
        }
    }

    function mergeRepartition () {
        foreach ($this->repartitions as $invoice) {
	    if ($this->hasInvoice($invoice['reference'])) {
      		$this->invoices[$invoice['reference']]['repartition'][$invoice['_id']] = $invoice;
            } else {
                $this->invoices[$invoice['reference']] = $invoice;
            }
        }
    }

    /* biggest amount is the bill in itself, others are payment */
    function orderPaiement () {
        foreach ($this->invoices as $reference => $facture) {
            if (!empty($this->invoices[$reference]['paiement'])) {
               $biggest = $facture;
               foreach ($facture['paiement'] as $paiement) {
                    if ($biggest['montant'] < $paiement['montant']) {
                        $biggest = $paiement;
                    }
               }

               $repartition = $facture['repartition'];
               $paiement = $facture['paiement'];
               $facture['paiement'] = [];
               $facture['repartition'] = [];
               $paiement[] = $facture;
               $biggest['repartition'] = $repartition;
               $biggest['paiement'] = $paiement;

               $this->invoices[$reference] = $biggest;
            }
        }
    }

    function finalize() {
        $this->mergeRepartition();
        $this->orderPaiement();
    }

    function first () {
        reset($this->invoices);
        $this->finalize();
        $k = key($this->invoices);
        if ($k) {
            return $this->invoices[$k];
        }
        return null;
    }

    function next () {
        next($this->invoices);
        $k = key($this->invoices);
        if ($k) {
            return $this->invoices[$k];
        }
        return null;
    }

}

$invoices = new Invoices();

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
                $facture = intoFacture($year, $sheet, $i, 'c');
                $invoices->addInvoice($facture);
            break;
        }
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
            $facture = intoFacture($year, $sheet, $i, 'd');
            $invoices->addInvoice($facture);
            break;
        }
    }
}

$count = 0;
$dbaddress = 0;

$ctotal = 0;
$dtotal = 0;
fprintf(STDERR, PHP_EOL . "Résultat" . PHP_EOL . '--------' . PHP_EOL . PHP_EOL);
for ($invoice = $invoices->first(); $invoice !== null; $invoice = $invoices->next()) {
    $total = 0;
    $count++;
    if (!empty($invoice['dbaddress'])) {
        $dbaddress++;
    }
    foreach ($invoice['paiement'] as $p) {
        $total += $p['montant'];
    }
    if ($invoice['montant'] < $total) {
        echo 'Erreur de paiement pour ' . $invoice['adresse'] . PHP_EOL;
    }

    if ($invoice['creancier']) {
        $ctotal += $invoice['montant'];
        fprintf(STDERR,  "CREANCE($count): N°$invoice[reference], CHF $invoice[montant] du " . $invoice['date']->format('d.m.Y') . " de " . (!empty($invoice['dbaddress']) ? $F[$invoice['adresse']]['displayname'] . ' (C)' : $invoice['adresse']) . PHP_EOL);
    } else {
        $dtotal += $invoice['montant'];
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

echo 'BEGIN TRANSACTION;' . "\n";
echo 'DELETE FROM repartition;' . "\n";
echo 'DELETE FROM facture;' . "\n";
echo 'DELETE FROM factureLien;' . "\n";

$id = 1;
for ($facture = $invoices->first(); $facture!== null; $facture = $invoices->next()) {
    /* indate is the date of invoice for importation */
    echo "INSERT INTO facture (facture_id, facture_reference, facture_indate, facture_date, facture_duedate, facture_amount, facture_type, facture_person, facture_comment) VALUES (" . 
        $id . ', "' . $facture['reference'] . '", "' . $facture['date']->format(DATE_ATOM) . '", "' . $facture['date']->format(DATE_ATOM) . '", "' . $facture['payable']->format(DATE_ATOM) . '", ' . 
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
        if (!empty($r['dbchantier'])) {
            echo "\tINSERT INTO repartition (repartition_facture, repartition_project, repartition_value) VALUES (" . 
                $id . ', ' . $r['dbchantier'] . ', ' . $r['montant'] .');' . PHP_EOL;
        }
    }


    $id++; 
    fprintf(STDERR, PHP_EOL);
}

echo 'COMMIT;' . "\n";

fprintf(STDERR, '--------' . PHP_EOL . PHP_EOL);
fprintf(STDERR, "Total débiteur $dtotal" . PHP_EOL);
fprintf(STDERR, "Total créancier $ctotal" . PHP_EOL);
fprintf(STDERR, "$count facture dont $dbaddress avec fournisseur trouvé en base de donnée." .PHP_EOL);
//print_r($invoices);
?>
