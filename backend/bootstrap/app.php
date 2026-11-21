<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Tidak ada halaman login di Laravel (login ada di React), jadi jangan redirect
        $middleware->redirectGuestsTo(fn ($request) => $request->is('api/*') ? null : '/');

        $middleware->alias([
            'owner' => \App\Http\Middleware\EnsureOwner::class,
            'active' => \App\Http\Middleware\EnsureActiveUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API selalu membalas JSON (mis. 401 saat belum login), tidak redirect ke halaman login
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })->create();
