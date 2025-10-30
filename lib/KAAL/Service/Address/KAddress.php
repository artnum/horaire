<?php

namespace KAAL\Service\Address;

use KAAL\Service\Address\GenericAddress;
use Snowflake53\ID;
use stdClass;
use PDO;
use DateTime;

class KAddress extends GenericAddress
{
    use ID;
    public static function fromSdtClass(stdClass $object): KAddress
    {
        $o = new KAddress();
        $o->tenant_id = $object->tenant_id;
        if (!isset($object->id)) {
            $this->isNew();
        } else {
            $o->id = $object->id;
        }
        $o->name = $object->name;
        $o->line1 = $object->str_or_line1;
        $o->line2 = $object->num_or_line2;
        $o->country = $object->country;
        $o->ext1 = $object->ext1;
        $o->ext2 = $object->ext2;
        if (!empty($object->since)) {
            $o->since = new DateTime($object->since);
        }
        if (!empty($object->kind)) {
            $o->kind = $object->kind;
        }

        return $o;
    }

    public function update(PDO $pdo)
    {
    }

    public function create(PDO $pdo)
    {

    }

    public function delete(PDO $pdo)
    {
    }

}
