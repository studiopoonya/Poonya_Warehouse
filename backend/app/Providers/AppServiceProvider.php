<?php

namespace App\Providers;

use App\Mail\PasswordResetMail;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Batas percobaan dihitung per email + IP (bukan IP saja), supaya staff yang login
        // bareng dari WiFi gudang yang sama tidak saling memblokir, dan login & lupa password
        // punya hitungan masing-masing.
        RateLimiter::for('login', fn (Request $r) => Limit::perMinute(5)->by('login|'.strtolower((string) $r->input('email')).'|'.$r->ip()));
        // minta link & simpan password baru dihitung terpisah, supaya salah ketik konfirmasi
        // tidak menghabiskan jatah minta link (dan sebaliknya)
        RateLimiter::for('password-reset', fn (Request $r) => [
            Limit::perMinute(5)->by($r->path().'|'.strtolower((string) $r->input('email')).'|'.$r->ip()),
            Limit::perMinute(20)->by($r->path().'|ip|'.$r->ip()), // cegah spam ke banyak email dari satu IP
        ]);

        // Email reset password: link ke halaman React (bukan route Laravel) & template Bahasa Indonesia
        ResetPassword::toMailUsing(function ($user, string $token) {
            $url = rtrim(config('app.frontend_url'), '/').'/reset-password?token='.$token.'&email='.urlencode($user->email);

            return (new PasswordResetMail($user, $url, (int) config('auth.passwords.users.expire', 60)))->to($user->email);
        });
    }
}
