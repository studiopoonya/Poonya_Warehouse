<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use App\Mail\TestMail;
use App\Models\AppSetting;
use Closure;
use App\Models\Item;
use App\Models\Stock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Services\BackupService;
use App\Services\MailNotifier;
use Illuminate\Support\Facades\Mail;
use Throwable;
use Illuminate\Http\Request;
use RuntimeException;

/** Pengaturan: data venue & backup — khusus owner */
class SettingsController extends Controller
{
    /** POST /api/venues { name, type: warehouse|booth|studio, address, description, color } */
    public function storeVenue(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', $this->uniqueName()],
            'type' => ['required', Rule::in(array_keys(Venue::TYPE_LABELS))],
            'address' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ], [
            'name.required' => 'Nama venue wajib diisi.',
            'name.unique' => 'Sudah ada venue dengan nama ini.',
            'color.regex' => 'Warna tidak valid.',
        ]);

        $venue = DB::transaction(function () use ($data) {
            $base = Str::slug($data['name']) ?: 'venue';
            $slug = $base;
            for ($i = 2; Venue::where('slug', $slug)->exists(); $i++) {
                $slug = "{$base}-{$i}";
            }

            $venue = Venue::create($data + ['slug' => $slug, 'sort_order' => (int) Venue::max('sort_order') + 1]);

            // baris stok 0 untuk semua barang, supaya langsung muncul di inventaris & opname
            $now = now();
            $rows = Item::pluck('id')->map(fn ($id) => ['item_id' => $id, 'venue_id' => $venue->id, 'quantity' => 0, 'min_stock' => 0, 'created_at' => $now, 'updated_at' => $now])->all();
            foreach (array_chunk($rows, 500) as $chunk) {
                Stock::insert($chunk);
            }

            return $venue;
        });

        return (new VenueResource(Venue::withSummary()->find($venue->id)))->response()->setStatusCode(201);
    }

    /** DELETE /api/venues/{venue} — hanya venue yang belum pernah dipakai */
    public function destroyVenue(Venue $venue)
    {
        if ($venue->hasHistory()) {
            return response()->json(['message' => "{$venue->name} sudah punya stok atau riwayat transaksi, jadi tidak bisa dihapus."], 422);
        }
        if ($venue->type === 'warehouse' && Venue::where('type', 'warehouse')->count() === 1) {
            return response()->json(['message' => 'Harus ada minimal satu gudang.'], 422);
        }

        $venue->delete(); // baris stok 0 ikut terhapus

        return response()->noContent();
    }

    /** PUT /api/venues/{venue} { name, address, description, color } */
    public function updateVenue(Request $request, Venue $venue)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', $this->uniqueName($venue->id)],
            'address' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ], ['name.required' => 'Nama venue wajib diisi.', 'name.unique' => 'Sudah ada venue dengan nama ini.', 'color.regex' => 'Warna tidak valid.']);

        // slug sengaja tidak diubah: dipakai untuk warna & ikon venue
        $venue->update($data);

        return new VenueResource(Venue::withSummary()->find($venue->id));
    }

    /** GET /api/settings/notifications */
    public function notifications()
    {
        return ['data' => MailNotifier::settings() + [
            'configured' => MailNotifier::configured(),
            'mailer' => config('mail.default'),
            'from' => config('mail.from.address'),
        ]];
    }

    /** PUT /api/settings/notifications { emails: [], event_completed: bool, opname: bool } */
    public function updateNotifications(Request $request)
    {
        $data = $request->validate([
            'emails' => ['present', 'array', 'max:10'],
            'emails.*' => ['email:rfc', 'max:150'],
            'event_completed' => ['boolean'],
            'opname' => ['boolean'],
            'staff_assigned' => ['boolean'],
            'staff_reminder' => ['boolean'],
        ], ['emails.*.email' => 'Ada alamat email yang tidak valid: :input', 'emails.max' => 'Maksimal 10 alamat email.']);

        AppSetting::put('notify_emails', array_values(array_unique(array_map('strtolower', $data['emails']))));
        AppSetting::put('notify_event_completed', (bool) ($data['event_completed'] ?? true));
        AppSetting::put('notify_opname', (bool) ($data['opname'] ?? true));
        AppSetting::put('notify_staff_assigned', (bool) ($data['staff_assigned'] ?? true));
        AppSetting::put('notify_staff_reminder', (bool) ($data['staff_reminder'] ?? true));

        return $this->notifications();
    }

    /** POST /api/settings/notifications/test — kirim langsung (bukan setelah response) supaya error terlihat */
    public function testEmail(Request $request)
    {
        $emails = MailNotifier::settings()['emails'];
        if (! $emails) {
            return response()->json(['message' => 'Isi minimal satu alamat email penerima dulu.'], 422);
        }

        try {
            Mail::to($emails)->send(new TestMail($request->user()->name));
        } catch (Throwable $e) {
            return response()->json(['message' => 'Gagal mengirim: '.$e->getMessage()], 422);
        }

        return ['message' => MailNotifier::configured()
            ? 'Email tes terkirim ke '.implode(', ', $emails)
            : 'Email belum benar-benar terkirim: server masih mode "log" (lihat panduan SMTP di README).'];
    }

    /** Nama venue unik tanpa membedakan huruf besar/kecil ("Gudang Bekasi" = "gudang bekasi") */
    private function uniqueName(?int $ignoreId = null): Closure
    {
        return function (string $attr, mixed $value, Closure $fail) use ($ignoreId) {
            $exists = Venue::whereRaw('LOWER(name) = ?', [mb_strtolower(trim((string) $value))])
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists();
            if ($exists) {
                $fail('Sudah ada venue dengan nama ini.');
            }
        };
    }

    public function backups(BackupService $backups)
    {
        return ['data' => $backups->list(), 'keep' => BackupService::KEEP];
    }

    public function createBackup(BackupService $backups)
    {
        try {
            return response()->json(['data' => $backups->create('manual')], 201);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function downloadBackup(string $name, BackupService $backups)
    {
        $path = $backups->path($name);
        abort_unless($path, 404, 'File backup tidak ditemukan.');

        return response()->download($path, $name, ['Content-Type' => 'application/octet-stream']);
    }
}
