<?php

namespace KAAL;

use Exception;
use KAAL\Utils\Base64;

class Crypto
{
    private int $bytes = 32;
    private string $algo;

    public function __construct(
        string $algo = 'sha256',
    ) {
        $this->algo = self::algo_available($algo)
            ?? throw new Exception('Algorithm not available');
        $this->bytes = match ($this->algo) {
            'sha256' => 32,
            'sha384' => 48,
            'sha512' => 64
        };
    }

    /**
     * Generate a tag, an opaque random value used as identifier. Must be URL safe
     *
     * @param $bytes Number of bytes needed
     *
     * @return string
     * @throws Exception
     */
    public static function get_random_tag(int $bytes): string
    {
        try {
            $byte_string = random_bytes($bytes);
            return Base64::encode($byte_string);
        } catch (Exception $e) {
            throw new Exception(
                'Failed to generate random tag: ' . $e->getMessage()
            );
        }
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
     *
     * @return string
     *
     * @throws RandomException
     */
    public function get_random_bytes(): string
    {
        return random_bytes($this->get_hash_bytes());
    }

    /**
     * Generate a hmac with the current algorithm.
     *
     * @param $value Value to hash
     * @param $key   Key to hash
     *
     * @return string Hashed value
     */
    public function hmac(string $value, string $key): string
    {
        return hash_hmac(
            $this->get_hash_algo(),
            $value,
            $key,
            true
        );
    }

    /**
     * Get number of byte for the current hash algorithm.
     *
     * @return Number of bytes for hash
     */
    public function get_hash_bytes(): int
    {
        return $this->bytes;
    }

    /**
     * Get current hash algo.
     *
     * @return Algo name
     */
    public function get_hash_algo(): string
    {
        return $this->algo;
    }

    /**
     *
     * @param string $bytes
     * @return string
     */
    public function stringify(string $bytes): string
    {
        return Base64::encode($bytes);
    }

    /**
     *
     * @param string $encoded
     * @return string
     */
    public function binarify(string $encoded): string
    {
        return Base64::decode($encoded);
    }

    public static function strEncrypt(string $value, #[\SensitiveParameter] string $key): string
    {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cvalue = sodium_crypto_secretbox($value, $nonce, $key);
        $nonce = sodium_bin2base64($nonce, SODIUM_BASE64_VARIANT_ORIGINAL);
        $cvalue = sodium_bin2base64($cvalue, SODIUM_BASE64_VARIANT_ORIGINAL);
        return "$nonce $cvalue";
    }

    public static function strDecrypt(string $value, #[\SensitiveParameter] string $key): string
    {
        list($nonce, $cvalue) = explode(' ', $value, 2);
        $nonce = sodium_base642bin($nonce, SODIUM_BASE64_VARIANT_ORIGINAL);
        $cvalue = sodium_base642bin($cvalue, SODIUM_BASE64_VARIANT_ORIGINAL);
        $value = sodium_crypto_secretbox_open($cvalue, $nonce, $key);
        return $value;
    }
}
