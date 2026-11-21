<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * `php artisan db:seed` — data dasar untuk pemakaian sungguhan:
 * akun owner + 4 venue + kategori. TANPA barang/stok contoh.
 *
 * Mau data contoh untuk coba-coba? `php artisan db:seed --class=DemoSeeder`
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Akun owner awal. Ganti lewat .env (ADMIN_EMAIL / ADMIN_PASSWORD) atau
        // setelah login lewat menu akun / `php artisan poonya:user`.
        // Kalau akunnya sudah ada, password TIDAK ditimpa.
        User::firstOrCreate(
            ['email' => strtolower(env('ADMIN_EMAIL', 'admin@poonya.test'))],
            ['name' => env('ADMIN_NAME', 'Admin Poonya'), 'password' => env('ADMIN_PASSWORD', 'poonya123'), 'role' => User::ROLE_OWNER],
        );

        $this->call(BaseDataSeeder::class);
    }
}
