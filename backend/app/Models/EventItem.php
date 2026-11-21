<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['event_id', 'item_id', 'is_equipment', 'checked', 'qty_out', 'qty_returned', 'qty_damaged'];

    protected $casts = [
        'is_equipment' => 'boolean',
        'checked' => 'boolean',
        'qty_out' => 'integer',
        'qty_returned' => 'integer',
        'qty_damaged' => 'integer',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Barang habis pakai: terpakai = dibawa - tersisa - rusak/hilang.
     * Peralatan tidak "terpakai" (null). Null juga kalau sisa belum dilaporkan.
     */
    public function getQtyUsedAttribute(): ?int
    {
        if ($this->is_equipment || $this->qty_returned === null) {
            return null;
        }

        return $this->qty_out - $this->qty_returned - (int) $this->qty_damaged;
    }

    /**
     * Peralatan: qty_returned = kembali baik, qty_damaged = kembali tapi rusak,
     * hilang = sisanya (satu-satunya yang mengurangi stok).
     */
    public function getQtyLostAttribute(): ?int
    {
        if (! $this->is_equipment || $this->qty_returned === null) {
            return null;
        }

        return max(0, $this->qty_out - $this->qty_returned - (int) $this->qty_damaged);
    }
}
