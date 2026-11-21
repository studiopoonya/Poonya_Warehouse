<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Item;
use App\Models\StockOpname;
use App\Models\Venue;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Laporan .xlsx yang bisa langsung dibuka di Excel / Google Sheets */
class ExcelExportService
{
    private const RUPIAH = '"Rp" #,##0';

    private const NUMBER = '#,##0';

    /** Template import barang (dengan contoh & petunjuk) */
    public function importTemplate(): StreamedResponse
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Barang');
        $this->table($sheet, ['Nama barang', 'SKU', 'Kategori', 'Jenis', 'Satuan', 'Harga', 'Stok', 'Min stok', 'Standar dibawa'], [
            ['COVERFRAME 2R', '', 'Frame & Album', 'Habis pakai', 'pcs', 1500, 6101, 500, null],
            ['Paper DNP Reguler', '', 'Kertas & Media Cetak', 'Habis pakai', 'lembar', 3000, 969, 200, null],
            ['Printer DNP', '', 'Peralatan Elektronik', 'Peralatan', 'unit', 15000000, 1, 0, 1],
        ], [5 => self::RUPIAH, 6 => self::NUMBER, 7 => self::NUMBER, 8 => self::NUMBER]);

        $help = $book->createSheet()->setTitle('Petunjuk');
        $lines = [
            ['Petunjuk import barang'],
            [''],
            ['• Isi satu barang per baris di sheet "Barang". Hapus 3 baris contoh sebelum import.'],
            ['• Wajib: Nama barang. Kolom lain boleh kosong.'],
            ['• SKU kosong = dibuat otomatis dari nama barang.'],
            ['• Kategori yang belum ada akan dibuat otomatis.'],
            ['• Jenis: "Habis pakai" (stok berkurang saat dipakai di event) atau "Peralatan" (kamera, printer, lighting — dibawa pulang lagi). Kosong = Habis pakai.'],
            ['• Standar dibawa: khusus Peralatan, jumlah yang otomatis tercentang di form staff saat berangkat event (daftar Booth 1). Kosong = tidak masuk daftar.'],
            ['• Satuan kosong = pcs. Harga dalam rupiah tanpa titik juga boleh (15000).'],
            ['• Stok & Min stok masuk ke venue yang dipilih saat import (biasanya Warehouse).'],
            ['• Barang yang sudah ada (SKU / nama sama) tidak dibuat dua kali.'],
        ];
        foreach ($lines as $i => $l) {
            $help->setCellValue('A'.($i + 1), $l[0]);
        }
        $help->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $help->getColumnDimension('A')->setWidth(95);

        $book->setActiveSheetIndex(0);

