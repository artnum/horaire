<?PHP

/* An entity is something or someone made to be linked to something */
class EntityModel extends artnum\SQL
{
   function __construct($db, $config) {
      parent::__construct($db, 'atEntity', 'atEntity_id', $config);
   }
}

?>
