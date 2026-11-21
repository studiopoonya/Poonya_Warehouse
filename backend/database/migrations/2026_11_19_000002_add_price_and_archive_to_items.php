<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            // harga satuan dalam rupiah (bilangan bulat)
            $table->unsignedBigInteger('price')->default(0)->after('unit');
            // barang diarsipkan alih-alih dihapus, supaya riwayatnya tetap utuh
            $table->boolean('is_active')->default(true)->after('price');
            $table->timestamp('archived_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['price', 'is_active', 'archived_at']);
        });
    }
};
