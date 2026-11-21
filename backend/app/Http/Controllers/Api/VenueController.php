<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use Illuminate\Http\Request;

class VenueController extends Controller
{
    public function index()
    {
        return VenueResource::collection(Venue::withSummary()->get());
    }

    public function show(Request $request, int $id)
    {
        abort_unless($request->user()->canAccessVenue($id), 403, 'Kamu tidak punya akses ke venue ini.');

        $venue = Venue::withSummary()
            ->with([
                // barang yang memang ada / dipantau di venue ini (baris stok 0 tanpa minimum disembunyikan)
                'stocks' => fn ($q) => $q->with('item.category')
                    ->whereHas('item', fn ($i) => $i->where('is_active', true))
                    ->where(fn ($w) => $w->where('quantity', '>', 0)->orWhere('min_stock', '>', 0))
                    ->orderByDesc('quantity'),
                'movements' => fn ($q) => $q->with(['item', 'venue', 'transfer', 'user'])->latest()->orderByDesc('id')->limit(10),
            ])
            ->findOrFail($id);

        return new VenueResource($venue);
    }
}
