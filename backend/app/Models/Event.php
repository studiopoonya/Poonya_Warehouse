<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    public const SCHEDULED = 'scheduled'; // dijadwalkan owner, barang belum dibawa

    public const ONGOING = 'ongoing';     // sudah berangkat, belum lapor sisa

    public const COMPLETED = 'completed'; // sisa sudah dilaporkan

    public const CANCELLED = 'cancelled'; // dibatalkan owner, semua barang dikembalikan

    protected $fillable = [
        'code', 'name', 'location', 'event_date', 'crew', 'note', 'report_note', 'source_venue_id', 'user_id', 'created_by',
        'status', 'departed_at', 'returned_at', 'returned_by',
    ];

    protected $casts = [
        'event_date' => 'date',
        'departed_at' => 'datetime',
        'returned_at' => 'datetime',
        'user_id' => 'integer',
        'created_by' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(EventItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by');
    }

    public function sourceVenue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'source_venue_id');
    }

    /** Owner boleh semua event; staff hanya event yang jadi tanggung jawabnya */
    public function canBeManagedBy(User $user): bool
    {
        return $user->isOwner() || ($this->user_id !== null && $this->user_id === $user->id);
    }

    /** Event terjadwal yang belum ditugaskan boleh dilihat (dan diambil) semua staff */
    public function canBeViewedBy(User $user): bool
    {
        return $this->canBeManagedBy($user) || ($this->status === self::SCHEDULED && $this->user_id === null);
    }
}
