<?php 
namespace KAAL\Middleware\Address;

use KaalDB\LDAP\{LDAP, Entry};
use KAAL\Backend\Cache;
use STQuery\STQuery as Search;
use Snowflake53\ID;
use Generator;
use stdClass;
use Normalizer;
use Exception;

class JSONContactEntry extends stdClass {

    private function govIdNormalize (string $govid): string {
        $govid = trim(Normalizer::normalize($govid));
        list ($type, $id) = explode(' ', $govid, 2);
        $type = strtoupper($type);
        switch ($type) {
            case 'IDE':
                if (substr($id, 0, 3) !== 'CHE') { 
                    throw new Exception('Invalid IDE number');
                }
                $id = substr($id, 3);
                $id = 'IDE CHE' . preg_replace('/[^0-9]/', '', $id);
                break;
            case 'EHRAID':
                $id = 'EHRAID ' . preg_replace('/[^0-9]/', '', $id);
                break;
        }
        return $id;
    }

    private function addrNormalize (array|stdClass $addr):stdClass {
        if (is_array($addr)) {
            $addr = (object) $addr;
        }
        $outAddr = new stdClass();
        foreach ($addr as $key => $value) {
            $key = strtolower($key);
            $value = trim(Normalizer::normalize($value));
            switch($key) {
                case 'number':
                    $outAddr->houseIdentifier = $value;
                    break;
                case 'street':
                    $outAddr->street = $value;
                    break;
                case 'pobox': 
                    $outAddr->postOfficeBox = $value;
                    break;
                case 'postcode':
                    $outAddr->postalCode = $value;
                    break;
                case 'town':
                    $outAddr->l = $value;
                    break;
                case 'country':
                    $outAddr->c = $value;
                    break;
                case 'state':
                    $outAddr->st = $value;
                    break;
                case 'co':
                    $outAddr->kaCareOf = $value;
                    break;
                case 'description':
                    $outAddr->description = $value;
                    break;
                case 'type':
                    $outAddr->kaType = $value;
                    break;
            }
        }
        return $outAddr;
    }

    function __construct(stdClass|array $entry) {
        foreach ($entry as $key => $value) {
            $key = strtolower($key);
            if (substr($key, 0, 1) === '-') {
                $this->${$key} = null;
                continue;
            }
            switch($key) {
                case 'type':
                    if ($value === 'person') {
                        $this->objectclass = ['kaPerson'];
                    } else {
                        $this->objectclass = ['kaOrganization'];
                    }
                    break;
                case 'govid':
                    /* we expect value like "IDE CHE107677581"
                     * or "EHRAID 345035"
                     */
                    if (!is_array($value)) {
                        $value = [$value];
                    }
                    $this->kaExtId = array_map(fn($v) => $this->govIdNormalize($v), $value);
                    break;
                case 'extid':
                    if (!is_array($value)) {
                        $value = [$value];
                    }
                    $this->kaExtId = array_map(fn($v) => trim(Normalizer::normalize($v)), $value);
                    break;
                case 'uid':
                case '+uid':
                case 'o':
                case '+o':
                case 'gn':
                case '+gn':
                case 'sn':
                case '+sn': 
                case 'cn':
                case '+cn':
                    $this->{$key} = trim(Normalizer::normalize($value));
                    break;
            }

            if ($entry->addresses) {
                $this->addresses = array_map(fn($v) => $this->addrNormalize($v), $entry->addresses);
            }
        }

        /* Remove accents from names by tranliterating them to ASCII. When user
         * search for a name, he will likely search for "muller" instead of "müller".
         * Still we don't take into account spelling like "Mueller".
         */
        foreach (['sn', 'cn', 'gn', 'o'] as $attr) {
            if (!empty($this->$attr)) {
                $this->{'kaAscii' . ucfirst($attr)} = iconv('UTF-8', 'ASCII//TRANSLIT', $this->$attr);
            } else {
                $this->{'kaAscii' . ucfirst($attr)} = null;
            }
        }
    }
}

