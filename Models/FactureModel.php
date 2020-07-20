<?PHP
   class FactureModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'facture', 'facture_id', $config);
         $this->conf('auto-increment', true);
         $this->conf('force-type', ['amount' => 'str']);
         $this->set_req('get', 'SELECT *, (SELECT COUNT("paiement_id") FROM "paiement" WHERE "paiement_facture" = "facture_id") AS "facture_paiement", (SELECT COUNT("repartition_id") FROM "repartition" WHERE "repartition_facture" = "facture_id") AS "facture_repartition", CASE WHEN (SELECT SUM("paiement_amount") FROM "paiement" WHERE "paiement_facture" = "facture_id") = "facture_amount" THEN 1 ELSE 0 END AS "facture_paid" FROM "\\Table"');
      }
   
      function getYears ($options) {
        $result = new \artnum\JStore\Result();
        $req = 'SELECT SUBSTR("facture_date", 1, 4) AS "facture_year" FROM "facture" GROUP BY SUBSTR("facture_date", 1, 4)';
        try {
            $st = $this->get_db()->prepare($req);
            if ($st->execute()) {
                while (($row = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
                    $result->addItem($this->unprefix($row));
                }
            }
        } catch(\Exception $e) {
            $result->addError($e->getMessage(), $e);
        }

        return $result;
      }
    }
?>
