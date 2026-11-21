<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Lokasi: Warehouse, Poonya Box SAT, Poonya Box Dobro, Self Studio
        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('type', ['warehouse', 'booth', 'studio']);
            $table->string('address')->nullable();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('unit', 20)->default('pcs');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Stok satu barang di satu venue
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('min_stock')->default(0);
            $table->timestamps();
            $table->unique(['item_id', 'venue_id']);
        });

        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->nullable();
            $table->foreignId('from_venue_id')->constrained('venues')->cascadeOnDelete();
            $table->foreignId('to_venue_id')->constrained('venues')->cascadeOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity');
        });

        // Log setiap perubahan stok (audit trail)
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['in', 'out', 'adjust', 'transfer_in', 'transfer_out']);
            $table->integer('change');
            $table->unsignedInteger('balance_after');
            $table->foreignId('transfer_id')->nullable()->constrained()->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['venue_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('transfer_items');
        Schema::dropIfExists('transfers');
        Schema::dropIfExists('stocks');
        Schema::dropIfExists('items');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('venues');
    }
};
