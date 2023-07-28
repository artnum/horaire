<?PHP

class ContactModel extends artnum\LDAP {
  protected $kconf;
  function __construct($db, $config)  {
    $this->kconf = $config;
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

  function bx_to_ldap ($bxcontact, $noquery = false) {
    $contact = new stdClass();
    $contact->IDent = '@bx_' . $bxcontact->id;
    $contact->uid = $contact->IDent;
    $contact->custom4 = 'BEXIO';
    $contact->state = $bxcontact->_archived ? 'archived' : 'active';
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

          $bxContact = new BizCuit\BexioContact($bexioDB);
          foreach($relations as $relation) {
            $c = $bxContact->get($relation->contact_id);
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
      $contact->locality = $contact->c . '-' . $contact->locality;
    }
    return $contact;
  }

  function _read($dn, $options = null) {
    if (str_starts_with($dn, '@bx_')) {
      $noquery = false;
      if (isset($options['short'])) { $noquery = true; }
      $bexioDB = $this->kconf->getVar('bexioDB');
      if (!$bexioDB) { throw new Exception('Database unavailable'); }
      $id = substr($dn, 4);
      $bxContact = new BizCuit\BexioContact($bexioDB);
      try {
        $contact = $bxContact->get($id);
        $contact->_archived = false;
      } catch (Exception $e) {
        // try to get archived value
        $contact = $bxContact->get($id, ['show_archived' => 'true']);
        $contact->_archived = true;
      }
      $contact = $this->bx_to_ldap($contact, $noquery);
      $this->response->start_output();
      $this->response->echo(json_encode($contact));
      return ['count' => 1];
    }
    return parent::_read($dn);
  }  

  function search($body, $options) {
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

    $flatquery = $this->flatten_query($body);
    $bexioDB = $this->kconf->getVar('bexioDB');
    if (!$bexioDB) { throw new Exception('Database unavailable'); }
    $bxContact = new BizCuit\BexioContact($bexioDB);


    $count = 0;
    $bxresults = [];
    $this->response->start_output();

    foreach ($flatquery as $queryelement) {
      $query = $bxContact->newQuery();
      $query->add($queryelement['field'], $queryelement['value'], $queryelement['criteria']);
      $results = $bxContact->search($query, $offset, $limit);
      foreach($results as $result) {
        if (!isset($bxresults[$result->id])) {
          $bxresults[$result->id] = true;
          $result = $this->bx_to_ldap($result, true);
          $count++;
          $this->response->print($result);
        }
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
