<?php

header('Content-Type: application/json', true);
echo '{"datetime":"'. (new DateTime())->format('c') . '"}';
