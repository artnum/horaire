<?PHP
include('artnum/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');


include('pdf.php');
include('artnum/bvrkey.php');
include('../../../lib/barcode/barcode.php');

$path = explode('/', $_SERVER['PHP_SELF']);
for ($i = 0; $i < 4; $i++) {
  array_pop($path);
}

$ServerURL = $_SERVER['REQUEST_SCHEME'] .
'://' .
$_SERVER['SERVER_NAME'] .
implode('/', $path);

$JClient = new artnum\JRestClient(
  $_SERVER['REQUEST_SCHEME'] .
  '://' .
  $_SERVER['SERVER_NAME'] .
  implode('/', $path));


$ini_conf = load_ini_configuration();
$pdo = init_pdo($ini_conf);

$KAIROSClient = new artnum\JRestClient($ini_conf['kairos']['url'] . '/store/');

if (isset($_GET['pid']) && is_numeric($_GET['pid'])) {
  $st = $pdo->prepare('SELECT * FROM "project" WHERE "project_id" = :id');
  if (!$st) {
    die('Erreur');
  }
  $st->bindParam(':id', $_GET['pid'], PDO::PARAM_INT);
  if (!$st->execute()) {
    die('Erreur');
  }
  if(!($pdata = $st->fetch())) {
    die('Erreur');
  }

  if (isset($_GET['travail']) && is_numeric($_GET['travail'])) {
    $st = $pdo->prepare('SELECT * FROM "travail" WHERE "travail_id" = :id AND "travail_project" = :project');
    if (!$st) { die('Erreur'); }
    $st->bindParam(':id', $_GET['travail'], PDO::PARAM_INT);
    $st->bindParam(':project', $_GET['pid'], PDO::PARAM_INT);
    if (!$st->execute()) { die('Erreur'); }
    if (!($tdata = array($st->fetch()))) { die('Erreur'); }
  } else {
    $st = $pdo->prepare('SELECT * FROM "travail" WHERE "travail_project" = :project');
    if (!$st) { die('Erreur de base de données'); }
    $st->bindParam(':project', $_GET['pid'], PDO::PARAM_INT);
    if (!$st->execute()) { die('Erreur de base de données'); }
    if (!($tdata = $st->fetchAll())) { $tdata = array(array('travail_reference' => '', 'travail_meeting' => '', 'travail_contact' => '', 'travail_phone' => '', 'travail_progress' => '', 'travail_status' => '')); }
  }

  $Filename= sprintf('%s.pdf', $pdata['project_reference']);
  $PDF = new HorairePDF(array(
    'doctype' => substr($pdata['project_reference'], 0, 1),
    'name' => $pdata['project_name']
  ));
  $PDF->SetAutoPageBreak(false);
  $PDF->SetMargins(15,30, 10);
  $PDF->addTab('middle');
  $PDF->addTab(130);
  foreach($tdata as $t) {
    $data = array_merge($pdata, $t);
    $PDF->AddPage('P', 'a4');
    $PDF->SetFont('helvetica', '', 12);   
    $PDF->block('head');

    $client = null;
    if (!empty($data['project_client'])) {
      $uri = explode('/', $data['project_client']);
      if (count($uri) === 2) {
        $result = $JClient->get($uri[1], $uri[0]);
        if ($result['length'] === 1) {
          $client = $result['data'][0];
        }
      }
    }
  
    $process = null;
    if ($data['travail_status']) {
      $status = $KAIROSClient->get($data['travail_status'], 'Status');
      if ($status['length'] === 1) {
        $process = $status['data'][0]['name'];
      } 
    }
  
    $DATE;
    if (isset($data['travail_id'])) {
      $date = new DateTime();
      $date->setTimestamp(intval($data['travail_created']));
      $DATE = $date->format('d.m.Y');
      $data['bon_number'] = $data['project_reference'] . '.' . $data['travail_id'];
      $barcode_value = $ServerURL . '/#travail/' . sprintf('%u', $data['travail_id']);
    } else {
      $date = new DateTime();
      $date->setTimestamp(intval($data['project_created']));
      $DATE =  $date->format('d.m.Y');
      $data['bon_number'] = $data['project_reference'];
      $barcode_value = $ServerURL . '/#project/' . sprintf('%u', $data['project_id']);
    }
    $PDF->SetFont('helvetica', '', 7);
    
    $bcGen = new barcode_generator();
    $img = $bcGen->render_image('qr', $barcode_value, ['w' => 120]);
    imagepng($img, sys_get_temp_dir() . '/' . base64_encode($barcode_value) . '.png');
    $PDF->Image(sys_get_temp_dir() . '/' . base64_encode($barcode_value) . '.png', 170, 2, 0, 0, 'PNG');
    
    $y = $PDF->GetY();
    $x = $PDF->GetX();
    $PDF->SetXY(184, 5); 
    $PDF->printLn($DATE, ['break' => false]);
    $PDF->SetXY($x, $y);

    $y = $PDF->GetY();
    $PDF->SetY($y + 8);
    $PDF->squaredFrame(37, array('line-type' => 'dotted', 'square' => 9, 'lined' => true));
    $PDF->SetY($y);

    foreach(array('bon_number' => 'N° de bon',
                  'travail_reference' => 'Référence',
                  'travail_meeting' => 'Rendez-vous',
                  'travail_contact' => 'Personne de contact',
                  'travail_phone' => 'Téléphone') as $item => $label) {
      $PDF->tab(1);
      $PDF->SetFont('helvetica', '', 8);
      $PDF->printLn($label);
      $PDF->tab(1);
      $PDF->SetFont('helvetica', 'B', 10);
      if (!isset($data[$item])) { $data[$item] = null; }
      if ($data[$item] === 'null') { $data[$item] = null; }
      $PDF->printLn($data[$item] ? $data[$item] : ' ');
    }
    $PDF->reset();
    foreach(array('1' => 'Client',
                  '2' => 'Téléphone',
                  '3' => 'Adresse') as $item => $label) {
      if ($client === null) { continue ; }
      $PDF->SetFont('helvetica', '', 8);
      $PDF->printLn($label);
      $PDF->SetFont('helvetica', 'B', 10);
      switch ($item) {
        case 1:
          $PDF->printLn($client['displayname']);
          break;
        case 2:
          $phone = '';
          if (!empty($client['mobile'])) {
            $phone = $client['mobile'];
          } else if (!empty($client['telephonenumber'])) {
            $phone = $client['telephonenumber'];
          }
          if ($phone !== '' && is_array($phone)) {
            $phone = $phone[0];
          }
          $PDF->printLn($phone);
          break;
        case 3:
          $address = [];
          if (!empty($client['postaladdress'])) {
            $p = preg_split('/(\r\n|\n|\r)/', $client['postaladdress']);
            if (count($p) > 2) {
              while (count($p) > 2) {
                array_shift($p);
              }
            }
            if (count($p) === 2) {
              $address[] = $p[0];
              $address[] = $p[1];
            } else {
              $address[] = $p[0];
            }
          }
          if (!empty($client['locality'])) {
            if (is_array($client['locality'])) {
              $address[] = $client['locality'][0];
            } else {
              $address[] = $client['locality'];
            }
          }

          if (count($address) === 2 && $client['type'] === 'person' && !empty($client['o'])) {
            if (is_array($client['o'])) {
              array_unshift($address, $client['o'][0]);
            } else {
              array_unshift($address, $client['o']);
            }
          }

          foreach($address as $line) {
            $PDF->SetFont('helvetica', 'B', 10);
            $PDF->printLn($line);
            $PDF->SetFont('helvetica', '', 8);
            $PDF->printLn('');
          }
          break;
      }
    }

    
    $PDF->block('description');
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Description du travail');
    $PDF->hr();
    $PDF->SetFont('helvetica', '', 10);
    if (!empty($data['travail_description'])) {
      $lines = preg_split('/\r?\n|\r/', $data['travail_description']);
      foreach ($lines as $line) {
        $PDF->printLn($line, ['multiline' => true]);
      }
    }

    if ($process) {
      $PDF->printLn('Processus : ', ['break' => false]);
      $PDF->SetFont('helvetica', 'B', 10);
      $PDF->printLn($process);
    }

    $PDF->br();
    $PDF->block('worktime');
    $bHeight = 25;
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Main d\'œuvre');
    $PDF->br();
    $y = $PDF->GetY();
    $PDF->SetFont('helvetica', '', 10);
    $furtherX = 0;
    $PDF->Line($PDF->lMargin, ceil($y - $PDF->FontSize), ceil($PDF->w - $PDF->rMargin), ceil($y - $PDF->FontSize));
    foreach(array('Date' => 30, 'Employé' => 90, 'Tarif' => 15, 'Heure' => 15, 'Total' => 0) as $label => $w) {
      $PDF->Cell($w, 0, $label, 0, 0, 'C');
      if ($w > 0) {
        if ($PDF->GetX() > $furtherX) { $furtherX = $PDF->GetX(); }
        $PDF->Line($PDF->GetX(), $y - $PDF->FontSize, $PDF->GetX(), ceil($y + $bHeight + 10));
      }
    }
    $PDF->Line($PDF->lMargin, $y + $PDF->FontSize, ceil($PDF->w - $PDF->rMargin), $y + $PDF->FontSize);
    $PDF->SetXY($PDF->lMargin, ceil($y + $PDF->FontSize + 6));
    $PDF->squaredFrame($bHeight, array('square' => 5, 'lined' => true, 'line-type'=>'dotted'));
    $PDF->SetY($PDF->GetY() + $bHeight + 2);
    $str = 'Total main d\'œuvre : ';
    $PDF->SetX(floor($furtherX - $PDF->GetStringWidth($str)));
    $PDF->printLn($str);
    $PDF->Line($PDF->lMargin, $PDF->GetY(), ceil($PDF->w - $PDF->rMargin), $PDF->GetY());
    
    $PDF->block('others');
    $PDF->br();
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Matériel utilisé et autres charge');
    $PDF->br();
    $bHeight = 35;
    $y = $PDF->GetY();
    $PDF->SetFont('helvetica', '', 10);
    $furtherX = 0;
    $PDF->Line($PDF->lMargin, $y - $PDF->FontSize, ceil($PDF->w - $PDF->rMargin), $y - $PDF->FontSize);
    foreach(array('Matériaux' => 100, 'Qté' => 15, "Unité\n(km/h/pc)" => 15, 'Prix unité' => 15, 'Total' => 0) as $label => $w) {
      $PDF->SetFont('helvetica', '', 10);
      $sublabel = '';
      if (strpos($label, "\n") !== FALSE) {
        $label = explode("\n", $label);
        $sublabel = $label[1];
        $label = $label[0];
        $PDF->SetFont('helvetica', '', 8);
      }
      $pX = $PDF->GetX();
      $PDF->Cell($w, 0, $label, 0, 0, 'C');
      if ($sublabel !== '') {
        /*$oX = $PDF->GetX();
           $PDF->SetFont('helvetica', '', 8);
           $PDF->SetX($pX);
           $oY = $PDF->GetY();
           $PDF->SetY($oY + 4);
           $PDF->Cell($w, 0, $sublabel, 0, 0, 'C');
           $PDF->SetXY($oX, $oY);*/
      }
      if ($w > 0) {
        if ($PDF->GetX() > $furtherX) { $furtherX = $PDF->GetX(); }
        $PDF->Line($PDF->GetX(), $y - $PDF->FontSize, $PDF->GetX(), ceil($y + $bHeight + 10));
      }
    }
    $PDF->Line($PDF->lMargin, $y + $PDF->FontSize, ceil($PDF->w - $PDF->rMargin), $y + $PDF->FontSize);
    $PDF->SetXY($PDF->lMargin, ceil($y + $PDF->FontSize + 6));
    $PDF->squaredFrame($bHeight, array('square' => 5, 'lined' => true, 'line-type'=>'dotted'));
    $PDF->SetY($PDF->GetY() + $bHeight + 2);
    $str = 'Total matériel et autres charges : ';
    $PDF->SetX(floor($furtherX - $PDF->GetStringWidth($str)));
    $PDF->printLn($str);
    $PDF->Line($PDF->lMargin, $PDF->GetY(), ceil($PDF->w - $PDF->rMargin), $PDF->GetY());
    $PDF->SetY($PDF->GetY() + 2);
    $PDF->SetFont('helvetica', 'B', 12);
    $PDF->printLn('Total');
    $PDF->Line($PDF->lMargin, $PDF->GetY(), ceil($PDF->w - $PDF->rMargin), $PDF->GetY());    

    $PDF->block('remarks');
    $PDF->br();
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Observations/remarques');
    $bHeight = 15;
    $PDF->br();
    $PDF->squaredFrame($bHeight, array('up-to' => 262, 'square' => 5, 'lined' => true, 'line-type'=>'dotted'));  

    $PDF->block('sign');
    $PDF->SetFont('helvetica', '', 10);
    $PDF->br();
    $PDF->printLn('Date :', array('break' => false));
    $PDF->drawLine(ceil($PDF->GetX()  + 3), ceil($PDF->GetY() + 3), floor($PDF->getTab(1) - $PDF->GetX() -5), 0, 'dotted');
    $PDF->tab(1);
    $PDF->printLn('Signature du donneur d\'ordre :', array('break' => false));
    $PDF->drawLine(ceil($PDF->GetX()  + 3), ceil($PDF->GetY() + 3), floor($PDF->w - $PDF->rMargin - $PDF->GetX() - 3), 0, 'dotted');
    $PDF->br(); $PDF->br();
    $PDF->printLn('Nom et prénom du signataire si différent du haut :', array('break' => false));
    $PDF->drawLine(ceil($PDF->GetX()  + 3), ceil($PDF->GetY() + 3), floor($PDF->w - $PDF->rMargin - $PDF->GetX() - 3), 0, 'dotted');
    $PDF->close_block();

  }
  $PDF->Output($Filename, 'I');
}

?>
