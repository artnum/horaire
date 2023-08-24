<?php

/**
 * Manage caching of external bexio data into two caches :
 *  - Short time cache to avoid hiting ratelimit (put,get,delete)
 *  - Long time cache in case bexio is down (store,load,remove)
 */
class BexioCache {
    protected $cache; // short time cache
    protected $path; // long time cache
    protected $duration = 30;
    
    function __construct (Memcached $memcache, string $path, Int $duration = 30) {
        $this->cache = $memcache;
        $this->path = realpath($path);
        $this->duration = $duration;

        if (!is_writable($this->path)) {
            throw new Exception ('Cache is not writable');
        }
    }

    function content_hash (string $content):string {
        return hash('xxh3', $content);
    }

    function ref_hash (string $reference):string {
        return hash('xxh3', $reference) . '.' . hash('crc32c', $reference);
    }

    function ref_to_path (string $reference):string {
        $base = $this->ref_hash($reference);
        $dir = $this->path . '/' . substr($base, 0, 2) . '/' . substr($base, 2, 2) . '/' . $base . '/';
        if (!is_dir($dir)) {
            @mkdir($dir, 0770, true);
        }
        return $dir;
    }

    function cmp_content (string $reference, string $content) {
        $dirname = $this->ref_to_path($reference);
        if (!is_file($dirname . '/hash')) { return false; }

        $hash = $this->content_hash($content);
        $storedHash = file_get_contents($dirname . '/hash');

        if ($storedHash === $hash) { return true; }

        return false;
    }

    /**
     * When set into collection, this will be for iterating only so performance
     * penalty is not a concern when reading back. This is to be used in some 
     * specific emergency case where slowness is not a problem.
     */
    function set_to_collection (string $reference, string $path):bool {
        $parts = explode('/', $reference);
        $collection = array_shift($parts);
        $item = array_shift($parts);
        if (str_starts_with($item, '#')) { return true; } // query or listing, don't structure into collection/item
        if (!is_dir($this->path . '/' . $collection)) {
            mkdir($this->path . '/' . $collection);
        }
        $file = basename($path);
        if (!is_link($this->path . '/' . $collection . '/' . $file)) {
         return symlink($path, $this->path . '/' . $collection . '/' . $file);
        }
        return true;
    }

    function get_age (string $reference):int {
        $dirname = $this->ref_to_path($reference);
        if (!is_file($dirname . '/hash')) { return -1; }
        $mtime = filemtime($dirname . '/hash');
        if ($mtime === false) { return -1; }
        return time() - $mtime;
    }

    function iterate_collection (string $collection):Generator {
        $dh = opendir($this->path . '/' . $collection);
        if (!$dh) { return; }
        while(($file = readdir($dh)) !== false) {
            if (is_file($this->path . '/' . $collection . '/' . $file . '/deleted')) { continue; }
            if (!is_file($this->path . '/' . $collection . '/' . $file . '/content')) { continue; }
            yield file_get_contents($this->path . '/' . $collection . '/' . $file . '/content');
        }
        closedir($dh);
    }

    function store (string $reference, string $content):bool {
        $dirname = $this->ref_to_path($reference);
        $this->set_to_collection($reference, $dirname);
        if (file_put_contents($dirname . '/content', $content)) {
            return file_put_contents($dirname . '/hash', $this->content_hash($content)) !== false;   
        }
        return false;
    }

    function load (string $reference):string|false {
        $dirname = $this->ref_to_path($reference);
        return file_get_contents($dirname . '/content');
    }

    function remove (string $reference):bool {
        $dirname = $this->ref_to_path($reference);
        return file_put_contents($dirname . '/deleted', strval(time())) !== false;
    }

    function put (string $reference, string $content):bool {
        $reference = $this->ref_hash($reference);
        return $this->cache->set($reference, $content, $this->duration);
    }

    function get (string $reference):string|false {
        $reference = $this->ref_hash($reference);
        return $this->cache->get($reference);
    }

    function delete (string $reference):bool {
        $reference = $this->ref_hash($reference);
        return $this->cache->delete($reference);
    }
} 