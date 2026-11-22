<?php

use Illuminate\Support\Facades\Route;

/*
 * Domain ini (api-warehouse.studiopoonya.net) hanya untuk API. Aplikasinya ada di
 * FRONTEND_URL (warehouse.studiopoonya.net), jadi halaman utama cukup info singkat.
 */
Route::get('/', fn () => response()->json([
    'app' => 'Poonya Warehouse API',
    'frontend' => config('app.frontend_url'),
]));
