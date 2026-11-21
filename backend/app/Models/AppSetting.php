<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Pengaturan key -> value (JSON). Pakai AppSetting::get('kunci', default) / AppSetting::put('kunci', nilai) */
class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::find($key);

        return $row ? ($row->value['v'] ?? $default) : $default;
    }

    public static function put(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => ['v' => $value]]);
    }
}
