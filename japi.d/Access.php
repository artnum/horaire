<?php

require_once __DIR__ . '/../vendor/autoload.php';

use KAAL\Middleware\Access;

/**
 * Return the middleware access code
 *
 * @var KAAL\Context $AppContext extracted variable from caller
 */
return new Access($AppContext);
