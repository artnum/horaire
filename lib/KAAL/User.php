<?php

namespace KAAL;

class User implements IRole
{
    private string $role;

    public function __construct(string $role)
    {
        $this->role = $role;
    }

    public function get(): string
    {
        return $this->role;
    }
}