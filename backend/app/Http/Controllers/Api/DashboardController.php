<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StockMovementResource;
use App\Http\Resources\TransferResource;
use App\Http\Resources\VenueResource;
use App\Models\Category;
use App\Models\Event;
use App\Models\Item;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Transfer;
use App\Models\Venue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard?venue_id=&days=30
     */
    public function __invoke(Request $request)
    {
        // staff selalu dikunci ke venue-nya sendiri
        $venueId = $request->user()->scopedVenueId($request->integer('venue_id') ?: null);
        $days = min(90, max(7, $request->integer('days', 30)));

        $thisMonth = now()->startOfMonth();
        $lastMonth = now()->subMonthNoOverflow()->startOfMonth();

        $stocks = fn () => Stock::query()->when($venueId, fn ($q) => $q->where('venue_id', $venueId));
        $movements = fn () => StockMovement::query()->when($venueId, fn ($q) => $q->where('venue_id', $venueId));
        $transfers = fn () => Transfer::query()->involving($venueId);

        $stats = [
            'total_units' => (int) $stocks()->sum('quantity'),
            'total_value' => (int) $stocks()->join('items', 'items.id', '=', 'stocks.item_id')->where('items.is_active', true)->sum(DB::raw('stocks.quantity * items.price')),
            'total_items' => $venueId
                ? $stocks()->where('quantity', '>', 0)->count()
                : Item::count(),
            'total_categories' => Category::count(),
            'low_stock_count' => $stocks()->low()->count(),
            'out_of_stock_count' => $stocks()->low()->where('quantity', 0)->count(),
            'transfers_this_month' => $transfers()->where('created_at', '>=', $thisMonth)->count(),
            'transfers_last_month' => $transfers()->whereBetween('created_at', [$lastMonth, $thisMonth])->count(),
            'in_this_month' => (int) $movements()->where('type', 'in')->where('created_at', '>=', $thisMonth)->sum('change'),
            'in_last_month' => (int) $movements()->where('type', 'in')->whereBetween('created_at', [$lastMonth, $thisMonth])->sum('change'),
        ];

        return [
            'stats' => $stats,
            'daily' => $this->daily($movements(), $days, (bool) $venueId),
            'low_stock' => $stocks()->low()
                ->with(['item', 'venue'])
                ->orderByRaw('CAST(quantity AS REAL) / min_stock')
                ->limit(8)
                ->get()
                ->map(fn ($s) => [
                    'item_id' => $s->item_id,
                    'name' => $s->item->name,
                    'sku' => $s->item->sku,
                    'venue' => VenueResource::brief($s->venue),
                    'quantity' => $s->quantity,
                    'min_stock' => $s->min_stock,
                ]),
            'recent_transfers' => TransferResource::collection(
                $transfers()->with(['fromVenue', 'toVenue', 'items.item', 'user'])->latest()->limit(5)->get()
            ),
            'recent_movements' => StockMovementResource::collection(
                $movements()->with(['item', 'venue', 'transfer', 'user'])->latest()->orderByDesc('id')->limit(5)->get()
            ),
            // ringkasan per venue hanya untuk owner
            'venues' => $request->user()->isOwner() ? VenueResource::collection(Venue::withSummary()->get()) : [],
            // event hari ini s/d 6 hari ke depan (untuk kartu "Event minggu ini")
            'events_week' => Event::with(['user', 'items'])->where('status', '!=', Event::CANCELLED)
                ->whereBetween('event_date', [now()->toDateString(), now()->addDays(6)->toDateString()])
                ->orderBy('event_date')->orderBy('id')->get()
                ->map(fn ($e) => [
                    'id' => $e->id, 'name' => $e->name, 'location' => $e->location, 'event_date' => $e->event_date->toDateString(),
                    'status' => $e->status, 'staff' => $e->user?->name, 'items' => $e->items->count(), 'units' => (int) $e->items->sum('qty_out'),
                ]),
            // event yang sudah > 1 hari belum lapor sisa
            'overdue_events' => Event::with('user')->where('status', Event::ONGOING)
                ->where('departed_at', '<', now()->subHours(NotificationController::OVERDUE_HOURS))->orderBy('departed_at')->get()
                ->map(fn ($e) => ['id' => $e->id, 'name' => $e->name, 'staff' => $e->user?->name, 'departed_at' => $e->departed_at]),
        ];
    }

    /**
     * Total unit masuk / keluar / transfer per hari. Dijumlahkan di database per (tanggal, tipe)
     * supaya tetap cepat walau riwayat stok sudah puluhan ribu baris.
     * DATE() & GROUP BY alias didukung SQLite, MySQL, dan PostgreSQL.
     */
    private function daily($query, int $days, bool $perVenue): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $change = $query->getQuery()->getGrammar()->wrap('change'); // "change" kata cadangan di MySQL

        $rows = $query->where('created_at', '>=', $from)
            ->selectRaw("DATE(created_at) as day, type, SUM({$change}) as total, SUM(ABS({$change})) as total_abs")
            ->groupBy('day', 'type')
            ->toBase()
            ->get()
            ->groupBy('day');

        $result = [];
        for ($d = $from->copy(); $d->lte(now()); $d->addDay()) {
            $day = $rows->get($d->toDateString(), collect());
            $sum = fn (array $types, string $col = 'total') => (int) $day->whereIn('type', $types)->sum($col);
            $result[] = [
                'date' => $d->toDateString(),
                'in' => $sum(['in', 'event_return']),
                'out' => abs($sum(['out', 'event_out', 'event_lost'])),
                // tanpa filter venue, hitung sisi keluar saja supaya tidak dobel
                'transfer' => $sum($perVenue ? ['transfer_in', 'transfer_out'] : ['transfer_out'], 'total_abs'),
            ];
        }

        return $result;
    }
}
