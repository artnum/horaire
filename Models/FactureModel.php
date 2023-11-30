<?php

use function BizCuit\SwissQR\creditorref_verify;
use function BizCuit\SwissQR\reference_verify;

class FactureModel extends artnum\SQL {
  function __construct($db, $config) {
    $this->kconfig = $config;
    parent::__construct($db, 'facture', 'facture_id', []);
    $this->conf('auto-increment', true);
    $this->conf('force-type', [
      'facture_amount' => 'str', 
      'facture_reference' => 'str', 
      'facture_number' => 'str',
      'facture_condition' => 'str']);
  }

  function getFileByName($args)   {
    $path = $this->kconfig->get('facture.path');
    $name = preg_replace('/[^a-zA-Z0-9_]/', '', $args['name']);
    [$p1, $p2] = [substr($name, 0, 2), substr($name, 2, 2)];

    $file = realpath($path . '/' . $p1 . '/' . $p2 . '/' . $name . '.pdf.b64');
    $this->response->start_output();
    if (!is_file($file) || !is_readable($file)) {
      return ['count' => 0];
    }
    $this->response->echo('{"mimetype":"application/pdf", "file": "');
    readfile($file);
    $this->response->echo('"}');

    return ['count' => 1];
  }
  
  function getBXUpload($args) {
    $path = $this->kconfig->get('facture.path');
    $name = preg_replace('/[^a-zA-Z0-9_]/', '', $args['name']);
    [$p1, $p2] = [substr($name, 0, 2), substr($name, 2, 2)];
    $file = realpath($path . '/' . $p1 . '/' . $p2 . '/' . $name . '.pdf');

    $bxCtx = $this->kconfig->getVar('bexioDB');

    $bxfile = new BizCuit\BexioFile($bxCtx);
    
    $content = $bxfile->upload($file);
    if (!$content) {
      throw new Exception('Erreur bexio');
    }
    $this->response->start_output();
    $this->response->echo(json_encode($content[0]));
    return ['count' => 1];
  }

