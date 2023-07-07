<?php

abstract class BexioModel
{
    protected $api;
    protected $db;
    protected $conf;
    protected $response;
    protected $operation;

    function __construct($db, $config) {
        $this->operation = ['', ''];
        $this->conf = $config;
        $this->set_db($db);
    }

    function dbtype() {
        return 'bexio';
    }

    function set_response($response) {
        $this->response = $response;
    }

    function set_db($db) {
        if ($db === null) { return; }
        $this->db = $db;
        $this->setApi();
    }

    function setApi () {
        $this->api = new BizCuit\BexioAPI($this->db);
    }

    function getIDName() {
        return $this->api->getIdName();
    }

    function write($arg, &$id = NULL) {
        return false;
    }

    function overwrite($arg, &$id = NULL) {
        return false;
    }

    function delete($arg) {
        return false;
    }

    function read($arg) {
        $object = $this->api->get($arg);
        if (!$object) { return ['count' => 0]; }
        $this->response->start_output();
        $this->response->echo($object->toJson());
        return ['count' => 1];
    }
    function exists($arg) {
        return ['count' => 1];
    }

    function listing($arg) {
        $count = 0;
        $first = true;
        $this->response->start_output();
        foreach($this->api->list() as $item) {
            if (!$first) { $this->response->echo(','); }
            $this->response->echo($item->toJson());
            $count++;
            $first = false;
        }
        return ['count' => $count];
    }

    function get_owner($data, $id = null) {
        return -1;
    }

    function setAttributeFilter($attributes = []) {
        return; 
    }    

    function search($body, $options) {
        $body = $this->query($body);
        $query = $this->api->newQuery();
        foreach($body as $item) {
            $query->add($item['field'], $item['value'], $item['criteria']);
        }
        $results = $this->api->search($query);
        $this->response->start_output();
        $first = true;
        foreach ($results as $object) {
            if (!$first) { $this->response->echo(','); }
            $this->response->echo($object->toJson());
            $first = false;
        }
        
        return ['count' => count($results)];
    }

    function isUnary ($op) {
        if (!is_string($op)) { return false; }
        switch ($op) {
          case '--':
          case '-': return ['is_null', ''];
          case '**':
          case '*': return ['not_null', ''];
          default: return false;
        }
        return false;
    }
      
    function query ($body, $depth = 0) {
        $flat = [];
        $criteriaMap = [
            '<=' => '<=',
            '<' => '<',
            '>=' => '>=',
            '>' => '>',
            '=' => '=',
            '!=' => '!=',
            '~' => 'like'
        ];

        foreach ($body as $k => $v) {
            $k = explode(':', $k, 2)[0];
            if (substr($k, 0, 1) === '#') {
                $flat = array_merge($flat, $this->query($v, $depth + 1));
                continue;
            }
            if (!is_array($v)) {
                $u = $this->isUnary($v);
                if ($u === false) {
                    $flat[] = ['field' => $k, 'criteria' => '=', 'value' => $v];
                    continue;
                }
                $flat[] = ['field' => $k, 'criteria' => $u[0], 'value' => $u[1]];
                continue;
            }

            if (count($v) === 1) {
                $u = $this->isUnary($v[0]);
                if ($u === false) {
                    $flat[] = ['field' => $k, 'criteria' => '=', 'value' => $v[0]];
                    continue;
                }
                $flat[] = ['field' => $k, 'criteria' => $u[0], 'value' => $u[1]];
                continue;
            }

            if (!empty($v)) {                
                $flat[] = ['field' => $k, 'criteria' => $criteriaMap[$v[0]], 'value' => $v[1]];
            }
        }
        if ($depth === 0) {
            $out = [];
            foreach ($flat as $f) {
                if (!isset($out[$f['field']])) {
                    $out[$f['field']] = $f;
                }
            }
            $flat = array_values($out);
        }
        return $flat;
    }

    function error($msg, $line = __LINE__, $file = __FILE__) {
        error_log("$file:$line:" . get_class($this) . ", $msg");
    }
}

abstract class BexioModelRO extends BexioModel 
{
    function write($arg, &$id = NULL) {
        return false;
    }

    function overwrite($arg, &$id = NULL) {
        return false;
    }

    function delete($arg) {
        return false;
    }
}