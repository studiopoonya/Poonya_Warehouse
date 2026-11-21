<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Akun yang dinonaktifkan langsung tertolak walau tokennya masih ada */
class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            $user->currentAccessToken()?->delete();

            return response()->json(['message' => 'Akun kamu dinonaktifkan. Hubungi owner.'], 401);
        }

        return $next($request);
    }
}
