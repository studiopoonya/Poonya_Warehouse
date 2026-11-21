<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Logistik event photobooth: barang dibawa dari gudang -> dipakai di event -> sisa dikembalikan
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->nullable();
            $table->string('name');                       // nama event, mis. "Wedding Budi & Ani"
            $table->string('location')->nullable();       // lokasi, mis. "Hotel Grand Hyatt"
            $table->date('event_date');
            $table->string('crew')->nullable();           // anggota tim lain (opsional, teks bebas)
            $table->text('note')->nullable();
            $table->foreignId('source_venue_id')->constrained('venues'); // asal barang (Warehouse)
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // staff yang mencatat
            // ongoing = sudah berangkat, belum lapor sisa | completed = sudah lapor sisa | cancelled
            $table->string('status', 20)->default('ongoing');
            $table->timestamp('departed_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->foreignId('returned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'event_date']);
        });

        Schema::create('event_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('qty_out');                 // dibawa
            $table->unsignedInteger('qty_returned')->nullable(); // tersisa (diisi saat pulang)
            $table->unique(['event_id', 'item_id']);
        });

        // Jenis pergerakan stok jadi string bebas supaya bisa tambah 'event_out' & 'event_return'
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('type', 20)->change();
            $table->foreignId('event_id')->nullable()->after('transfer_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('event_id');
        });
        Schema::dropIfExists('event_items');
        Schema::dropIfExists('events');
    }
};
