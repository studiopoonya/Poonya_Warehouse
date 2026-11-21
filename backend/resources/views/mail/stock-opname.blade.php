@extends('mail.layout')
@section('title', 'Stock opname '.$o->venue->name)
@php
    $rp = fn ($v) => ($v < 0 ? '-' : '').'Rp '.number_format(abs($v), 0, ',', '.');
    $n = fn ($v) => number_format((int) $v, 0, ',', '.');
    $signed = fn ($v) => ($v > 0 ? '+' : '').number_format((int) $v, 0, ',', '.');
@endphp

@section('content')
    @if($totals['mismatched'])
        <div style="display:inline-block;background:#fdf3df;color:#9a6100;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">{{ $totals['mismatched'] }} barang selisih</div>
    @else
        <div style="display:inline-block;background:#e5f5e9;color:#1f7a43;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">✓ Semua sesuai</div>
    @endif
    <h1 style="font-size:22px;margin:12px 0 4px;letter-spacing:-.02em;">Stock opname {{ $o->venue->name }}</h1>
    <div style="font-size:13px;color:#7a8076;line-height:1.6;">
        {{ $o->code }} · {{ $o->created_at->locale('id')->translatedFormat('l, d F Y H:i') }} · oleh <b style="color:#3d423b;">{{ $o->user?->name ?? '-' }}</b>
        @if($o->note)<br>“{{ $o->note }}”@endif
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
        <tr>
            @foreach ([['Dihitung', $n($totals['counted']), '#141614', '#f8f9f6'], ['Sesuai', $n($totals['matched']), '#1f7a43', '#f8f9f6'], ['Selisih', $n($totals['mismatched']), '#ffffff', '#121412']] as [$label, $val, $fg, $bg])
                <td width="33%" style="padding:0 4px;">
                    <div style="background:{{ $bg }};border:1px solid #e6e8e1;border-radius:12px;padding:12px;">
                        <div style="font-size:12px;color:{{ $bg === '#121412' ? '#9aa196' : '#7a8076' }};">{{ $label }}</div>
                        <div style="font-size:22px;font-weight:700;color:{{ $fg }};">{{ $val }} <span style="font-size:12px;font-weight:400;">barang</span></div>
                    </div>
                </td>
            @endforeach
        </tr>
    </table>

    @if($totals['mismatched'])
        <p style="font-size:14px;margin:0 0 14px;line-height:1.6;">
            @if($totals['plus'] > 0)Lebih <b style="color:#1f7a43;">{{ $signed($totals['plus']) }}</b> unit @endif
            @if($totals['plus'] > 0 && $totals['minus'] < 0) · @endif
            @if($totals['minus'] < 0)Kurang <b style="color:#d9443a;">{{ $signed($totals['minus']) }}</b> unit @endif
            @if($totals['value'] != 0)<br>Nilai selisih: <b>{{ $rp($totals['value']) }}</b>@endif
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <tr style="background:#f8f9f6;color:#7a8076;">
                <th align="left" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Barang</th>
                <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Sistem</th>
                <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Fisik</th>
                <th align="right" style="padding:8px;border-bottom:1px solid #e6e8e1;font-weight:500;">Selisih</th>
            </tr>
            @foreach ($diffs as $l)
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $l->item?->name }}@if($price($l))<div style="font-size:11px;color:#7a8076;">{{ $rp($l->difference * $price($l)) }}</div>@endif</td>
                    <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $n($l->system_qty) }}</td>
                    <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;">{{ $n($l->counted_qty) }}</td>
                    <td align="right" style="padding:8px;border-bottom:1px solid #f0f1ec;font-weight:700;color:{{ $l->difference > 0 ? '#1f7a43' : '#d9443a' }};">{{ $signed($l->difference) }}</td>
                </tr>
            @endforeach
        </table>
        <p style="font-size:12px;color:#7a8076;margin:10px 0 0;">Stok di sistem sudah disamakan dengan hitungan fisik.</p>
    @else
        <p style="font-size:14px;margin:0;">Semua {{ $totals['counted'] }} barang yang dihitung sama dengan stok di sistem.</p>
    @endif

    <div style="margin-top:20px;">
        <a href="{{ $url }}" style="display:inline-block;background:#121412;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;">Lihat hasil opname →</a>
    </div>
@endsection