  function getBXCreateBill($args) {
    $bxCtx = $this->kconfig->getVar('bexioDB');
    $file = $args['fileuuid'];
    $billId = $args['billid'];

    $stmt = $this->get_db(true)->prepare('SELECT * FROM facture 
      LEFT JOIN qraddress ON facture_qraddress = qraddress_id 
      WHERE facture_id = :id');
    $stmt->execute(['id' => $billId]);
    $bill = $stmt->fetch(PDO::FETCH_ASSOC);

    $bxbill = new BizCuit\BexioBills($bxCtx);

    if (!empty($bill['facture_extid'])) {
      $object = $bxbill->get($bill['facture_extid']);
      $object->id = $bill['facture_extid'];
    } else {
      $object = $bxbill->new();
      $lines = new stdClass();
      $lines->position = 1;
      $lines->amount = $bill['facture_amount'];
      $object->line_items = [$lines];
      $object->discounts = [];
    }

    $object->supplier_id = $bill['qraddress_extid'];
    $object->vendor_ref = empty($bill['facture_number']) ? ' ' : $bill['facture_number'];
    $object->contact_partner_id = 1;
    $object->bill_date = $bill['facture_date'];
    $object->due_date = $bill['facture_duedate'];
    $object->amount_man = $bill['facture_amount'];
    $object->manual_amount = true;
    $object->currency_code = $bill['facture_currency'];
    $object->item_net = false;
    $object->attachment_ids = [$file];
    $object->address = new stdClass();
    $object->address->lastname_company = $bill['qraddress_name'];
    $object->address->type = 'COMPANY';

    try {
      $ret = $bxbill->set($object);
    } catch (Exception $e) {
      error_log($e->getMessage());
      while($e = $e->getPrevious()) {
        error_log($e->getMessage());
      }
      throw new Exception('Erreur bexio');
    }

    $stmt = $this->get_db(false)->prepare('UPDATE facture SET facture_extid = :extid WHERE facture_id = :id');
    $stmt->execute(['extid' => $ret->id, 'id' => $billId]);

    $this->response->start_output();
    $this->response->echo($ret->toJson());
    return ['count' => 1];
  }

  function getPay($args) {
    $billId = $args['id'];
    $bankAccountId = 1;
    if (!empty($args['bank'])) {
      $bankAccountId = $args['bank'];
    }

    $stmt = $this->get_db(true)->prepare('SELECT * FROM facture 
      LEFT JOIN qraddress ON facture_qraddress = qraddress_id 
      WHERE facture_id = :id');
    $stmt->execute(['id' => $billId]);
    $bill = $stmt->fetch(PDO::FETCH_ASSOC);
    $bxaccount = new BizCuit\BexioBankAccount($this->kconfig->getVar('bexioDB'));
    $bxpay = new BizCuit\BexioOutgoingPayment($this->kconfig->getVar('bexioDB'));

    $bank = $bxaccount->get(1);

    $object = $bxpay->new();
    $object->bill_id = $bill['facture_extid'];
    $object->amount = floatval($bill['facture_amount']);
    $object->currency_code = $bill['facture_currency'];
    $object->exchange_rate = 1.0;
    $object->sender_bank_account_id = $bankAccountId;
    if (empty($bill['qraddress_iban'])) {
      $object->payment_type = 'MANUAL';
    } else {
      error_log(var_export(reference_verify($bill['facture_reference']), true));
      if ((substr($bill['qraddress_iban'], 4, 1) == '3' && reference_verify($bill['facture_reference'])) || 
          creditorref_verify($bill['facture_reference'])) {
        $object->payment_type = 'QR';
        $object->reference_no = $bill['facture_reference'];
      } else {
        $object->payment_type = 'IBAN';
        $object->fee_type = 'BREAKDOWN';
        if (substr($bill['qraddress_iban'], 0, 2) ==  substr($bank->iban_nr, 0, 2)) {
          $object->fee_type = 'NO_FEE';
        }
      }

      $object->sender_iban = $bank->iban_nr;
      $object->sender_name = $bank->sender_name;
      $object->sender_street = $bank->owner_address;
      $object->sender_house_no = ' ';
      $object->sender_city = $bank->owner_city;
      $object->sender_postcode = $bank->owner_zip;
      $object->sender_country_code = substr($bank->iban_nr, 0, 2);
      $object->sender_bc_no = $bank->bc_nr;
      $object->sender_bank_name = $bank->bank_name;
      $object->sender_bank_no = $bank->bank_nr;

      $object->receiver_iban = $bill['qraddress_iban'];
      $object->receiver_name = $bill['qraddress_name'];
      $object->receiver_street = $bill['qraddress_street'];
      $object->receiver_house_no = $bill['qraddress_number'];
      $object->receiver_city = $bill['qraddress_town'];
      $object->receiver_postcode = $bill['qraddress_postcode'];
      $object->receiver_country_code = $bill['qraddress_country'];
      foreach (['receiver_street', 'receiver_house_no', 'receiver_city', 'receiver_postcode'] as $k) {
        if (empty($object->$k)) {
          $object->$k = ' ';
        }
      }
    }

    $object->execution_date = date('Y-m-d');
    $object->is_salary_payment = false;
    try {
      $ret = $bxpay->set($object);
    } catch (Exception $e) {
      error_log($e->getMessage());
      $this->response->softError('bexio', $e->getMessage(), $e->getCode());
      while($e = $e->getPrevious()) {
        error_log($e->getMessage());
        $this->response->softError('bexio', $e->getMessage(), $e->getCode());
      }
      throw new Exception('Erreur bexio');
    }
    $this->get_db(false)->prepare('UPDATE facture SET facture_state = \'PAID\' WHERE facture_id = :id')->execute(['id' => $billId]);    

    $this->response->start_output();
    $this->response->echo($ret->toJson());
    return ['count' => 1];
  }

}