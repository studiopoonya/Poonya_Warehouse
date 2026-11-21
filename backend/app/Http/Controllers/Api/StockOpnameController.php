<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\StockOpname;
use App\Models\Venue;
use App\Services\StockOpnameService;
use Illuminate\Http\Request;

/** Stock opname — khusus owner (lihat routes/api.php) */
class StockOpnameController extends Controller
{
    /** GET /api/opnames?venue_id= */
    public function index(Request $request)
    {
        $opnames = StockOpname::with(['venue', 'user', 'items.item'])
            ->when($request->integer('venue_id'), fn ($q, $id) => $q->where('venue_id', $id))
            ->latest()->orderByDesc('id')->limit(100)->get();

        return ['data' => $opnames->map(fn ($o) => $this->present($o))];
    }

    public function show(StockOpname $opname)
    {
        $opname->load(['venue', 'user', 'items.item.category']);

        return ['data' => $this->present($opname) + [
            'items' => $opname->items->sortBy(fn ($l) => [$l->difference === 0 ? 1 : 0, $l->item?->name])->values()->map(fn ($l) => [
                'item_id' => $l->item_id,
                'name' => $l->item?->name,
                'sku' => $l->item?->sku,
                'unit' => $l->item?->unit,
                'category' => $l->item?->category?->name,
                'system_qty' => $l->system_qty,
                'counted_qty' => $l->counted_qty,
                'difference' => $l->difference,
                'price' => (int) ($l->item?->price ?? 0),
            ]),
        ]];
    }

    /** POST /api/opnames { venue_id, note, items: [{ item_id, counted }] } */
    public function store(Request $request, StockOpnameService $service)
    {
        $data = $request->validate([
            'venue_id' => ['required', 'exists:venues,id'],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'distinct', 'exists:items,id'],
            'items.*.counted' => ['required', 'integer', 'min:0'],
        ], [
            'items.required' => 'Belum ada barang yang dihitung.',
            'items.min' => 'Belum ada barang yang dihitung.',
            'items.*.counted.min' => 'Hitungan fisik tidak boleh minus.',
        ]);

        $opname = $service->complete($request->user(), Venue::findOrFail($data['venue_id']), $data['items'], $data['note'] ?? null);

        return response()->json($this->show($opname->fresh()), 201);
    }

    private function present(StockOpname $o): array
    {
        $lines = $o->items;

        return [
            'id' => $o->id,
            'code' => $o->code,
            'venue' => VenueResource::brief($o->venue),
            'user' => $o->user?->name,
            'note' => $o->note,
            'created_at' => $o->created_at,
            'totals' => [
                'counted' => $lines->count(),
                'matched' => $lines->where('difference', 0)->count(),
                'mismatched' => $lines->where('difference', '!=', 0)->count(),
                'plus' => (int) $lines->where('difference', '>', 0)->sum('difference'),
                'minus' => (int) $lines->where('difference', '<', 0)->sum('difference'),
                'value_diff' => (int) $lines->sum(fn ($l) => $l->difference * (int) ($l->item?->price ?? 0)),
            ],
        ];
    }
}
