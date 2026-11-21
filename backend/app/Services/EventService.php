<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventItem;
use App\Models\Item;
use App\Models\Stock;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Alur logistik event:
 *   schedule()        owner  — jadwalkan event (+ penanggung jawab, atau belum ditugaskan)
 *   claim()           staff  — ambil event yang belum ditugaskan
 *   departScheduled() staff  — pilih event terjadwal, catat barang dibawa, stok gudang berkurang
 *   depart()          staff  — event mendadak: info + barang sekaligus
 *   report()                 — catat sisa, sisa kembali ke stok gudang (+ email ke owner)
 *   cancel()          owner  — batalkan event terjadwal / berjalan
 */
class EventService
{
    public function __construct(private StockService $stock, private MailNotifier $mail) {}

    /** Gudang asal barang event: yang dipilih (harus bertipe gudang), atau gudang utama */
    public static function sourceVenue(?int $venueId = null): Venue
    {
        if ($venueId) {
            $venue = Venue::where('type', 'warehouse')->find($venueId);
            if (! $venue) {
                throw ValidationException::withMessages(['source_venue_id' => 'Asal barang harus berupa gudang.']);
            }

            return $venue;
        }

        return Venue::mainWarehouse() ?? throw ValidationException::withMessages(['source_venue_id' => 'Belum ada gudang. Tambahkan venue bertipe Gudang dulu.']);
    }

    /** Owner menjadwalkan event. $assigneeId null = belum ditugaskan (semua staff bisa mengambil) */
    public function schedule(User $owner, array $info, ?int $assigneeId, ?int $sourceId = null): Event
    {
        $event = DB::transaction(function () use ($owner, $info, $assigneeId, $sourceId) {
            $event = Event::create($info + [
                'source_venue_id' => self::sourceVenue($sourceId)->id,
                'user_id' => $assigneeId,
                'created_by' => $owner->id,
                'status' => Event::SCHEDULED,
            ]);

            return $this->withCode($event);
        });
        // event langsung ditugaskan -> kabari staff-nya
        if ($assigneeId) {
            $this->mail->staffAssigned($event);
        }

        return $event;
    }

    /** Ubah info / penanggung jawab — hanya selama barang belum dibawa */
    public function updateSchedule(Event $event, array $info, ?int $assigneeId, ?int $sourceId = null): Event
    {
        $this->mustBe($event, Event::SCHEDULED, 'Event yang sudah berangkat tidak bisa diubah lagi.');
        $previous = $event->user_id;
        $event->update($info + ['user_id' => $assigneeId] + ($sourceId ? ['source_venue_id' => self::sourceVenue($sourceId)->id] : []));

        // penanggung jawab baru -> kabari staff-nya
        if ($assigneeId && $assigneeId !== $previous) {
            $this->mail->staffAssigned($event);
        }

        return $event;
    }

    /** Staff mengambil event yang belum ditugaskan. Atomik: kalau dua staff menekan bersamaan, hanya satu yang dapat. */
    public function claim(Event $event, User $staff): Event
    {
        $taken = Event::whereKey($event->id)
            ->where('status', Event::SCHEDULED)
            ->whereNull('user_id')
            ->update(['user_id' => $staff->id]);

        if (! $taken) {
            throw ValidationException::withMessages(['event' => 'Event ini sudah diambil staff lain.']);
        }

        return $event->refresh();
    }

    /** Berangkat untuk event yang sudah dijadwalkan owner */
    public function departScheduled(Event $event, User $user, array $lines, ?int $sourceId = null): Event
    {
        return DB::transaction(function () use ($event, $user, $lines, $sourceId) {
            $event = Event::whereKey($event->id)->lockForUpdate()->first();
            $this->mustBe($event, Event::SCHEDULED, 'Barang untuk event ini sudah dicatat.');

            $event->update([
                'status' => Event::ONGOING,
                'departed_at' => now(),
                'user_id' => $event->user_id ?? $user->id,
            ] + ($sourceId ? ['source_venue_id' => self::sourceVenue($sourceId)->id] : []));
            $this->takeItems($event, $lines);

            return $event;
        });
    }

