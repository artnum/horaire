<?php

namespace KAAL\Service\Address;

use JsonSerializable;
use PDO;
use Snowflake53\ID;
use stdClass;

class GenericAddress extends stdClass implements JsonSerializable
{
    use ID;
    protected bool $new;
    public int $id;

    protected function isNew()
    {
        if (!isset($this->id)) {
            $this->id = self::get63();
            $this->new = true;
        } else {
            $this->new = false;
        }

    }

    protected function exists(PDO $pdo): bool
    {
        if ($this->new) {
            return false;
        }
        $stmt = $pdo->prepare('SELECT id FROM addresses WHERE id = :id AND tenant_id = :tid');
        $stmt->bindValue(':id', $this->id, PDO::PARAM_INT);
        $stmt->bindValue(':tid', $this->tenant_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() === 1;
    }

    protected function create(PDO $pdo): bool
    {
        if (!$this->new) {
            return false;
        }
    }

    public function jsonSerialize(): mixed
    {
        $jsonArray = [
            'name' => $this->name,
            'country' => $this->country,
            'ext1' => isset($this->ext1) ? $this->ext1 : '',
            'ext2' => isset($this->ext2) ? $this->ext2 : '',
            'since' => isset($this->since) ? $this->since->format('Y-m-d') : '0001-01-01',
            'kind' => isset($this->kind) ? $this->kind : '',
            'priority' => isset($this->priority) ? $this->priority : 0

        ];

        if ($this->type == 'STRUCTURED') {
            $jsonArray['street'] = isset($this->str_or_line1) ? $this->str_or_line1 : '';
            $jsonArray['houseNumber'] = isset($this->str_or_line2) ? $this->str_or_line2 : '';
            $jsonArray['line1'] = '';
            $jsonArray['line2'] = '';
        } else {
            $jsonArray['line1'] = isset($this->str_or_line1) ? $this->str_or_line1 : '';
            $jsonArray['line2'] = isset($this->str_or_line2) ? $this->str_or_line2 : '';
            $jsonArray['street'] = '';
            $jsonArray['houseNumber'] = '';
        }

        return $jsonArray;
    }

}
