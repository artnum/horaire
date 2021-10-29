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

function  attrLessUrl2db($url, $ldapBase) {
    $decodedURL = rawurldecode($url);
    $URLparts = explode('/', $decodedURL);
    $lastPart = array_pop($URLparts);
    if ($lastPart) {
        if (strpos($lastPart, '=') === false) {
            $lastPart = 'uid=' . $lastPart;
        }
        return implode(',', [$lastPart, $ldapBase]);
    } else {
        return $ldapBase;
    }
}
?>