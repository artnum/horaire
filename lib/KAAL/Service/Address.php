<?php

namespace KAAL\Service;

use DateTime;
use Exception;
use Generator;
use KAAL\Context;
use KAAL\Utils\MixedID;
use KAAL\Utils\VException;
use PDO;
use Snowflake53\ID;
use stdClass;
use KAAL\Service\Address\KAddress;
use KAAL\Service\Address\SAddress;

/**
 * Address are based on SwissQR address structure and encoding.
 * @see https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-fr.pdf SwissQR normatize documentation
 */
class Address
{
    use MixedID;
    use ID;

    public const TYPE_STRUCTURED = 'STRUCTURED';
    public const TYPE_UNSTRUCTURED = 'UNSTRUCTURED';

    public const FIELD_STREET_LENGTH = 70;
    public const FIELD_HOUSENUM_LENGTH = 16;
    public const FIELD_POSTALCODE_LENGTH = 16;
    public const FIELD_LOCALITY_LENGTH = 35;
    public const FIELD_LINE1_LENGTH = 70;
    public const FIELD_LINE2_LENGTH = 70;
    public const FIELD_NAME_LENGTH = 70;
    public const FIELD_COUNTRY_LENGTH = 2;
    public const FIELD_EXT1_LENGTH = 70;
    public const FIELD_EXT2_LENGTH = 70;

    public const FIEL_KIND_LENGTH = 10;

    public function __construct(private Context $context)
    {
    }

    /* as per https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.3-fr.pdf
     * « 4.1.1 Jeu de caractères ».
     */
    private function containsInvalidCodePoint(string $string): bool
    {
        $allowedRanges = (
            '\x{0020}-\x{007E}' .  // Basic Latin (U+0020 – U+007E)
            '|\x{00A0}-\x{00FF}' . // Latin-1 Supplement (U+00A0 – U+00FF)
            '|\x{0100}-\x{017F}' . // Latin Extended-A (U+0100 – U+017F)
            '|\x{0218}-\x{021B}' . // S/s, T/t with comma below (U+0218 – U+021B)
            '|\x{20AC}'            // Euro sign (U+20AC)
        );

        return preg_match('/^[' . $allowedRanges . ']*$/u', $string) === 0;
    }

    protected function normalizeEgressAddressRelation(stdClass $address): stdClass
    {
        if (empty($address->id)) {
            throw new VException('id');
        }
        $address->id = strval($this->normalizeId($address->id));
        if (empty($address->type) || ($address->type != 'STRUCTURED' && $address->type != 'UNSTRUCTURED')) {
            throw new VException('type');
        }


        return $address;
    }

    public function validate(stdClass $address)
    {
        $field_errors = [];
        if (empty($address->name)
            || mb_strlen($address->name) > self::FIELD_NAME_LENGTH
            || $this->containsInvalidCodePoint($address->name)
        ) {
            $field_errors[] = 'name';
        }
        /* default to CH */
        if (!empty($address->country)) {
            if (strlen($address->country) > self::FIELD_COUNTRY_LENGTH) {
                $field_errors[] = 'country';
            }
        }

        if (!empty($address->ext1) && (
            mb_strlen($address->ext1) > self::FIELD_EXT1_LENGTH
            || $this->containsInvalidCodePoint($address->ext1)
        )) {
            $field_errors[] = 'ext1';
        }

        if (!empty($address->ext2) && (
            mb_strlen($address->ext2) > self::FIELD_EXT1_LENGTH
            || $this->containsInvalidCodePoint($address->ext2)
        )) {
            $field_errors[] = 'ext2';
        }

        if ($address->type === self::TYPE_STRUCTURED) {
            if (!empty($address->str_or_line1)
                && (mb_strlen($address->str_or_line1, 'UTF-8')
                    > self::FIELD_STREET_LENGTH
                || $this->containsInvalidCodePoint($address->str_or_line1))
            ) {
                $field_errors[] = 'str_or_line1';
            }
            if (!empty($address->num_or_line2)
                && (mb_strlen($address->num_or_line2, 'UTF-8')
                    > self::FIELD_HOUSENUM_LENGTH
                || $this->containsInvalidCodePoint($address->num_or_line2))
            ) {
                $field_errors[] = 'num_or_line2';
            }

            if (empty($address->postal_code)
                || mb_strlen($address->postal_code, 'UTF-8') > self::FIELD_POSTALCODE_LENGTH
                || $this->containsInvalidCodePoint($address->postal_code)
            ) {
                $field_errors[] = 'postal_code';
            }
            if (empty($address->locality)
                || mb_strlen($address->locality, 'UTF-8') > self::FIELD_LOCALITY_LENGTH
                || $this->containsInvalidCodePoint($address->locality)
            ) {
                $field_errors[] = 'locality';
            }
        } elseif ($address->type === self::TYPE_UNSTRUCTURED) {
            if (!empty($address->str_or_line1)
                && (mb_strlen($address->str_or_line1, 'UTF-8')
                    > self::FIELD_LINE1_LENGTH
                || $this->containsInvalidCodePoint($address->str_or_line1))
            ) {
                $field_errors[] = 'str_or_line1';
            }
            if (!empty($address->num_or_line2)
                && (mb_strlen($address->num_or_line2, 'UTF-8')
                    > self::FIELD_LINE2_LENGTH
                || $this->containsInvalidCodePoint($address->num_or_line2))
            ) {
                $field_errors[] = 'num_or_line2';
            }
        }
        return (object)['errors' => $field_errors];
    }

