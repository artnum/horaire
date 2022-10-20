<?PHP
   class FactureModel extends artnum\SQL {
      function __construct($db, $config) {
        $this->kconfig = $config;
         parent::__construct($db, 'facture', 'facture_id', []);
         $this->conf('auto-increment', true);
         $this->conf('force-type', ['amount' => 'str']);
         $this->set_req('get', 'SELECT 
            *,
            (SELECT COUNT("paiement_id") FROM "paiement" WHERE "paiement_facture" = "facture_id") AS "facture_paiement",
            (SELECT COUNT("repartition_id") FROM "repartition" WHERE "repartition_facture" = "facture_id") AS "facture_repartition",
            CASE WHEN (SELECT SUM("paiement_amount") FROM "paiement" WHERE "paiement_facture" = "facture_id") >= "facture_amount" THEN 1 ELSE 0 END AS "facture_paid",
            (SELECT COUNT("factureLien_id") FROM "factureLien" WHERE "factureLien_source" = "facture_id" AND ("factureLien_type" = 2 OR "factureLien_type" = 3 OR "factureLien_type" = 4)) AS "facture_rappel"
            FROM "\\Table"');
      }
   
      function getYears ($options) {
        $result = ['count' => 0];
        $req = 'SELECT SUBSTR("facture_date", 1, 4) AS "facture_year" FROM "facture" GROUP BY SUBSTR("facture_date", 1, 4)';
        $st = $this->get_db()->prepare($req);
        if ($st->execute()) {
            $this->response->start_output();
            while (($row = $st->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
                $this->response->print($this->unprefix($row));
                $result['count']++;
            }
        }

        return $result;
      }
    }
?>
