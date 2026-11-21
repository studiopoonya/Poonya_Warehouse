<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Hanya owner yang boleh lewat */
class EnsureOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isOwner()) {
            return response()->json(['message' => 'Hanya owner yang boleh melakukan ini.'], 403);
        }

        return $next($request);
    }
}
