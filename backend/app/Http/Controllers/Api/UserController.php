<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Kelola akun (khusus owner — lihat routes/api.php).
 */
class UserController extends Controller
{
    public function index()
    {
        return UserResource::collection(
            User::with('venue')->orderByRaw("CASE role WHEN 'owner' THEN 0 ELSE 1 END")->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $user = User::create($data);

        return (new UserResource($user->load('venue')))->response()->setStatusCode(201);
    }

    public function update(Request $request, User $user)
    {
        $data = $this->validated($request, $user);
        $self = $request->user()->is($user);

        // Cegah owner mengunci dirinya sendiri keluar dari sistem
        if ($self && ($data['role'] !== User::ROLE_OWNER || ! $data['is_active'])) {
            throw ValidationException::withMessages([
                'role' => 'Kamu tidak bisa menurunkan peran atau menonaktifkan akunmu sendiri.',
            ]);
        }

        $accessChanged = $user->role !== $data['role']
            || ($user->is_active && ! $data['is_active'])
            || ! empty($data['password']);

        $user->update($data);

        // Akses berubah -> paksa login ulang di semua perangkat orang tersebut
        if ($accessChanged && ! $self) {
            $user->tokens()->delete();
        }

        return new UserResource($user->load('venue'));
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['user' => 'Kamu tidak bisa menghapus akunmu sendiri.']);
        }

        // Riwayat stok & transfer tetap ada, kolom "oleh" menjadi kosong
        $user->tokens()->delete();
        $user->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?User $user = null): array
    {
        $request->merge(['email' => strtolower((string) $request->input('email'))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user?->id)],
            'role' => ['required', Rule::in([User::ROLE_OWNER, User::ROLE_STAFF])],
            'is_active' => ['boolean'],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
        ], [
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah dipakai akun lain.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
        ]);

        $data['is_active'] = $data['is_active'] ?? true;
        // Akun tidak lagi terikat venue: staff hanya mengurus logistik event
        $data['venue_id'] = null;

        if (empty($data['password'])) {
            unset($data['password']);
        }

        return $data;
    }
}
