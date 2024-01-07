<?PHP

require('lib/bexio.php');

class ContactModel extends artnum\LDAP {
  protected $kconf;
  protected $bxcache;

  use BexioJSONCache;

  function __construct($db, $config)  {
    $this->kconf = $config;
    if ($this->kconf->get('bexio.enabled') != 0) {
      $cacheopts = $config->getVar('bxcache');
      $this->bxcache = new BexioCache($cacheopts[0], $cacheopts[1], $cacheopts[2]);
    }
    parent::__construct($db,
      $this->kconf->get('trees.contacts'), 
      [
        'objectclass',
        'givenname',
        'sn',
        'displayname',
        'mail',
        'telephonenumber',
        'o',
        'description',
        'mobile',
        'l',
        'postalcode',
        'c',
        'postaladdress',
        'uid',
        'labeleduri',
        'custom4'
      ],
      []
    );
    $this->conf('rdnAttr', 'uid');
    $this->conf('objectclass', function (&$entry) {
      $defaultClass = [
        'inetOrgPerson',
        'iroAdditionalUserInfo',
        'contactPerson'
      ];
      if (!empty($entry['type'])) {
        if ($entry['type'] !== 'person') {
          $defaultClass = [
            'organization',
            'iroOrganizationExtended',
            'contactPerson'
          ];
        }
        unset ($entry['type']);
      }
      return $defaultClass;
    });
  }

  function is($value) {
    if (empty($value)) { return false; }
    if ($value === null) { return false; }
    return true;
  }
  
  function search_id ($body) {
    $h = hash_init('xxh3');
    usort($body, fn($a, $b) => strcasecmp($a['field'], $b['field']));
    array_reduce($body, function ($carry, $item) {
        hash_update($carry, $item['field'] . $item['criteria'] . $item['value'] );
        return $carry;
    }, $h);
    return hash_final($h);
  }
  
  function bx_to_ldap ($bxcontact, $noquery = false) {
    $contact = new stdClass();
    $contact->IDent = '@bx_' . $bxcontact->id;
    $contact->uid = $contact->IDent;
    $contact->custom4 = 'BEXIO';
    $contact->state = 'active';
    if (isset($bxcontact->_archived)) { $contact->state = $bxcontact->_archived ? 'archived' : 'active'; }
    if ($bxcontact->contact_type_id == 1) {
      $contact->type = 'oragnization';
      $contact->o = $bxcontact->name_1;
      if ($this->is($bxcontact->name_2)) {
        $contact->description = $bxcontact->name_2; 
        $contact->displayname = implode(' ', [$contact->o, $contact->description]); 
      } else {
        $contact->displayname = $contact->o;
      }
    } else {
      $contact->type = 'person';
      $contact->sn = $bxcontact->name_1;
      $contact->givenname = $bxcontact->name_2;
      $contact->displayname = implode(' ', [$contact->givenname, $contact->sn]);
    }

    if ($this->is($bxcontact->city)) { $contact->l = $bxcontact->city; }
    $contact->mail = [];
    if ($this->is($bxcontact->mail)) { $contact->mail[] = $bxcontact->mail; }
    if ($this->is($bxcontact->mail_second)) { $contact->mail[] = $bxcontact->mail_second; }
    if ($this->is($bxcontact->postcode)) { $contact->postalcode = $bxcontact->postcode; }
    if ($this->is($bxcontact->address)) { $contact->postaladdress = $bxcontact->address; }
    $contact->telephonenumber = [];
    if ($contact->type === 'organization' && $this->is($bxcontact->phone_mobile)) {
      $contact->telephonenumber[] = $bxcontact->phone_mobile;
    }
    if ($contact->type === 'person' && $this->is($bxcontact->phone_mobile)) {
      $contact->mobile = [$bxcontact->phone_mobile];
    }
    if ($this->is($bxcontact->phone_fixed)) { $contact->telephonenumber[] = $bxcontact->phone_fixed; }
    if ($this->is($bxcontact->phone_fixed_second)) { $contact->telephonenumber[] = $bxcontact->phone_fixed_second; }

    if ($this->is($bxcontact->url)) {
      $contact->labeleduri = [$bxcontact->url];
    }

    $bexioDB = $this->kconf->getVar('bexioDB');

    if ($this->is($bxcontact->country_id) && !$noquery) {
      try {
        $bxCountry = new BizCuit\BexioCountry($bexioDB);
        $country = $bxCountry->get($bxcontact->country_id);
        $contact->c = $country->iso3166_alpha2;
      } catch (Exception $e) {
        error_log($e->getMessage());
        // no country is not the end of the world
      }
    }
    if ($contact->type === 'person' && !$noquery) {
      try {
        $bxCRelation = new BizCuit\BexioContactRelation($bexioDB);
        $query = $bxCRelation->newQuery();
        $query->add('contact_sub_id', $bxcontact->id);
        $relations = $bxCRelation->search($query);
        if (count($relations) > 0) {
          $company = null;

          foreach($relations as $relation) {
            $c = $this->getBexioContact($relation->contact_id);
            if ($c->contact_type_id === 1) {
              $company = $c;
              break;
            }
          }
          if ($company) {
            $contact->o = $company->name_1;
          }
        }
      } catch (Exception $e) {
        error_log($e->getMessage());
        // no relation is not the end of the world
      }
    }
    if (isset($contact->l)) { $contact->locality = implode(' ', [$contact->postalcode, $contact->l]); }
    if (!empty($contact->c)) {
      if (empty($contact->locality)) { $contact->locality = ''; }
      $contact->locality = $contact->c . '-' . $contact->locality;
    }
    return $contact;
  }

