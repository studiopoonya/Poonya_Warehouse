<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    public const CONSUMABLE = 'consumable';

    public const EQUIPMENT = 'equipment';

    public const KIND_LABELS = [self::CONSUMABLE => 'Habis pakai', self::EQUIPMENT => 'Peralatan'];

    protected $fillable = ['sku', 'name', 'category_id', 'unit', 'kind', 'kit_qty', 'price', 'description', 'is_active', 'archived_at'];

    protected $attributes = ['kind' => self::CONSUMABLE];

    protected $casts = [
        'kit_qty' => 'integer',
        'price' => 'integer',
        'is_active' => 'boolean',
        'archived_at' => 'datetime',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /** Peralatan: dibawa ke event lalu kembali, stok tidak berkurang karena dipakai */
    public function isEquipment(): bool
    {
        return $this->kind === self::EQUIPMENT;
    }

    /** Barang yang masih dipakai (tidak diarsipkan) */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Sudah pernah dipakai di transaksi? Kalau ya, barang tidak boleh dihapus permanen
     * (riwayat stok, event, transfer & opname-nya akan ikut terhapus) — arsipkan saja.
     */
    public function hasHistory(): bool
    {
        return $this->movements()->exists()
            || EventItem::where('item_id', $this->id)->exists()
            || TransferItem::where('item_id', $this->id)->exists()
            || StockOpnameItem::where('item_id', $this->id)->exists();
    }
}
