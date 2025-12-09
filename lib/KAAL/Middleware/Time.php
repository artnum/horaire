<?php

namespace KAAL\Middleware;

use DateInterval;
use DateTime;
use Exception;
use Generator;
use KAAL\Context;
use KAAL\Utils\FinalException;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use MixedID as MixedIDMixedID;
use PDO;
use Snowflake53\ID;
use stdClass;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL };

class Time
{
    use ID;
    use MixedID;
    use Normalizer;

    public function __construct(private Context $context)
    {

    }

    private function _normalizeIngressTimeEntry(stdClass $entry)
    {
        return $entry;
    }

    private function _normalizeEgressTimeEntry(stdClass $entry)
    {
        if ($entry->id === null || empty($entry->id)) {
            throw new Exception('ID missing', ERR_INTERNAL);
        }
        $entry->id = self::normalizeId($entry->id);
        /*hstatus.status_id AS hstatus_id, hstatus.status_name
                     AS hstatus_name, hstatus.status_color AS hsatus_color,
                     tstatus.status_id AS tstatus_id, tstatus.status_name
                     AS tstatus_name, tstatus.status_color AS tstatus_color,
                     htime_id, htime_day, htime_value, htime_process,
                     htime_comment, htime_dinner, htime_km, project_id,
                     project_reference, project_name, travail_id, travail_reference,
                     travail_description, travail_status
        */
        $entry->day = self::normalizeDate($entry->day);
        $entry->value = self::normalizeTimestamp($entry->value);
        $entry->comment = self::normalizeString($entry->comment);
        $entry->dinner = self::normalizeBool($entry->dinner);
        $entry->km = self::normalizeInt($entry->km);
        if (!empty($entry->project->id)) {
            $entry->project->id = self::normalizeId($entry->project->id);
        }
        $entry->project->name = self::normalizeString($entry->project->name);
        $entry->project->reference = self::normalizeString($entry->project->reference);
        if (!empty($entry->travail->id)) {
            $entry->travail->id = self::normalizeId($entry->travail->id);
            $entry->travail->reference = self::normalizeString($entry->travail->reference);
            $entry->travail->description = self::normalizeString($entry->travail->description);
            if (!empty($entry->travail->status->id)) {
                $entry->travail->status->id = self::normalizeId($entry->travail->status->id);
                $entry->travail->status->name = self::normalizeString($entry->travail->status->name);
                $entry->travail->status->color = self::normalizeString($entry->travail->status->color);
            }
        }
        if (!empty($entry->status->id)) {
            $entry->status->id = self::normalizeId($entry->status->id);
        }
        $entry->status->name = self::normalizeString($entry->status->name);
        $entry->status->color = self::normalizeString($entry->status->color);

        return $entry;
    }

    public function getMyMonth(int $year, int $month): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $strYear = strval($year);
        $strMonth = str_pad(strval($month), 2, '0', STR_PAD_LEFT);
        if (!ctype_digit($strMonth) || !ctype_digit($strYear)) {
            throw new FinalException('Bad year or month', ERR_BAD_REQUEST);
        }
        /* TESTED QUERY :
         * SELECT hstatus.status_id AS hstatus_id, hstatus.status_name AS hstatus_name,
         * hstatus.status_color AS hsatus_color, tstatus.status_id AS tstatus_id,
         * tstatus.status_name AS tstatus_name, tstatus.status_color AS tstatus_color,
         * htime_id, htime_day, htime_value, htime_process, htime_comment, htime_dinner,
         * htime_km, project_id, project_reference, project_name, travail_id, travail_reference,
         * travail_description, travail_status
         * FROM htime
         * LEFT JOIN project ON htime_project = project_id
         * LEFT JOIN travail ON htime_travail = travail_id
         * LEFT JOIN kairos.status AS tstatus ON travail_status = tstatus.status_id
         * LEFT JOIN kairos.status AS hstatus ON htime_process = hstatus.status_id
         * WHERE htime_day LIKE '2025-08-%'
         *       AND htime_person = 48
         *       AND COALESCE(htime_deleted, 0) = 0
         */

        $query = sprintf(
            "SELECT hstatus.status_id AS hstatus_id, hstatus.status_name 
             AS hstatus_name, hstatus.status_color AS hstatus_color,
             tstatus.status_id AS tstatus_id, tstatus.status_name 
             AS tstatus_name, tstatus.status_color AS tstatus_color,
             htime_id, htime_day, htime_value,
             htime_comment, htime_dinner, htime_km, project_id,
             project_reference, project_name, travail_id, travail_reference,
             travail_description
            FROM htime
            LEFT JOIN project ON htime_project = project_id
            LEFT JOIN travail ON htime_travail = travail_id
            LEFT JOIN kairos.status AS tstatus ON travail_status = tstatus.status_id
            LEFT JOIN kairos.status AS hstatus ON htime_process = hstatus.status_id
            WHERE htime_day LIKE '%s-%s-%%'
                AND htime_person = :person
                AND COALESCE(htime_deleted, 0) = 0
            ORDER BY htime_day ASC
            ",
            $strYear,
            $strMonth
        );
        $stmt = $this->context->pdo()->prepare($query);
        $stmt->bindValue(
            ':person',
            $this->context->auth()->get_current_userid(),
            PDO::PARAM_INT
        );
        $stmt->execute();

