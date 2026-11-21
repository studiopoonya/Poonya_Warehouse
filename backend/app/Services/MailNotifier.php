<?php

namespace App\Services;

use App\Mail\EventCompletedMail;
use App\Mail\EventReminderMail;
use App\Mail\StaffAssignedMail;
use App\Mail\StockOpnameMail;
use App\Models\AppSetting;
use App\Models\Event;
use App\Models\StockOpname;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Email ringkasan ke owner: event selesai & stock opname selesai.
 * Dikirim SETELAH response terkirim ke user, jadi aplikasi tidak terasa lambat,
 * dan kegagalan kirim email tidak pernah menggagalkan transaksi stok.
 */
class MailNotifier
{
    /** @return array{emails: string[], event_completed: bool, opname: bool, staff_assigned: bool, staff_reminder: bool} */
    public static function settings(): array
    {
        $emails = AppSetting::get('notify_emails');

        return [
            // default: semua owner aktif
            'emails' => $emails ?? User::where('role', User::ROLE_OWNER)->where('is_active', true)->pluck('email')->all(),
            'event_completed' => (bool) AppSetting::get('notify_event_completed', true),
            'opname' => (bool) AppSetting::get('notify_opname', true),
            // email ke staff (ke alamat akun staff masing-masing)
            'staff_assigned' => (bool) AppSetting::get('notify_staff_assigned', true),
            'staff_reminder' => (bool) AppSetting::get('notify_staff_reminder', true),
        ];
    }

    /** true kalau email benar-benar terkirim keluar (bukan hanya ditulis ke log) */
    public static function configured(): bool
    {
        return ! in_array(config('mail.default'), ['log', 'array'], true);
    }

    public function eventCompleted(Event $event): void
    {
        $s = self::settings();
        if ($s['event_completed'] && $s['emails']) {
            $this->later(fn () => new EventCompletedMail($event->fresh(['items.item', 'user', 'returnedBy', 'sourceVenue'])), $s['emails'], "event {$event->code}");
        }
    }

    public function opnameCompleted(StockOpname $opname): void
    {
        $s = self::settings();
        if ($s['opname'] && $s['emails']) {
            $this->later(fn () => new StockOpnameMail($opname->fresh(['items.item', 'user', 'venue'])), $s['emails'], "opname {$opname->code}");
        }
    }

    /** Staff ditugaskan sebagai penanggung jawab event */
    public function staffAssigned(Event $event): void
    {
        $event->loadMissing('user');
        if (self::settings()['staff_assigned'] && $event->user?->is_active) {
            $this->later(fn () => new StaffAssignedMail($event->fresh(['user', 'creator'])), [$event->user->email], "penugasan {$event->code}");
        }
    }

    /**
     * Pengingat H-1 (dipanggil scheduler, langsung dikirim).
     * Event yang ada penanggung jawabnya -> email ke staff; yang belum -> email ke owner.
     */
    public function sendReminder(Event $event): bool
    {
        $s = self::settings();
        if (! $s['staff_reminder']) {
            return false;
        }
        $to = $event->user?->is_active ? [$event->user->email] : $s['emails'];
        if (! $to) {
            return false;
        }
        try {
            Mail::to($to)->send(new EventReminderMail($event, ! $event->user));

            return true;
        } catch (Throwable $e) {
            Log::warning("Gagal kirim pengingat {$event->code}: ".$e->getMessage());

            return false;
        }
    }

    private function later(callable $makeMail, array $to, string $what): void
    {
        app()->terminating(function () use ($makeMail, $to, $what) {
            try {
                Mail::to($to)->send($makeMail());
            } catch (Throwable $e) {
                Log::warning("Gagal kirim email {$what}: ".$e->getMessage());
            }
        });
    }
}
