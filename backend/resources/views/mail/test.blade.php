@extends('mail.layout')
@section('title', 'Tes notifikasi email')

@section('content')
    <div style="display:inline-block;background:#e5f5e9;color:#1f7a43;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">✓ Berhasil</div>
    <h1 style="font-size:22px;margin:12px 0 8px;">Email notifikasi sudah jalan</h1>
    <p style="font-size:14px;line-height:1.6;margin:0;">
        Email tes ini dikirim oleh <b>{{ $sender }}</b>. Mulai sekarang alamat ini akan menerima ringkasan setiap
        <b>event selesai</b> dan <b>stock opname</b>.
    </p>
    <div style="margin-top:20px;">
        <a href="{{ $url }}" style="display:inline-block;background:#121412;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;">Buka Poonya Warehouse →</a>
    </div>
@endsection
