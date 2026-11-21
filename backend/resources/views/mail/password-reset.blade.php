@extends('mail.layout')
@section('title', 'Reset password')

@section('content')
    <h1 style="font-size:22px;margin:0 0 10px;letter-spacing:-.02em;">Reset password</h1>
    <p style="font-size:14px;line-height:1.6;margin:0;">
        Halo {{ $user->name }}, ada permintaan untuk mengganti password akun <b>{{ $user->email }}</b>.
        Klik tombol di bawah untuk membuat password baru. Link ini berlaku <b>{{ $minutes }} menit</b>.
    </p>
    <div style="margin:22px 0;">
        <a href="{{ $url }}" style="display:inline-block;background:#121412;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;">Buat password baru →</a>
    </div>
    <p style="font-size:12.5px;line-height:1.6;color:#7a8076;margin:0;">
        Kalau kamu tidak meminta reset password, abaikan email ini — password lama tetap berlaku.
    </p>
@endsection
