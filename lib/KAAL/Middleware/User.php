<?php

namespace KAAL\Middleware;

use Address as AddressAddress;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Exception;
use Generator;
use KAAL\Context;
use KAAL\Service\Address;
use KAAL\Utils\FinalException;
use KAAL\Middleware\User\CivilStatus;
use stdClass;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use KAAL\Utils\PrefixedTable;
use KaalDB\PDO\PDO;
use Snowflake53\ID;
use KAAL\Crypto;
use KAAL\Utils\AVS;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

const ORDER_STEP_SIZE = 100;

/**
 * Handle RPC call for namespace User
 *
 * @category None
 * @package  KAAL
 * @author   Etienne Bagnoud <etienne@artnum.ch>
 * @license  MIT https://opensource.org/license/mit
 * @link     none
 */
class User
{
    use CivilStatus;
    use ID;
    use MixedID;
    use PrefixedTable;
    use Normalizer;

    /* database allows 100, when we delete we add @ + a snowflake id in order
     * to free that username. So it's 78 max.
     * We don't delete to keep consistence with historic data.
     */
    public const MAX_USERNAME_LENGTH = 78;

    protected PDO $pdo;

    /**
     * Constructor function
     *
     * @param $context Application Context
     */
    public function __construct(protected Context $context)
    {
        $this->pdo = $context->pdo();
    }

    protected static function normalizeEgressKeyopt(string $keyopt): stdClass
    {
        $out = new stdClass();

        $parts = $parts = array_values(array_filter(explode(' ', $keyopt)));
        if (count($parts) < 2) {
            return $out;
        }

        $iterations = self::normalizeInt($parts[0]);
        if ($iterations <= 0) {
            return $out;
        }
        $salt = self::normalizeString($parts[1]);
        $algorithm = isset($parts[2]) ? self::normalizeString($parts[2]) : 'SHA-256';


        if (!match ($algorithm) {
            'SHA-256', 'SHA-384', 'SHA-512' => true,
            default => false
        }
        ) {
            return $out;
        }

        $out->iterations = $iterations;
        $out->salt = $salt;
        $out->algorithm = $algorithm;

        return $out;
    }

    protected static function normalizeEgressUser(stdClass $user): stdClass
    {
        if (empty($user)) {
            throw new Exception('No user provided', ERR_BAD_REQUEST);
        }
        if (!empty($user->id)) {
            $user->id = strval($user->id);
        }
        /* don't allow the user key to be outputed */
        unset($user->key);

        if (isset($user->tenant_id)) {
            /* private fields start with _ and filtered out on
             * output
             */
            $user->_tenant_id = self::normalizeId($user->tenant_id);
            unset($user->tenant_id);
        }

        if (isset($user->keyopt)) {
            $user->keyopt = self::normalizeEgressKeyopt(
                self::normalizeString($user->keyopt)
            );
        }
        if (empty($user->username)) {
            throw new FinalException('Must have username', ERR_BAD_REQUEST);
        }
        if (strlen($user->username) > 78) {
            throw new FinalException('Username too loog', ERR_BAD_REQUEST);
        }

        $user->name = self::normalizeString($user->name);
        $user->username = self::normalizeString($user->username);
        $user->level = self::normalizeInt($user->level);
        $user->deleted = self::normalizeTimestamp($user->deleted);
        $user->created = self::normalizeTimestamp($user->created);
        $user->modified = self::normalizeTimestamp($user->modified);
        $user->disabled = self::normalizeInt($user->disabled);
        $user->order = self::normalizeInt($user->order);
        $user->efficiency = self::normalizeFloat($user->efficiency);
        $user->workday = self::normalizeString($user->workday);
        $user->extid = self::normalizeString($user->extid);

        return $user;
    }

