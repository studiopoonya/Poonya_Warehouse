<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Data dasar yang selalu dibutuhkan: 4 venue & kategori barang.
 * Aman dijalankan berulang (tidak membuat duplikat, tidak menimpa perubahan nama/alamat).
 */
class BaseDataSeeder extends Seeder
{
    public const VENUES = [
        ['name' => 'Warehouse', 'type' => 'warehouse', 'description' => 'Gudang pusat: stok cadangan, peralatan, dan barang habis pakai sebelum didistribusikan.'],
        ['name' => 'Poonya Box SAT', 'type' => 'booth', 'description' => 'Photobooth Poonya Box cabang SAT.'],
        ['name' => 'Poonya Box Dobro', 'type' => 'booth', 'description' => 'Photobooth Poonya Box cabang Dobro.'],
        ['name' => 'Self Studio', 'type' => 'studio', 'description' => 'Self photo studio — pelanggan foto sendiri dengan remote.'],
    ];

    /** Kategori awal, disesuaikan dengan barang photobooth Poonya */
    public const CATEGORIES = [
        'Frame & Album',          // Coverframe 2R/4R/Polaroid, Scrapbook
        'Kertas & Media Cetak',   // Paper DNP, Paper Kodak 305
        'Souvenir',               // Keychain, Magnet
        'Peralatan Elektronik',   // Printer, Kamera, Laptop, Monitor, CPU, Lighting, Terminal kabel
        'Backdrop & Properti',    // Kain beludru/sequin, Tiang backdrop, Properti, Meja
        'Perlengkapan',           // Gunting, Lakban, Spidol, Label, Kupon, E-Money
    ];

    public function run(): void
    {
        foreach (self::VENUES as $i => $v) {
            Venue::firstOrCreate(['slug' => Str::slug($v['name'])], $v + ['sort_order' => $i]);
        }

        foreach (self::CATEGORIES as $name) {
            Category::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name]);
        }
    }
}
