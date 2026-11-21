<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Item;
use App\Models\Stock;
use App\Models\Venue;
use App\Support\Sku;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Import barang dari Excel/CSV (atau tempelan dari spreadsheet).
 * Alur: preview() -> tampilkan ke user -> commit().
 */
class ItemImportService
{
    /** Nama kolom yang dikenali (huruf kecil, tanpa spasi berlebih) -> field */
    private const HEADERS = [
        'name' => ['nama', 'nama barang', 'barang', 'name', 'item', 'produk'],
        'sku' => ['sku', 'kode', 'kode barang', 'code'],
        'category' => ['kategori', 'category'],
        // "jenis" dulu dipakai sebagai kategori; sekarang = jenis barang, kecuali isinya bukan jenis (lihat mapHeader)
        'kind' => ['jenis', 'jenis barang', 'tipe', 'tipe barang', 'type', 'kind'],
        'kit_qty' => ['standar dibawa', 'jumlah standar', 'jumlah standar dibawa', 'bawa ke event', 'dibawa ke event', 'standar booth', 'booth'],
        'unit' => ['satuan', 'unit', 'uom'],
        'price' => ['harga', 'harga satuan', 'price', 'harga beli'],
        'stock' => ['stok', 'stock', 'qty', 'qty stok', 'jumlah', 'stok awal', 'quantity'],
        'min_stock' => ['min', 'min stok', 'minimum', 'minimum stok', 'stok minimum', 'min stock'],
    ];

    /** Isi kolom "Jenis" yang dikenali -> jenis barang */
    private const KINDS = [
        'habis pakai' => Item::CONSUMABLE, 'habispakai' => Item::CONSUMABLE, 'consumable' => Item::CONSUMABLE,
        'bahan' => Item::CONSUMABLE, 'barang habis pakai' => Item::CONSUMABLE, 'hp' => Item::CONSUMABLE,
        'peralatan' => Item::EQUIPMENT, 'alat' => Item::EQUIPMENT, 'equipment' => Item::EQUIPMENT,
        'aset' => Item::EQUIPMENT, 'asset' => Item::EQUIPMENT, 'perlengkapan booth' => Item::EQUIPMENT,
    ];

    public function __construct(private StockService $stock) {}

    /** "Peralatan" -> equipment, "Habis pakai" -> consumable, kosong -> null, lainnya -> false */
    public static function kind(mixed $v): string|null|false
    {
        $key = Str::of((string) $v)->lower()->squish()->value();

        return $key === '' ? null : (self::KINDS[$key] ?? false);
    }

    /** Baca file xlsx/xls/csv menjadi baris mentah [field => nilai] */
    public function readFile(UploadedFile $file): array
    {
        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet();

        return $this->mapHeader($sheet->toArray(null, true, false, false));
    }

    /** Baris pertama = judul kolom. Kembalikan baris yang sudah dipetakan ke field. */
    public function mapHeader(array $table): array
    {
        $table = array_values(array_filter($table, fn ($r) => collect($r)->filter(fn ($v) => trim((string) $v) !== '')->isNotEmpty()));
        if (! $table) {
            return [];
        }

        $map = [];
        foreach (array_shift($table) as $i => $title) {
            $key = Str::of((string) $title)->lower()->squish()->value();
            foreach (self::HEADERS as $field => $aliases) {
                if (in_array($key, $aliases, true) && ! in_array($field, $map, true)) {
                    $map[$i] = $field;
                }
            }
        }

        // kompatibel dengan file lama: kolom "Jenis" yang isinya kategori (bukan Habis pakai/Peralatan)
        // dan tidak ada kolom Kategori -> dibaca sebagai kategori
        $kindCol = array_search('kind', $map, true);
        if ($kindCol !== false && ! in_array('category', $map, true)) {
            $values = collect($table)->pluck($kindCol)->filter(fn ($v) => trim((string) $v) !== '');
            if ($values->isNotEmpty() && $values->every(fn ($v) => self::kind($v) === false)) {
                $map[$kindCol] = 'category';
            }
        }

        return array_map(function ($row) use ($map) {
            $out = [];
            foreach ($map as $i => $field) {
                $out[$field] = $row[$i] ?? null;
            }

            return $out;
        }, $table);
    }

