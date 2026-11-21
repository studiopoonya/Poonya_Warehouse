<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransferRequest;
use App\Http\Resources\TransferResource;
use App\Models\Transfer;
use App\Models\Venue;
use App\Services\TransferService;
use Illuminate\Http\Request;

class TransferController extends Controller
{
    public function index(Request $request)
    {
        $venueId = $request->user()->scopedVenueId($request->integer('venue_id') ?: null);

        $transfers = Transfer::with(['fromVenue', 'toVenue', 'items.item', 'user'])
            ->involving($venueId)
            ->latest()
            ->limit($request->integer('limit', 50))
            ->get();

        return TransferResource::collection($transfers);
    }

    public function store(StoreTransferRequest $request, TransferService $service)
    {
        // Staff hanya boleh mengirim barang yang ada di venue-nya sendiri
        abort_unless(
            $request->user()->canAccessVenue($request->integer('from_venue_id')),
            403,
            'Kamu hanya boleh mengirim barang dari venue kamu sendiri.'
        );

        $transfer = $service->create(
            Venue::findOrFail($request->input('from_venue_id')),
            Venue::findOrFail($request->input('to_venue_id')),
            $request->input('items'),
            $request->input('note'),
        );

        return (new TransferResource($transfer->load('user')))->response()->setStatusCode(201);
    }
}
