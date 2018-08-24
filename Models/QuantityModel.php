<?PHP
   class QuantityModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'quantity', 'quantity_id', $config);
         $this->conf('auto-increment', true);
         $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "projects" ON "quantity_project" = "projects"."projects_id" LEFT JOIN "items" ON "quantity_item" = "items"."items_id" WHERE "\\IDName" = :id');
      }
   }
?>
