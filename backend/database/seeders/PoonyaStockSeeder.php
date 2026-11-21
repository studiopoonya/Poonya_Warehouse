<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Item;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Venue;
use App\Services\StockService;
use App\Support\Sku;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Stok asli Poonya dari sheet lama:
 *   - Warehouse, barang habis pakai (sheet 17 November 2026)
 *   - Warehouse, peralatan "Booth 1" = daftar standar yang dibawa ke event (sheet 31 Agustus 2026)
 *   - Poonya Box SAT (Sunrise At Three) & Poonya Box Dobro (sheet 19/10/2026)
 *
 *   php artisan db:seed --class=PoonyaStockSeeder
 *
 * Aman dijalankan ulang: barang yang sudah ada tidak dibuat dobel, dan stok awal
 * hanya diisi untuk barang/venue yang belum punya riwayat stok sama sekali.
 */
class PoonyaStockSeeder extends Seeder
{
    private const PAPER = 'Kertas & Media Cetak';

    private const FRAME = 'Frame & Album';

    private const SOUVENIR = 'Souvenir';

    private const ELEKTRONIK = 'Peralatan Elektronik';

    private const BACKDROP = 'Backdrop & Properti';

    private const PERLENGKAPAN = 'Perlengkapan';

    /** [nama, kategori, satuan, stok Warehouse] — barang habis pakai */
    private const WAREHOUSE_CONSUMABLES = [
        ['Paper Kodak 305', self::PAPER, 'lembar', 490],
        ['Paper DNP Reguler', self::PAPER, 'lembar', 1065],
        ['Paper DNP Perforated', self::PAPER, 'lembar', 426],
        ['Coverframe 2R', self::FRAME, 'pcs', 2190],
        ['Coverframe 4R', self::FRAME, 'pcs', 1591],
        ['Coverframe Polaroid', self::FRAME, 'pcs', 479],
        ['Scrapbook Set', self::FRAME, 'set', 1],
        ['Keychain Strip', self::SOUVENIR, 'pcs', 109],
        ['Keychain Kotak', self::SOUVENIR, 'pcs', 21],
        ['Keychain Bulat', self::SOUVENIR, 'pcs', 28],
        ['Keychain Love', self::SOUVENIR, 'pcs', 0],
        ['Keychain Persegi Panjang', self::SOUVENIR, 'pcs', 0],
        ['Magnet Sheets', self::SOUVENIR, 'lembar', 0],
        ['Magnet 2R', self::SOUVENIR, 'pcs', 52],
        ['Magnet 4R', self::SOUVENIR, 'pcs', 80],
        ['Kupon', self::PERLENGKAPAN, 'lembar', 370],
        ['Kartu Nama', self::PERLENGKAPAN, 'box', 2],
        ['Lakban', self::PERLENGKAPAN, 'roll', 6],
        ['Label', self::PERLENGKAPAN, 'pack', 4],
        ['E-Money 1', self::PERLENGKAPAN, 'kartu', 0],
        ['E-Money 2', self::PERLENGKAPAN, 'kartu', 0],
    ];

    /** [nama, kategori, satuan, jumlah] — peralatan Booth 1: stok Warehouse = jumlah standar dibawa ke event */
    private const BOOTH_EQUIPMENT = [
        ['Printer Kodak', self::ELEKTRONIK, 'unit', 1],
        ['Kamera', self::ELEKTRONIK, 'unit', 1],
        ['Batre Dummy', self::ELEKTRONIK, 'pcs', 1],
        ['Kabel Data Kamera', self::ELEKTRONIK, 'pcs', 1],
        ['Mini CPU', self::ELEKTRONIK, 'unit', 1],
        ['Monitor Touch', self::ELEKTRONIK, 'unit', 1],
        ['Lighting Yongnuo', self::ELEKTRONIK, 'unit', 1],
        ['Lighting Godox', self::ELEKTRONIK, 'unit', 2],
        ['Batre Godox', self::ELEKTRONIK, 'pcs', 4],
        ['Kabel Terminal', self::ELEKTRONIK, 'pcs', 2],
        ['Keyboard Mini', self::ELEKTRONIK, 'unit', 1],
        ['Orbit 1', self::ELEKTRONIK, 'unit', 1],
        ['Box Foto', self::BACKDROP, 'unit', 1],
        ['Tripod Backdrop', self::BACKDROP, 'unit', 1],
        ['Kain Backdrop', self::BACKDROP, 'lembar', 6],
        ['Tripod Lighting', self::BACKDROP, 'unit', 2],
        ['Diffuser', self::BACKDROP, 'pcs', 2],
        ['Meja + Kain Bludru', self::BACKDROP, 'set', 1],
        ['Properti', self::BACKDROP, 'pcs', 12],
        ['Trolley', self::PERLENGKAPAN, 'unit', 1],
        ['Seragam', self::PERLENGKAPAN, 'pcs', 2],
        ['Emoney', self::PERLENGKAPAN, 'kartu', 1],
        ['Gunting', self::PERLENGKAPAN, 'pcs', 2],
        ['Lanyard', self::PERLENGKAPAN, 'pcs', 2],
    ];

