<?php

namespace App\Http\Resources;

use App\Models\EventItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EventResource extends JsonResource
{
    /** Ringkasan kosong per kelompok (habis pakai / peralatan) */
    private const EMPTY = ['n' => 0, 'out' => 0, 'returned' => 0, 'damaged' => 0, 'checked' => 0, 'out_value' => 0, 'damaged_value' => 0, 'left_value' => 0];

    /**
     * Ringkasan banyak event sekaligus, dihitung di database (untuk daftar event).
     * Jauh lebih cepat daripada memuat & menjumlah ribuan baris barang di PHP.
     *
     * @return array<int, array{c: array, e: array}> [event_id => [c => habis pakai, e => peralatan]]
     */
    public static function statsFor(array $eventIds): array
    {
        if (! $eventIds) {
            return [];
        }
        $rows = DB::table('event_items')
            ->leftJoin('items', 'items.id', '=', 'event_items.item_id')
            ->whereIn('event_items.event_id', $eventIds)
            ->groupBy('event_items.event_id', 'event_items.is_equipment')
            ->selectRaw('event_items.event_id as event_id, event_items.is_equipment as eq, COUNT(*) as n,
                SUM(qty_out) as "out", SUM(COALESCE(qty_returned, 0)) as returned, SUM(COALESCE(qty_damaged, 0)) as damaged,
                SUM(CASE WHEN checked THEN 1 ELSE 0 END) as checked,
                SUM(qty_out * COALESCE(items.price, 0)) as out_value,
                SUM(COALESCE(qty_damaged, 0) * COALESCE(items.price, 0)) as damaged_value,
                SUM((qty_out - COALESCE(qty_returned, 0) - COALESCE(qty_damaged, 0)) * COALESCE(items.price, 0)) as left_value')
            ->get();

        $stats = [];
        foreach ($rows as $r) {
            $stats[$r->event_id][$r->eq ? 'e' : 'c'] = array_map('intval', array_intersect_key((array) $r, self::EMPTY));
        }

        return $stats;
    }

    /** Ringkasan yang sama, dari baris barang yang sudah dimuat (halaman detail) */
    private static function statsFromLines(Collection $lines): array
    {
        $out = [];
        foreach ($lines->groupBy(fn (EventItem $l) => $l->is_equipment ? 'e' : 'c') as $key => $group) {
            $s = self::EMPTY;
            foreach ($group as $l) {
                $price = (int) ($l->item?->price ?? 0);
                $ret = (int) $l->qty_returned;
                $dmg = (int) $l->qty_damaged;
                $s['n']++;
                $s['out'] += $l->qty_out;
                $s['returned'] += $ret;
                $s['damaged'] += $dmg;
                $s['checked'] += $l->checked ? 1 : 0;
                $s['out_value'] += $l->qty_out * $price;
                $s['damaged_value'] += $dmg * $price;
                $s['left_value'] += ($l->qty_out - $ret - $dmg) * $price;
            }
            $out[$key] = $s;
        }

        return $out;
    }

    public function toArray(Request $request): array
    {
        $withLines = $request->attributes->get('event_lines', true) && $this->relationLoaded('items');
        // daftar event: ringkasan dari database (event_stats); detail: dari baris barang
        $stats = $request->attributes->get('event_stats')[$this->id]
            ?? ($this->relationLoaded('items') ? self::statsFromLines($this->items) : []);
        $c = ($stats['c'] ?? []) + self::EMPTY; // barang habis pakai
        $e = ($stats['e'] ?? []) + self::EMPTY; // peralatan
        $reported = $this->status === 'completed';
        $showValue = $request->user()?->isOwner() ?? false;
        // habis pakai: terpakai = dibawa - tersisa - rusak/hilang; peralatan: hilang = dibawa - kembali - rusak
        $used = $c['out'] - $c['returned'] - $c['damaged'];
        $lost = $e['out'] - $e['returned'] - $e['damaged'];

        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'location' => $this->location,
            'event_date' => $this->event_date?->toDateString(),
            'crew' => $this->crew,
            'note' => $this->note,
            'report_note' => $this->report_note,
            'status' => $this->status,
            'source_venue' => VenueResource::brief($this->sourceVenue),
            // user = penanggung jawab (null = belum ditugaskan)
            'user' => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null,
            'creator' => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name, 'role' => $this->creator->role] : null,
            'created_by_staff' => $this->creator?->role === 'staff',
            'returned_by' => $this->returnedBy?->name,
            'departed_at' => $this->departed_at,
            'returned_at' => $this->returned_at,
            'can_manage' => $request->user() ? $this->resource->canBeManagedBy($request->user()) : false,
            'can_claim' => $request->user() && ! $request->user()->isOwner() && $this->status === 'scheduled' && $this->user_id === null,

            // angka dibawa/tersisa/terpakai = barang habis pakai; peralatan punya ringkasan sendiri
            'totals' => [
                'items' => $c['n'],
                'out' => $c['out'],
                'returned' => $reported ? $c['returned'] : null,
                'used' => $reported ? $used : null,
                'damaged' => $reported ? $c['damaged'] : null,
                'damaged_value' => $showValue && $reported ? $c['damaged_value'] : null,
                'out_value' => $showValue ? $c['out_value'] : null,
                'used_value' => $showValue && $reported ? $c['left_value'] : null,
            ],
            'equipment' => [
                'items' => $e['n'],
                'out' => $e['out'],
                'checked' => $e['checked'],
                'back' => $reported ? $e['returned'] : null,
                'damaged' => $reported ? $e['damaged'] : null,
                'lost' => $reported ? $lost : null,
                'lost_value' => $showValue && $reported ? $e['left_value'] : null,
            ],
            // daftar event tanpa rincian barang per baris, supaya ringan
            'items' => $this->when($withLines, fn () => $this->items->map(fn ($l) => [
                'item_id' => $l->item_id,
                'name' => $l->item?->name,
                'sku' => $l->item?->sku,
                'unit' => $l->item?->unit,
                'category' => $l->item?->category?->name,
                'qty_out' => $l->qty_out,
                'qty_returned' => $l->qty_returned,
                'qty_used' => $l->qty_used,
                'qty_damaged' => $l->qty_damaged,
                'is_equipment' => $l->is_equipment,
                'checked' => $l->checked,
                'qty_lost' => $l->qty_lost,
                'price' => $showValue ? (int) ($l->item?->price ?? 0) : null,
            ])->values()),
            'created_at' => $this->created_at,
        ];
    }
}
