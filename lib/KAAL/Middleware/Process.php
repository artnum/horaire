<?php

namespace KAAL\Middleware;

use KaalDB\PDO\PDO;
use stdClass;

class Process {
    protected PDO $pdo;

    public function get(int|string $id):stdClass {
        if(is_string($id)) {
            $id = intval($id);
        }


        
    }

}