<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockOpnameItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['stock_opname_id', 'item_id', 'system_qty', 'counted_qty', 'difference'];

    protected $casts = [
        'system_qty' => 'integer',
        'counted_qty' => 'integer',
        'difference' => 'integer',
    ];

    public function opname(): BelongsTo
    {
        return $this->belongsTo(StockOpname::class, 'stock_opname_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
