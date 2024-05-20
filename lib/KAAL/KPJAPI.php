<?php
namespace KAAL;

use Throwable;
use Monolog\Level;
use Monolog\Logger;
use Monolog\Handler\SyslogHandler;

class KPJAPI extends \PJAPI\PJAPI {
    protected array $conf;
    protected Logger $logger;
    
    public function __construct(string $dir) {
        parent::__construct($dir);
        $this->logger = new Logger('kaal');
        $this->logger->pushHandler(new SyslogHandler('kaal', 'local6'));
        $this->conf = require('conf/kaal.php');
    }

    public function setConf (string $path, mixed $value) {
        $parts = explode('.', $path);
        $conf =& $this->conf;
        foreach ($parts as $part) {
            if (isset($conf[$part])) {
                $conf =& $conf[$part];
            } else {
                $conf[$part] = [];
                $conf =& $conf[$part];
            }
        }
        $conf = $value;
        return $conf;
    }

    public function conf(string $path) {
        $parts = explode('.', $path);
        $conf = $this->conf;
        foreach ($parts as $part) {
            if (isset($conf[$part])) {
                $conf = $conf[$part];
            } else {
                return null;
            }
        }
        return $conf;
    }

    protected function emitError(Throwable $e) {
        parent::emitError($e);
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

    public function getLogger() {
        return $this->logger;
    }
}