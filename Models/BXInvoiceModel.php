<?php
include ('lib/bexio.php');

class BXInvoiceModel extends BexioModel
{
    protected $api;
    protected $db;
    protected $conf;
    protected $response;
    protected $operation;

    function setApi () { 
        $this->api = new BizCuit\BexioInvoice($this->db);
    }

    function write ($arg, &$id = null) {
        $object = $this->api->new((object) $arg);
        $ret = null;
        if ($id === null) {
            $ret = $this->api->set($object);
        } else {
            $ret = $this->api->update($object);
        }
        if (!$ret) { return ['count' => 0]; }
        $this->response->start_output();
        $this->response->echo($ret->toJson());
        return ['count' => 1];
    }

    function overwrite($arg, &$id = NULL)
    {
        return $this->write($arg, $id);
    }
}