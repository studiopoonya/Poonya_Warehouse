<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'change' => $this->change,
            'balance_after' => $this->balance_after,
            'note' => $this->note,
            'item' => ['id' => $this->item->id, 'name' => $this->item->name, 'sku' => $this->item->sku],
            'venue' => VenueResource::brief($this->venue),
            'transfer_code' => $this->transfer?->code,
            'user' => $this->whenLoaded('user', fn () => $this->user?->name),
            'created_at' => $this->created_at,
        ];
    }
}
