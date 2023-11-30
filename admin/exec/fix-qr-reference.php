<?php

require('../../vendor/autoload.php');
require('../../lib/ini.php');
require('../../lib/dbs.php');
require('../../lib/urldn.php');
require('../../lib/auth.php');
$ini_conf = load_ini_configuration();
$db = init_pdo($ini_conf);
if (is_null($db)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}

$stmt = $db->prepare('SELECT * FROM facture WHERE facture_qrdata <> \'\'');
$stmt->execute();

while(($facture = $stmt->fetch())) {
    $output = preg_split("/\r\n|\n/", $facture['facture_qrdata']);
    if ($output === false) { continue; }
    /* remove trailing spaces */
    $output = array_map('trim', $output);

    $iban = $output[BizCuit\SwissQR\QRCH\CdtrInf\IBAN];
    if (substr($iban, 4, 1) !== '3') {
        continue;
    }

    $qrref = $output[BizCuit\SwissQR\QRCH\RmtInf\Ref];
    if (empty($qrref)) { continue; }
    if (strval($qrref) === strval($facture['facture_reference'])) {
        continue;
    }
    echo "Facture " . $facture['facture_id'] . " : " . $facture['facture_reference'] . " => " . $qrref . "\n";
    $db->prepare('UPDATE facture SET facture_reference = :ref WHERE facture_id = :id')->execute(['ref' => $qrref, 'id' => $facture['facture_id']]);
}