<?php
namespace KAAL\Middleware;

use Exception;
use Generator;
use KAAL\AccessControl;
use KAAL\Context;
use stdClass;

use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use KAAL\Utils\PrefixedTable;
use KaalDB\PDO\PDO;
use Snowflake53\ID;
use KAAL\Crypto;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class Tenant 
{
    function __construct(protected Context $context)
    {
    }

    function create(stdClass $tenant)
    {
        
    }
}