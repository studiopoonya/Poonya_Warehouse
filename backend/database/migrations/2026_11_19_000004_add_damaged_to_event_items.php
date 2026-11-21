<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Laporan sisa: dibawa = tersisa (kembali baik) + rusak/hilang + terpakai
        Schema::table('event_items', function (Blueprint $table) {
            $table->unsignedInteger('qty_damaged')->nullable()->after('qty_returned');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->text('report_note')->nullable()->after('note'); // catatan saat lapor sisa, mis. "kamera jatuh"
        });
    }

    public function down(): void
    {
        Schema::table('events', fn (Blueprint $t) => $t->dropColumn('report_note'));
        Schema::table('event_items', fn (Blueprint $t) => $t->dropColumn('qty_damaged'));
    }
};
