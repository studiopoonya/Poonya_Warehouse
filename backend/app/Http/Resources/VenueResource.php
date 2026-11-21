<?php

namespace App\Http\Resources;

use App\Models\Venue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Staff tetap melihat daftar semua venue (untuk tujuan transfer),
        // tapi angka stok hanya untuk venue miliknya sendiri.
        $canSee = $request->user()?->canAccessVenue($this->id) ?? false;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type,
            'type_label' => $this->type_label,
            'address' => $this->address,
            'description' => $this->description,
            'color' => $this->color,
            'is_main' => $this->type === 'warehouse' && Venue::mainWarehouse()?->id === $this->id,
            'accessible' => $canSee,

            // Ringkasan (ada jika di-query dengan scope withSummary)
            'total_units' => $canSee ? (int) ($this->total_units ?? 0) : null,
            'items_count' => $canSee ? (int) ($this->items_count ?? 0) : null,
            'low_stock_count' => $canSee ? (int) ($this->low_stock_count ?? 0) : null,
            'transfers_in_month' => $canSee ? (int) ($this->transfers_out_month ?? 0) + (int) ($this->transfers_in_month_count ?? 0) : null,

            // Detail (hanya di endpoint show)
            'stocks' => $this->whenLoaded('stocks', fn () => $this->stocks->map(fn ($s) => [
                'item' => [
                    'id' => $s->item->id,
                    'name' => $s->item->name,
                    'sku' => $s->item->sku,
                    'unit' => $s->item->unit,
                    'category' => $s->item->category?->name,
                    'kind' => $s->item->kind,
                ],
                'quantity' => $s->quantity,
                'condition' => $s->item->isEquipment() ? ($s->condition ?? 'baik') : null,
                'condition_at' => $s->condition_at,
                'min_stock' => $s->min_stock,
                'is_low' => $s->is_low,
            ])->values()),
            'recent_movements' => StockMovementResource::collection($this->whenLoaded('movements')),
        ];
    }

    /** Bentuk ringkas untuk relasi */
    public static function brief($venue): ?array
    {
        return $venue ? ['id' => $venue->id, 'name' => $venue->name, 'slug' => $venue->slug, 'type' => $venue->type, 'color' => $venue->color] : null;
    }
}
