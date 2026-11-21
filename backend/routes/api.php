<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\StockOpnameController;
use App\Http\Controllers\Api\TransferController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VenueController;
use Illuminate\Support\Facades\Route;

/*
| Semua route di sini otomatis berprefix /api
|
| Peran:
|   owner — akses penuh: dashboard, stok semua venue, transfer, katalog barang, akun, semua event
|   staff — hanya logistik event miliknya sendiri (catat barang dibawa & lapor sisa)
*/

// Publik — maks. 5 percobaan login per menit per IP
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:password-reset');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:password-reset');

// Wajib login (header Authorization: Bearer <token>) dan akun aktif
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);

    // Logistik event — owner & staff (staff hanya event miliknya, dicek di controller)
    Route::get('/events/available-items', [EventController::class, 'availableItems']);
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::get('/events/{event}', [EventController::class, 'show']);
    Route::put('/events/{event}/return', [EventController::class, 'report']);
    Route::post('/events/{event}/claim', [EventController::class, 'claim']);
    Route::post('/events/{event}/depart', [EventController::class, 'depart']);

    // Khusus owner
    Route::middleware('owner')->group(function () {
        Route::post('/events/schedule', [EventController::class, 'schedule']);
        Route::put('/events/{event}', [EventController::class, 'updateSchedule']);
        Route::post('/events/{event}/cancel', [EventController::class, 'cancel']);

        Route::get('/settings/notifications', [SettingsController::class, 'notifications']);
        Route::put('/settings/notifications', [SettingsController::class, 'updateNotifications']);
        Route::post('/settings/notifications/test', [SettingsController::class, 'testEmail']);

        Route::get('/dashboard', DashboardController::class);
        Route::get('/venues', [VenueController::class, 'index']);
        Route::get('/venues/{id}', [VenueController::class, 'show']);
        Route::get('/notifications', NotificationController::class);

        Route::apiResource('categories', CategoryController::class)->except('show');

        // barang: import/export didaftarkan sebelum resource
        Route::get('/items/export', [ItemController::class, 'export']);
        Route::get('/items/import/template', [ItemController::class, 'importTemplate']);
        Route::post('/items/import/preview', [ItemController::class, 'importPreview']);
        Route::post('/items/import', [ItemController::class, 'import']);
        Route::patch('/items/{item}/archive', [ItemController::class, 'archive']);
        Route::put('/items/{item}/condition', [ItemController::class, 'condition']);
        Route::apiResource('items', ItemController::class)->except('show');
        Route::get('/transfers', [TransferController::class, 'index']);
        Route::post('/transfers', [TransferController::class, 'store']);
        Route::get('/movements', [StockMovementController::class, 'index']);
        Route::post('/movements', [StockMovementController::class, 'store']);
        Route::apiResource('users', UserController::class)->except('show');
        Route::get('/opnames', [StockOpnameController::class, 'index']);
        Route::post('/opnames', [StockOpnameController::class, 'store']);
        Route::get('/opnames/{opname}', [StockOpnameController::class, 'show']);

        // laporan Excel
        Route::get('/reports/events', [ReportController::class, 'events']);
        Route::get('/reports/opnames/{opname}', [ReportController::class, 'opname']);

        // pengaturan
        Route::post('/venues', [SettingsController::class, 'storeVenue']);
        Route::put('/venues/{venue}', [SettingsController::class, 'updateVenue']);
        Route::delete('/venues/{venue}', [SettingsController::class, 'destroyVenue']);
        Route::get('/backups', [SettingsController::class, 'backups']);
        Route::post('/backups', [SettingsController::class, 'createBackup']);
        Route::get('/backups/{name}', [SettingsController::class, 'downloadBackup']);
    });
});
