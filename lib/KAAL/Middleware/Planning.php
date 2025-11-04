<?php

namespace KAAL\Middleware;

use DateInterval;
use DateTime;
use Generator;
use KAAL\Context;
use KAAL\Utils\Boolean;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use PDO;
use stdClass;

class Planning
{
    use MixedID;
    use Normalizer;
    public function __construct(private Context $context)
    {
    }

    private function normalizeStatus(stdClass $status): stdClass
    {
        $s = new stdClass();
        $s->id = self::normalizeId($status->status_id);
        $s->color = self::normalizeString($status->status_color);
        $s->bgcolor = self::normalizeString($status->status_bgcolor);
        $s->name = self::normalizeString($status->status_name);
        $s->description = self::normalizeString($status->status_description);
        $s->symbol = self::normalizeString($status->status_symbol);
        $s->group = self::normalizeString($status->status_group);
        $s->type = self::normalizeId($status->status_type);
        return $s;
    }

    private function normalizeCoworker(stdClass $co): stdClass
    {
        $coworker = new stdClass();
        $coworker->dates = [];
        $coworker->id = self::normalizeId($co->person_id);
        $coworker->name = self::normalizeString($co->person_name);
        $coworker->affaire = self::normalizeInt($co->reservation_affaire);
        $coworker->status = self::normalizeInt($co->reservation_status);
        $begin = new DateTime($co->reservation_dbegin);
        $end = new DateTime($co->reservation_dend);
        do {
            $coworker->dates[] = $begin->format('Y-m-d');
            $begin = $begin->add(new DateInterval('P1D'));
        } while ($begin->format('Y-m-d') < $end->format('Y-m-d'));

        return $coworker;
    }

    /**
     * @return Generator<stdClass>
     */
    public function myForecast(int $days = 9): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $userid = $this->context->auth()->get_current_userid();
        $tenant_id = $this->context->auth()->get_tenant_id();

        $dateRange = [
            (new DateTime())->add(new DateInterval('P1D'))->format('Y-m-d'),
            (new DateTime())->add(new DateInterval(sprintf('P%dD', $days + 1)))->format('Y-m-d')
        ];

        $stmt = $this->context->pdo()->prepare('
            SELECT reservation_id, travail_reference, travail_status, travail_description,
                project_reference, project_name, project_manager,
                p1.person_name AS person_name, reservation_status, reservation_dbegin, reservation_dend,
                reservation_affaire, p2.person_name AS technician_name
            FROM kairos.reservation
            LEFT JOIN kaal.travail ON reservation_affaire = kaal.travail.travail_id
            LEFT JOIN kaal.project ON travail_project = kaal.project.project_id
            LEFT JOIN kaal.person AS p1 ON project_manager = p1.person_id
            LEFT JOIN kaal.person AS p2 ON reservation_technician = p2.person_id
            WHERE reservation_target = :userid
                AND reservation_dbegin <= :end AND reservation_dend >= :begin
                AND COALESCE(reservation_deleted, 0) = 0
            ORDER BY reservation_dbegin ASC
        ');
        $stmt->bindValue(':userid', strval($userid), PDO::PARAM_STR);
        $stmt->bindValue(':begin', $dateRange[0], PDO::PARAM_STR);
        $stmt->bindValue(':end', $dateRange[1], PDO::PARAM_STR);
        $stmt->execute();

        $stmt2 = $this->context->pdo()->prepare('
            SELECT person_name, reservation_affaire, reservation_status,
                reservation_dbegin, reservation_dend, person_id
            FROM kairos.reservation
            LEFT JOIN kaal.person ON reservation_target = kaal.person.person_id
            WHERE reservation_target <> :userid
                AND reservation_dbegin <= :end AND reservation_dend >= :begin
                AND COALESCE(reservation_deleted, 0) = 0
        ');
        $stmt2->bindValue(':userid', strval($userid), PDO::PARAM_STR);
        $stmt2->bindValue(':begin', $dateRange[0], PDO::PARAM_STR);
        $stmt2->bindValue(':end', $dateRange[1], PDO::PARAM_STR);
        $stmt2->execute();
        $coworkers = array_map(
            fn ($c) => $this->normalizeCoworker($c),
            $stmt2->fetchAll(PDO::FETCH_OBJ)
        );

        $stmt3 = $this->context->pdo()->prepare('
            SELECT rallocation_target, rallocation_source, rallocation_date
            FROM kairos.rallocation
            WHERE rallocation_date >= :begin AND rallocation_date <= :end
                AND rallocation_type = "afftbcar"
        ');
        $stmt3->bindValue(':begin', $dateRange[0], PDO::PARAM_STR);
        $stmt3->bindValue(':end', $dateRange[1], PDO::PARAM_STR);
        $stmt3->execute();
        $cars = $stmt3->fetchAll(PDO::FETCH_OBJ);

        $status = array_map(
            fn ($s) => $this->normalizeStatus($s),
            $this->context->pdo()->query('
                SELECT * FROM kairos.status
                WHERE status_type IN (1,2) AND COALESCE(status_deleted, 0) = 0
            ')->fetchAll(PDO::FETCH_OBJ)
        );

        $cars = array_filter(
            array_map(function ($c) use ($status) {
                $c->status = array_find(
                    $status,
                    fn ($s) => $s->id === intval($c->rallocation_source) &&
                        $s->group === 'Véhicule'
                );
                return $c;
            }, $cars),
            fn ($c) => $c->status !== null
        );
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) !== false) {
            $out = new stdClass();
            $out->id = $row->reservation_id;
            $out->affaire = self::normalizeInt($row->reservation_affaire);
            $out->reference = self::normalizeString($row->project_reference);
            $out->managers = [];
            $p1 = self::normalizeString($row->person_name);
            $p2 = self::normalizeString($row->technician_name);
            if (!empty($p1)) {
                $out->managers[] = $p1;
            }
            if (!empty($p2)) {
                $out->managers[] = $p2;
            }
            $out->managers = array_unique($out->managers);
            $out->name = self::normalizeString($row->project_name);
            $out->description = self::normalizeString($row->travail_description);
            $out->status = Boolean::or(
                array_find($status, fn ($s) => is_numeric($row->reservation_status) ? $s->id === self::normalizeId($row->reservation_status) : false),
                array_find($status, fn ($s) => is_numeric($row->travail_status) ? $s->id === self::normalizeId($row->travail_status) : false),
                (object)['id' => 0, 'name' => '', 'description' => '', 'color' => '#000000', 'bgcolor' => '#FFFFFF']
            );
            $out->coworkers = [];
            $out->cars = [];
            $begin = new DateTime($row->reservation_dbegin);
            $end = new DateTime($row->reservation_dend);
            do {
                var_dump($out);
                $out->date = $begin->format('Y-m-d');
                $out->coworkers = array_values(array_unique(
                    array_map(
                        fn ($c) => $c->name,
                        array_filter(
                            $coworkers,
                            fn ($c) => $c->affaire == $out->affaire && array_find($c->dates, fn ($d) => $d == $out->date) !== null
                        )
                    )
                ));
                $out->cars = array_values(
                    array_filter($cars, fn ($c) => intval($c->rallocation_target) === $out->affaire)
                );
                $begin = $begin->add(new DateInterval('P1D'));
                yield $out;
            } while ($begin->format('Y-m-d') < $end->format('Y-m-d'));
        }
    }

}
