<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Transfer;
use App\Models\Venue;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Satu-satunya pintu untuk mengubah jumlah stok.
 * Setiap perubahan dicatat di stock_movements beserta saldo akhirnya.
 */
class StockService
{
    /**
     * Ubah stok sebesar $change (positif = tambah, negatif = kurang).
     * Wajib dipanggil di dalam DB::transaction().
     */
    public function apply(
        Item $item,
        Venue $venue,
        int $change,
        string $type,
        ?string $note = null,
        ?Transfer $transfer = null,
        ?CarbonInterface $at = null,
        ?int $eventId = null,
    ): StockMovement {
        Stock::firstOrCreate(['item_id' => $item->id, 'venue_id' => $venue->id]);

        $stock = Stock::where('item_id', $item->id)
            ->where('venue_id', $venue->id)
            ->lockForUpdate()
            ->first();

        $newQty = $stock->quantity + $change;

        if ($newQty < 0) {
            throw ValidationException::withMessages([
                'quantity' => "Stok {$item->name} di {$venue->name} tidak cukup (tersisa {$stock->quantity}).",
            ]);
        }

        $stock->update(['quantity' => $newQty]);

        $at ??= now();

        return StockMovement::create([
            'item_id' => $item->id,
            'venue_id' => $venue->id,
            'type' => $type,
            'change' => $change,
            'balance_after' => $newQty,
            'transfer_id' => $transfer?->id,
            'event_id' => $eventId,
            'user_id' => auth()->id(),
            'note' => $note,
            'created_at' => $at,
            'updated_at' => $at,
        ]);
    }

    /** Barang masuk / keluar / penyesuaian (stock opname) */
    public function record(Item $item, Venue $venue, string $type, int $quantity, ?string $note = null, ?CarbonInterface $at = null): StockMovement
    {
        return DB::transaction(function () use ($item, $venue, $type, $quantity, $note, $at) {
            $change = match ($type) {
                'in' => $quantity,
                'out' => -$quantity,
                // penyesuaian: set stok ke angka fisik
                'adjust' => $quantity - (int) Stock::where('item_id', $item->id)->where('venue_id', $venue->id)->value('quantity'),
            };

            return $this->apply($item, $venue, $change, $type, $note, null, $at);
        });
    }
}
