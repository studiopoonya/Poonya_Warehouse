<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Stock;
use App\Models\StockOpname;
use App\Models\Venue;
use App\Services\BackupService;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/notifications — hal yang perlu perhatian owner, dihitung langsung dari data
 * (tidak disimpan, jadi selalu sesuai kondisi terkini).
 */
class NotificationController extends Controller
{
    /** Event dianggap terlambat lapor sisa setelah berangkat lebih dari ini */
    public const OVERDUE_HOURS = 24;

    public function __invoke(BackupService $backups)
    {
        $list = [];

        // 1. event yang sudah lebih dari 1 hari belum lapor sisa
        foreach (Event::with('user')->where('status', Event::ONGOING)->where('departed_at', '<', now()->subHours(self::OVERDUE_HOURS))->orderBy('departed_at')->get() as $e) {
            $days = max(1, (int) floor($e->departed_at->diffInHours(now()) / 24));
            $list[] = [
                'id' => "event-{$e->id}",
                'type' => 'event_overdue',
                'tone' => $days >= 3 ? 'danger' : 'warn',
                'title' => "{$e->name} belum lapor sisa",
                'text' => ($e->user?->name ?? 'Staff')." · berangkat {$days} hari lalu",
                'link' => "/events/{$e->id}",
                'at' => $e->departed_at,
            ];
        }

        // 1b. event terjadwal yang tanggalnya sudah lewat tapi barangnya belum dicatat
        foreach (Event::with('user')->where('status', Event::SCHEDULED)->where('event_date', '<', now()->toDateString())->orderBy('event_date')->get() as $e) {
            $list[] = [
                'id' => "event-sched-{$e->id}", 'type' => 'event_not_departed', 'tone' => 'warn',
                'title' => "{$e->name} belum dicatat barangnya",
                'text' => ($e->user?->name ?? 'Belum ada penanggung jawab').' · tanggal event '.$e->event_date->format('d/m'),
                'link' => "/events/{$e->id}", 'at' => $e->event_date,
            ];
        }

        // 1c. event dalam 2 hari ke depan yang belum ada penanggung jawab
        foreach (Event::where('status', Event::SCHEDULED)->whereNull('user_id')
            ->whereBetween('event_date', [now()->toDateString(), now()->addDays(2)->toDateString()])->orderBy('event_date')->get() as $e) {
            $list[] = [
                'id' => "event-unassigned-{$e->id}", 'type' => 'event_unassigned', 'tone' => 'info',
                'title' => "{$e->name} belum ada penanggung jawab",
                'text' => 'Tanggal event '.$e->event_date->format('d/m').' · tugaskan ke staff',
                'link' => "/events/{$e->id}", 'at' => $e->event_date,
            ];
        }

        // 2. stok habis & menipis
        $out = Stock::low()->where('quantity', 0)->count();
        $low = Stock::low()->where('quantity', '>', 0)->count();
        if ($out) {
            $list[] = ['id' => 'stock-out', 'type' => 'stock_out', 'tone' => 'danger', 'title' => "{$out} stok habis", 'text' => 'Barang dengan batas minimum yang stoknya 0', 'link' => '/inventory?filter=low', 'at' => null];
        }
        if ($low) {
            $list[] = ['id' => 'stock-low', 'type' => 'stock_low', 'tone' => 'warn', 'title' => "{$low} stok menipis", 'text' => 'Di bawah batas minimum', 'link' => '/inventory?filter=low', 'at' => null];
        }

        // 2b. peralatan rusak / sedang diservis
        $broken = Stock::with(['item', 'venue'])->whereIn('condition', ['rusak', 'servis'])->where('quantity', '>', 0)
            ->whereHas('item', fn ($q) => $q->where('is_active', true)->where('kind', 'equipment'))->get();
        if ($broken->isNotEmpty()) {
            $names = $broken->take(3)->map(fn ($s) => "{$s->item->name} ({$s->venue->name})")->join(', ');
            $list[] = [
                'id' => 'equipment-broken', 'type' => 'equipment_broken', 'tone' => 'danger',
                'title' => "{$broken->count()} alat rusak / diservis",
                'text' => $names.($broken->count() > 3 ? ', …' : ''),
                'link' => $broken->count() === 1 ? "/venues/{$broken->first()->venue_id}" : '/inventory?kind=equipment',
                'at' => $broken->max('condition_at'),
            ];
        }

        // 3. venue yang belum di-opname > 30 hari (hanya kalau sudah ada barang)
        if (DB::table('items')->where('is_active', true)->exists()) {
            foreach (Venue::orderBy('sort_order')->get() as $v) {
                $last = StockOpname::where('venue_id', $v->id)->latest()->value('created_at');
                if (! $last || $last->lt(now()->subDays(30))) {
                    $list[] = [
                        'id' => "opname-{$v->id}", 'type' => 'opname_due', 'tone' => 'info',
                        'title' => "{$v->name} perlu stock opname",
                        'text' => $last ? 'Terakhir '.$last->diffForHumans() : 'Belum pernah di-opname',
                        'link' => "/opname/new?venue={$v->id}", 'at' => $last,
                    ];
                }
            }
        }

        // 4. backup
        $latest = $backups->list()[0] ?? null;
        if (! $latest || now()->diffInHours($latest['created_at']) > 48) {
            $list[] = [
                'id' => 'backup', 'type' => 'backup', 'tone' => 'info',
                'title' => $latest ? 'Backup terakhir lebih dari 2 hari lalu' : 'Belum ada backup data',
                'text' => 'Buat backup di Pengaturan', 'link' => '/settings', 'at' => $latest['created_at'] ?? null,
            ];
        }

        return ['data' => $list, 'count' => count($list)];
    }
}
