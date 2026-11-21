<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Satu sesi stock opname (hitung fisik) di satu venue
        Schema::create('stock_opnames', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->nullable();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        // Hasil hitung per barang: stok sistem saat disimpan vs hitungan fisik
        Schema::create('stock_opname_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_opname_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('system_qty');
            $table->unsignedInteger('counted_qty');
            $table->integer('difference'); // counted - system
            $table->unique(['stock_opname_id', 'item_id']);
        });

        // Pergerakan stok hasil opname ditautkan ke sesinya
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('stock_opname_id')->nullable()->after('event_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', fn (Blueprint $t) => $t->dropConstrainedForeignId('stock_opname_id'));
        Schema::dropIfExists('stock_opname_items');
        Schema::dropIfExists('stock_opnames');
    }
};
