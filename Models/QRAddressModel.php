<?php
class QRAddressModel extends artnum\SQL {
    function __construct($db, $config) {
        $this->kconfig = $config;
        parent::__construct($db, 'qraddress', 'qraddress_id', []);
        $this->conf('auto-increment', true);
    }
}
