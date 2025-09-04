<?php

namespace KAAL\Utils;

/**
 * Legacy table have a prefix system, this remove the prefix.
 */
trait PrefixedTable {
    private function unprefix (array $line):array {
        return array_combine(
            array_map(
                function($k) { 
                    /* this is a specific key that is added to table and 
                     * must be stay as this no matter what.
                     * Some values may be added in the future.
                     */
                    if ($k === 'document_id') { return 'document_id'; }
                    if ($k === 'tenant_id') { return 'tenant_id'; }
                    $x = explode('_', $k, 2); return array_pop($x); 
                },
                array_keys($line)
            ),
            $line
        );
    }
}