    /**
     * Normalisasi & validasi. Status per baris: new | exists | error.
     *
     * @return array{rows: array, summary: array}
     */
    public function preview(array $rawRows): array
    {
        $existingSku = Item::pluck('id', 'sku')->mapWithKeys(fn ($id, $sku) => [strtolower($sku) => $id]);
        $existingName = Item::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [Str::lower(Str::squish($name)) => $id]);
        $categories = Category::pluck('name')->mapWithKeys(fn ($n) => [Str::lower($n) => $n]);

        $seenSku = [];
        $seenName = [];
        $rows = [];

        foreach (array_values($rawRows) as $i => $raw) {
            $name = Str::squish((string) ($raw['name'] ?? ''));
            $name = preg_replace('~\s*/\s*(pcs|unit|set|pack|box|roll|lembar|botol)$~i', '', $name); // "COVERFRAME 2R / pcs"
            $sku = Str::upper(Str::squish((string) ($raw['sku'] ?? '')));
            $cat = Str::squish((string) ($raw['category'] ?? ''));
            $kind = self::kind($raw['kind'] ?? null);

            $row = [
                'line' => $i + 2, // nomor baris di file (baris 1 = judul)
                'name' => $name,
                'sku' => $sku,
                'category' => $cat !== '' ? ($categories[Str::lower($cat)] ?? $cat) : '',
                'new_category' => $cat !== '' && ! isset($categories[Str::lower($cat)]),
                'unit' => Str::lower(Str::squish((string) ($raw['unit'] ?? ''))) ?: 'pcs',
                'price' => $this->number($raw['price'] ?? null),
                'stock' => $this->number($raw['stock'] ?? null),
                'min_stock' => $this->number($raw['min_stock'] ?? null),
                // null = kolom jenis kosong: barang baru jadi habis pakai, barang lama tidak diubah
                'kind' => $kind === false ? (string) $raw['kind'] : $kind,
                'kit_qty' => $this->number($raw['kit_qty'] ?? null),
                'status' => 'new',
                'message' => null,
                'existing_id' => null,
            ];

            $errors = [];
            if ($name === '') {
                $errors[] = 'Nama barang kosong';
            } elseif (mb_strlen($name) > 150) {
                $errors[] = 'Nama terlalu panjang';
            }
            if (mb_strlen($sku) > 50) {
                $errors[] = 'SKU terlalu panjang';
            }
            foreach (['price' => 'Harga', 'stock' => 'Stok', 'min_stock' => 'Min. stok', 'kit_qty' => 'Standar dibawa'] as $f => $label) {
                if ($row[$f] === false) {
                    $errors[] = "{$label} bukan angka";
                }
            }
            if ($kind === false) {
                $errors[] = 'Jenis harus "Habis pakai" atau "Peralatan"';
            }
            // jumlah standar dibawa hanya untuk peralatan. Jenis kosong: tetap disimpan, dipakai kalau
            // barangnya (yang sudah ada) memang peralatan — barang baru tanpa jenis jadi habis pakai.
            if ($row['kit_qty'] && $kind === Item::CONSUMABLE) {
                $row['kit_qty'] = null;
            }

            $nameKey = Str::lower($name);
            if ($sku !== '' && isset($seenSku[strtolower($sku)])) {
                $errors[] = "SKU dobel dengan baris {$seenSku[strtolower($sku)]}";
            } elseif ($name !== '' && isset($seenName[$nameKey]) && $sku === '') {
                $errors[] = "Nama dobel dengan baris {$seenName[$nameKey]}";
            }

            if ($errors) {
                $row['status'] = 'error';
                $row['message'] = implode(', ', $errors);
            } else {
                $existing = ($sku !== '' ? ($existingSku[strtolower($sku)] ?? null) : null) ?? ($existingName[$nameKey] ?? null);
                if ($existing) {
                    $row['status'] = 'exists';
                    $row['existing_id'] = $existing;
                    $row['message'] = 'Sudah ada di inventaris';
                }
            }

            if ($sku !== '') {
                $seenSku[strtolower($sku)] ??= $row['line'];
            }
            if ($name !== '') {
                $seenName[$nameKey] ??= $row['line'];
            }

            // nilai yang bukan angka dibiarkan apa adanya supaya tetap ditolak saat disimpan
            foreach (['price', 'stock', 'min_stock', 'kit_qty'] as $f) {
                $row[$f] = $row[$f] === false ? (string) $raw[$f] : $row[$f];
            }
            $rows[] = $row;
        }

        $c = collect($rows);

