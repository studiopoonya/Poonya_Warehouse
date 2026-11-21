<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Item;
use App\Models\Stock;
use App\Models\User;
use App\Models\Venue;
use App\Services\StockService;
use App\Services\TransferService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * DATA CONTOH untuk mencoba aplikasi: 27 barang, simulasi 30 hari, 4 akun staff demo.
 * Jangan dijalankan di data asli!  php artisan db:seed --class=DemoSeeder
 */
class DemoSeeder extends Seeder
{
    /** Kategori yang dianggap barang habis pakai (dipakai harian di venue) */
    private const CONSUMABLE = ['Printer & Media', 'Props', 'Perlengkapan'];

    public function run(StockService $stock, TransferService $transfers): void
    {
        mt_srand(42); // data contoh selalu sama

        // ---------- Venue & kategori dasar ----------
        $this->call(BaseDataSeeder::class);
        $owner = User::where('role', 'owner')->first();
        auth()->setUser($owner); // data contoh dicatat atas nama owner
        $venues = Venue::orderBy('sort_order')->get();

        [$wh, $sat, $dobro, $studio] = $venues->all();

        // ---------- Kategori & barang ----------
        // [sku, nama, satuan, stok awal [WH, SAT, Dobro, Studio], min stok [WH, SAT, Dobro, Studio]]
        $catalog = [
            'Kamera & Lensa' => [
                ['CAM-CNN-200D', 'Kamera Canon EOS 200D', 'unit', [2, 1, 1, 1], [1, 1, 1, 1]],
                ['LNS-CNN-1855', 'Lensa Canon EF-S 18-55mm', 'unit', [2, 1, 1, 0], [1, 1, 1, 0]],
                ['LNS-YN-50', 'Lensa Yongnuo 50mm f/1.8', 'unit', [1, 0, 0, 1], [0, 0, 0, 1]],
                ['BAT-LPE17', 'Baterai Canon LP-E17', 'pcs', [8, 3, 3, 3], [4, 2, 2, 2]],
                ['MEM-SD-64', 'Memory card SD 64GB', 'pcs', [10, 2, 2, 2], [4, 1, 1, 1]],
            ],
            'Printer & Media' => [
                ['PRN-DNP-RX1', 'Printer DNP DS-RX1HS', 'unit', [1, 1, 1, 1], [0, 1, 1, 1]],
                ['MED-DNP-4R', 'Media kit DNP 4R (700 lbr)', 'box', [30, 5, 5, 4], [10, 3, 3, 2]],
                ['MED-DNP-2X6', 'Media kit DNP 2x6 strip', 'box', [16, 4, 3, 2], [5, 2, 2, 1]],
                ['PPR-PHT-4R', 'Kertas foto glossy 4R', 'pack', [50, 8, 8, 10], [15, 4, 4, 4]],
            ],
            'Lighting' => [
                ['LGT-RING-18', 'Ring light 18 inch', 'unit', [3, 1, 1, 2], [1, 1, 1, 1]],
                ['LGT-SOFTBOX', 'Softbox 50x70 + stand', 'set', [4, 2, 2, 2], [1, 2, 2, 2]],
                ['LGT-BULB-85', 'Lampu LED 85W', 'pcs', [12, 2, 2, 4], [6, 2, 2, 2]],
            ],
            'Elektronik' => [
                ['ELC-IPAD-10', 'iPad 10th Gen (operator)', 'unit', [1, 1, 1, 1], [0, 1, 1, 1]],
                ['ELC-MON-22', 'Monitor touchscreen 22"', 'unit', [1, 1, 1, 0], [0, 1, 1, 0]],
                ['ELC-HDMI-5M', 'Kabel HDMI 5m', 'pcs', [10, 2, 2, 2], [4, 1, 1, 1]],
                ['ELC-TERMINAL', 'Kabel roll / terminal 5m', 'pcs', [8, 2, 2, 2], [3, 1, 1, 1]],
                ['ELC-REMOTE', 'Remote shutter bluetooth', 'pcs', [6, 0, 0, 3], [2, 0, 0, 2]],
            ],
            'Props' => [
                ['PRP-KACAMATA', 'Props kacamata lucu', 'pcs', [80, 15, 15, 20], [20, 10, 10, 10]],
                ['PRP-BANDO', 'Bando & topi pesta', 'pcs', [60, 12, 12, 15], [20, 8, 8, 8]],
                ['PRP-BOARD', 'Props papan tulisan', 'pcs', [40, 10, 10, 10], [10, 6, 6, 6]],
                ['PRP-BALON', 'Balon foil huruf', 'pack', [30, 5, 5, 6], [10, 3, 3, 3]],
            ],
            'Backdrop' => [
                ['BDP-SHIMMER', 'Backdrop shimmer wall gold', 'set', [2, 1, 1, 0], [1, 1, 1, 0]],
                ['BDP-KAIN-PTH', 'Backdrop kain putih 3x6m', 'pcs', [4, 0, 0, 2], [1, 0, 0, 1]],
                ['BDP-STAND', 'Stand backdrop portable', 'set', [3, 1, 1, 1], [1, 1, 1, 1]],
            ],
            'Perlengkapan' => [
                ['SUP-ALBUM', 'Album foto / guestbook', 'pcs', [40, 6, 6, 0], [10, 3, 3, 0]],
                ['SUP-FRAME', 'Frame / bingkai foto 4R', 'pcs', [120, 20, 20, 30], [40, 10, 10, 15]],
                ['SUP-CLEAN', 'Cairan pembersih lensa', 'botol', [10, 2, 2, 2], [3, 1, 1, 1]],
            ],
        ];

        // stok awal dicatat 2 bulan lalu supaya tidak mengacaukan statistik "bulan lalu"
        $start = now()->subMonthsNoOverflow(2)->startOfMonth()->setTime(8, 0);
        $mins = [];
        $consumables = collect();

        foreach ($catalog as $catName => $items) {
            $category = Category::firstOrCreate(['slug' => Str::slug($catName)], ['name' => $catName]);

            foreach ($items as [$sku, $name, $unit, $qty, $min]) {
                $item = Item::create(['sku' => $sku, 'name' => $name, 'unit' => $unit, 'category_id' => $category->id]);

                foreach ($venues as $i => $venue) {
                    $mins[$item->id][$venue->id] = $min[$i];
                    Stock::create(['item_id' => $item->id, 'venue_id' => $venue->id, 'quantity' => 0, 'min_stock' => $min[$i]]);
                    if ($qty[$i] > 0) {
                        $stock->apply($item, $venue, $qty[$i], 'in', 'Stok awal', null, $start);
                    }
                }

                // barang habis pakai = kategori consumable, kecuali alat (satuan "unit") seperti printer
                if (in_array($catName, self::CONSUMABLE) && $unit !== 'unit') {
                    $consumables->push($item);
                }
            }
        }

        // ---------- Simulasi 30 hari operasional ----------
        $qtyAt = fn (Item $item, Venue $venue) => (int) Stock::where('item_id', $item->id)->where('venue_id', $venue->id)->value('quantity');
        $at = fn ($day) => now()->subDays($day)->setTime(mt_rand(9, 21), mt_rand(0, 59));
        $outlets = [$sat, $dobro, $studio];

        for ($day = 30; $day >= 1; $day--) {
            $weekend = now()->subDays($day)->isWeekend();

            // Pemakaian harian di venue (lebih ramai saat weekend)
            foreach ($outlets as $venue) {
                foreach ($consumables->random(mt_rand(1, $weekend ? 4 : 2)) as $item) {
                    $current = $qtyAt($item, $venue);
                    if ($current > 0) {
                        $use = mt_rand(1, max(1, (int) ceil($current * 0.2)));
                        $stock->apply($item, $venue, -$use, 'out', $this->usageNote(), null, $at($day));
                    }
                }
            }

            // Pembelian ke gudang: barang yang stok gudangnya mulai sedikit
            if ($day % 3 === 0) {
                $needs = $consumables->filter(fn ($item) => $qtyAt($item, $wh) < $mins[$item->id][$wh->id] * 2)->take(3);
                foreach ($needs->isEmpty() ? $consumables->random(1) : $needs as $item) {
                    $stock->apply($item, $wh, mt_rand(15, 40), 'in', 'Pembelian dari supplier', null, $at($day));
                }
            }

            // Restock dari gudang ke venue: isi ulang barang yang sudah menipis
            if ($day % 2 === 0 || mt_rand(0, 2) === 0) {
                $to = $outlets[array_rand($outlets)];
                $lines = $consumables
                    ->filter(fn ($item) => $mins[$item->id][$to->id] > 0 && $qtyAt($item, $to) < $mins[$item->id][$to->id] * 2)
                    ->take(4)
                    ->map(fn ($item) => [
                        'item_id' => $item->id,
                        'quantity' => min($mins[$item->id][$to->id] * 2 - $qtyAt($item, $to) + mt_rand(0, 3), $qtyAt($item, $wh)),
                    ])
                    ->filter(fn ($l) => $l['quantity'] > 0)
                    ->values()->all();

                if ($lines) {
                    $this->safely(fn () => $transfers->create($wh, $to, $lines, 'Restock rutin', $at($day)));
                }
            }

            // Sesekali peralatan dikembalikan ke gudang untuk servis
            if ($day % 9 === 0) {
                $this->safely(fn () => $transfers->create($dobro, $wh, [
                    ['item_id' => Item::where('sku', 'LGT-BULB-85')->value('id'), 'quantity' => 1],
                ], 'Lampu mati, kirim ke gudang untuk servis', $at($day)));
            }
        }

        // ---------- Pastikan ada beberapa stok menipis untuk contoh ----------
        $drain = [
            ['MED-DNP-4R', $dobro, 1],
            ['PRP-BALON', $sat, 0],
            ['SUP-FRAME', $studio, 6],
            ['BAT-LPE17', $wh, 3],
        ];
        foreach ($drain as [$sku, $venue, $target]) {
            $item = Item::where('sku', $sku)->first();
            $diff = $qtyAt($item, $venue) - $target;
            if ($diff > 0) {
                $stock->apply($item, $venue, -$diff, 'out', 'Dipakai event hari ini', null, now()->subHours(mt_rand(1, 5)));
            }
        }

        // akun staff demo (password: staff123)
        $this->demoStaff();
    }

    private function demoStaff(): void
    {
        foreach ([['Staff Gudang', 'gudang@poonya.test'], ['Staff SAT', 'sat@poonya.test'], ['Staff Dobro', 'dobro@poonya.test'], ['Staff Studio', 'studio@poonya.test']] as [$name, $email]) {
            User::updateOrCreate(['email' => $email], ['name' => $name, 'password' => 'staff123', 'role' => 'staff']);
        }
    }

    private function usageNote(): string
    {
        return ['Pemakaian harian', 'Event wedding', 'Event ulang tahun', 'Event corporate', 'Rusak / cacat', 'Walk-in customer'][mt_rand(0, 5)];
    }

    private function safely(callable $fn): void
    {
        try {
            DB::transaction($fn);
        } catch (ValidationException) {
            // stok tidak cukup, lewati
        }
    }
}
