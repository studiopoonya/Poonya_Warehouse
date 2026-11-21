<?php

namespace App\Http\Resources;

use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'unit' => $this->unit,
            'kind' => $this->kind,
            'kind_label' => Item::KIND_LABELS[$this->kind] ?? $this->kind,
            'kit_qty' => $this->kit_qty,
            'price' => (int) $this->price,
            'is_active' => (bool) $this->is_active,
            'archived_at' => $this->archived_at,
            'description' => $this->description,
            'category' => $this->category ? ['id' => $this->category->id, 'name' => $this->category->name] : null,
            'stocks' => $this->whenLoaded('stocks', fn () => $this->stocks->map(fn ($s) => [
                'venue_id' => $s->venue_id,
                'quantity' => $s->quantity,
                'min_stock' => $s->min_stock,
                'is_low' => $s->is_low,
                // kondisi alat (khusus peralatan); default baik
                'condition' => $this->resource->isEquipment() ? ($s->condition ?? 'baik') : null,
                'condition_at' => $s->condition_at,
            ])->values()),
            'total_quantity' => $this->whenLoaded('stocks', fn () => $this->stocks->sum('quantity')),
            'total_value' => $this->whenLoaded('stocks', fn () => $this->stocks->sum('quantity') * (int) $this->price),
            'created_at' => $this->created_at,
        ];
    }
}
