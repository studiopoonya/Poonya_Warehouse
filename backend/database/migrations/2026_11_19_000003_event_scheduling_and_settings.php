<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // events.user_id     = penanggung jawab (boleh kosong = belum ditugaskan)
        // events.created_by  = yang membuat event (owner menjadwalkan / staff membuat mendadak)
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
        });
        DB::table('events')->whereNull('created_by')->update(['created_by' => DB::raw('user_id')]);

        // Pengaturan aplikasi sederhana (key -> value JSON), mis. penerima email notifikasi
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
        Schema::table('events', fn (Blueprint $t) => $t->dropConstrainedForeignId('created_by'));
    }
};
