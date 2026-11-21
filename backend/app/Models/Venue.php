<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venue extends Model
{
    public const TYPE_LABELS = [
        'warehouse' => 'Gudang',
        'booth' => 'Photobooth',
        'studio' => 'Self photo studio',
    ];

    protected $fillable = ['name', 'slug', 'type', 'address', 'description', 'color', 'sort_order'];

    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(Transfer::class, 'from_venue_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(Transfer::class, 'to_venue_id');
    }

    /** Gudang utama = gudang pertama (urutan terkecil). Dipakai sebagai asal barang event secara default. */
    public static function mainWarehouse(): ?self
    {
        return static::where('type', 'warehouse')->orderBy('sort_order')->orderBy('id')->first();
    }

    /** Pernah dipakai di transaksi? Kalau ya, tidak boleh dihapus (riwayatnya ikut terhapus). */
    public function hasHistory(): bool
    {
        return $this->movements()->exists()
            || $this->outgoingTransfers()->exists() || $this->incomingTransfers()->exists()
            || Event::where('source_venue_id', $this->id)->exists()
            || StockOpname::where('venue_id', $this->id)->exists()
            || $this->stocks()->where('quantity', '>', 0)->exists();
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPE_LABELS[$this->type] ?? ucfirst($this->type);
    }

    /** Tambahkan ringkasan stok: total_units, items_count, low_stock_count, transfers_in_month */
    public function scopeWithSummary(Builder $query): Builder
    {
        $monthStart = now()->startOfMonth();

        return $query
            ->withSum('stocks as total_units', 'quantity')
            ->withCount([
                'stocks as items_count' => fn ($q) => $q->where('quantity', '>', 0),
                'stocks as low_stock_count' => fn ($q) => $q->low(),
                'outgoingTransfers as transfers_out_month' => fn ($q) => $q->where('created_at', '>=', $monthStart),
                'incomingTransfers as transfers_in_month_count' => fn ($q) => $q->where('created_at', '>=', $monthStart),
            ])
            ->orderBy('sort_order');
    }
}
