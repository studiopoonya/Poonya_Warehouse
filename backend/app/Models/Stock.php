<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends Model
{
    /** Kondisi peralatan per venue ("Status" di sheet lama) */
    public const CONDITIONS = ['baik' => 'Baik', 'rusak' => 'Rusak', 'servis' => 'Servis'];

    protected $fillable = ['item_id', 'venue_id', 'quantity', 'min_stock', 'condition', 'condition_at'];

    protected $casts = [
        'quantity' => 'integer',
        'min_stock' => 'integer',
        'condition_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    /** Stok dianggap menipis jika jumlahnya di bawah batas minimum (barang arsip diabaikan) */
    public function scopeLow(Builder $query): Builder
    {
        return $query->where('min_stock', '>', 0)
            ->whereColumn('quantity', '<', 'min_stock')
            ->whereHas('item', fn ($q) => $q->where('is_active', true));
    }

    public function getIsLowAttribute(): bool
    {
        return $this->min_stock > 0 && $this->quantity < $this->min_stock;
    }
}
