<?PHP
require('../../../vendor/autoload.php');
include('artnum/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');
require('../../../lib/auth.php');
require('../../../lib/user.php');


include('pdf.php');
include('artnum/bvrkey.php');

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\Logo\Logo;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\ErrorCorrectionLevel;;

function genQRImage ($txt, $size = 30, $icon = 'clock') {
  $qrCode = QrCode::create($txt);
  /* at 300dpi 46mm with 7mm logo */
  $qrCode->setErrorCorrectionLevel(ErrorCorrectionLevel::High);
  $qrCode->setEncoding(new Encoding('UTF-8'));
  $qrCode->setSize($size);
  $qrCode->setMargin(3);
  $qrCode->setRoundBlockSizeMode(RoundBlockSizeMode::Margin);

  $logo = Logo::create(__DIR__ . '/../../../resources/' . $icon .  '.png');
  $logo->setResizeToWidth(sqrt(($size * $size * 4 / 100)));

  return [$qrCode, $logo];

  /*$writer = new PngWriter();
  $writer->write($qrCode, $logo, null, ['compression_level' => 0])->saveToFile($filename);*/
}

$ADD_PAGE_SEPARATION = false;

$path = explode('/', $_SERVER['PHP_SELF']);
for ($i = 0; $i < 4; $i++) {
  array_pop($path);
}
$BaseURL = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['SERVER_NAME'];
$ServerURL = $BaseURL . implode('/', $path);

/* don't let access_token leak into database */
$MyURL = $BaseURL . $_SERVER['PHP_SELF'] . '?';
foreach($_GET as $k => $v) {
  if ($k === 'access_token') { continue; }
  $parmas[] = $k . '=' . $v;
}
$MyURL .= implode('&', $parmas);

$ini_conf = load_ini_configuration();
$pdo = init_pdo($ini_conf);
$authpdo = init_pdo($ini_conf, 'authdb');
$KAuth = new KAALAuth($authpdo);
$KUser = new KUser($pdo);

if (!$KAuth->check_auth($KAuth->get_auth_token(), $BaseURL . '/' . $_SERVER['REQUEST_URI'])) {
  http_response_code(401);
  exit(0);
}
$audit_pdo = init_pdo($ini_conf, 'logdb');
$Audit = new artnum\JStore\SQLAudit($audit_pdo);

$dateFormater = new IntlDateFormatter(
  'fr_CH',  IntlDateFormatter::FULL,
  IntlDateFormatter::FULL,
  'Europe/Zurich',
  IntlDateFormatter::GREGORIAN,
  'EEEE, dd MMMM y'
);

try {
  $print_info = $dateFormater->format(new DateTime()) . ' par ' . $KUser->get($KAuth->get_current_userid())['name'];
} catch (Exception $e) {
  $print_info = $dateFormater->format(new DateTime());
}

$JClient = new artnum\JRestClient(
  $_SERVER['REQUEST_SCHEME'] .
  '://' .
  $_SERVER['SERVER_NAME'] .
  implode('/', $path));

$JClient->setAuth($ini_conf['security']['authproxy']);

