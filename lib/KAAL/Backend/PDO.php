<?php

namespace KAAL\Backend;

use PDO as PDOBase;

class PDO extends PDOBase
{
    public function __construct(
        string $dsn,
        ?string $username = null,
        #[\SensitiveParameter] ?string $password = null,
        ?array $options = null
    ) {
        parent::__construct($dsn, $username, $password, $options);
    }
}
