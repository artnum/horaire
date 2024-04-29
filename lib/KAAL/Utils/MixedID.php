<?php

namespace KAAL\Utils;

use Exception;
use stdClass;

use const PJAPI\ERR_BAD_REQUEST;

trait MixedID {
    public static function normalizeId (int|string|stdClass $id):int {
        if (is_object($id)) {
            if (isset($id->id)) {
                return self::normalizeId($id->id);
            }
            throw new Exception('Invalid id', ERR_BAD_REQUEST, 
                new Exception('Object must have an id property.'));
        }
        if (is_string($id)) {
            if (!is_numeric($id) || intval($id) != $id || intval($id) < 1) {
                throw new Exception('Invalid id', ERR_BAD_REQUEST, 
                    new Exception('ID must be an integer or a string that can be converted to an integer.'));
            }
            return intval($id);
        }
        return intval($id);
    }
}