  function getBexioContact ($id) {
    $bexioDB = $this->kconf->getVar('bexioDB');
    if (!$bexioDB) { throw new Exception('Database unavailable'); }
    $cached = $this->bxcache->get('Contact/' . $id);
    if ($cached) {
      $contact = json_decode($cached);
    } else {
      $bxContact = new BizCuit\BexioContact($bexioDB);
      try {
        try {
          $contact = $bxContact->get($id);
          $jsonObject = $contact->toJson();
          $cached = $this->bxcache->put('Contact/' . $contact->getId(), $jsonObject);
          $this->store_cache('Contact/' . $contact->getId(), $jsonObject, 1);
          $contact->_archived = false;
        } catch (Exception $e) {
          // try to get archived value
          $contact = $bxContact->get($id, ['show_archived' => 'true']);
          $jsonObject = $contact->toJson();
          $cached = $this->bxcache->put('Contact/' . $contact->getId(), $jsonObject);
          $this->store_cache('Contact/' . $contact->getId(), $jsonObject, 1);
          $contact->_archived = true;
        }
      } catch (Exception $e) {
        switch ($e->getCode()) {
          case 0:
          case 304:
          case 429:
          case 500:
          case 503:
            $this->response->softError('bexio', 'down', 500);
            [$count, $object] = $this->read_cache('Contact/' . $id);
            if ($count > 0) { return json_decode($object); }
        }
        throw $e;
      }
    }
    return $contact;
  } 

  function _read($dn, $options = null) {
    if ($this->kconf->get('bexio.enabled') == 0) {
      return parent::_read($dn);
    }
    if (str_starts_with($dn, '@bx_')) {
      $noquery = false;
      if (isset($options['short'])) { $noquery = true; }
      $id = substr($dn, 4);
      $contact = $this->getBexioContact($id);
      $contact = $this->bx_to_ldap($contact, $noquery);
      $this->response->start_output();
      $this->response->echo(json_encode($contact));
      return ['count' => 1];
    }
    return parent::_read($dn);
  }  

