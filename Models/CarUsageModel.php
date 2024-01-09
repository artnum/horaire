<?php
class CarUsageModel extends artnum\SQL
{
    protected $kconf;
    function __construct($db, $config)
    {
        $this->kconf = $config;
        parent::__construct($db, 'carusage', 'carusage_id', []);
        $this->conf('auto-increment', true);
    }
}
