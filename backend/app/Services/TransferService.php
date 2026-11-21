<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Transfer;
use App\Models\Venue;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class TransferService
{
    public function __construct(private StockService $stock) {}

    /**
     * Pindahkan barang dari satu venue ke venue lain secara atomik.
     *
     * @param  array<int, array{item_id:int, quantity:int}>  $lines
     */
    public function create(Venue $from, Venue $to, array $lines, ?string $note = null, ?CarbonInterface $at = null): Transfer
    {
        return DB::transaction(function () use ($from, $to, $lines, $note, $at) {
            $at ??= now();

            $transfer = Transfer::create([
                'from_venue_id' => $from->id,
                'to_venue_id' => $to->id,
                'user_id' => auth()->id(),
                'note' => $note,
                'created_at' => $at,
            ]);
            $transfer->update(['code' => 'TRF-'.$at->format('ymd').'-'.str_pad($transfer->id, 4, '0', STR_PAD_LEFT)]);

            $items = Item::whereIn('id', array_column($lines, 'item_id'))->get()->keyBy('id');

            foreach ($lines as $line) {
                $item = $items[$line['item_id']];
                $qty = (int) $line['quantity'];

                $transfer->items()->create(['item_id' => $item->id, 'quantity' => $qty]);
                $this->stock->apply($item, $from, -$qty, 'transfer_out', null, $transfer, $at);
                $this->stock->apply($item, $to, $qty, 'transfer_in', null, $transfer, $at);
            }

            return $transfer->load(['fromVenue', 'toVenue', 'items.item']);
        });
    }
}
