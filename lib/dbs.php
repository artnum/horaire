<?PHP

/* $ini: parsed ini file
  $type : type of database ("storage" being generic datastorage)
 */
function init_pdo($ini, $type = 'storage') {
  if (!isset($ini[$type])) { return NULL; }
  if (!isset($ini[$type]['pdo-string'])) { return NULL; }
  $dsn = $ini[$type]['pdo-string'];
  $user = isset($ini[$type]['user']) ? $ini[$type]['user'] : '';
  $password = isset($ini[$type]['password']) ? $ini[$type]['password'] : '';

  try {
    $options = array(PDO::ATTR_PERSISTENT => true);
    /* odbc should not use persistent connection */
    if (substr(strtolower($dsn), 0, 4) === 'odbc') {
      $options = array(PDO::ATTR_PERSISTENT => false);
    }
    $pdo = new PDO($dsn, $user, $password, $options);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
    /* driver specific setup */
    switch ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)) {
      case 'mysql':
        $pdo->exec('SET sql_mode=\'ANSI\'');
        break;
      case 'sqlite':
        $pdo->exec('PRAGMA foreign_keys = YES;');
        break;
    }
  } catch (Exception $e) {
    return NULL;
  }
  return $pdo;
}

?>
