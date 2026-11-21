<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // owner: akses penuh | staff: hanya venue tempat dia ditugaskan
            $table->enum('role', ['owner', 'staff'])->default('staff')->after('email');
            $table->foreignId('venue_id')->nullable()->after('role')->constrained()->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('venue_id');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
        });

        // Catat siapa yang melakukan setiap pergerakan stok & transfer
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('transfer_id')->constrained()->nullOnDelete();
        });
        Schema::table('transfers', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('to_venue_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transfers', fn (Blueprint $t) => $t->dropConstrainedForeignId('user_id'));
        Schema::table('stock_movements', fn (Blueprint $t) => $t->dropConstrainedForeignId('user_id'));
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('venue_id');
            $table->dropColumn(['role', 'is_active', 'last_login_at']);
        });
    }
};
