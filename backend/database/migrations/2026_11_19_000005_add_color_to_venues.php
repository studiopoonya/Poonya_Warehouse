<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // warna penanda venue (hex, mis. #3b6fd9). Kosong = warna bawaan.
        Schema::table('venues', function (Blueprint $table) {
            $table->string('color', 9)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('venues', fn (Blueprint $t) => $t->dropColumn('color'));
    }
};