    protected function normalizeIngressAddress(stdClass $address): stdClass
    {
        if (isset($address->id)) {
            if ($address->id === "new") {
                unset($address->id);
            } else {
                try {
                    $address->id = $this->normalizeId($address->id);
                } catch (Exception $e) {
                    throw new VException('Id');
                }
            }
        }
        if (empty($address->type)) {
            throw new VException('Type');
        }
        if (empty($address->name)
            || mb_strlen($address->name) > self::FIELD_NAME_LENGTH
            || $this->containsInvalidCodePoint($address->name)
        ) {
            throw new VException('Name');
        }
        /* default to CH */
        if (empty($address->country)) {
            $address->country = 'CH';
        }
        if (strlen($address->country) > self::FIELD_COUNTRY_LENGTH) {
            throw new VException('Country');
        }

        if (!empty($address->ext1) && (
            mb_strlen($address->ext1) > self::FIELD_EXT1_LENGTH
            || $this->containsInvalidCodePoint($address->ext1)
        )) {
            throw new VException('Ext1');
        }

        if (!empty($address->ext2) && (
            mb_strlen($address->ext2) > self::FIELD_EXT1_LENGTH
            || $this->containsInvalidCodePoint($address->ext2)
        )) {
            throw new VException('Ext2');
        }

        if ($address->type === self::TYPE_STRUCTURED) {
            if (!empty($address->str_or_line1)
                && (mb_strlen($address->str_or_line1, 'UTF-8')
                    > self::FIELD_STREET_LENGTH
                || $this->containsInvalidCodePoint($address->str_or_line1))
            ) {
                throw new VException('Street');
            }
            if (!empty($address->num_or_line2)
                && (mb_strlen($address->num_or_line2, 'UTF-8')
                    > self::FIELD_HOUSENUM_LENGTH
                || $this->containsInvalidCodePoint($address->num_or_line2))
            ) {
                throw new VException('House number');
            }

            if (empty($address->postal_code)
                || mb_strlen($address->postal_code, 'UTF-8') > self::FIELD_POSTALCODE_LENGTH
                || $this->containsInvalidCodePoint($address->postal_code)
            ) {
                throw new VException('Postal code');
            }
            if (empty($address->locality)
                || mb_strlen($address->locality, 'UTF-8') > self::FIELD_LOCALITY_LENGTH
                || $this->containsInvalidCodePoint($address->locality)
            ) {
                throw new VException('Locality');
            }
            return $address;
        } elseif ($address->type === self::TYPE_UNSTRUCTURED) {
            if (!isset($address->str_or_line1)) {
                $address->str_or_line1 = '';
            }
            if (!isset($address->num_or_line2)) {
                $address->num_or_line2 = '';
            }

            if (!empty($address->str_or_line1)
                && (mb_strlen($address->str_or_line1, 'UTF-8')
                    > self::FIELD_LINE1_LENGTH
                || $this->containsInvalidCodePoint($address->str_or_line1))
            ) {
                throw new VException('Line1');
            }
            if (!empty($address->num_or_line2)
                && (mb_strlen($address->num_or_line2, 'UTF-8')
                    > self::FIELD_LINE2_LENGTH
                || $this->containsInvalidCodePoint($address->num_or_line2))
            ) {
                throw new VException('Line2');
            }
            if (!empty($address->postal_code)) {
                $address->postal_code = '';
            }
            if (!empty($address->locality)) {
                $address->locality = '';
            }
            return $address;
        }
        throw new Exception('Unknown type');
    }