        while (($timeEntry = $stmt->fetch(PDO::FETCH_ASSOC))) {
            $timeEntryObj = new stdClass();
            $timeEntryObj->project = new stdClass();
            $timeEntryObj->travail = new stdClass();
            $timeEntryObj->status = new stdClass();
            foreach ($timeEntry as $k => $v) {
                $kparts = explode('_', $k, 2);
                if (count($kparts) < 2) {
                    $timeEntryObj->{$kparts[0]} = $v;
                } else {
                    switch ($kparts[0]) {
                        case 'htime':
                            $timeEntryObj->{$kparts[1]} = $v;
                            break;
                        case 'travail':
                            $timeEntryObj->travail->{$kparts[1]} = $v;
                            break;
                        case 'project':
                            $timeEntryObj->project->{$kparts[1]} = $v;
                            break;
                        case 'hstatus':
                            $timeEntryObj->status->{$kparts[1]} = $v;
                            break;
                        case 'tstatus':
                            if (!isset($timeEntryObj->travail->status)) {
                                $timeEntryObj->travail->status = new stdClass();
                            }
                            $timeEntryObj->travail->status->{$kparts[1]} = $v;
                            break;
                    }
                }
            }
            yield $this->_normalizeEgressTimeEntry($timeEntryObj);
        }
    }
    private function _getWritableDay(int $userid)
    {
        /* TODO : fetch that from configuration */
        $delay = 2;

        $days = [];
        $interval = new DateInterval('P1D');
        $origin = new DateTime();
        /* the delay is the number of days that can be written, but if there
         * is week-end work planned, it extends the delay */
        do {
            $weekDay = intval($origin->format('w'));
            $date = $origin->format('Y-m-d');
            if ($weekDay == 6 || $weekDay == 0) {
                $stmt = $this->context->pdo()->prepare(
                    "SELECT reservation_id 
                     FROM kairos.reservation 
                     WHERE reservation_dend = :date 
                       AND reservation_target = :person
                    LIMIT 1"
                );
                $stmt->bindValue(':date', $date, PDO::PARAM_STR);
                $stmt->bindValue(':person', strval($userid), PDO::PARAM_STR);
                $stmt->execute();
                if ($stmt->rowCount() > 0) {
                    $days[] = $date;
                }
                $origin->sub($interval);
                continue;
            }
            $days[] = $date;
            $delay--;
            $origin->sub($interval);
        } while ($delay > 0);

        return $days;

    }

    public function getMyWritableDays()
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        return (object) ['writable' => $this->_getWritableDay($this->context->auth()->get_current_userid())];
    }
    /* SELECT project_id, project_reference, project_name, person_id, person_name,(CASE WHEN htime_id IS NULL THEN false ELSE true END) AS has_worked
     * FROM project
     * LEFT JOIN htime ON htime_project = project_id AND htime_person = 48 AND COALESCE(htime_deleted, 0) = 0
     * LEFT JOIN person ON person_id = project_manager
     * WHERE COALESCE(project_deleted, 0) = 0 AND project_closed IS NULL
     * GROUP BY project_id
     * ORDER BY htime_modified,project_modified ASC;
     */
    /* select * from project
     * left join htime on htime_project = project_id and htime_person = 48 and COALESCE(htime_deleted,0) = 0
     * where COALESCE(project_deleted,0) = 0
     * group by project_id
     * order by project_modified ASC;
     */
    public function getMyProjects(): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $stmt = $this->context->pdo()->prepare('
            SELECT project_id, project_reference, project_name, project_manager,
                (CASE WHEN htime_id IS NULL THEN false ELSE true END) AS has_worked
            FROM project
            LEFT JOIN htime ON htime_project = project_id AND htime_person = :uid 
                AND COALESCE(htime_deleted, 0) = 0
            WHERE COALESCE(project_deleted, 0) = 0 AND project_closed = NULL
            GROUP BY project_id
            ORDER BY htime_modified, project_modified DESC
        ');

        $stmt->bindValue(':uid', $this->context->auth()->get_current_userid(), PDO::PARAM_INT);
        $stmt->execute();
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) !== false) {
            $out = new stdClass();

            $out->id = strval(MixedID::normalizeId($row->project_id));
            $out->reference = Normalizer::normalizeString($row->project_reference);
            $out->name = Normalizer::normalizeString($row->project_name);
            $out->manager = strval(MixedID::normalizeId($row->project_manager));
            $out->worked = Normalizer::normalizeBool($row->has_worked);

            yield($out);
        }
    }




    public function addToMyTime(stdClass $entry)
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $entry = $this->_normalizeIngressTimeEntry($entry);

        $userid = $this->context->auth()->get_current_userid();
        $wDay = $this->_getWritableDay($userid);
        if (!in_array($entry->day->format('Y-m-d'), $wDay, true)) {
            throw new FinalException('This day is not writable');
        }
    }
}
