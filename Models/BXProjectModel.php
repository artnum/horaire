<?php
include ('lib/bexio.php');

class BXProjectModel extends BexioModel
{
    protected $api;
    protected $db;
    protected $conf;
    protected $response;
    protected $operation;

    function setApi () { 
        $this->api = new BizCuit\BexioProject($this->db);
    }
}