        return $this->download($book, 'template-import-barang.xlsx');
    }

    /** Inventaris: stok per venue + nilai */
    public function inventory(bool $includeArchived = false): StreamedResponse
    {
        $venues = Venue::orderBy('sort_order')->get();
        $items = Item::with(['category', 'stocks'])->when(! $includeArchived, fn ($q) => $q->active())->orderBy('name')->get();

        $headers = ['Nama barang', 'SKU', 'Kategori', 'Satuan', 'Harga'];
        foreach ($venues as $v) {
            $headers[] = $v->name;
        }
        array_push($headers, 'Total stok', 'Nilai stok', 'Status', 'Jenis');

        $rows = $items->map(function ($it) use ($venues) {
            $stocks = $it->stocks->keyBy('venue_id');
            $row = [$it->name, $it->sku, $it->category?->name, $it->unit, (int) $it->price];
            foreach ($venues as $v) {
                $row[] = (int) ($stocks[$v->id]->quantity ?? 0);
            }
            $total = $it->stocks->sum('quantity');
            $low = $it->stocks->contains(fn ($s) => $s->is_low);
            $broken = $it->isEquipment() ? $it->stocks->whereIn('condition', ['rusak', 'servis'])->count() : 0;
            $status = ! $it->is_active ? 'Diarsipkan' : ($broken ? 'Ada yang rusak/servis' : ($low ? 'Menipis' : 'Aman'));
            array_push($row, $total, $total * (int) $it->price, $status, Item::KIND_LABELS[$it->kind] ?? $it->kind);

            return $row;
        })->all();

        $n = count($venues);
        $formats = [4 => self::RUPIAH, 5 + $n => self::NUMBER, 6 + $n => self::RUPIAH];
        for ($i = 0; $i < $n; $i++) {
            $formats[5 + $i] = self::NUMBER;
        }

        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Inventaris');
        $this->table($sheet, $headers, $rows, $formats, totals: [5 + $n, 6 + $n]);

        return $this->download($book, 'inventaris-'.now()->format('Y-m-d').'.xlsx');
    }

    /** Pemakaian barang di event dalam satu bulan (YYYY-MM) */
    public function events(string $month): StreamedResponse
    {
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $events = Event::with(['items.item', 'user'])
            ->where('status', '!=', Event::CANCELLED)
            ->whereBetween('event_date', [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()])
            ->orderBy('event_date')->get();

        $detail = [];
        $perItem = [];
        foreach ($events as $e) {
            foreach ($e->items as $l) {
                // peralatan tidak "terpakai"; hanya masuk laporan kalau ada yang hilang
                if ($l->is_equipment && ! $l->qty_lost) {
                    continue;
                }
                $bad = $l->is_equipment ? (int) $l->qty_lost : (int) $l->qty_damaged;
                $price = (int) ($l->item?->price ?? 0);
                $used = $l->qty_used;
                $detail[] = [
                    $e->event_date?->format('d/m/Y'), $e->code, $e->name, $e->location, $e->user?->name,
                    $e->status === Event::COMPLETED ? 'Selesai' : 'Belum lapor sisa',
                    $l->item?->name, $l->qty_out, $l->qty_returned, $bad ?: null, $used, $price, $used === null ? null : $used * $price,
                ];
                $k = $l->item_id;
                $perItem[$k] ??= [$l->item?->name, $l->item?->unit, 0, 0, 0, $price, 0, 0];
                $perItem[$k][2] += $l->qty_out;
                $perItem[$k][3] += $used ?? 0;
                $perItem[$k][4] += $bad;
                $perItem[$k][6] += ($used ?? 0) * $price;
                $perItem[$k][7] += $bad * $price;
            }
        }

        $book = new Spreadsheet;
        $s1 = $book->getActiveSheet()->setTitle('Per barang');
        $rows = collect($perItem)->sortByDesc(fn ($r) => $r[3])->values()->all();
        $this->table($s1, ['Barang', 'Satuan', 'Total dibawa', 'Total terpakai', 'Rusak/hilang', 'Harga', 'Nilai terpakai', 'Nilai rusak/hilang'], $rows,
            [2 => self::NUMBER, 3 => self::NUMBER, 4 => self::NUMBER, 5 => self::RUPIAH, 6 => self::RUPIAH, 7 => self::RUPIAH], totals: [2, 3, 4, 6, 7]);

        $s2 = $book->createSheet()->setTitle('Rincian event');
        $this->table($s2, ['Tanggal', 'Kode', 'Event', 'Lokasi', 'Staff', 'Status', 'Barang', 'Dibawa', 'Tersisa', 'Rusak/hilang', 'Terpakai', 'Harga', 'Nilai terpakai'], $detail,
            [7 => self::NUMBER, 8 => self::NUMBER, 9 => self::NUMBER, 10 => self::NUMBER, 11 => self::RUPIAH, 12 => self::RUPIAH], totals: [7, 9, 10, 12]);

        $book->setActiveSheetIndex(0);

        return $this->download($book, "pemakaian-event-{$month}.xlsx");
    }

    /** Hasil satu stock opname */
    public function opname(StockOpname $opname): StreamedResponse
    {
        $opname->load(['venue', 'user', 'items.item']);
        $rows = $opname->items->map(fn ($l) => [
            $l->item?->name, $l->item?->sku, $l->system_qty, $l->counted_qty, $l->difference,
            (int) ($l->item?->price ?? 0), $l->difference * (int) ($l->item?->price ?? 0),
        ])->all();

        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Opname');
        $sheet->setCellValue('A1', "Stock opname {$opname->code} — {$opname->venue->name}");
        $sheet->setCellValue('A2', 'Tanggal: '.$opname->created_at->format('d/m/Y H:i').' · Oleh: '.($opname->user?->name ?? '-').($opname->note ? ' · '.$opname->note : ''));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $this->table($sheet, ['Barang', 'SKU', 'Sistem', 'Fisik', 'Selisih', 'Harga', 'Nilai selisih'], $rows,
            [2 => self::NUMBER, 3 => self::NUMBER, 4 => '+#,##0;-#,##0;0', 5 => self::RUPIAH, 6 => '"Rp" #,##0;-"Rp" #,##0;"Rp" 0'], startRow: 4, totals: [4, 6]);

        return $this->download($book, "opname-{$opname->code}.xlsx");
    }

    /**
     * Tulis tabel: judul tebal + latar, format angka per kolom (index 0-based), baris total opsional.
     */
    private function table(Worksheet $sheet, array $headers, array $rows, array $formats = [], int $startRow = 1, array $totals = []): void
    {
        $sheet->fromArray($headers, null, 'A'.$startRow);
        if ($rows) {
            $sheet->fromArray($rows, null, 'A'.($startRow + 1), true);
        }
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));
        $lastRow = $startRow + max(count($rows), 1);

        $head = $sheet->getStyle("A{$startRow}:{$lastCol}{$startRow}");
        $head->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $head->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('121412');

        foreach ($formats as $i => $fmt) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->getStyle("{$col}".($startRow + 1).":{$col}".($lastRow + 1))->getNumberFormat()->setFormatCode($fmt);
        }

        if ($totals && $rows) {
            $t = $lastRow + 1;
            $sheet->setCellValue("A{$t}", 'TOTAL');
            foreach ($totals as $i) {
                $col = Coordinate::stringFromColumnIndex($i + 1);
                $sheet->setCellValue("{$col}{$t}", "=SUM({$col}".($startRow + 1).":{$col}{$lastRow})");
            }
            $sheet->getStyle("A{$t}:{$lastCol}{$t}")->getFont()->setBold(true);
        }

        foreach (range(1, count($headers)) as $i) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
        }
        $sheet->freezePane('A'.($startRow + 1));
    }

    private function download(Spreadsheet $book, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($book) {
            (new Xlsx($book))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store',
        ]);
    }
}
