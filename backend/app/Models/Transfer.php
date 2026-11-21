<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transfer extends Model
{
    protected $fillable = ['code', 'from_venue_id', 'to_venue_id', 'user_id', 'note', 'created_at'];

    public function fromVenue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'from_venue_id');
    }

    public function toVenue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'to_venue_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransferItem::class);
    }

    /** Transfer yang melibatkan venue tertentu (sebagai asal atau tujuan) */
    public function scopeInvolving(Builder $query, ?int $venueId): Builder
    {
        return $query->when($venueId, fn ($q) => $q->where(
            fn ($w) => $w->where('from_venue_id', $venueId)->orWhere('to_venue_id', $venueId)
        ));
    }
}