    /**
     * Normalize incoming user data
     *
     * @param $user   User data
     * @param $crypto Crypto module
     *
     * @return stdClass
     * @throws Exception
     */
    protected static function normalizeIngressUser(
        stdClass $user,
        Crypto $crypto
    ): stdClass {
        if (empty($user)) {
            throw new Exception('No user provided', ERR_BAD_REQUEST);
        }
        if (!empty($user->id)) {
            $user->id = self::normalizeId($user->id);
        }
        if (!empty($user->extid)) {
            $user->extid = self::normalizeId($user->extid);
        }

        /* don't allow the user key, keyopt to be inputed
         * authentication modification is left to the auth system
         */
        unset($user->key);
        unset($user->keyopt);

        /* created, deleted and modified are controller here
         * cannot be set from input
         */
        unset($user->created);
        unset($user->deleted);
        unset($user->modified);
        unset($user->tenant_id);

        if (isset($user->disabled)) {
            $user->disabled = self::normalizeBool($user->disabled) ? 1 : 0;
        }
        if (isset($user->level)) {
            $user->level = self::normalizeInt($user->level);
        }
        if (isset($user->order)) {
            $user->order = self::normalizeInt($user->order);
        }
        if (isset($user->efficiency)) {
            $user->efficiency = self::normalizeFloat($user->efficiency);
        }
        $user->name = self::normalizeString($user->name);
        $user->username = self::normalizeString($user->username);
        if (isset($user->workday)) {
            $user->workday = self::normalizeString($user->workday);
        }

        return $user;
    }

