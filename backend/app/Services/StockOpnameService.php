<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Stock;
use App\Models\StockOpname;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;

/**
 * Stock opname: samakan stok sistem dengan hitungan fisik.
 * Hanya barang yang dihitung yang disesuaikan; sisanya tidak disentuh.
 */
class StockOpnameService
{
    public function __construct(private StockService $stock, private MailNotifier $mail) {}

    /**
     * @param  array<int, array{item_id:int, counted:int}>  $lines
     */
    public function complete(User $user, Venue $venue, array $lines, ?string $note = null): StockOpname
    {
        $opname = DB::transaction(function () use ($user, $venue, $lines, $note) {
            $opname = StockOpname::create(['venue_id' => $venue->id, 'user_id' => $user->id, 'note' => $note]);
            $opname->update(['code' => 'OPN-'.now()->format('ymd').'-'.str_pad($opname->id, 4, '0', STR_PAD_LEFT)]);

            $items = Item::whereIn('id', array_column($lines, 'item_id'))->get()->keyBy('id');

            foreach ($lines as $line) {
                $item = $items[$line['item_id']];
                $counted = (int) $line['counted'];

                // stok sistem dibaca saat disimpan (bukan saat mulai hitung), dikunci agar tidak berubah di tengah jalan
                Stock::firstOrCreate(['item_id' => $item->id, 'venue_id' => $venue->id]);
                $system = (int) Stock::where('item_id', $item->id)->where('venue_id', $venue->id)->lockForUpdate()->value('quantity');
                $diff = $counted - $system;

                $opname->items()->create([
                    'item_id' => $item->id,
                    'system_qty' => $system,
                    'counted_qty' => $counted,
                    'difference' => $diff,
                ]);

                if ($diff !== 0) {
                    $movement = $this->stock->apply($item, $venue, $diff, 'adjust', "Stock opname {$opname->code}");
                    $movement->update(['stock_opname_id' => $opname->id]);
                }
            }

            return $opname;
        });

        // email ringkasan ke owner (dikirim setelah response)
        $this->mail->opnameCompleted($opname);

        return $opname;
    }
}
