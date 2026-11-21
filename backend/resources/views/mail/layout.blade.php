@php
    $rp = fn ($n) => ($n < 0 ? '-' : '').'Rp '.number_format(abs($n), 0, ',', '.');
    $n = fn ($v) => number_format($v, 0, ',', '.');
@endphp
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title')</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#141614;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f0;padding:24px 12px;">
    <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
            {{-- header --}}
            <tr><td style="padding:0 4px 14px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="background:#121412;border-radius:9px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                        <span style="display:inline-block;width:8px;height:8px;background:#b8f36b;border-radius:2px;margin:1px;"></span><span style="display:inline-block;width:8px;height:8px;background:#fff;border-radius:2px;margin:1px;"></span>
                    </td>
                    <td style="padding-left:10px;font-weight:700;font-size:15px;">Poonya <span style="font-weight:400;color:#7a8076;">Warehouse</span></td>
                </tr></table>
            </td></tr>

            <tr><td style="background:#ffffff;border:1px solid #e6e8e1;border-radius:18px;padding:24px;">
                @yield('content')
            </td></tr>

            <tr><td style="padding:16px 4px;font-size:12px;color:#7a8076;line-height:1.5;">
                Email otomatis dari Poonya Warehouse. Atur penerima & jenis email di menu <b>Pengaturan → Notifikasi email</b>.
            </td></tr>
        </table>
    </td></tr>
</table>
</body>
</html>