class LDAPContactEntry extends stdClass {
    function __construct(Entry $entry) {
        foreach ([
            'uid',
            'organization',
            'fax',
            'firstname',
            'lastname',
            'commonname',
            'email',
            'phone',
            'mobile',
            'locality',
            'postalcode',
            'address',
            'country',
            'dn'
        ] as $attr) {
            $this->$attr = '';
        }
        foreach ($entry as $attr => $values) {
            switch ($attr) {
                case 'objectClass':
                    if (in_array('organization', $values)) {
                        $this->type = 'organization';
                    } else {
                        $this->type = 'person';
                    }
                    break;
                case 'dn':
                    $this->dn = $values;
                    break;
                case 'uid':
                case 'c':
                case 'o':
                case 'mobile':
                case 'givenName':
                case 'sn':
                case 'cn':
                case 'l':
                case 'postalCode':
                case 'postalAddress':
                case 'st':
                    $this->{$attr} = trim(Normalizer::normalize($values[0]));
                    break;
                case 'facsimileTelephoneNumber':
                    $this->fax = array_map(fn($v) => trim(Normalizer::normalize($v)), $values);
                    break;
                case 'mail':
                    $this->email = array_map(fn($v) => trim(Normalizer::normalize($v)), $values);
                    break;
                case 'telephoneNumber':
                    $this->phone = array_map(fn($v) => trim(Normalizer::normalize($v)), $values);
                    break;
                case 'mobile':
                    $this->mobile = array_map(fn($v) => trim(Normalizer::normalize($v)), $values);
                    break;
                case 'jpegPhoto': break;
                default:
                    $this->$attr = array_map(fn($v) => trim(Normalizer::normalize($v)), $values);
                    break;
            }
        }
    }
}

class Contact {
    use ID;

    private string $basedn;
    private LDAP $ldap;
    private Cache $cache;

    public function __construct(string $basedn, LDAP $ldap, Cache $cache)
    {
        $this->basedn = $basedn;
        $this->ldap = $ldap;
        $this->cache = $cache;
    }

    private function uid2rdn (string $uid) {
        $uid = urldecode($uid);
        $parts = explode('/', $uid);
        $uid = array_pop($parts);
        if (strpos($uid, '=') !== false) {
            list ($attr, $uid) = explode('=', $uid, 2);
            $uid = ldap_escape($uid, '', LDAP_ESCAPE_FILTER);
            return sprintf('%s=%s', $attr, $uid);
        }
        $uid = ldap_escape($uid, '', LDAP_ESCAPE_FILTER);
        return sprintf('uid=%s', $uid);
    }

    public function get(string $uid): LDAPContactEntry
    {
        $rdn = $this->uid2rdn($uid);
        return new LDAPContactEntry($this->ldap->read(sprintf('%s,%s', $rdn, $this->basedn)));
    }

    public function search(stdClass $search):Generator {
        $JSearch = new Search();
        $JSearch->setSearch($search);
        $filter = $JSearch->toLDAP();
        $result = $this->ldap->list($this->basedn, $filter);
        foreach ($result as $entry) {
            if ($entry->dn === $this->basedn) {
                continue;
            }
            yield new LDAPContactEntry($entry);
        }
    }

    public function list():Generator {
        $result = $this->ldap->list($this->basedn, '(objectClass=*)');
        foreach ($result as $entry) {
            if ($entry->dn === $this->basedn) {
                continue;
            }
            yield new LDAPContactEntry($entry);
        }
    }

    public function create(stdClass $jsonEntry): LDAPContactEntry {
        $entry = new JSONContactEntry($jsonEntry);
        if (isset($entry->uid)) {
            $entry->uid = $this->get53();
        }
        $addresses = $entry->addresses;
        unset($entry->addresses);

        $dn = sprintf('uid=%s,%s', $entry->uid, $this->basedn);
        $baseEntry = new LDAPContactEntry($this->ldap->add($dn, $entry));
        foreach ($addresses as $addr) {
            if (!$addr->uid) {
                $addr->uid = $this->get53();
            }
            $dn = sprintf('uid=%s,%s', $entry->uid, $dn);
            $this->ldap->add($dn, $addr);
        }
        return $baseEntry;
    }

    public function modify (stdClass $jsonEntry): LDAPContactEntry {
        $entry = new JSONContactEntry($jsonEntry);
        $dn = sprintf('uid=%s,%s', $entry->uid, $this->basedn);
        return new LDAPContactEntry($this->ldap->modify($dn, $entry));
    }
}