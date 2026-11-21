<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'from_venue' => VenueResource::brief($this->fromVenue),
            'to_venue' => VenueResource::brief($this->toVenue),
            'note' => $this->note,
            'user' => $this->whenLoaded('user', fn () => $this->user?->name),
            'total_qty' => (int) $this->items->sum('quantity'),
            'items' => $this->items->map(fn ($line) => [
                'item_id' => $line->item_id,
                'name' => $line->item?->name,
                'sku' => $line->item?->sku,
                'quantity' => $line->quantity,
            ])->values(),
            'created_at' => $this->created_at,
        ];
    }
}
