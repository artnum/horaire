<?php
require_once(__DIR__ . '/../vendor/autoload.php');

$contact = require('Contact.php');

return new KAAL\Middleware\Project($AppContext, $contact);