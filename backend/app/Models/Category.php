<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Category extends Model
{
    protected $fillable = ['name', 'slug'];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    /** Buat kategori dengan slug unik (mis. "souvenir", "souvenir-2") */
    public static function createNamed(string $name): self
    {
        return static::create(['name' => $name, 'slug' => static::uniqueSlug($name)]);
    }

    public static function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'kategori';
        $slug = $base;
        for ($i = 2; static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }
}