    /**
     * List all users
     *
     * @return Generator
     * @throws Exception
     *
     * @OperationType search
     */
    public function list(): Generator
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );
            $tenant_id = $this->context->auth()->get_tenant_id();
            $stmt = $this->pdo->prepare(
                'SELECT person_id, person_name, person_level, person_keyopt,
                    person_deleted, person_created, person_modified,
                    person_disabled, person_efficiency, person_order,
                    person_workday, person_extid, person_username
                FROM person
                WHERE tenant_id = :tenant_id
                    AND COALESCE(person_deleted, 0) = 0'
            );
            $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) !== false) {
                $user = (object) $this->unprefix($row);
                yield $this->normalizeEgressUser($user);
            }
        } catch (Exception $e) {
            $this->context->logger()->error('User listing failed', $e->getTrace());
            throw new Exception('User listing failed', ERR_INTERNAL, $e);
        }
    }


    private function _get(string|int $id): stdClass
    {
        try {
            $tenant_id = $this->context->auth()->get_tenant_id();
            $id = self::normalizeId($id);
            $stmt = $this->pdo->prepare(
                'SELECT person_id, person_name, person_level, person_keyopt,
                    person_deleted, person_created, person_modified,
                    person_disabled, person_efficiency, person_order,
                    person_workday, person_extid, person_username
                FROM person
                WHERE person_id = :id AND tenant_id = :tenant_id'
            );
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
            $stmt->execute();
            return $this->normalizeEgressUser(
                (object) $this->unprefix($stmt->fetch(PDO::FETCH_ASSOC))
            );
        } catch (Exception $e) {
            throw new Exception('User not found', ERR_INTERNAL, $e);
        }
    }


    public function newInvitation(string|int|stdClass $userid): stdClass
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        try {
            $id = self::normalizeId($userid);
            $tenant_id = $this->context->auth()->get_tenant_id();
            $invitation_code = $this->context->auth()->generate_invitation(
                $id,
                $tenant_id
            );

            return $this->egressInvitation($id, $invitation_code);
        } catch (Exception $e) {
            throw new Exception('Failed to generate invitation', ERR_INTERNAL, $e);
        }
    }

    public function deleteInvitation(
        string|int|stdClass $userid,
        string $invitation
    ): stdClass {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        try {
            $id = self::normalizeId($userid);
            $tenant_id = $this->context->auth()->get_tenant_id();
            return (object) [
                'success' => $this->context->auth()->deleteAnInvitation(
                    $id,
                    $tenant_id,
                    $invitation
                )
            ];
        } catch (Exception $e) {
            throw $e;
        }
    }

    private function deleteInvitations(
        string|int|stdClass $userid,
        int $tenant_id
    ): bool {
        return $this->context->auth()->delete_invitation($userid, $tenant_id);
    }

    private function egressInvitation(int $userid, string $code): stdClass
    {
        $url = str_replace(
            '{code}',
            $code,
            $this->context->conf()->get('url-invitation')
        );
        $qrCode = new QrCode(
            data: $url,
            size: 200,
        );

        $writer = new PngWriter();
        $result = $writer->write($qrCode);

        return (object)[
            'qrimage' => base64_encode($result->getString()),
            'invitation' => $code,
            'url' => $url,
            'user' => strval($userid)
        ];
    }

    /**
     * List all invitation for a specific user
     *
     * @param $userid The user in question
     *
     * @return A generator for all invitations avaialable
     */
    public function getInvitations(string|int|stdClass $userid): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        try {
            $tenant_id = $this->context->auth()->get_tenant_id();
            $id = self::normalizeId($userid);
            $url = $this->context->conf()->get('url-invitation');
            foreach (
                $this->context->auth()->list_invitations(
                    $id,
                    $tenant_id
                ) as $invitation
            ) {
                yield $this->egressInvitation($id, $invitation['auth']);
            }
        } catch (Exception $e) {
            throw new Exception('Inviation not found', ERR_INTERNAL, $e);
        }
    }

    /**
     * Activate or desactivate a user.
     *
     * @param $userid The user
     * @param $active Set user active or FinalException
     *
     * @return The user object
     */
    public function setActiveState(string|int|stdClass $userid, bool|int $active)
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $userid = self::normalizeId($userid);
        $active = self::normalizeBool($active);

        $stmt = $this->context->pdo()->prepare(
            'UPDATE person
            SET person_disabled = :active 
            WHERE person_id = :userid 
                AND tenant_id = :tenant_id'
        );
        $stmt->bindValue(':active', $active ? 0 : time(), PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(
            ':tenant_id',
            $this->context->auth()->get_tenant_id(),
            PDO::PARAM_INT
        );
        $stmt->execute();
        return $this->_get($userid);
    }

    /**
     * Get user by id
     *
     * @param string|int $id The user id
     *
     * @return stdClass
     * @throws Exception
     */
    public function get(string|int $id): stdClass
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        return $this->_get($id);
    }

    public function set(stdClass $user): stdClass
    {
        $isNew = false;
        $user = $this->normalizeIngressUser($user, $this->context->crypto());

        if (!isset($user->id)) {
            /* TODO : fix every js code that use this id as integer */
            $user->id = self::get53($this->context->machine_id);
            $isNew = true;
        }

        $stmt = $this->context->pdo()->prepare(
            'INSERT INTO `person` (`person_id`, `person_name`, `person_username`,
                `tenant_id`, `person_created`, `person_modified`, `person_deleted`)
            VALUES (:id, :name, :username, :tenant, :created, :modified, 0)
            ON DUPLICATE KEY UPDATE `person_name` = VALUES(`person_name`),
                `person_username` = VALUES(`person_username`),
                `person_modified` = VALUES(`person_modified`)'
        );

        $ts = time();
        $stmt->bindValue(':id', $user->id, PDO::PARAM_INT);
        $stmt->bindValue(':created', $ts, PDO::PARAM_INT);
        $stmt->bindValue(':modified', $ts, PDO::PARAM_INT);
        $stmt->bindValue(
            ':tenant',
            $this->context->auth()->get_tenant_id(),
            PDO::PARAM_INT
        );
        $stmt->bindValue(':name', $user->name, PDO::PARAM_STR);
        $stmt->bindValue(':username', $user->username, PDO::PARAM_STR);
        $stmt->execute();

        if ($isNew) {
            // always generate an inviation for new user, it's the next
            // logical step for end user
            $this->newInvitation($user->id);
        }

        return $this->_get($user->id);
    }

    private function normalizeEgressPersonnalData(stdClass $pdata): stdClass
    {
        if (isset($pdata->avs_number) && $pdata->avs_number > 0) {
            $pdata->avs_number = AVS::format($pdata->avs_number);
        }
        if (isset($pdata->avs_number) && $pdata->avs_number === 0) {
            $pdata->avs_number = '';
        }

        if (!isset($pdata->birthday) || $pdata->birthday === null) {
            $pdata->birthday = '';
        }

        $pdata->id = $pdata->person_id;
        $pdata->_tenant_id = $pdata->tenant_id;

        unset($pdata->person_id);
        unset($pdata->tenant_id);

        return $pdata;
    }

    private function normalizeIngressPersonnalData(stdClass $pdata): stdClass
    {
        if (!empty($pdata->avs_number) && AVS::check($pdata->avs_number)) {
            $pdata->avs_number = AVS::toint($pdata->avs_number);
        } else {
            $pdata->avs_number = 0;
        }
        if (!isset($pdata->employee_number)) {
            $pdata->employee_number = '';
        }
        if (!isset($pdata->birthday) || empty($pdata->birthday)) {
            $pdata->birthday = null;
        }
        if (!isset($pdata->sex)) {
            $pdata->sex = '';
        }

        if (!isset($pdata->canton_residency)) {
            $pdata->canton_residency = '';
        }

        if (!isset($pdata->language)) {
            $pdata->language = '';
        }

        if (!isset($pdata->residency_type)) {
            $pdata->residency_type = 0;
        }
        if (!isset($pdata->nationality)) {
            $pdata->nationality = '';
        }
        return $pdata;
    }

    public function delete(string|int|stdClass $id): stdClass
    {
        $id = self::normalizeId($id);
        $tenant_id = $this->context->auth()->get_tenant_id();

        $currentUser = $this->get($id);

        $this->context->pdo()->exec('START TRANSACTION');
        try {
            $access = new Access($this->context);
            $groups = new UserGroup($this->context);

            $stmt = $this->context->pdo()->prepare(
                'UPDATE `person`
                SET `person_deleted` = :time, `person_username` = :username
                WHERE `person_id` = :id AND `tenant_id` = :tenant'
            );
            $stmt->bindValue(
                ':username',
                $currentUser->username . '@' . strval(self::get63($this->context->machine_id)),
                PDO::PARAM_STR
            );
            $stmt->bindValue(':time', time(), PDO::PARAM_INT);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':tenant', $tenant_id, PDO::PARAM_INT);
            $stmt->execute();

            if (!$access->deleteUserRoles($id)->success
                || !$groups->deleteUserGroups($id)->success
            ) {
                throw new Exception('User deletion failed', ERR_INTERNAL);
            }

            /* All user shares are deleted */
            $this->context->auth()->del_all_shares($id);

            $this->context->pdo()->exec('COMMIT');
            return (object)['success' => true];
        } catch (Exception $e) {
            $this->context->pdo()->exec('ROLLBACK');
            throw $e;
        }
    }

    public function getPersonnalData(string|int $id): stdClass
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $stmt = $this->context->pdo()->prepare(
            'SELECT person_id, employee_number, avs_number, sex, birthday,
                nationality, canton_residency, residency_type, language
            FROM person_details
            WHERE person_id = :id AND tenant_id = :tenant'
        );
        $stmt->bindValue(':id', self::normalizeId($id), PDO::PARAM_INT);
        $stmt->bindValue(
            ':tenant',
            $this->context->auth()->get_tenant_id(),
            PDO::PARAM_INT
        );
        $stmt->execute();
        $pdata = $stmt->fetch(PDO::FETCH_OBJ);
        if ($pdata === false) {
            $pdata = new stdClass();
        }
        return $this->normalizeEgressPersonnalData($pdata);
    }

    public function setPersonnalData(stdClass $personnalData): stdClass
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $personnalData = $this->normalizeIngressPersonnalData($personnalData);
        if (!isset($personnalData->id)) {
            throw new Exception('No id', ERR_BAD_REQUEST);
        }

        $stmt = $this->context->pdo()->prepare(
            'INSERT INTO `person_details` (`employee_number`, `avs_number`, `sex`,
                `birthday`, `nationality`, `canton_residency`, `residency_type`,
                `language`, `tenant_id`, `person_id`)
             VALUES (:enumber, :anumber, :sex, :birthday, :nationality,
                :cantonr, :rtype, :language, :tenant, :id)
            ON DUPLICATE KEY UPDATE `employee_number` = VALUES(`employee_number`),
                `avs_number` = VALUES(`avs_number`), `sex` = VALUES(`sex`),
                `birthday` = VALUES(`birthday`),
                `nationality` = VALUES(`nationality`),
                `canton_residency` = VALUES(`canton_residency`),
                `residency_type` = VALUES(`residency_type`),
                `language` = VALUES(`language`);'
        );
        $stmt->bindValue(
            ':id',
            self::normalizeId($personnalData->id),
            PDO::PARAM_INT
        );
        $stmt->bindValue(
            ':tenant',
            $this->context->auth()->get_tenant_id(),
            PDO::PARAM_INT
        );
        $stmt->bindValue(
            ':enumber',
            $personnalData->employee_number,
            PDO::PARAM_STR
        );
        $stmt->bindValue(':anumber', $personnalData->avs_number, PDO::PARAM_INT);
        $stmt->bindValue(':sex', $personnalData->sex, PDO::PARAM_STR);
        $stmt->bindValue(
            ':birthday',
            $personnalData->birthday,
            $personnalData->birthday === null ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $stmt->bindValue(
            ':nationality',
            $personnalData->nationality,
            PDO::PARAM_STR
        );
        $stmt->bindValue(
            ':cantonr',
            $personnalData->canton_residency,
            PDO::PARAM_STR
        );
        $stmt->bindValue(':rtype', $personnalData->residency_type, PDO::PARAM_STR);
        $stmt->bindValue(':language', $personnalData->language, PDO::PARAM_STR);
        $stmt->execute();
        return $this->getPersonnalData($personnalData->id);
    }

    /**
     * Filter user data
     *
     * @param stdClass $user User object
     *
     * @return stdClass
     */
    private function _filterOutManagementData(stdClass $user): stdClass
    {
        foreach ([
            'efficiency',
            'extid',
            'level',
            'disabled',
            'modified',
            'deleted',
            'created'
        ] as $field) {
            if (property_exists($user, $field)) {
                unset($user->$field);
            }
        }

        return $user;
    }

    /**
     * User get himself
     *
     * @return stdClass
     *
     * @throws Exception
     */
    public function getSelf(): stdClass
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        return $this->_filterOutManagementData(
            $this->_get($this->context->auth()->get_current_userid())
        );
    }

    /**
     * Reorder all users
     *
     * @param array $visible User id array in order for users in visible category
     * @param array $hidden  User id array in order for users in hidden category
     *
     * @return Generator
     * @throws Exception
     *
     * @OperationType write
     */
    public function reorder(array $visible, array $hidden): Generator
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );
            $tenant_id = $this->pdo->quote($this->context->auth()->get_tenant_id());
            $caseClauses = [];
            $ids = [];

            if (!empty($visible)) {
                foreach (array_values($visible) as $index => $id) {
                    $qid = $this->pdo->quote($id, PDO::PARAM_INT);
                    $position = ($index + 1) * ORDER_STEP_SIZE;
                    $caseClauses[] = "WHEN person_id = $qid THEN $position";
                    $ids[] = $qid;
                }
            }
            if (!empty($hidden)) {
                foreach (array_values($hidden) as $index => $id) {
                    $qid = $this->pdo->quote($id, PDO::PARAM_INT);
                    $caseClauses[] = "WHEN person_id = $qid THEN -1";
                    $ids[] = $qid;
                }
            }

            $caseClause = implode("\n        ", $caseClauses);
            $inClause = implode(', ', $ids);

            $this->pdo->exec(
                "
                UPDATE person 
                SET person_order = CASE
                    $caseClause
                    ELSE person_order
                END
                WHERE person_id IN ($inClause) AND tenant_id = $tenant_id
                "
            );
            $stmt = $this->pdo->query(
                "SELECT person_id, person_order
                FROM person WHERE tenant_id = $tenant_id"
            );
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) !== false) {
                yield $this->normalizeEgressUser(
                    (object) $this->unprefix($row)
                );
            }
        } catch (Exception $e) {
            throw new Exception('Reorder failed', ERR_INTERNAL, $e);
        }
    }

    public function create(stdClass $userData): stdClass
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );
            $tenant_id = $this->pdo->quote($this->context->auth()->get_tenant_id());
        } catch (Exception $e) {
            throw new Exception('Creation failed', ERR_INTERNAL, $e);
        }
        return $userData;
    }


    private function normalizeIngressPrice(stdClass $price): stdClass
    {
        if (!empty($price->_id)) {
            $price->id = $price->_id;
        }
        if (isset($price->id)) {
            $price->id = self::normalizeId($price->id);
        }
        if (isset($price->person)) {
            $price->person = self::normalizeId($price->person);
        }
        if (isset($price->value)) {
            $price->value = self::normalizeFloat($price->value);
        }
        if (isset($price->validity)) {
            $price->validity = self::normalizeDate($price->validity);
        }
        return $price;
    }

    private function normalizeEgressPrice(stdClass $price): stdClass
    {
        $price->_tenant_id = $price->tenant_id;
        unset($price->tenant_id);
        $price->id = strval($price->id);
        $price->person = strval($price->person);
        return $price;
    }

    private function _setPrice(int $userid, int $tenant_id, stdClass $price): bool
    {
        $stmt = $this->context->pdo()->prepare(
            'INSERT INTO `prixheure` (`prixheure_id`, `prixheure_person`,
                `prixheure_value`, `prixheure_validity`, `tenant_id`)
            VALUES (:id, :person, :value, :validity, :tenant)
            ON DUPLICATE KEY UPDATE `prixheure_value` = VALUES(`prixheure_value`), 
                `prixheure_validity` = VALUES(`prixheure_validity`)'
        );
        if (!isset($price->id)) {
            $price->id = self::get63($this->context->machine_id);
        }
        $stmt->bindValue(
            ':id',
            $price->id,
            PDO::PARAM_INT
        );
        $stmt->bindValue(
            ':tenant',
            $tenant_id,
            PDO::PARAM_INT
        );
        $stmt->bindValue(':value', $price->value, PDO::PARAM_STR);
        $stmt->bindValue(':validity', $price->validity, PDO::PARAM_STR);
        $stmt->bindValue(':person', $userid, PDO::PARAM_INT);

        $stmt->execute();
        var_dump($price);
        return $price->id;

    }

    private function _deletePrice(int $tenant_id, stdClass $price): int
    {
        $stmt = $this->context->pdo()->prepare(
            'DELETE FROM `prixheure`
            WHERE `prixheure_id` = :id
                AND `tenant_id` = :tenant'
        );
        $stmt->bindValue(':id', $price->id, PDO::PARAM_INT);
        $stmt->bindValue(
            ':tenant',
            $tenant_id,
            PDO::PARAM_INT
        );
        $stmt->execute();
        return $price->id;
    }

    public function setPricing(int|string|stdClass $user, stdClass $prices): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        $tenant_id = $this->context->auth()->get_tenant_id();
        $userid = self::normalizeId($user);
        try {
            $this->context->pdo()->beginTransaction();
            foreach (array_merge($prices->modified, $prices->created) as $price) {
                $price = $this->normalizeIngressPrice($price);
                yield (object) ['id' => $this->_setPrice($userid, $tenant_id, $price)];
            }
            foreach ($prices->deleted as $price) {
                $price = $this->normalizeIngressPrice($price);
                yield (object)[$this->_deletePrice($tenant_id, $price)];
            }
            $this->context->pdo()->commit();
        } catch (Exception $e) {
            if ($this->context->pdo()->inTransaction()) {
                $this->context->pdo()->rollBack();
            }
            throw $e;
        }
    }

    public function setPrice(int|string|stdClass $user, stdClass $price): stdClass
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $userid = self::normalizeId($user);
        $tenant_id = $this->context->auth()->get_tenant_id();
        $price = $this->normalizeIngressPrice($price);
        $this->_setPrice($userid, $tenant_id, $price);
        return $this->normalizeEgressPrice($price);
    }

    public function deletePrice(stdClass $price): stdClass
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        $tenant_id = $this->context->auth()->get_tenant_id();
        $price = $this->normalizeIngressPrice($price);
        $this->_deletePrice($tenant_id, $price);
        return (object)['id' => strval($price->id)];
    }

    /**
     * @return Generator<stdClass>
     */
    public function listPrice(stdClass $price): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $tenant_id = $this->context->auth()->get_tenant_id();
        $price = $this->normalizeIngressPrice($price);

        $stmt = $this->context->pdo()->prepare(
            'SELECT `prixheure_id`, `prixheure_value`, `prixheure_person`,
                `prixheure_validity`, `tenant_id`
            FROM `prixheure`
            WHERE `prixheure_person` = :person
                AND `tenant_id` = :tenant
            ORDER BY `prixheure_validity` DESC'
        );

        $stmt->bindValue(':person', $price->person, PDO::PARAM_INT);
        $stmt->bindValue(':tenant', $tenant_id, PDO::PARAM_INT);
        $stmt->execute();

        $i = 0;
        while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) !== false) {
            $price = $this->normalizeEgressPrice(
                (object) $this->unprefix($row)
            );
            $price->_order = ++$i;
            yield $price;
        }
    }

    public function getPersonnalAddresses(int|stdClass $id): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        if ($id instanceof stdClass) {
            $id = self::normalizeId($id->id);
        }
        $addrService = new Address($this->context);
        foreach ($addrService->getByKind($this->context->auth()->get_tenant_id(), $id, 'HOMEADDR') as $address) {
            yield $address;
        }
    }

    public function setPersonnalAddresses(int|string|stdClass $id, array $addresses): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $id = self::normalizeId($id);
        foreach ($addresses as $address) {
            if (!empty($address->since)) {
                $address->since = self::normalizeDate($address->since);
            }
            $addrService = new Address($this->context);
            if (empty($address->id) || $address->id === 'new') {
                $relation = (object)[
                    'kind' => 'HOMEADDR',
                    'since' => empty($address->since) ? '0001-01-01' : $address->since,
                    'priority' => 0
                ];
                yield (object) ['address' => $addrService->createAddress($id, $this->context->auth()->get_tenant_id(), $relation, $address)];
            } else {
                $address->id = self::normalizeId($address->id);
                $relation = (object) [
                    'kind' => 'HOMEADDR',
                    'since' => empty($address->since) ? '0001-01-01' : $address->since,
                    'priority' => 0
                ];
                yield (object)['address' => $addrService->editAddress($id, $this->context->auth()->get_tenant_id(), $relation, $address)];
            }
        }
    }

    public function deletePersonnalAddresses(int|string|stdClass $id, array $addresses)
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        $addrService = new Address($this->context);
        $id = self::normalizeId($id);
        foreach ($addresses as $address) {
            $relation = (object)[
                                'kind' => 'HOMEADDR',
                                'priority' => 0
                            ];

            yield (object) ['id' => $addrService->deleteAddress($id, $this->context->auth()->get_tenant_id(), $relation, $address)];
        }
    }
}