    /** [nama, kategori, satuan, jenis, stok SAT, stok Dobro] */
    private const BOX_ITEMS = [
        ['Box Fisik', self::ELEKTRONIK, 'unit', Item::EQUIPMENT, 1, 1],
        ['Printer Fisik', self::ELEKTRONIK, 'unit', Item::EQUIPMENT, 1, 1],
        ['CPU', self::ELEKTRONIK, 'unit', Item::EQUIPMENT, 1, 1],
        ['Monitor', self::ELEKTRONIK, 'unit', Item::EQUIPMENT, 1, 1],
        ['Kamera', self::ELEKTRONIK, 'unit', Item::EQUIPMENT, 1, 1],
        ['Software Photo', self::ELEKTRONIK, 'lisensi', Item::EQUIPMENT, 1, 1],
        ['Properti Foto', self::BACKDROP, 'pcs', Item::CONSUMABLE, 7, 16],
        ['Print Media (sisa print)', self::PAPER, 'print', Item::CONSUMABLE, 320, 243],
        ['DIY Stickers', self::PERLENGKAPAN, 'pcs', Item::CONSUMABLE, 4, 8],
        ['DIY Spidol', self::PERLENGKAPAN, 'pcs', Item::CONSUMABLE, 16, 15],
        ['DIY Paper Clip', self::PERLENGKAPAN, 'pcs', Item::CONSUMABLE, 20, 20],
        ['Keychain basic (kasir)', self::SOUVENIR, 'pcs', Item::CONSUMABLE, 21, 19],
        ['Keychain set (kasir)', self::SOUVENIR, 'set', Item::CONSUMABLE, 8, 10],
        ['Kupon Kendala', self::PERLENGKAPAN, 'lembar', Item::CONSUMABLE, 20, 20],
        ['Kupon Bundling Venue', self::PERLENGKAPAN, 'lembar', Item::CONSUMABLE, 0, 0],
        ['Kupon Bundling Keychain', self::PERLENGKAPAN, 'lembar', Item::CONSUMABLE, 0, 0],
    ];

    public function run(StockService $stock): void
    {
        $this->call(BaseDataSeeder::class);
        auth()->setUser(User::where('role', User::ROLE_OWNER)->first());

        $venue = fn (string $slug) => Venue::where('slug', $slug)->firstOrFail();
        $wh = $venue('warehouse');
        $sat = $venue('poonya-box-sat');
        $dobro = $venue('poonya-box-dobro');
        $sheetVenue = Carbon::parse('2026-10-19 12:00');

        DB::transaction(function () use ($stock, $wh, $sat, $dobro, $sheetVenue) {
            foreach (self::WAREHOUSE_CONSUMABLES as [$name, $cat, $unit, $qty]) {
                $item = $this->item($name, $cat, $unit, Item::CONSUMABLE);
                $this->initial($stock, $item, $wh, $qty, 'Stok awal (sheet Warehouse 17 Nov 2026)');
            }

            foreach (self::BOOTH_EQUIPMENT as [$name, $cat, $unit, $qty]) {
                $item = $this->item($name, $cat, $unit, Item::EQUIPMENT, $qty);
                $this->initial($stock, $item, $wh, $qty, 'Stok awal peralatan Booth 1 (sheet 31 Agu 2026)');
            }

            foreach (self::BOX_ITEMS as [$name, $cat, $unit, $kind, $qtySat, $qtyDobro]) {
                $item = $this->item($name, $cat, $unit, $kind);
                foreach ([[$sat, $qtySat], [$dobro, $qtyDobro]] as [$v, $qty]) {
                    $this->initial($stock, $item, $v, $qty, 'Stok awal (sheet '.$v->name.' 19/10/2026)');
                    // status GOOD di sheet -> kondisi baik
                    if ($kind === Item::EQUIPMENT) {
                        Stock::where('item_id', $item->id)->where('venue_id', $v->id)->update(['condition' => 'baik', 'condition_at' => $sheetVenue]);
                    }
                }
            }
        });

        $this->command?->info('Stok Poonya terisi: '.Item::count().' barang ('.Item::where('kind', Item::EQUIPMENT)->count().' peralatan).');
    }

    /** Barang dengan nama ini (tanpa beda huruf besar/kecil), atau buat baru beserta baris stok 0 di semua venue */
    private function item(string $name, string $category, string $unit, string $kind, ?int $kitQty = null): Item
    {
        $item = Item::whereRaw('LOWER(name) = ?', [Str::lower($name)])->first();
        if (! $item) {
            $item = Item::create([
                'name' => $name,
                'sku' => Sku::generate($name),
                'unit' => $unit,
                'kind' => $kind,
                'kit_qty' => $kitQty,
                'price' => 0,
                'category_id' => Category::where('name', $category)->value('id'),
            ]);
            foreach (Venue::pluck('id') as $venueId) {
                Stock::firstOrCreate(['item_id' => $item->id, 'venue_id' => $venueId]);
            }
        } elseif ($kitQty !== null && $item->kit_qty === null) {
            // barang yang sama dipakai di venue & Booth 1 (mis. Kamera)
            $item->update(['kind' => Item::EQUIPMENT, 'kit_qty' => $kitQty]);
        }

        return $item;
    }

    private function initial(StockService $stock, Item $item, Venue $venue, int $qty, string $note): void
    {
        $touched = StockMovement::where('item_id', $item->id)->where('venue_id', $venue->id)->exists();
        if ($qty > 0 && ! $touched) {
            $stock->apply($item, $venue, $qty, 'in', $note);
        }
    }
}
