<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_OWNER = 'owner';

    public const ROLE_STAFF = 'staff';

    protected $fillable = ['name', 'email', 'password', 'role', 'venue_id', 'is_active', 'last_login_at'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'venue_id' => 'integer',
            'password' => 'hashed',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    /** Data stok per venue khusus owner (staff hanya mengurus logistik event) */
    public function canAccessVenue(?int $venueId): bool
    {
        return $this->isOwner();
    }

    /**
     * Venue yang dipakai untuk memfilter data:
     * owner bebas memilih (null = semua venue). Staff tidak punya akses data stok.
     */
    public function scopedVenueId(?int $requested): ?int
    {
        return $this->isOwner() ? ($requested ?: null) : -1; // -1 = tidak ada data yang cocok
    }
}