    /**
     * Event mendadak yang dibuat staff sendiri: info + barang dibawa sekaligus.
     *
     * @param  array{name:string, location:?string, event_date:string, crew:?string, note:?string}  $info
     * @param  array<int, array{item_id:int, quantity:int}>  $lines
     */
    public function depart(User $user, array $info, array $lines, ?int $sourceId = null): Event
    {
        return DB::transaction(function () use ($user, $info, $lines, $sourceId) {
            $event = Event::create($info + [
                'source_venue_id' => self::sourceVenue($sourceId)->id,
                'user_id' => $user->id,
                'created_by' => $user->id,
                'status' => Event::ONGOING,
                'departed_at' => now(),
            ]);
            $this->withCode($event);
            $this->takeItems($event, $lines);

            return $event;
        });
    }

    /**
     * Langkah 3: laporkan sisa. Bisa dipanggil lagi oleh owner untuk koreksi —
     * stok hanya disesuaikan sebesar selisihnya.
     *
     * @param  array<int, int>  $returned  [item_id => qty tersisa (kembali dalam kondisi baik)]
     * @param  array<int, int>  $damaged   [item_id => qty rusak/hilang] — tidak kembali ke stok
     */
    public function report(Event $event, array $returned, User $by, array $damaged = [], ?string $note = null): Event
    {
        if (! in_array($event->status, [Event::ONGOING, Event::COMPLETED], true)) {
            throw ValidationException::withMessages(['event' => 'Event ini belum berangkat atau sudah dibatalkan.']);
        }

        $correction = $event->status === Event::COMPLETED;

        $event = DB::transaction(function () use ($event, $returned, $by, $correction, $damaged, $note) {
            $source = $event->sourceVenue;

            foreach ($event->items()->with('item')->lockForUpdate()->get() as $line) {
                if (! array_key_exists($line->item_id, $returned)) {
                    throw ValidationException::withMessages(['items' => "Sisa {$line->item->name} belum diisi."]);
                }

                $new = (int) $returned[$line->item_id];
                $bad = (int) ($damaged[$line->item_id] ?? 0);
                if ($new < 0 || $bad < 0 || $new + $bad > $line->qty_out) {
                    throw ValidationException::withMessages([
                        'items' => $line->is_equipment
                            ? "Kembali + rusak {$line->item->name} tidak boleh lebih dari {$line->qty_out} (jumlah yang dibawa)."
                            : "Sisa + rusak/hilang {$line->item->name} tidak boleh lebih dari {$line->qty_out} (jumlah yang dibawa).",
                    ]);
                }

                if ($line->is_equipment) {
                    $this->reportEquipment($event, $line, $new, $bad, $correction);

                    continue;
                }

                $delta = $new - (int) ($line->qty_returned ?? 0);
                if ($delta !== 0) {
                    $movementNote = $correction ? "Koreksi sisa event: {$event->name}" : "Sisa dari event: {$event->name}";
                    $this->stock->apply($line->item, $source, $delta, 'event_return', $movementNote, eventId: $event->id);
                }

                $line->update(['qty_returned' => $new, 'qty_damaged' => $bad ?: null]);
            }

            $event->update([
                'status' => Event::COMPLETED,
                'report_note' => $note !== null ? $note : $event->report_note,
                'returned_at' => $correction ? $event->returned_at : now(),
                'returned_by' => $correction ? $event->returned_by : $by->id,
            ]);

            return $event;
        });

        // email ringkasan ke owner — hanya saat pertama kali selesai, bukan saat koreksi
        if (! $correction) {
            $this->mail->eventCompleted($event);
        }

        return $event;
    }

    /** Batalkan event terjadwal (tanpa efek stok) atau berjalan (semua barang kembali ke gudang) */
    public function cancel(Event $event): Event
    {
        if (! in_array($event->status, [Event::SCHEDULED, Event::ONGOING], true)) {
            throw ValidationException::withMessages(['event' => 'Event yang sudah selesai atau dibatalkan tidak bisa dibatalkan lagi.']);
        }

        return DB::transaction(function () use ($event) {
            // peralatan tidak pernah memotong stok, jadi tidak ada yang perlu dikembalikan
            foreach ($event->items()->with('item')->where('is_equipment', false)->get() as $line) {
                $this->stock->apply($line->item, $event->sourceVenue, $line->qty_out, 'event_return', "Event dibatalkan: {$event->name}", eventId: $event->id);
            }
            $event->update(['status' => Event::CANCELLED]);

            return $event;
        });
    }

