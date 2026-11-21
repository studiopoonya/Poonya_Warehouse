<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indeks untuk kolom yang sering dicari / diurutkan. SQLite tidak membuat indeks otomatis
 * untuk foreign key, jadi tanpa ini query riwayat, event & laporan makin lambat seiring data bertambah.
 */
return new class extends Migration
{
    /** [tabel => [nama indeks => kolom]] */
    private const INDEXES = [
        'stock_movements' => [
            'stock_movements_created_at_index' => ['created_at'],
            'stock_movements_item_id_created_at_index' => ['item_id', 'created_at'],
            'stock_movements_type_created_at_index' => ['type', 'created_at'],
            'stock_movements_event_id_index' => ['event_id'],
            'stock_movements_transfer_id_index' => ['transfer_id'],
            'stock_movements_stock_opname_id_index' => ['stock_opname_id'],
        ],
        'stocks' => ['stocks_venue_id_index' => ['venue_id']],
        'events' => [
            'events_user_id_status_index' => ['user_id', 'status'],
            'events_source_venue_id_status_index' => ['source_venue_id', 'status'],
            'events_event_date_index' => ['event_date'],
            'events_returned_at_index' => ['returned_at'],
        ],
        'event_items' => ['event_items_item_id_index' => ['item_id']],
        'transfers' => [
            'transfers_created_at_index' => ['created_at'],
            'transfers_from_venue_id_index' => ['from_venue_id'],
            'transfers_to_venue_id_index' => ['to_venue_id'],
        ],
        'transfer_items' => [
            'transfer_items_transfer_id_index' => ['transfer_id'],
            'transfer_items_item_id_index' => ['item_id'],
        ],
        'stock_opnames' => ['stock_opnames_venue_id_created_at_index' => ['venue_id', 'created_at']],
        'stock_opname_items' => ['stock_opname_items_item_id_index' => ['item_id']],
        'items' => ['items_is_active_name_index' => ['is_active', 'name']],
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $table => $indexes) {
            foreach ($indexes as $name => $columns) {
                if (! Schema::hasIndex($table, $name)) {
                    Schema::table($table, fn (Blueprint $t) => $t->index($columns, $name));
                }
            }
        }
    }

    public function down(): void
    {
        foreach (self::INDEXES as $table => $indexes) {
            foreach (array_keys($indexes) as $name) {
                if (Schema::hasIndex($table, $name)) {
                    Schema::table($table, fn (Blueprint $t) => $t->dropIndex($name));
                }
            }
        }
    }
};
