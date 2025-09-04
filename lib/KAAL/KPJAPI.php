<?php

namespace KAAL;

use KAAL\Utils\Conf;
use Throwable;
use Monolog\Level;
use Monolog\Logger;
use Monolog\Handler\SyslogHandler;

class KPJAPI extends \PJAPI\PJAPI
{
    protected Conf $conf;
    protected Logger $logger;

    public function __construct(string $dir, Conf $conf, bool $debug = false)
    {
        parent::__construct($dir, $debug);
        $this->logger = new Logger('kaal');
        $this->logger->pushHandler(new SyslogHandler('kaal', 'local6'));
        $this->conf = $conf;
    }

    public function setConf(string $path, mixed $value)
    {
        return $this->conf->set($path, $value);
    }

    public function conf(string $path)
    {
        return $this->conf->get($path);
    }

    protected function emitError(int $stream, Throwable $e): void
    {
        parent::emitError($stream, $e);
        $i = 0;
        while ($e) {
            $i++;
            $this->logger->debug(sprintf('#%03d. ', $i) . $e->getMessage(), ['code' => $e->getCode(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
            $j = 0;
            foreach ($e->getTrace() as $trace) {
                $this->logger->debug(sprintf("\t>", $i, $j), $trace);
            }
            $e = $e->getPrevious();
        }
    }

    public function getLogger()
    {
        return $this->logger;
    }
}