    /**
     * Laporan pulang untuk peralatan: $back kembali baik, $broken kembali tapi rusak, sisanya hilang.
     * Hanya yang hilang mengurangi stok. Saat koreksi, stok disesuaikan sebesar selisih jumlah hilang.
     */
    private function reportEquipment(Event $event, EventItem $line, int $back, int $broken, bool $correction): void
    {
        $source = $event->sourceVenue;
        $prevLost = (int) ($line->qty_lost ?? 0);
        $lost = $line->qty_out - $back - $broken;

        $delta = $prevLost - $lost; // lebih banyak hilang -> stok berkurang
        if ($delta < 0) {
            $this->stock->apply($line->item, $source, $delta, 'event_lost', ($correction ? 'Koreksi: ' : '')."Hilang di event: {$event->name}", eventId: $event->id);
        } elseif ($delta > 0) {
            $this->stock->apply($line->item, $source, $delta, 'event_return', "Koreksi: ternyata tidak hilang di event {$event->name}", eventId: $event->id);
        }

        // ada yang rusak -> kondisi alat di gudang ditandai rusak (owner ubah lagi setelah diservis)
        if ($broken > (int) $line->qty_damaged) {
            Stock::where('item_id', $line->item_id)->where('venue_id', $source->id)->update(['condition' => 'rusak', 'condition_at' => now()]);
        }

        $line->update(['qty_returned' => $back, 'qty_damaged' => $broken ?: null]);
    }

    /**
     * Peralatan yang sedang dibawa ke event lain (belum lapor pulang), per barang.
     * Stoknya tidak berkurang, tapi tidak bisa dibawa ke dua event sekaligus.
     *
     * @return array<int, int> [item_id => qty]
     */
    public static function equipmentInUse(int $venueId, ?int $exceptEventId = null): array
    {
        return EventItem::query()
            ->where('is_equipment', true)
            ->whereHas('event', fn ($q) => $q->where('status', Event::ONGOING)->where('source_venue_id', $venueId)
                ->when($exceptEventId, fn ($w) => $w->whereKeyNot($exceptEventId)))
            ->selectRaw('item_id, SUM(qty_out) as qty')
            ->groupBy('item_id')
            ->pluck('qty', 'item_id')
            ->map(fn ($q) => (int) $q)
            ->all();
    }

    /**
     * Catat barang dibawa. Habis pakai: stok gudang langsung dipotong.
     * Peralatan: hanya dicatat (+ sudah dicek atau belum), stok tidak berubah.
     * Gagal (seluruh transaksi batal) kalau stok tidak cukup.
     */
    private function takeItems(Event $event, array $lines): void
    {
        $source = $event->sourceVenue()->first();
        $items = Item::with(['stocks' => fn ($q) => $q->where('venue_id', $source->id)])
            ->whereIn('id', array_column($lines, 'item_id'))->get()->keyBy('id');
        $inUse = self::equipmentInUse($source->id, $event->id);
        $note = "Dibawa ke event: {$event->name}";

        foreach ($lines as $line) {
            $item = $items[$line['item_id']];
            $qty = (int) $line['quantity'];

            if ($item->isEquipment()) {
                $free = (int) ($item->stocks->first()?->quantity ?? 0) - ($inUse[$item->id] ?? 0);
                if ($qty > $free) {
                    throw ValidationException::withMessages(['items' => $free > 0
                        ? "{$item->name}: hanya {$free} yang tersedia di {$source->name} (sisanya sedang dibawa ke event lain)."
                        : "{$item->name} tidak tersedia di {$source->name}".(($inUse[$item->id] ?? 0) ? ' (sedang dibawa ke event lain).' : '.')]);
                }
                $event->items()->create(['item_id' => $item->id, 'is_equipment' => true, 'checked' => (bool) ($line['checked'] ?? false), 'qty_out' => $qty]);

                continue;
            }

            $event->items()->create(['item_id' => $item->id, 'qty_out' => $qty]);
            $this->stock->apply($item, $source, -$qty, 'event_out', $note, eventId: $event->id);
        }
    }

    private function withCode(Event $event): Event
    {
        $event->update(['code' => 'EVT-'.now()->format('ymd').'-'.str_pad($event->id, 4, '0', STR_PAD_LEFT)]);

        return $event;
    }

    private function mustBe(Event $event, string $status, string $message): void
    {
        if ($event->status !== $status) {
            throw ValidationException::withMessages(['event' => $message]);
        }
    }
}
