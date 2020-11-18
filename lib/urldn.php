<?PHP 
function url2dn ($url, $ldapBase) {
    $decodedURL = rawurldecode($url);
    $URLparts = explode('/', $decodedURL);
    $lastPart = array_pop($URLparts);
    if ($lastPart) {
        return implode(',', [$lastPart, $ldapBase]);
    } else {
        return $ldapBase;
    }
}
?>