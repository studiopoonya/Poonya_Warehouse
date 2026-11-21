<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ItemRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\Stock;
use App\Models\Venue;
use App\Services\ExcelExportService;
use App\Services\ItemImportService;
use App\Services\StockService;
use App\Support\Sku;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Katalog barang — khusus owner (lihat routes/api.php) */
class ItemController extends Controller
{
    public function __construct(private StockService $stock) {}

    /**
     * GET /api/items?search=&category_id=&low=1&venue_id=&archived=1
     * Default hanya barang aktif; archived=1 menampilkan barang yang diarsipkan.
     */
    public function index(Request $request)
    {
        $venueId = $request->integer('venue_id') ?: null;

        $items = Item::query()
            ->with(['category', 'stocks'])
            ->where('is_active', ! $request->boolean('archived'))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->input('search').'%';
                $q->where(fn ($w) => $w->where('name', 'like', $term)->orWhere('sku', 'like', $term));
            })
            ->when($request->filled('kind'), fn ($q) => $q->where('kind', $request->input('kind')))
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->input('category_id')))
            ->when($request->boolean('low'), fn ($q) => $q->whereHas(
                'stocks',
                fn ($s) => $s->low()->when($venueId, fn ($v) => $v->where('venue_id', $venueId))
            ))
            ->orderBy('name')
            ->get();

        return ItemResource::collection($items);
    }

    public function store(ItemRequest $request)
    {
        $item = DB::transaction(function () use ($request) {
            $data = $request->safe()->except('stocks');
            $data['sku'] = filled($data['sku'] ?? null) ? strtoupper($data['sku']) : Sku::generate($data['name']);
            $data['price'] = $data['price'] ?? 0;
            $data['kind'] = $data['kind'] ?? Item::CONSUMABLE;
            $item = Item::create($this->normalizeKit($data));
            $input = collect($request->input('stocks', []))->keyBy('venue_id');

            // setiap venue punya baris stok (meski 0) supaya tabel konsisten
            foreach (Venue::all() as $venue) {
                $row = $input->get($venue->id, []);
                Stock::create([
                    'item_id' => $item->id,
                    'venue_id' => $venue->id,
                    'quantity' => 0,
                    'min_stock' => (int) ($row['min_stock'] ?? 0),
                ]);
                if (($qty = (int) ($row['quantity'] ?? 0)) > 0) {
                    $this->stock->apply($item, $venue, $qty, 'in', 'Stok awal');
                }
            }

            return $item;
        });

        return new ItemResource($item->load(['category', 'stocks']));
    }

    public function update(ItemRequest $request, Item $item)
    {
        DB::transaction(function () use ($request, $item) {
            $data = $request->safe()->except('stocks');
            $data['sku'] = filled($data['sku'] ?? null) ? strtoupper($data['sku']) : $item->sku;
            $data['price'] = $data['price'] ?? $item->price;
            $data['kind'] = $data['kind'] ?? $item->kind;
            $item->update($this->normalizeKit($data));

            // jumlah stok TIDAK diubah di sini (harus lewat movement/opname), hanya batas minimum
            foreach ($request->input('stocks', []) as $row) {
                Stock::updateOrCreate(
                    ['item_id' => $item->id, 'venue_id' => $row['venue_id']],
                    ['min_stock' => (int) ($row['min_stock'] ?? 0)],
                );
            }
        });

        return new ItemResource($item->load(['category', 'stocks']));
    }

    /** PUT /api/items/{item}/condition { venue_id, condition: baik|rusak|servis } — kondisi peralatan di satu venue */
    public function condition(Request $request, Item $item)
    {
        abort_unless($item->isEquipment(), 422, 'Kondisi hanya untuk barang jenis peralatan.');
        $data = $request->validate([
            'venue_id' => ['required', 'exists:venues,id'],
            'condition' => ['required', Rule::in(array_keys(Stock::CONDITIONS))],
        ], ['condition.in' => 'Kondisi harus Baik, Rusak, atau Servis.']);

        Stock::updateOrCreate(
            ['item_id' => $item->id, 'venue_id' => $data['venue_id']],
            ['condition' => $data['condition'], 'condition_at' => now()],
        );

        return new ItemResource($item->load(['category', 'stocks']));
    }

    /** Barang habis pakai tidak punya jumlah standar dibawa */
    private function normalizeKit(array $data): array
    {
        if ($data['kind'] !== Item::EQUIPMENT || ! ($data['kit_qty'] ?? null)) {
            $data['kit_qty'] = null;
        }

        return $data;
    }

    /** PATCH /api/items/{item}/archive { archived: bool } */
    public function archive(Request $request, Item $item)
    {
        $archived = $request->boolean('archived', true);
        $item->update(['is_active' => ! $archived, 'archived_at' => $archived ? now() : null]);

        return new ItemResource($item->load(['category', 'stocks']));
    }

    /** Hapus permanen hanya untuk barang yang belum pernah dipakai di transaksi apa pun */
    public function destroy(Item $item)
    {
        if ($item->hasHistory()) {
            return response()->json([
                'message' => 'Barang ini sudah punya riwayat stok/event/opname, jadi tidak bisa dihapus permanen. Arsipkan saja.',
            ], 422);
        }

        $item->delete();

        return response()->noContent();
    }

    /** POST /api/items/import/preview — file (xlsx/xls/csv) ATAU rows (hasil tempel dari spreadsheet) */
    public function importPreview(Request $request, ItemImportService $import)
    {
        $request->validate([
            'file' => ['nullable', 'file', 'max:5120', 'mimes:xlsx,xls,csv,txt'],
            'rows' => ['nullable', 'array', 'max:2000'],
        ], ['file.mimes' => 'File harus Excel (.xlsx/.xls) atau .csv.', 'file.max' => 'File maksimal 5 MB.']);

        if ($request->hasFile('file')) {
            $rows = $import->readFile($request->file('file'));
        } elseif ($request->filled('rows')) {
            $rows = $import->mapHeader($request->input('rows'));
        } else {
            return response()->json(['message' => 'Pilih file atau tempel data dulu.'], 422);
        }

        if (! $rows) {
            return response()->json(['message' => 'Data kosong atau kolom "Nama barang" tidak ditemukan di baris judul.'], 422);
        }
        if (! array_key_exists('name', $rows[0])) {
            return response()->json(['message' => 'Kolom "Nama barang" tidak ditemukan. Pastikan baris pertama berisi judul kolom (pakai template).'], 422);
        }

        return $import->preview($rows);
    }

    /** POST /api/items/import { venue_id, update_existing, rows: [hasil preview] } */
    public function import(Request $request, ItemImportService $import)
    {
        $data = $request->validate([
            'venue_id' => ['required', 'exists:venues,id'],
            'update_existing' => ['boolean'],
            'rows' => ['required', 'array', 'min:1', 'max:2000'],
        ]);

        // baris dari preview sudah berbentuk [field => nilai]; divalidasi ulang di server
        $rows = collect($data['rows'])->map(fn ($r) => collect($r)->only(['name', 'sku', 'category', 'kind', 'kit_qty', 'unit', 'price', 'stock', 'min_stock'])->all())->all();

        return $import->commit($rows, Venue::findOrFail($data['venue_id']), (bool) ($data['update_existing'] ?? false));
    }

    public function importTemplate(ExcelExportService $excel)
    {
        return $excel->importTemplate();
    }

    public function export(Request $request, ExcelExportService $excel)
    {
        return $excel->inventory($request->boolean('archived'));
    }
}