        return [
            'rows' => $rows,
            'summary' => [
                'total' => $c->count(),
                'new' => $c->where('status', 'new')->count(),
                'exists' => $c->where('status', 'exists')->count(),
                'error' => $c->where('status', 'error')->count(),
                'equipment' => $c->where('status', '!=', 'error')->where('kind', Item::EQUIPMENT)->count(),
                'new_categories' => $c->where('status', '!=', 'error')->where('new_category', true)->pluck('category')->unique()->values(),
            ],
        ];
    }

    /**
     * Simpan hasil import.
     * - barang baru: dibuat + stok awal di $venue
     * - barang yang sudah ada: dilewati, atau (jika $updateExisting) diperbarui harga/kategori/satuan.
     *   Stok barang lama TIDAK diubah — pakai stock opname untuk itu.
     */
    public function commit(array $rawRows, Venue $venue, bool $updateExisting): array
    {
        $preview = $this->preview($rawRows)['rows'];

        return DB::transaction(function () use ($preview, $venue, $updateExisting) {
            $created = $updated = $skipped = 0;
            $categoryIds = Category::pluck('id', 'name')->mapWithKeys(fn ($id, $n) => [Str::lower($n) => $id])->all();
            $venues = Venue::all();
            $reserved = [];

            $categoryId = function (string $name) use (&$categoryIds) {
                if ($name === '') {
                    return null;
                }

                return $categoryIds[Str::lower($name)] ??= Category::createNamed($name)->id;
            };

            foreach ($preview as $row) {
                if ($row['status'] === 'error') {
                    $skipped++;

                    continue;
                }

                if ($row['status'] === 'exists') {
                    if (! $updateExisting) {
                        $skipped++;

                        continue;
                    }
                    $item = Item::find($row['existing_id']);
                    $item->update(array_filter([
                        'price' => $row['price'],
                        'unit' => $row['unit'],
                        'category_id' => $row['category'] !== '' ? $categoryId($row['category']) : null,
                        'kind' => $row['kind'],
                    ], fn ($v) => $v !== null));
                    // jumlah standar: diisi -> pakai; jadi habis pakai -> dihapus
                    if ($item->kind !== Item::EQUIPMENT) {
                        $item->update(['kit_qty' => null]);
                    } elseif ($row['kit_qty'] !== null) {
                        $item->update(['kit_qty' => $row['kit_qty'] ?: null]);
                    }
                    if ($row['min_stock'] !== null) {
                        Stock::updateOrCreate(['item_id' => $item->id, 'venue_id' => $venue->id], ['min_stock' => $row['min_stock']]);
                    }
                    $updated++;

                    continue;
                }

                $sku = $row['sku'] !== '' ? $row['sku'] : Sku::generate($row['name'], $reserved);
                $reserved[strtolower($sku)] = true;

                $item = Item::create([
                    'sku' => $sku,
                    'name' => $row['name'],
                    'unit' => $row['unit'],
                    'price' => $row['price'] ?? 0,
                    'category_id' => $categoryId($row['category']),
                    'kind' => $row['kind'] ?? Item::CONSUMABLE,
                    'kit_qty' => ($row['kind'] ?? null) === Item::EQUIPMENT ? ($row['kit_qty'] ?: null) : null,
                ]);
                foreach ($venues as $v) {
                    Stock::create([
                        'item_id' => $item->id,
                        'venue_id' => $v->id,
                        'quantity' => 0,
                        'min_stock' => $v->id === $venue->id ? ($row['min_stock'] ?? 0) : 0,
                    ]);
                }
                if (($row['stock'] ?? 0) > 0) {
                    $this->stock->apply($item, $venue, $row['stock'], 'in', 'Stok awal (import)');
                }
                $created++;
            }

            return compact('created', 'updated', 'skipped');
        });
    }

    /** "Rp 15.000" / "6.101" / "6,101" / 6101 -> 6101. Kosong -> null. Bukan angka -> false. */
    private function number(mixed $v): int|null|false
    {
        if ($v === null || trim((string) $v) === '') {
            return null;
        }
        if (is_int($v) || is_float($v)) {
            return $v < 0 ? false : (int) round($v);
        }
        $s = preg_replace('/^\s*rp\.?\s*/i', '', trim((string) $v));
        $s = preg_replace('/[,.](\d{1,2})$/', '', $s);   // buang desimal ",00" / ".50"
        $digits = preg_replace('/[.,\s]/', '', $s);       // buang pemisah ribuan

        return ctype_digit($digits) ? (int) $digits : false;
    }
}
