<?php

require('bxcache.php');
trait BexioJSONCache {
    protected $bxcache;

    function read_cache (string $reference):Array {
        if ($this->bxcache->get_age($reference) <= -1) { return [0, false]; }
        $content = $this->bxcache->load($reference);
        if ($content === false) { return [0, false]; }
        [$count, $content] = explode("\n", $content, 2);
        return [intval($count), $content];
    }

    function search_cache ($collection, $reference):Generator {
        if ($this->bxcache->get_age($reference) <= -1) { return; }
        $content = $this->bxcache->load($reference);
        if ($content === false) { return; }
        [$count, $content] = explode("\n", $content, 2);
        $content = json_decode($content);
        foreach($content as $id) {
            $object = $this->read_cache($collection . '/' . $id);
            if ($object[0] <= 0) { continue; }
            if ($object[0] > 1) {
                $items = json_decode($object[1]);
                foreach($items as $item) { yield json_encode($item); }
                continue;
            }
            yield $object[1];
        }
    }

    function _cmp_value ($op, $v1, $v2 = '') {
        $strv1 = strval($v1);
        $strv2 = strval($v2);
        switch ($op) {
            case '=':
            case 'equal':
                return strcasecmp($strv1, $strv2) === 0;
            case '!=':
            case 'not_equal':
                return strcasecmp($strv1, $strv2) !== 0;
            case '>':
            case 'greater_than':
                return strcasecmp($strv1, $strv2) === 1;
            case '<':
            case 'less_than':
                return strcasecmp($strv1, $strv2) === -1;
            case '>=':
            case 'greater_equal':
                $x = strcasecmp($strv1, $strv2);
                return $x >= 0;
            case '<=':
            case 'less_equal':
                $x = strcasecmp($strv1, $strv2);
                return $x <= 0;
            case 'like':
                return stristr($strv1, $strv2) !== false;
            case 'not_like':
                return stristr($strv1, $strv2) === false;
            case 'is_null':
                return is_null($v1);
            case 'not_null':
                return !is_null($v1);
            case 'in':
                $v2 = json_decode($v2);
                foreach ($v2 as $item) {
                    if ($this->_cmp_value($strv1, strval($item))) {
                        return true;
                    }
                }
                return false;
            case 'not_in':
                $v2 = json_decode($v2);
                foreach ($v2 as $item) {
                    if ($this->_cmp_value($strv1, strval($item))) {
                        return false;
                    }
                }
                return true;

        }
    }

    /**
     * Search cache a bit like it would be done on real server
     */
    function query_cache (string $collection, array $query, bool $use_or = false):Generator {
        foreach($this->bxcache->iterate_collection($collection) as $object) {
            [$count, $content] = explode("\n", $object);
            if ($count <= 0) { continue; }
            if ($count > 1) {
                $items = json_decode($content);
                foreach($items as $item) { 
                    $filter = $use_or;
                    foreach ($query as $q) {
                        if ($use_or) {
                            if ($this->_cmp_value($q['criteria'], $item->{$q['field']}, $q['value'])) {
                                $filter = false;
                                break;
                            }         
                            continue;
                        }
                        if (!$this->_cmp_value($q['criteria'], $item->{$q['field']}, $q['value'])) {
                            $filter = true;
                            break;
                        }
                    }
                    if ($filter) { continue; }
                    yield json_encode($item); 
                }
                continue;
            }
            $object = json_decode($content);
            $filter = $use_or;
            foreach ($query as $q) {
                if ($use_or) {
                    if ($this->_cmp_value($q['criteria'], $object->{$q['field']}, $q['value'])) {
                        $filter = false;
                        break;
                    }
                    continue;
                }
                if (!$this->_cmp_value($q['criteria'], $object->{$q['field']}, $q['value'])) {
                    $filter = true;
                    break;
                }
            }
            if ($filter) { continue; }
            yield $content;
        }
    }

    function store_cache (string $reference, string $content, int $items) {
        $content = $items . "\n" . $content;
        if (!$this->bxcache->cmp_content($reference, $content)) {
            $this->bxcache->store($reference, $content);
        }
    }
}

abstract class BexioModel
{
    protected $api;
    protected $db;
    protected $conf;
    protected $response;
    protected $operation;
    protected $bxcache;
    
    use BexioJSONCache;

