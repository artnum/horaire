<?PHP
   class QuantityModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'quantity', 'quantity_id', []);
         $this->conf('auto-increment', true);
         $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "project" ON "quantity_project" = "project"."project_id" LEFT JOIN "item" ON "quantity_item" = "item"."item_id"');
      }
   }
?>
