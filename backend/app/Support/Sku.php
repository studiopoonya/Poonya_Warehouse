<?php

namespace App\Support;

use App\Models\Item;
use Illuminate\Support\Str;

/** Membuat kode SKU otomatis dari nama barang, mis. "Coverframe 2R" -> "COVERFRAME-2R" */
class Sku
{
    /** @param  array<string, true>  $reserved  SKU lain yang sedang dipakai (mis. dalam satu file import) */
    public static function generate(string $name, array $reserved = []): string
    {
        $base = Str::of(Str::ascii($name))->upper()->replaceMatches('/[^A-Z0-9]+/', '-')->trim('-')->limit(24, '')->rtrim('-')->value();
        $base = $base !== '' ? $base : 'ITEM';

        $sku = $base;
        for ($i = 2; isset($reserved[strtolower($sku)]) || Item::whereRaw('LOWER(sku) = ?', [strtolower($sku)])->exists(); $i++) {
            $sku = "{$base}-{$i}";
        }

        return $sku;
    }
}