    function __construct($db, $config) {
        $this->operation = ['', ''];
        $this->conf = $config;
        $this->set_db($db);
        $cacheopts = $config->getVar('bxcache');
        $this->bxcache = new BexioCache($cacheopts[0], $cacheopts[1], $cacheopts[2]);
    }

    abstract protected function setApi();

    function search_id ($body) {
        $h = hash_init('xxh3');
        usort($body, fn($a, $b) => strcasecmp($a['field'], $b['field']));
        array_reduce($body, function ($carry, $item) {
            hash_update($carry, $item['field'] . $item['criteria'] . $item['value'] );
            return $carry;
        }, $h);
        return hash_final($h);
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

    function getIDName() {
        return $this->api->getIdName();
    }

    function handleError (Exception $e) {
        $code = $e->getCode();
        switch (intval($code)) {
            case 0: // connection error like network down
            case 304: // not changed, so ok to serve from cache
            case 429: // ratelimit kick in, ok to serve from cache
            case 500: // bexio server having bugs, ok to serve from cache
            case 503: // bexio server under maintenance, ok to serve from cache
                return true;
            default:
                for(; $e; $e = $e->getPrevious()) {
                    error_log('Bexio error [code=' . $code . '] "' . $e->getMessage() . '"');
                }
                return false;
        }
        
    }

    function write($arg, &$id = NULL) {
        try {
            $object = $this->api->new();
            foreach ($arg as $property => $value) {
                $object->{$property} = $value;
            }
            if ($id !== null) {
                $object->{$object->getIDName()} = $id;
                $this->bxcache->delete($object->getType() . '/' . $object->getId());
            }
            $object = $this->api->update($object);
            $this->store_cache($object->getType() . '/' . $object->getId(), $object->toJson(), 1);
            return $object;
        } catch (Exception $e) {
            return $this->handleError($e);
        }
    }

    function overwrite($arg, &$id = NULL) {
        try {
            if ($id === null) { return $this->write($arg); }
            $object = $this->api->new();
            foreach ($arg as $property => $value) {
                $object->{$property} = $value;
            }
            $object->{$object->getIDName()} = $id;
            $this->bxcache->delete($object->getType() . '/' . $object->getId());
            $object = $this->api->set($object);
            $this->store_cache($object->getType() . '/' . $object->getId(), $object->toJson(), 1);
        } catch (Exception $e) {
            return $this->handleError($e);
        }
    }

    function delete($arg) {
        try {
            $this->bxcache->delete($this->api->getType() . '/' . $arg);
            return $this->api->delete($arg);
        } catch (Exception $e) {
            return $this->handleError($e);
        }
    }

    function try_read_cache (string $reference) {
        [$count, $object] = $this->read_cache($reference);
        if ($count === 1) {
            $this->response->start_output();
            $this->response->echo($object);
            return ['count' => 1];
        }
        return ['count' => 0];
    }

    function read($arg) {
        try {
            $cached = $this->bxcache->get($this->api->getType() . '/' . $arg);
            if ($cached) {
                $this->response->start_output();
                $this->response->echo($cached);
                return ['count' => 1];
            }

            $object = $this->api->get($arg);
            if (!$object) { 
                return $this->try_read_cache($this->api->getType() . '/' . $arg);
            }

            $jsonObject = $object->toJson();
            $this->bxcache->put($this->api->getType() . '/' . $arg, $jsonObject);
            $this->store_cache($this->api->getType() . '/' . $arg, $jsonObject, 1);

            $this->response->start_output();
            $this->response->echo($jsonObject);
            return ['count' => 1];
        } catch (Exception $e) {
            if($this->handleError($e)) {
                $this->response->softError('bexio', 'down', 500);
                return $this->try_read_cache($this->api->getType() . '/' . $arg);
            }
            return ['count' => 0];
        }
    }
    function exists($arg) {
        return ['count' => 1];
    }

    function parseLimit ($limit) {

        if (ctype_digit($limit)) { return [0, intval($limit)]; }

        if (!strchr($limit, ',')) { return [0, 500]; }

        [$offset,$limit] = explode(',', $limit, 2);
        if (!ctype_digit($limit) && !ctype_digit($offset)) { return [0, 500]; }
        
        return [intval($offset), intval($limit)];
    }

    function listing($arg) {
        try {
            $strLimit = ':0-500';
            $limit = [0, 500];
            if (!empty($arg['limit'])) { 
                $limit = $this->parseLimit($arg['limit']);
                $strLimit = ':' . $limit[0] . '-' ($limit[0] + $limit[1]);
            }
            /* Get cache first */
            $serachId = $this->api->getType() . '/#list' . $strLimit;
            $cached = $this->bxcache->get($serachId);
            if ($cached) {
                $cached = json_decode($cached);
                $count = 0;
                $this->response->start_output();
                foreach ($cached as $itemid) {
                    $item = $this->bxcache->get($this->api->getType() . '/' . $itemid);
                    if (!$item) { continue; }
                    if ($count > 0) { $this->response->echo(','); }
                    $this->response->echo($item);
                    $count++;
                }
                return ['count' => $count];
            }


            $count = 0;
            $first = true;
            $tocache = [];
            $this->response->start_output();
            foreach($this->api->list($limit[0], $limit[1]) as $item) {
                if (!$first) { $this->response->echo(','); }
                $tocache[] = $item->getId();
                $jsonObject = $item->toJson();
                $this->bxcache->put($item->getType() . '/' . $item->getId(), $jsonObject);
                $this->store_cache($item->getType() . '/' . $item->getId(), $jsonObject, 1);
                $this->response->echo($jsonObject);
                $count++;
                $first = false;
            }
            $this->bxcache->put($serachId, json_encode($tocache));
            return ['count' => $count];
        } catch (Exception $e) {
            if($this->handleError($e)) {
                $count = 0;
                $this->response->start_output();
                foreach($this->query_cache($this->api->getType(), []) as $item) {
                    if ($count > 0) { $this->response->echo(','); }
                    $this->response->echo($item);
                    $count++;
                }
                $this->response->softError('bexio', 'down', 500);
                return ['count' => $count];
            }
            return ['count' => 0];
        }
    }

    function get_owner($data, $id = null) {
        return -1;
    }

    function setAttributeFilter($attributes = []) {
        return; 
    }    

    function try_search_cache ($collection, $reference, $query = []) {
        $this->response->start_output();
        $count = 0;
        foreach ($this->search_cache($collection, $reference) as $item) {
            if ($count > 0) { $this->response->echo(','); }
            $this->response->echo($item);
            $count++;
        }
        if ($count === 0) {
            foreach($this->query_cache($collection, $query) as $item) {
                if ($count > 0) { $this->response->echo(','); }
                $this->response->echo($item);
                $count++;
            }
        }
        return ['count' => $count];
    }

    function search($body, $options) {
        try {
            $body = $this->query($body);
            $strLimit = ':0-500';
            $limit = [0, 500];
            if (!empty($arg['limit'])) { 
                $limit = $this->parseLimit($arg['limit']);
                $strLimit = ':' . $limit[0] . '-' ($limit[0] + $limit[1]);
            }

            /* Get cache first */
            $collection = $this->api->getType();
            $serachId = $this->api->getType() . '/#s_' . $this->search_id($body) . $strLimit;
            $cached = $this->bxcache->get($serachId);
            if ($cached) {
                $cached = json_decode($cached);
                $count = 0;
                $this->response->start_output();
                foreach($cached as $itemid) {
                    $item = $this->bxcache->get($this->api->getType() . '/' . $itemid);
                    if (!$item) { continue; }
                    if ($count > 0) { $this->response->echo(','); }
                    $this->response->echo($item);
                    $count++;
                }
                return ['count' => $count];
            }

            $query = $this->api->newQuery();
            foreach($body as $item) {
                $query->add($item['field'], $item['value'], $item['criteria']);
            }
            $results = $this->api->search($query, $limit[0], $limit[1]);
            $this->response->start_output();
            $tocache = [];
            $first = true;
            foreach ($results as $object) {
                $tocache[] = $object->getId();
                $jsonObject = $object->toJson();
                $this->bxcache->put($object->getType() . '/' . $object->getId(), $jsonObject);
                $this->store_cache($object->getType() . '/' . $object->getId(), $jsonObject, 1);
                if (!$first) { $this->response->echo(','); }
                $this->response->echo($jsonObject);
                $first = false;
            }
            $jsonObject = json_encode(($tocache));
            $this->bxcache->put($serachId, $jsonObject);
            $this->store_cache($serachId, $jsonObject, count($tocache));
            return ['count' => count($results)];
        } catch (Exception $e) {
            if ($this->handleError($e)) {
                $this->response->softError('bexio', 'down', 500);
                return $this->try_search_cache($collection, $serachId, $body);
            }
        }
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