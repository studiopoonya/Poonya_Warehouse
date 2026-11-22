<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    /** API tanpa login ditolak dengan 401 (bukan dialihkan ke halaman frontend) */
    public function test_api_requires_login(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    /** Alamat /api yang tidak ada tetap 404 JSON, tidak tertangkap rute frontend */
    public function test_unknown_api_route_is_not_served_by_frontend(): void
    {
        $this->getJson('/api/tidak-ada')->assertStatus(404);
    }
}
