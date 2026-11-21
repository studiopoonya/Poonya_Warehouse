<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Staff sekarang hanya mengurus logistik event, jadi tidak lagi ditugaskan ke venue.
 * Kolom users.venue_id tetap ada (tidak dipakai) supaya mudah kalau suatu saat dibutuhkan lagi.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'staff')->update(['venue_id' => null]);
    }

    public function down(): void
    {
        // tidak bisa dikembalikan: penugasan venue lama tidak disimpan
    }
};