$KAIROSClient = new artnum\JRestClient($ini_conf['kairos']['url'] . '/store/');
$KAIROSClient->setAuth($ini_conf['security']['authproxy']);

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
    $Audit->new_action('PRINT', 'Project', $_GET['pid'], $KAuth->get_current_userid(), $MyURL); 
    if (!($tdata = [$st->fetch()])) { die('Erreur'); }
  } else {
    $ADD_PAGE_SEPARATION = true;
    $st = $pdo->prepare('SELECT * FROM "travail" WHERE "travail_project" = :project');
    if (!$st) { die('Erreur de base de données'); }
    $st->bindParam(':project', $_GET['pid'], PDO::PARAM_INT);
    if (!$st->execute()) { die('Erreur de base de données'); }
    $Audit->new_action('PRINT', 'Project', $_GET['pid'], $KAuth->get_current_userid(), $MyURL); 
    if (!($tdata = $st->fetchAll())) { 
      $tdata = [
        [
          'travail_id' => NULL,
          'travail_reference' => '',
          'travail_meeting' => '',
          'travail_contact' => '',
          'travail_phone' => '',
          'travail_progress' => '',
          'travail_status' => ''
        ]
      ]; 
    }
  }
  foreach ($tdata as &$travail) {
    if ($travail['travail_id'] == NULL) { 
      $createAction = $Audit->get_item_action('CREATE', 'Project', $pdata['project_id']);
      if ($createAction) { $createAction['_user'] = $KUser->get($createAction['userid']); }
      $travail['_create'] = $createAction;
      continue;
    }
    $createAction = $Audit->get_item_action('CREATE', 'Travail', $travail['travail_id']);
    if ($createAction) { $createAction['_user'] = $KUser->get($createAction['userid']); }
    $travail['_create'] = $createAction;
    $Audit->new_action('PRINT', 'Travail', $travail['travail_id'], $KAuth->get_current_userid(), $MyURL);

  }

  $Filename= sprintf('%s.pdf', $pdata['project_reference']);
  class FPDF extends HorairePDF {}

  $PDF = new FPDF([
    'doctype' => substr($pdata['project_reference'], 0, 1),
    'name' => $pdata['project_name']
  ]);

  if (isset($ini_conf['address'])) {
    $PDF->setAddress($ini_conf['address']);
  }

  $PDF->addTaggedFont('h', 'helvetica', '', '');
  $PDF->addTaggedFont('b', 'helvetica', 'B', '');
  $PDF->SetAutoPageBreak(false);
  $PDF->SetMargins(15,30, 10);
  $PDF->addTab('middle');
  $PDF->addTab(130);
  $PDF->addTab(60);
  $PDF->addTab('right');

  $BLK_COUNT = 0;
  foreach($tdata as $t) {
    $data = array_merge($pdata, $t);
    $client = null;
    if (!empty($data['project_client'])) {
      $uri = explode('/', $data['project_client']);
      if (count($uri) === 2) {
        $result = $JClient->get($uri[1], $uri[0]);
        if (is_array($result) && $result['length'] === 1) {
          $client = $result['data'][0];
        }
      }
    }

    $data['create_travail_info'] = '';
    if ($t['_create']) {
      $time = new DateTime();
      $time->setTimestamp($t['_create']['time']);
      $data['create_travail_info'] = $dateFormater->format($time);
      if ($t['_create']['_user']) {
        $data['create_travail_info'] .= ' par ' . $t['_create']['_user']['name'];
      }
    }

    $data['print_travail_info'] = $print_info;
  
    $process = null;
    $colorType = '#FFFFFF';
    if ($data['travail_status']) {
      $status = $KAIROSClient->get($data['travail_status'], 'Status');
      if ($status && $status['length'] === 1) {
        $process = $status['data'][0]['name'];
        $colorType = $status['data'][0]['color'];
      } 
    }

    $begin = null;
    $end = null;
    if (isset($_GET['travail'])) {
      $reservations = $KAIROSClient->post(['affaire' => $_GET['travail'], 'deleted' => '--'], 'Reservation/_query');
      if ($reservations) {
        foreach ($reservations['data'] as $r) {
          if (!$r) { continue; }
          if (!isset($r['begin']) || !isset($r['end'])) { continue; }
          if ($r['status'] === $data['travail_status']) {
            if ($begin === null || $end === null) {
              $begin = new DateTime($r['begin']);
              $end = new DateTime($r['end']);
              continue;
            }
            if ($begin->getTimestamp() > (new DateTime($r['begin']))->getTimestamp()) {
              $begin = new DateTime($r['begin']);
            }
            if ($end->getTimestamp() < (new DateTime($r['end']))->getTimestamp()) {
              $end = new DateTime($r['end']);
            }
          }
        }
      }
    }

    if (isset($data['travail_id'])) {
      $data['bon_number'] = $data['project_reference'] . '.' . $data['travail_id'];
      $barcode_value = $ServerURL . '/#travail/' . sprintf('%u', $data['travail_id']);
    } else {
      $data['bon_number'] = $data['project_reference'];
      $barcode_value = $ServerURL . '/#project/' . sprintf('%u', $data['project_id']);
    }

    /* start pdf page */
    $PDF->set('color-type', $colorType);
    $PDF->set('work-type', $process);
    $PDF->AddPage('P', 'a4');
    $PDF->SetFont('helvetica', '', 12);
  
    $PDF->block('head' . $BLK_COUNT);
    $PDF->SetFontSize(3.2);
    if (!empty($data['travail_group'])) { $PDF->printTaggedLn(['%h', 'Sous-projet : ', '%b', $data['travail_group']]); $PDF->br(); }
    $PDF->SetFont('helvetica', '', 7);
    /*
    $bcGen = new barcode_generator();
    $img = $bcGen->render_image('qr', $barcode_value, ['w' => 140]);
    imagepng($img, sys_get_temp_dir() . '/' . base64_encode($barcode_value) . '.png');
    */

    $y = $PDF->GetY();
    $x = $PDF->GetX();
    $PDF->SetXY(174.5, 6); 
    $PDF->printLn('Noter les heures', ['break' => false]);
    $PDF->SetXY($x, $y);

    $y = $PDF->GetY();
    $PDF->SetY($y + 8);
    $PDF->squaredFrame(47, array('line-type' => 'dotted', 'square' => 9.3, 'lined' => true));
    $PDF->SetY($y);
    
    $i = 0;
    foreach([
        'bon_number' => 'N° de bon',
        'travail_reference' => 'Référence',
        'create_travail_info' => 'Création',
        'print_travail_info' => 'Impression',
        'travail_phone' => 'Téléphone',
        'travail_contact' => 'Personne de contact'] as $item => $label
    ) {
      $PDF->tab(1);
      $PDF->SetFont('helvetica', '', 8);
      $PDF->printLn((string) $label);
      $PDF->tab(1);
      $PDF->SetFont('helvetica', 'B', 10);
      if (!isset($data[$item])) { $data[$item] = null; }
      if ($data[$item] === 'null') { $data[$item] = null; }
      $PDF->printLn($data[$item] ? $data[$item] : ' ', ['max-width' => $i > 2 ? 85 : 65]);
      $i++;
    }
    $PDF->reset();
    $PDF->SetY($y);

    foreach(['1' => 'Client',
                  '2' => 'Téléphone',
                  '3' => 'Adresse'] as $item => $label) {
      if ($client === null) { continue ; }
      $PDF->SetFont('helvetica', '', 8);
      $PDF->printLn($label);
      $PDF->SetFont('helvetica', 'B', 10);
      switch ($item) {
        case 1:
          $PDF->printLn($client['displayname'], ['max-width' => 85]);
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
          $PDF->printLn($phone, ['max-width' => 85]);
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

          while (count($address) < 3) {
            $address[] = '';
          }

          $first = true;
          foreach($address as $line) {
            if (!$first) {
              $PDF->SetFont('helvetica', '', 8);
              $PDF->printLn('');
            }
            $PDF->SetFont('helvetica', 'B', 10);
            $PDF->printLn($line, ['max-width' => 85]);
            $first = false;
          }
          break;
      }
    }

    if ($data['project_manager'] !== null && !empty($data['project_manager'])) {
      $PDF->SetFont('helvetica', '', 8);
      $PDF->printLn('Chef de projet');
      try {
        $manager = $KUser->get($data['project_manager']);
        $PDF->SetFont('helvetica', 'B', 10);
        $PDF->printLn($manager['name'], ['max-width' => 85]);
      } catch (Exception $e) {
        $PDF->SetFont('helvetica', 'B', 10);
        $PDF->printLn('');
      }
    }
    
    if ($begin === null) {
      if (empty($data['travail_begin']) || is_null($data['travail_begin'])) {
        $begin = new DateTime();
      } else {
        $begin = new DateTime($data['travail_begin']);
      }
    }

    if ($end === null) {
      if (empty($data['travail_end']) || is_null($data['travail_end'])) {
        $end =  $begin;
      } else {
        $end = new DateTime($data['travail_end']);
      }
    }

    $PDF->block('description' . $BLK_COUNT);
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Description du travail', ['break' => false]);
    $PDF->SetFont('helvetica', '', 10);
    $PDF->tab(3);
    $PDF->printLn('Début : ', ['break' => false]);
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn(trim($dateFormater->format($begin)), ['break' => false]);

    $PDF->tab(4);
    $PDF->printTaggedLn(['Fin : ', '%h',  trim($dateFormater->format($end)), '%b'], ['align' => 'right']);
    
    $QRCodeYRelative = $PDF->GetY();

    $PDF->hr();
    $PDF->SetFont('helvetica', '', 10);
    if (!empty($data['travail_description'])) {
      $y = $PDF->GetY();
      $lines = preg_split('/\r?\n|\r/', $data['travail_description']);
      $printParams = ['multiline' => true];
      if (!empty($travail['travail_urlgps'])) {
        $printParams['max-width'] = 150;
      }
      foreach ($lines as $line) {
        $PDF->printLn($line, $printParams);
        if (isset($printParams['max-width']) && $PDF->GetY() - $y > 36) {
          if ($PDF->GetY() - $y < 34) {
            $PDF->SetFont('helvetica', '', 4);
            $PDF->printLn('');
            $PDF->SetFont('helvetica', '', 10);

          }
          unset($printParams['max-width']);
        }
      }
    }
    $PDF->br();
    if (!empty($travail['travail_urlgps'])) {
      while ($PDF->GetY() < 120) {
        $PDF->br();
      }
    }
    $PDF->close_block();


    $hasGPS = false;
    if (!empty($travail['travail_urlgps'])) {
      $y = $PDF->GetY();
      $QRPosition = $QRCodeYRelative + 2.8;
      try {
        [$qr, $logo] = genQRImage($travail['travail_urlgps'], 24, 'gps');
        (new PdfWriter())->write($qr, $logo, null, [
          PdfWriter::WRITER_OPTION_PDF => $PDF, 
          PdfWriter::WRITER_OPTION_X => 169, 
          PdfWriter::WRITER_OPTION_Y => $QRPosition,
          PdfWriter::WRITER_OPTION_UNIT => 'mm']);
        $PDF->Image(__DIR__ . '/../../../resources/tap.png', 197, $QRPosition + 27, 6, 6, 'PNG');
        $PDF->Link(170, $QRPosition + 1, 28, 28, $travail['travail_urlgps']);
        $PDF->SetFont('helvetica', '', 7);
        $PDF->SetXY(173, $QRPosition - 2);
        $PDF->printLn('Localisation GPS', ['break' => false]);
        $hasGPS = true;
        $PDF->SetY($y + 4);
      } catch(Exception $e) {
        error_log('QRCode generation failed : ' . $e->getMessage());
      }
    }
    $PDF->block('worktime' . $BLK_COUNT);

    $bHeight = $hasGPS ? 15 : 20;
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Main d\'œuvre et matière');
    $PDF->br();
    $y = $PDF->GetY();
    $PDF->SetFont('helvetica', '', 10);
    $furtherX = 0;
    $PDF->Line($PDF->lMargin, ceil($y - $PDF->FontSize), ceil($PDF->w - $PDF->rMargin), ceil($y - $PDF->FontSize));

    $PDF->block('main-head' . $BLK_COUNT);
    $PDF->background_block($colorType);
    $PDF->setColor($PDF->getBWFromColor($colorType));
    foreach(['Date' => 30, 'Employé' => 90, 'Tarif' => 15, 'Heure' => 15, 'Total' => 0] as $label => $w) {
      $sX = $PDF->GetX();
      $PDF->printTaggedLn(['%h', $label], ['break' => false]);
      $PDF->SetX($PDF->GetX() +  ($w - ($PDF->GetX() - $sX)));
      if ($w > 0) {
        if ($PDF->GetX() > $furtherX) { $furtherX = $PDF->GetX(); }
        $PDF->Line($PDF->GetX(), $y - 1, $PDF->GetX(), $y + $bHeight + 10.2);
      }
    }
    $PDF->br();
    $PDF->close_block();
    $PDF->br();
    $PDF->Line($PDF->lMargin, $y + $PDF->FontSize, ceil($PDF->w - $PDF->rMargin), $y + $PDF->FontSize);
    $PDF->SetXY($PDF->lMargin, $PDF->GetY());
    $PDF->squaredFrame($bHeight, ['square' => 5, 'lined' => true, 'line-type'=>'dotted']);
    $PDF->SetY($PDF->GetY() + $bHeight + 2);
    $str = 'Total : ';
    $PDF->SetX(floor($furtherX - $PDF->GetStringWidth($str)));
    $PDF->printLn($str);
    $PDF->Line($PDF->lMargin, $PDF->GetY(), ceil($PDF->w - $PDF->rMargin), $PDF->GetY());
    
    $PDF->block('others' . $BLK_COUNT);
    $PDF->br();
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Journal d\'activité');
    $PDF->br();
    $bHeight = $hasGPS ? 35 : 50;
    $y = $PDF->GetY();
    $PDF->SetFont('helvetica', '', 10);
    $furtherX = 0;
    $PDF->Line($PDF->lMargin, $y - $PDF->FontSize, ceil($PDF->w - $PDF->rMargin), $y - $PDF->FontSize);
    $PDF->block('matos-head' . $BLK_COUNT);
    $PDF->background_block($colorType);
    $PDF->setColor($PDF->getBWFromColor($colorType));
    foreach(['Date' => 30, 'Employé' => 30, 'Descriptif' => 0] as $label => $w) {
      $sX = $PDF->GetX();
      $PDF->printTaggedLn(['%h', $label], ['break' => false]);
      $PDF->SetX($PDF->GetX() +  ($w - ($PDF->GetX() - $sX)));
      if ($w > 0) {
        if ($PDF->GetX() > $furtherX) { $furtherX = $PDF->GetX(); }
        $PDF->Line($PDF->GetX(), $y - 1, $PDF->GetX(), $y + $bHeight + 10.2);
      }
    }
    $PDF->br();
    $PDF->close_block();
    $PDF->br();
    $PDF->setColor('black');
    $PDF->Line($PDF->lMargin, $y + $PDF->FontSize, ceil($PDF->w - $PDF->rMargin), $y + $PDF->FontSize);
    $PDF->SetXY($PDF->lMargin, $PDF->GetY());
    $PDF->squaredFrame($bHeight, ['square' => 5, 'lined' => true, 'line-type'=>'dotted']);
    $PDF->SetY($PDF->GetY() + $bHeight + 2);
    $END_OF_TEXT_POSITION = $PDF->GetY();
    try {

      [$qr, $logo] = genQRImage($barcode_value);
      (new PdfWriter())->write($qr, $logo, null, [
        PdfWriter::WRITER_OPTION_PDF => $PDF, 
        PdfWriter::WRITER_OPTION_X => 167, 
        PdfWriter::WRITER_OPTION_Y => 8,
        PdfWriter::WRITER_OPTION_UNIT => 'mm']);
      $PDF->Link(167, 8, 35, 35, $travail['travail_urlgps']);
    } catch(Exception $e) {
      error_log('QRCode generation failed : ' . $e->getMessage());
    }
    
    $page_added = false;
    $up_to = $END_OF_TEXT_POSITION + 30;
    if ($END_OF_TEXT_POSITION > 230) {
      $up_to = 20;
      $PDF->Image(__DIR__ . '/../../../resources/rotate-page.png', 196, 286, 6, 6, 'PNG');
      $page_added = true;
      $PDF->AddPage();
    }

    $PDF->SetY($END_OF_TEXT_POSITION);

    $PDF->block('remarks' . $BLK_COUNT);
    $PDF->br();
    $PDF->SetFont('helvetica', 'B', 10);
    $PDF->printLn('Observations/remarques');
    $bHeight = 15;
    $PDF->br();
    $PDF->squaredFrame($bHeight, ['up-to' => $up_to, 'square' => 5, 'lined' => true, 'line-type'=>'dotted']);
    $PDF->block('sign' . $BLK_COUNT);
    $PDF->SetFont('helvetica', '', 10);
    $PDF->br();
    $PDF->printLn('Date :', ['break' => false]);
    $PDF->drawLine(ceil($PDF->GetX()  + 3), ceil($PDF->GetY() + 3), floor($PDF->getTab(1) - $PDF->GetX() -5), 0, 'dotted');
    $PDF->tab(1);
    $PDF->printLn('Signature du donneur d\'ordre :', ['break' => false]);
    $PDF->drawLine(ceil($PDF->GetX()  + 3), ceil($PDF->GetY() + 3), floor($PDF->w - $PDF->rMargin - $PDF->GetX() - 3), 0, 'dotted');
    $PDF->br(); $PDF->br();
    $PDF->printLn('Nom et prénom du signataire si différent du haut :', ['break' => false]);
    $PDF->drawLine(ceil($PDF->GetX()  + 3), ceil($PDF->GetY() + 3), floor($PDF->w - $PDF->rMargin - $PDF->GetX() - 3), 0, 'dotted');
    $PDF->close_block();

    if ($ADD_PAGE_SEPARATION && !$page_added) {
      $PDF->AddBlankPage();
    }
    $BLK_COUNT++;
  }
  $PDF->Output($Filename, 'I');
}
