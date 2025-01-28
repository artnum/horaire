<?php

namespace KAAL;

use Exception;
use Random\RandomException;

class Crypto {

    private $bytes;
    private $algo;
    function __construct(string $algo = 'sha256')
    {
        $this->algo = self::algo_available($algo);
        if (is_null($this->algo)) {
            throw new Exception('Aglorithm not available');
        }
        $this->bytes = match($this->algo) {
            'sha256' => 32,
            'sha384' => 48,
            'sha512' => 64
        };
    }

    /**
     * Generate a tag, an opaque random value used as identifier. Must be URL safe
     * @param int $bytes 
     * @return string 
     * @throws RandomException 
     */
    public static function get_random_tag(int $bytes): string
    {
        $byte_string = random_bytes($bytes);
        return rtrim(strtr(base64_encode($byte_string), '+/', '-_'), '=');
    }

    public static function algo_available(string $algo): ?string
    {
        return match($algo) {
            'sha256' => 'sha256',
            'SHA256' => 'sha256',
            'sha-256' => 'sha256',
            'SHA-256' => 'sha256',
            'sha384' => 'sha384',
            'SHA384' => 'sha384',
            'sha-384' => 'sha384',
            'SHA-384' => 'sha384',
            'sha512' => 'sha512',
            'SHA512' => 'sha512',
            'sha-512' => 'sha512',
            'SHA-512' => 'sha512',
            default => null
        };
    }

    /**
     * Generate random bytes.
     * @return string 
     * @throws RandomException 
     */
    public function get_random_bytes(): string
    {
        return random_bytes($this->get_hash_bytes());
    }

    /**
     * Generate a hmac with the current algorithm.
     * @param string $value 
     * @param string $key 
     * @return string 
     */
    public function hmac(string $value, string $key):string
    {
        return hash_hmac(
            $this->get_hash_algo(),
            $value,
            $key,
            true);
    }

    /**
     * Get number of byte for the current hash algorithm.
     * @return int 
     */
    public function get_hash_bytes():int
    {
        return $this->bytes;
    }

    /**
     * Get current hash algo.
     * @return string 
     */
    public function get_hash_algo():string
    {
        return $this->algo;
    }

    /**
     * 
     * @param string $bytes 
     * @return string 
     */
    public function stringify(string $bytes):string
    {
        return base64_encode($bytes);
    }

    /**
     * 
     * @param string $encoded 
     * @return string 
     */
    public function binarify(string $encoded):string
    {
        return base64_decode($encoded);
    }
}