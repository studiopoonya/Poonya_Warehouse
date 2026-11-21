<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login  { email, password, remember? }
     * -> { token, user }
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['boolean'],
        ], [
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $user = User::where('email', strtolower($data['email']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Email atau password salah.']);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Akun kamu dinonaktifkan. Hubungi owner.']);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        // "Ingat saya" = token 30 hari, selain itu ikut default config (7 hari)
        $expiresAt = ($data['remember'] ?? false)
            ? now()->addDays(30)
            : now()->addMinutes((int) config('sanctum.expiration'));

        $token = $user->createToken($request->userAgent() ?: 'web', ['*'], $expiresAt)->plainTextToken;

        return [
            'token' => $token,
            'expires_at' => $expiresAt,
            'user' => $this->present($user),
        ];
    }

    /** GET /api/auth/me */
    public function me(Request $request)
    {
        return ['user' => $this->present($request->user())];
    }

    /** POST /api/auth/logout — cabut token yang sedang dipakai */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->noContent();
    }

    /**
     * POST /api/auth/forgot-password { email }
     * Jawaban selalu sama (terdaftar atau tidak) supaya tidak bisa dipakai menebak email yang terdaftar.
     */
    public function forgotPassword(Request $request)
    {
        $email = strtolower($request->validate(['email' => ['required', 'email']], [
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
        ])['email']);

        if (User::where('email', $email)->where('is_active', true)->exists()) {
            Password::sendResetLink(['email' => $email]);
        }

        return ['message' => 'Kalau email itu terdaftar, link reset password sudah dikirim. Cek inbox (dan folder spam).'];
    }

    /** POST /api/auth/reset-password { token, email, password, password_confirmation } */
    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'password.min' => 'Password baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak sama.',
        ]);
        $data['email'] = strtolower($data['email']);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => $password])->save();
            $user->tokens()->delete(); // keluarkan semua perangkat
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'Link reset tidak valid atau sudah kedaluwarsa. Minta link baru.']);
        }

        return ['message' => 'Password berhasil diganti. Silakan login dengan password baru.'];
    }

    /** PUT /api/auth/password { current_password, password, password_confirmation } */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'current_password.current_password' => 'Password lama salah.',
            'password.min' => 'Password baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak sama.',
        ]);

        $user = $request->user();
        $user->update(['password' => $request->input('password')]);

        // keluarkan semua sesi lain, biarkan sesi saat ini tetap login
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->noContent();
    }

    private function present(User $user): UserResource
    {
        return new UserResource($user->load('venue'));
    }
}
