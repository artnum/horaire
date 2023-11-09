<?php
class FactureModel extends artnum\SQL {
  function __construct($db, $config) {
    $this->kconfig = $config;
    parent::__construct($db, 'facture', 'facture_id', []);
    $this->conf('auto-increment', true);
    $this->conf('force-type', ['amount' => 'str']);
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

    $object = $bxbill->new();
    $object->supplier_id = $bill['qraddress_extid'];
    $object->contact_partner_id = 1;
    $object->bill_date = $bill['facture_date'];
    $object->due_date = $bill['facture_duedate'];
    $object->amount_man = $bill['facture_amount'];
    $object->manual_amount = true;
    $object->currency_code = $bill['facture_currency'];
    $object->item_net = true;
    $object->attachment_ids = [$file];
    $object->address = new stdClass();
    $object->address->lastname_company = $bill['qraddress_name'];
    $object->address->type = 'COMPANY';
    $lines = new stdClass();
    $lines->position = 1;
    $lines->amount = $bill['facture_amount'];
    $object->line_items = [$lines];
    $object->discounts = [];
    $ret = $bxbill->set($object);
    if (!$ret) {
      throw new Exception('Erreur bexio');
    }

    $this->response->start_output();
    $this->response->echo($ret->toJson());
    return ['count' => 1];
  }
}