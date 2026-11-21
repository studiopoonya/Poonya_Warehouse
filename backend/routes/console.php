<?php

use App\Models\AppSetting;
use App\Models\Event;
use App\Models\User;
use App\Services\BackupService;
use App\Services\MailNotifier;
use Database\Seeders\BaseDataSeeder;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;

/*
| Backup database (SQLite) ke storage/app/backups. 14 backup terakhir disimpan.
|   php artisan poonya:backup
| Otomatis setiap hari jam 02:00 — butuh scheduler berjalan:
|   development: php artisan schedule:work
|   server     : cron "* * * * * cd /path/backend && php artisan schedule:run >> /dev/null 2>&1"
*/
Artisan::command('poonya:backup {--auto : Tandai sebagai backup otomatis}', function (BackupService $backups) {
    try {
        $b = $backups->create($this->option('auto') ? 'auto' : 'manual');
        $this->info("Backup dibuat: {$b['name']} (".number_format($b['size'] / 1024, 0, ',', '.').' KB)');
    } catch (\RuntimeException $e) {
        $this->error($e->getMessage());

        return 1;
    }
})->purpose('Backup database ke storage/app/backups');

Schedule::command('poonya:backup --auto')->dailyAt('02:00');

/*
| Pengingat H-1: email ke staff penanggung jawab event besok
| (event besok yang belum ditugaskan -> email ke owner). Otomatis tiap hari jam 17:00.
|   php artisan poonya:event-reminders            (event besok)
|   php artisan poonya:event-reminders --date=2026-12-24
*/
Artisan::command('poonya:event-reminders {--date= : Tanggal event (default: besok)}', function (MailNotifier $mail) {
    $date = $this->option('date') ?: now()->addDay()->toDateString();
    $events = Event::with('user')->where('status', Event::SCHEDULED)->whereDate('event_date', $date)->get();

    $sent = 0;
    foreach ($events as $e) {
        // jangan kirim dua kali untuk event & tanggal yang sama
        $key = "reminder_sent:{$e->id}:{$date}";
        if (AppSetting::get($key)) {
            continue;
        }
        if ($mail->sendReminder($e)) {
            AppSetting::put($key, now()->toIso8601String());
            $sent++;
            $this->line('  · '.$e->name.' → '.($e->user?->name ?? 'owner (belum ditugaskan)'));
        }
    }
    $this->info("{$sent} pengingat terkirim untuk {$events->count()} event tanggal {$date}.");
})->purpose('Kirim email pengingat H-1 event terjadwal');

Schedule::command('poonya:event-reminders')->dailyAt('17:00');

/*
| Kosongkan data barang & transaksi, misalnya untuk membuang data contoh sebelum go-live.
|   php artisan poonya:reset-data              (staff ikut dihapus, ada konfirmasi)
|   php artisan poonya:reset-data --keep-staff (akun staff dipertahankan)
| Yang SELALU dipertahankan: venue dan akun owner (termasuk password-nya).
*/
Artisan::command('poonya:reset-data {--keep-staff : Jangan hapus akun staff} {--force : Lewati konfirmasi}', function () {
    $tables = [
        'stock_movements' => 'riwayat stok',
        'stock_opname_items' => 'barang per stock opname',
        'stock_opnames' => 'stock opname',
        'event_items' => 'barang per event',
        'events' => 'event',
        'transfer_items' => 'barang per transfer',
        'transfers' => 'transfer',
        'stocks' => 'stok',
        'items' => 'barang',
        'categories' => 'kategori (diganti kategori dasar)',
    ];

    $this->warn('Data berikut akan DIHAPUS PERMANEN:');
    foreach ($tables as $table => $label) {
        $this->line(sprintf('  - %-36s %s baris', $label, DB::table($table)->count()));
    }
    $staff = User::where('role', User::ROLE_STAFF);
    if (! $this->option('keep-staff')) {
        $this->line(sprintf('  - %-36s %s akun', 'akun staff', (clone $staff)->count()));
    }
    $this->info('Dipertahankan: venue & akun owner ('.User::where('role', User::ROLE_OWNER)->pluck('email')->implode(', ').')');

    if (! $this->option('force') && ! $this->confirm('Lanjutkan?', false)) {
        $this->line('Dibatalkan, tidak ada yang dihapus.');

        return 0;
    }

    // truncate = hapus semua + reset nomor urut, jadi kode event/transfer mulai dari 0001 lagi
    Schema::withoutForeignKeyConstraints(function () use ($tables) {
        foreach (array_keys($tables) as $table) {
            DB::table($table)->truncate();
        }
    });

    if (! $this->option('keep-staff')) {
        $ids = $staff->pluck('id');
        DB::table('personal_access_tokens')->where('tokenable_type', User::class)->whereIn('tokenable_id', $ids)->delete();
        User::whereIn('id', $ids)->delete();
    }

    (new BaseDataSeeder)->run(); // pastikan 4 venue + kategori dasar ada

    $this->info('Selesai. Data sudah bersih, siap diisi barang & stok asli.');
})->purpose('Kosongkan data barang, stok, transaksi & event (venue + owner dipertahankan)');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Buat akun baru atau reset password akun yang sudah ada.
|   php artisan poonya:user owner@poonya.com --name="Owner" --role=owner
|   php artisan poonya:user andi@poonya.com --name="Andi" --role=staff
| Staff hanya bisa mengisi logistik event. Password akan ditanyakan
| (tidak tampil di layar), atau isi lewat --password=
*/
Artisan::command('poonya:user {email} {--name=} {--password=} {--role=}', function (string $email) {
    $email = strtolower($email);
    $user = User::firstWhere('email', $email);

    $name = $this->option('name') ?: $user?->name ?: $this->ask('Nama', explode('@', $email)[0]);
    $role = $this->option('role') ?: $user?->role ?: $this->choice('Peran', ['owner', 'staff'], 1);

    if (! in_array($role, ['owner', 'staff'])) {
        $this->error('Peran harus owner atau staff.');

        return 1;
    }

    $password = $this->option('password') ?: $this->secret('Password (min. 8 karakter)');
    if (strlen((string) $password) < 8) {
        $this->error('Password minimal 8 karakter.');

        return 1;
    }

    $user = User::updateOrCreate(['email' => $email], [
        'name' => $name, 'password' => $password, 'role' => $role, 'venue_id' => null, 'is_active' => true,
    ]);
    $user->tokens()->delete(); // paksa login ulang di semua perangkat

    $this->info(($user->wasRecentlyCreated ? 'Akun dibuat: ' : 'Akun diperbarui: ')."{$user->name} <{$user->email}> — {$role}");
})->purpose('Buat akun login atau reset password');
