@extends('mail.layout')
@section('title', 'Event selesai: '.$e->name)
@php
    $rp = fn ($v) => ($v < 0 ? '-' : '').'Rp '.number_format(abs($v), 0, ',', '.');
    $n = fn ($v) => number_format((int) $v, 0, ',', '.');
@endphp

@section('content')
    <div style="display:inline-block;background:#e5f5e9;color:#1f7a43;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">✓ Event selesai</div>
    <h1 style="font-size:22px;margin:12px 0 4px;letter-spacing:-.02em;">{{ $e->name }}</h1>
    <div style="font-size:13px;color:#7a8076;line-height:1.6;">
        {{ $e->code }} · {{ $e->event_date?->locale('id')->translatedFormat('l, d F Y') }}@if($e->location) · {{ $e->location }}@endif<br>
        Penanggung jawab: <b style="color:#3d423b;">{{ $e->user?->name ?? '-' }}</b>@if($e->crew) · Tim: {{ $e->crew }}@endif<br>
        Sisa dilaporkan {{ $e->returned_at?->format('d/m/Y H:i') }}@if($e->returnedBy) oleh {{ $e->returnedBy->name }}@endif
    </div>

    {{-- ringkasan --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
        <tr>
            @foreach ([['Dibawa', $n($totals['out']), '#141614', '#f8f9f6'], ['Kembali', $n($totals['returned']), '#141614', '#f8f9f6'], ['Terpakai', $n($totals['used']), '#ffffff', '#121412']] as [$label, $val, $fg, $bg])
                <td width="33%" style="padding:0 4px;">
                    <div style="background:{{ $bg }};border:1px solid #e6e8e1;border-radius:12px;padding:12px;">
                        <div style="font-size:12px;color:{{ $bg === '#121412' ? '#9aa196' : '#7a8076' }};">{{ $label }}</div>
                        <div style="font-size:22px;font-weight:700;color:{{ $fg }};">{{ $val }} <span style="font-size:12px;font-weight:400;">unit</span></div>
                    </div>
                </td>
            @endforeach
        </tr>
    </table>
    @if($totals['damaged'] > 0)
        <div style="background:#fde8e6;border:1px solid #f6cdc9;color:#b3342b;border-radius:12px;padding:10px 14px;font-size:14px;margin:0 0 12px;">
            ⚠ <b>{{ $n($totals['damaged']) }} unit rusak/hilang</b>@if($totals['damaged_value'] > 0) · senilai {{ $rp($totals['damaged_value']) }}@endif
        </div>
    @endif
    @if($totals['value'] > 0)
        <p style="font-size:14px;margin:0 0 14px;">Nilai barang terpakai: <b>{{ $rp($totals['value']) }}</b></p>
    @endif
    @if($e->report_note)
        <p style="font-size:13px;color:#3d423b;margin:0 0 14px;">Catatan staff: “{{ $e->report_note }}”</p>
    @endif

    {{-- rincian --}}
    @if($lines->isNotEmpty())
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <tr style="background:#f8f9f6;color:#7a8076;">
            <th align="left" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Barang</th>
            <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Dibawa</th>
            <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Sisa</th>
            @if($totals['damaged'] > 0)<th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Rusak/hilang</th>@endif
            <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Terpakai</th>
        </tr>
        @foreach ($lines as $l)
            <tr>
                <td style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $l->item?->name }}<div style="font-size:11px;color:#7a8076;">{{ $l->item?->unit }}@if($price($l)) · {{ $rp($price($l)) }}@endif</div></td>
                <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $n($l->qty_out) }}</td>
                <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $n($l->qty_returned) }}</td>
                @if($totals['damaged'] > 0)<td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;color:{{ $l->qty_damaged ? '#d9443a' : '#7a8076' }};font-weight:{{ $l->qty_damaged ? 700 : 400 }};">{{ $n($l->qty_damaged) }}</td>@endif
                <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;font-weight:700;color:{{ $l->qty_used > 0 ? '#1f7a43' : '#7a8076' }};">{{ $n($l->qty_used) }}</td>
            </tr>
        @endforeach
    </table>
    @endif

    @if($tools->isNotEmpty())
        <h2 style="font-size:16px;margin:24px 0 6px;">Peralatan</h2>
        @if($toolIssues->isEmpty())
            <p style="font-size:14px;margin:0;color:#1f7a43;">✓ Semua {{ $tools->count() }} jenis peralatan ({{ $n($tools->sum('qty_out')) }} unit) kembali dalam kondisi baik.</p>
        @else
            <p style="font-size:13px;margin:0 0 8px;color:#7a8076;">{{ $tools->count() }} jenis peralatan dibawa. Yang bermasalah:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
                <tr style="background:#f8f9f6;color:#7a8076;">
                    <th align="left" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Alat</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Dibawa</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Rusak</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Hilang</th>
                </tr>
                @foreach ($toolIssues as $l)
                    <tr>
                        <td style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $l->item?->name }}</td>
                        <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $n($l->qty_out) }}</td>
                        <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;color:{{ $l->qty_damaged ? '#9a6100' : '#7a8076' }};font-weight:{{ $l->qty_damaged ? 700 : 400 }};">{{ $n($l->qty_damaged) }}</td>
                        <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;color:{{ $l->qty_lost ? '#d9443a' : '#7a8076' }};font-weight:{{ $l->qty_lost ? 700 : 400 }};">{{ $n($l->qty_lost) }}</td>
                    </tr>
                @endforeach
            </table>
            <p style="font-size:12px;color:#7a8076;margin:8px 0 0;">Alat yang hilang sudah dikurangi dari stok gudang. Alat yang rusak ditandai "Rusak" di inventaris.</p>
        @endif
    @endif

    <div style="margin-top:20px;">
        <a href="{{ $url }}" style="display:inline-block;background:#121412;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;">Lihat laporan event →</a>
    </div>
@endsection
