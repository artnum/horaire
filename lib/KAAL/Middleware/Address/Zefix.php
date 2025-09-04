<?php
namespace KAAL\Middleware\Address;

use CurlHandle;
use Generator;
use Normalizer;
use stdClass;

class JSONContactEntry extends stdClass {
    function __construct(stdClass|array $entry)
    {
        if (is_array($entry)) {
            $entry = (object) $entry;
        }
        $this->uid = $entry->ehraid;
        $this->cn = $entry->name;
        $this->ide = $entry->uidFormatted;
        $this->type = 'organization';
        if (isset($entry->address)) {
            foreach($entry->address as $key => $value) {
                $key = strtolower($key);
                $value = trim(Normalizer::normalize($value));
                switch($key) {
                    case 'organisation': $this->organization = $value; break;
                    case 'town': $this->locality = $value; break;
                    case 'country': $this->country = $value; break;
                    case 'swisszipcode': $this->postalcode = $value; break;
                }
            }
            $this->address = implode("\n",
                array_filter([
                    implode(' ', [
                        $entry->address->street, $entry->address->houseNumber]),
                        $entry->address->addon,
                        $entry->address->poBox
                    ],
                    fn($v) => !empty($v)
                )
            );
        }
    }
}

/**
 * Zefix (swiss commerce registry) datasource. It's readonly, creation happen
 * in Contact backend.
 * As the access to opendata needs an account, we use the web application API
 * to access the data. 
 * @package KAAL\Middleware
 */
class Zefix {
    private CurlHandle $curl;
    const ZEFIX_API = 'https://zefix.ch/ZefixREST/api/v1/';
    public function __construct()
    {
        $this->curl = curl_init();
        curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
        /* Don't know if there is any check on the API but it is targeted to the
         * web application, so we use a common user agent. */
        curl_setopt(
            $this->curl,
            CURLOPT_USERAGENT,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
        );
        curl_setopt(
            $this->curl,
            CURLOPT_HTTPHEADER, ['Accept: application/json']
        );
        curl_setopt(
            $this->curl,
            CURLOPT_HTTPHEADER,
            ['Content-Type: application/json']
        );
    }


    public function search(string $name, int $next = 0):Generator {
        $query = [
            'maxEntries' => 30,
            'name' => $name,
            'offset' => $next
        ];

        curl_setopt($this->curl, CURLOPT_URL, self::ZEFIX_API . 'firm/search.json');
        curl_setopt($this->curl, CURLOPT_POST, true);
        curl_setopt($this->curl, CURLOPT_POSTFIELDS, json_encode($query));
        $data = curl_exec($this->curl);
        if ($data === false) {
            throw new \Exception('Zefix API error: ' . curl_error($this->curl));
        }
        $response = json_decode($data);
        
        $more = $response->hasMoreResults;
        $query['offset'] = $response->maxOffset;
        yield ['type' => 'next', 'data' => $more ? $response->maxOffset : -1 ];
        foreach ($response->list as $result) {
            yield ['type' => 'entry', 'data' => new JSONContactEntry($result)];
        }
    }

    public function get(string $id):object {
        curl_setopt($this->curl, CURLOPT_URL, self::ZEFIX_API . 'firm/' . $id . '/withoutShabPub.json');
        $data = curl_exec($this->curl);
        if ($data === false) {
            throw new \Exception('Zefix API error: ' . curl_error($this->curl));
        }
        return new JSONContactEntry(json_decode($data));
    }
}