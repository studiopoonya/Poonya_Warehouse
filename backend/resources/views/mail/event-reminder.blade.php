@extends('mail.layout')
@section('title', 'Pengingat: '.$e->name)

@section('content')
    @if($unassigned)
        <div style="display:inline-block;background:#fdf3df;color:#9a6100;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">Belum ada penanggung jawab</div>
        <h1 style="font-size:22px;margin:12px 0 6px;letter-spacing:-.02em;">Event besok belum ditugaskan ke staff</h1>
    @else
        <div style="display:inline-block;background:#e7eefc;color:#3b6fd9;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">Pengingat H-1</div>
        <h1 style="font-size:22px;margin:12px 0 6px;letter-spacing:-.02em;">Besok kamu bertugas, {{ $e->user?->name }}</h1>
    @endif

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;background:#f8f9f6;border:1px solid #e6e8e1;border-radius:12px;">
        <tr><td style="padding:14px 16px;font-size:14px;line-height:1.8;">
            <b style="font-size:16px;">{{ $e->name }}</b><br>
            📅 {{ $e->event_date->locale('id')->translatedFormat('l, d F Y') }}<br>
            @if($e->location)📍 {{ $e->location }}<br>@endif
            @if($e->crew)👥 Tim: {{ $e->crew }}<br>@endif
            @if($e->note)<span style="color:#7a8076;">“{{ $e->note }}”</span>@endif
        </td></tr>
    </table>

    <p style="font-size:14px;line-height:1.6;margin:0;">
        @if($unassigned)
            Tugaskan ke staff, atau minta staff menekan <b>Ambil event ini</b> di aplikasi.
        @else
            Jangan lupa catat barang yang dibawa dari gudang sebelum berangkat.
        @endif
    </p>
    <div style="margin-top:20px;">
        <a href="{{ $url }}" style="display:inline-block;background:#121412;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;">{{ $unassigned ? 'Buka event →' : 'Catat barang →' }}</a>
    </div>
@endsection
