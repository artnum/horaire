<?php

namespace KAAL\Utils;

use Exception;

class VException extends Exception
{
    public function __construct(...$args)
    {
        parent::__construct('Validation failed [' . join('|', $args) . ']');
    }
}