    protected function normalizeIngressRelation(stdClass $relation)
    {
        if (!isset($relation->since)) {
            $relation->since = '0001-01-01';
        } else {
            $relation->since = (new DateTime($relation->since))->format('Y-m-d');
        }
        if (!isset($relation->kind) || strlen($relation->kind) > self::FIEL_KIND_LENGTH) {
            throw new VException('kind');
        }

        if (!isset($relation->priority)) {
            $relation->priority = 0;
        } else {
            $relation->priority = intval($relation->priority);
        }
        return $relation;
    }

    private function relationExists(int $entity, int $tenant_id, stdClass $relation): int
    {
        $query = "SELECT address_id
                  FROM address_to_entity
                  WHERE kind = :kind
                    AND entity_id = :entity
                    AND priority = :priority
                    AND tenant_id = :tenant_id;";
        $stmt = $this->context->pdo()->prepare($query);
        $stmt->bindValue(':kind', $relation->kind, PDO::PARAM_STR);
        $stmt->bindValue(':entity_id', $entity, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':priority', $relation->priority, PDO::PARAM_INT);
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            return -1;
        }
        $row = $stmt->fetch(PDO::FETCH_OBJ);
        return $row->address_id;
    }

    public function getByKind(int $tenant_id, int $userid, string $kind): Generator
    {
        $stmt = $this->context->pdo()->prepare("
            SELECT addresses.id AS id, addresses.type, addresses.name AS name, addresses.str_or_line1 As str_or_line1,
                addresses.num_or_line2 AS num_or_line2, addresses.postal_code AS postal_code,
                addresses.locality AS locality, addresses.country AS country, addresses.ext1 AS ext1,
                addresses.ext2 AS ext2, address_to_entity.since AS since, addresses.type AS type,
                address_to_entity.kind AS kind
            FROM address_to_entity
            LEFT JOIN addresses ON address_to_entity.address_id = addresses.id
            WHERE address_to_entity.kind = :kind
                AND addresses.tenant_id = :tenant_id
                AND address_to_entity.entity_id = :userid
            ORDER BY address_to_entity.since DESC
        ");
        $stmt->bindValue(":kind", $kind, PDO::PARAM_STR);
        $stmt->bindValue(":tenant_id", $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(":userid", $userid, PDO::PARAM_INT);
        $stmt->execute();
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) != false) {
            yield $this->normalizeEgressAddressRelation($row);
        }
    }

    public function editAddress(int $entity_id, int $tenant_id, stdClass $relation, stdClass $address): int
    {
        try {
            $relation = $this->normalizeIngressRelation($relation);
            $address = $this->normalizeIngressAddress($address);

            $this->context->pdo()->beginTransaction();

            if (empty($address->id)) {
                throw new VException('id');
            }
            $stmt = $this->context->pdo()->prepare("
                UPDATE addresses
                SET type = :type, str_or_line1 = :str_or_line1, num_or_line2 = :num_or_line2,
                postal_code = :postal_code, locality = :locality, country = :country,
                ext1 = :ext1, ext2 = :ext2
                WHERE id = :id AND tenant_id = :tenant_id
                LIMIT 1
            ");
            $stmt->bindValue(":type", $address->type, PDO::PARAM_STR);
            $stmt->bindValue(":str_or_line1", $address->str_or_line1, PDO::PARAM_STR);
            $stmt->bindValue(":num_or_line2", $address->num_or_line2, PDO::PARAM_STR);
            $stmt->bindValue(":postal_code", $address->postal_code, PDO::PARAM_STR);
            $stmt->bindValue(":locality", $address->locality, PDO::PARAM_STR);
            $stmt->bindValue(":country", $address->country, PDO::PARAM_STR);
            $stmt->bindValue(":ext1", $address->ext1, PDO::PARAM_STR);
            $stmt->bindValue(":ext2", $address->ext2, PDO::PARAM_STR);
            $stmt->bindValue(":id", $address->id, PDO::PARAM_INT);
            $stmt->bindValue(":tenant_id", $tenant_id, PDO::PARAM_INT);
            $stmt->execute();

            $stmt = $this->context->pdo()->prepare("
                UPDATE address_to_entity 
                SET kind = :kind, priority = :priority, since = :since
                WHERE tenant_id = :tenant_id AND entity_id = :entity_id AND address_id = :address_id
            ");
            $stmt->bindValue(':kind', $relation->kind, PDO::PARAM_STR);
            $stmt->bindValue(':since', $relation->since, PDO::PARAM_STR);
            $stmt->bindValue(':priority', $relation->priority, PDO::PARAM_INT);
            $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
            $stmt->bindValue(':entity_id', $entity_id, PDO::PARAM_INT);
            $stmt->bindValue(':address_id', $address->id, PDO::PARAM_INT);
            if (!$stmt->execute()) {
                throw new Exception('Database error');
            }

            return $address->id;
        } catch (Exception $e) {
            if ($this->context->pdo()->inTransaction()) {
                $this->context->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function deleteAddress(int $entity_id, int $tenant_id, stdClass $relation, stdClass $address): int
    {
        try {
            $this->context->pdo()->beginTransaction();
            $relation = $this->normalizeIngressRelation($relation);
            $addressId = self::normalizeId($address->id);

            $stmt = $this->context->pdo()->prepare("
                DELETE FROM address_to_entity
                WHERE tenant_id = :tenant_id AND entity_id = :entity_id
                    AND address_id = :address_id AND kind = :kind
                    AND priority = :priority
            ");
            $stmt->bindValue(":tenant_id", $tenant_id, PDO::PARAM_INT);
            $stmt->bindValue(":entity_id", $entity_id, PDO::PARAM_INT);
            $stmt->bindValue(":address_id", $addressId, PDO::PARAM_INT);
            $stmt->bindValue(":kind", $relation->kind, PDO::PARAM_STR);
            $stmt->bindValue(":priority", $relation->priority, PDO::PARAM_INT);
            $stmt->execute();

            $stmt = $this->context->pdo()->prepare("
                DELETE FROM addresses
                WHERE tenant_id = :tenant_id AND id = :id
            ");
            $stmt->bindValue(":tenant_id", $tenant_id, PDO::PARAM_INT);
            $stmt->bindValue(":id", $addressId, PDO::PARAM_INT);
            $stmt->execute();

            $this->context->pdo()->commit();
            return $address->id;
        } catch (Exception $e) {
            if ($this->context->pdo()->inTransaction()) {
                $this->context->pdo()->rollBack();
            }
            throw $e;
        }
    }


    public function createAddress(int $entity_id, int $tenant_id, stdClass $relation, stdClass $address): int
    {
        try {
            $relation = $this->normalizeIngressRelation($relation);
            $address = $this->normalizeIngressAddress($address);

            if (!empty($address->id)) {
                throw new Exception('Not a new address');
            }
            $address->id = self::get63();

            $this->context->pdo()->beginTransaction();

            $stmt = $this->context->pdo()->prepare("
                INSERT INTO addresses
                (id, tenant_id, type, name, str_or_line1, num_or_line2, postal_code,
                 locality, country, ext1, ext2)
                VALUES (:id, :tenant_id, :type, :name, :str_or_line1, :num_or_line2,
                 :postal_code, :locality, :country, :ext1, :ext2)
                ");
            $stmt->bindValue(':id', $address->id, PDO::PARAM_INT);
            $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
            $stmt->bindValue(':type', $address->type, PDO::PARAM_STR);
            $stmt->bindValue(':name', $address->name, PDO::PARAM_STR);
            $stmt->bindValue(':str_or_line1', $address->str_or_line1, PDO::PARAM_STR);
            $stmt->bindValue(':num_or_line2', $address->num_or_line2, PDO::PARAM_STR);
            $stmt->bindValue(':postal_code', $address->postal_code, PDO::PARAM_STR);
            $stmt->bindValue(':locality', $address->locality, PDO::PARAM_STR);
            $stmt->bindValue(':country', $address->country, PDO::PARAM_STR);
            $stmt->bindValue(':ext1', $address->ext1, PDO::PARAM_STR);
            $stmt->bindValue(':ext2', $address->ext2, PDO::PARAM_STR);
            if (!$stmt->execute()) {
                throw new Exception('Database error');
            }

            $stmt = $this->context->pdo()->prepare("
                INSERT INTO address_to_entity
                (tenant_id, address_id, entity_id, kind, priority, since)
                VALUES(:tenant_id, :address_id, :entity_id, :kind, :priority, :since)
            ");
            $stmt->bindValue(':kind', $relation->kind, PDO::PARAM_STR);
            $stmt->bindValue(':since', $relation->since, PDO::PARAM_STR);
            $stmt->bindValue(':priority', $relation->priority, PDO::PARAM_INT);
            $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
            $stmt->bindValue(':entity_id', $entity_id, PDO::PARAM_INT);
            $stmt->bindValue(':address_id', $address->id, PDO::PARAM_INT);
            if (!$stmt->execute()) {
                throw new Exception('Database error');
            }

            $this->context->pdo()->commit();

            return $address->id;
        } catch (Exception $e) {
            if ($this->context->pdo()->inTransaction()) {
                $this->context->pdo()->rollBack();
            }
            throw $e;
        }
    }
}
