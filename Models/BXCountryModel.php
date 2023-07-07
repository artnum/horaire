<?php
include ('lib/bexio.php');

class BXCountryModel extends BexioModelRO
{
    protected $api;
    protected $db;
    protected $conf;
    protected $response;
    protected $operation;

    function dbtype() {
        return 'bexio';
    }


    function setApi () { 
        $this->api = new BizCuit\BexioCountry($this->db);
    }
}