  function search($body, $options) {
    if ($this->kconf->get('bexio.enabled') == 0) {
      return parent::search($body, $options);
    }

    $limit = 500;
    if (isset($options['limit']) && is_numeric($options['limit'])) {
      if (intval($options['limit']) > 0) {
        $limit = intval($options['limit']);
      }
    }
    $offset = 0;
    if (isset($options['offset']) && is_numeric($options['offset'])) {
      if (intval($options['offset']) > 0) {
        $limit = intval($options['offset']);
      }
    }

    $count = 0;
    try {
      $flatquery = $this->flatten_query($body);
      $bexioDB = $this->kconf->getVar('bexioDB');
      if (!$bexioDB) { throw new Exception('Database unavailable'); }
      $bxContact = new BizCuit\BexioContact($bexioDB);
      $searchId = 'Contact/#s_' . $this->search_id($flatquery) . ':0-500';
      $cached = $this->bxcache->get($searchId);

      if ($cached) {
        $cached = json_decode($cached);
        $this->response->start_output();
        foreach ($cached as $itemid) {
          $item = $this->bxcache->get('Contact/' . $itemid);
          if (!$item) { continue; }
          $item = json_decode($item);
          $count++;
          $item = $this->bx_to_ldap($item, true);
          $this->response->print($item);
        }
      } else {
        $bxresults = [];
        $this->response->start_output();
        $tocache = [];
        foreach ($flatquery as $queryelement) {
          $query = $bxContact->newQuery();
          $query->add($queryelement['field'], $queryelement['value'], $queryelement['criteria']);
          $results = $bxContact->search($query, $offset, $limit);
          foreach($results as $result) {
            if (isset($bxresults[$result->id])) { continue; }
            $tocache[] = $result->getId();
            $jsonObject = $result->toJson();
            $this->bxcache->put('Contact/' . $result->getId(), $jsonObject);
            $this->store_cache('Contact/' . $result->getId(), $jsonObject, 1);
            $bxresults[$result->id] = true;
            $result = $this->bx_to_ldap($result, true);
            $count++;
            $this->response->print($result);
          }
        }
        $jsonObject = json_encode($tocache);
        $this->bxcache->put($searchId, $jsonObject);
        $this->store_cache($searchId, $jsonObject, $count);
      }
    } catch (Exception $e) {
      switch($e->getCode()) {
        case 0: // connection error like network down
        case 304: // not changed, so ok to serve from cache
        case 429: // ratelimit kick in, ok to serve from cache
        case 500: // bexio server having bugs, ok to serve from cache
        case 503: // bexio server under maintenance, ok to serve from cache 
          $count = 0;
          $this->response->softError('bexio', 'down', 500);
          $this->response->start_output();
          foreach($this->search_cache('Contact', $searchId) as $item) {
            $item = json_decode($item);
            $item = $this->bx_to_ldap($item, true);
            $this->response->print($item);
            $count++;
          }
          if ($count === 0) {
            foreach ($this->query_cache('Contact', $flatquery, true) as $item) {
              $item = $this->bx_to_ldap(json_decode($item));
              $this->response->print($item);
              $count++;
            }
          }
          break;
        default:
          break;
      }
    }

    $ret = parent::search($body, $options);
    $ret['count'] += $count;
    return $ret;
  }


  function map_field_name($element) {
    switch($element) {
      case 'givenname': return 'name_1';
      case 'o': return 'name_1';
      case 'sn': return 'name_2';
    }
  }

  function flatten_query($body, $depth = 0) {
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
        $flat = array_merge($flat, $this->flatten_query($v, $depth + 1));
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
      foreach ($flat as &$f) {
        $f['field'] = $this->map_field_name($f['field']);
        if (strpos($f['value'], '0') >= 0) {
          $f['value'] = str_replace('*', '', $f['value']);
          $f['criteria'] = 'like';
        }
        if (!isset($out[$f['field']])) {
          $out[$f['field']] = $f;
        }
      }
      $flat = array_values($out);
    }

    return $flat;
  }

  function processEntry($conn, $ldapEntry, &$result) {
    $entry = parent::processEntry($conn, $ldapEntry, $result);
    if (!is_array($entry['objectclass'])) {
      $entry['objectclass'] = [$entry['objectclass']];
    }
    $oc = array_map('strtolower', $entry['objectclass']);
    unset($entry['objectclass']);
    if (in_array('inetorgperson', $oc)) {
      $entry['type'] = 'person';

      $displayname = [];
      foreach (['givenname', 'sn'] as $n) {
        if (!empty($entry[$n])) {
          if (is_array($entry[$n])) {
            $entry[$n] = implode(' ', $entry[$n]);
          }
          $displayname[] = $entry[$n];
        }
      }
      if (count($displayname) > 0) { $entry['displayname'] = join(' ', $displayname); }
    } else {
      $entry['type'] = 'organization';
      if (empty($entry['o'])) {
        return [];
      }
      $entry['displayname'] = $entry['o'];
      $person = [];
      if (!empty($entry['givenname'])) { $person[] = $entry['givenname']; }
      if (!empty($entry['sn'])) { $person[] = $entry['sn']; }
      if (count($person) > 0) { $entry['person'] = join(' ', $person); }
    }

    $locality = [];
    if (!empty($entry['postalcode'])) { $locality[] = $entry['postalcode']; }
    if (!empty($entry['l'])) { $locality[] = $entry['l']; }
    $entry['locality'] = join(' ', $locality);
    $entry['custom4'] = 'LOCAL';
    return $entry;
  }
}
?>
