<?PHP
class PersonModel extends artnum\SQL {
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'person', 'person_id', []);
    $this->conf('owner', 'person_id');
    $this->conf('auto-increment', true);
    $this->conf('create', 'person_created');
    $this->conf('create.ts', true);
    $this->conf('mtime', 'person_modified');
    $this->conf('mtime.ts', true);
    $this->conf('delete', 'person_deleted');
    $this->conf('delete.ts', true);
    $this->conf('private', ['key', 'keyopt']);
    $this->set_req('get', 'SELECT 
      "person"."person_created",
      "person"."person_deleted",
      "person"."person_disabled",
      "person"."person_efficiency",
      "person"."person_extid",
      "person"."person_id",
      "person"."person_level",
      "person"."person_modified",
      "person"."person_name",
      "person"."person_order",
      "person"."person_username",
      "person"."person_workday",
      COALESCE("prixheure_value", 0.0) AS "person_price" FROM "\\Table" LEFT JOIN "prixheure" ON "prixheure_id" = (SELECT "prixheure_id" FROM "prixheure" WHERE "prixheure_person" = "person_id" AND DATE("prixheure_validity") <= DATE(NOW()) ORDER BY "prixheure_validity" DESC, "prixheure_value" DESC LIMIT 1)');
  }
}
?>
