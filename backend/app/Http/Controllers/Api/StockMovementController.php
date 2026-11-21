<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMovementRequest;
use App\Http\Resources\StockMovementResource;
use App\Models\Item;
use App\Models\StockMovement;
use App\Models\Venue;
use App\Services\StockService;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    /**
     * GET /api/movements?venue_id=&type=in|out|adjust|transfer&item_id=
     */
    public function index(Request $request)
    {
        $type = $request->input('type');
        $venueId = $request->user()->scopedVenueId($request->integer('venue_id') ?: null);

        $movements = StockMovement::with(['item', 'venue', 'transfer', 'user'])
            ->when($venueId, fn ($q, $id) => $q->where('venue_id', $id))
            ->when($request->integer('item_id'), fn ($q, $id) => $q->where('item_id', $id))
            ->when($type === 'transfer', fn ($q) => $q->whereIn('type', ['transfer_in', 'transfer_out']))
            ->when($type === 'event', fn ($q) => $q->whereIn('type', ['event_out', 'event_return', 'event_lost']))
            ->when($type && ! in_array($type, ['transfer', 'event']), fn ($q) => $q->where('type', $type))
            ->latest()
            ->orderByDesc('id')
            ->limit($request->integer('limit', 200))
            ->get();

        return StockMovementResource::collection($movements);
    }

    public function store(StoreMovementRequest $request, StockService $stock)
    {
        abort_unless(
            $request->user()->canAccessVenue($request->integer('venue_id')),
            403,
            'Kamu hanya boleh mencatat stok di venue kamu sendiri.'
        );

        $movement = $stock->record(
            Item::findOrFail($request->input('item_id')),
            Venue::findOrFail($request->input('venue_id')),
            $request->input('type'),
            $request->integer('quantity'),
            $request->input('note'),
        );

        return (new StockMovementResource($movement->load(['item', 'venue', 'user'])))->response()->setStatusCode(201);
    }
}
