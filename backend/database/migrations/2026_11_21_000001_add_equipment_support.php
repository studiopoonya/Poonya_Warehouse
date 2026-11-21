<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dua jenis barang:
 *  - consumable (habis pakai): stok berkurang sebanyak yang terpakai di event
 *  - equipment (peralatan): dibawa & dibawa pulang lagi, stok hanya berkurang kalau hilang
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('kind', 12)->default('consumable')->after('unit');
            // jumlah standar yang dibawa ke event (daftar "Booth 1"); null = tidak masuk daftar standar
            $table->unsignedInteger('kit_qty')->nullable()->after('kind');
        });

        Schema::table('stocks', function (Blueprint $table) {
            // kondisi peralatan di venue ini: baik | rusak | servis (null untuk barang habis pakai)
            $table->string('condition', 10)->nullable()->after('min_stock');
            $table->timestamp('condition_at')->nullable()->after('condition');
        });

        Schema::table('event_items', function (Blueprint $table) {
            // salinan jenis barang saat berangkat, supaya laporan lama tidak berubah kalau jenisnya diganti
            $table->boolean('is_equipment')->default(false)->after('item_id');
            // "work done": peralatan sudah dicek staff sebelum berangkat
            $table->boolean('checked')->default(false)->after('is_equipment');
        });
    }

    public function down(): void
    {
        Schema::table('event_items', fn (Blueprint $t) => $t->dropColumn(['is_equipment', 'checked']));
        Schema::table('stocks', fn (Blueprint $t) => $t->dropColumn(['condition', 'condition_at']));
        Schema::table('items', fn (Blueprint $t) => $t->dropColumn(['kind', 'kit_qty']));
    }
};
