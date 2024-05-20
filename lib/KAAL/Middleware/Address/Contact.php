<?php 
namespace KAAL\Middleware\Address;

use KaalDB\LDAP\{LDAP, Entry};
use KAAL\Backend\Cache;
use STQuery\STQuery as Search;
use Snowflake53\ID;
use Generator;
use stdClass;
use Normalizer;

class JSONContactEntry extends stdClass {
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
                        $this->objectclass = ['top', 'person'];
                    } else {
                        $this->objectclass = ['top', 'organization'];
                    }
                    break;                   
                case 'uid':
                case '+uid':
                case 'c':
                case '+c':
                case 'o':
                case '+o':
                case 'givenname':
                case '+givenname':
                case 'sn':
                case '+sn': 
                case 'cn':
                case '+cn':
                case 'l':
                case '+l':
                case 'postalcode':
                case '+postalcode':
                case 'postaladdress':
                case '+postaladdress':
                case 'st':
                case '+st':
                    $this->{$key} = trim(Normalizer::normalize($value));
                    break;
                case 'jpegphoto': break;
                default:
                    if (!is_array($value)) {
                        $value = [$value];
                    }
                    $this->$key = array_map(fn($v) => trim(Normalizer::normalize($v)), $value);
                    break;
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
        $dn = sprintf('uid=%s,%s', $entry->uid, $this->basedn);
        return new LDAPContactEntry($this->ldap->add($dn, $entry));
    }

    public function modify (stdClass $jsonEntry): LDAPContactEntry {
        $entry = new JSONContactEntry($jsonEntry);
        $dn = sprintf('uid=%s,%s', $entry->uid, $this->basedn);
        return new LDAPContactEntry($this->ldap->modify($dn, $entry));
    }
}