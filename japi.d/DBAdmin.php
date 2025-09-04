<?php

use KAAL\Context;
use KAAL\Utils\MergeProject;

require_once __DIR__ . '/../vendor/autoload.php';

class DBAdmin
{
    protected Context $context;

    public function __construct(Context $context)
    {
        $this->context = $context;
    }

    public function merge(string $target, string $source)
    {
        $merger = new MergeProject($this->context->pdo());

    }
}

return new DBAdmin($AppContext);
