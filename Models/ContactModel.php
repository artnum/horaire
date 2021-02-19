<?PHP
class ContactModel extends artnum\LDAP {
  function __construct($db, $config)  {
    $this->kconf = $config;
    parent::__construct($db, $this->kconf->get('trees.contacts'), array('objectclass', 'givenname', 'sn', 'displayname', 'mail', 'telephonenumber', 'o', 'mobile', 'l', 'postalcode', 'c', 'postaladdress', 'uid'), []);
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
    
    return $entry;
  }
}
?>
