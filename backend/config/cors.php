<?php

/*
 * Frontend (warehouse.studiopoonya.net) dan API (api-warehouse.studiopoonya.net) beda domain,
 * jadi browser butuh izin CORS. Login memakai token Bearer (bukan cookie), sehingga
 * supports_credentials tidak perlu.
 */
$origins = array_values(array_filter(array_map(
    fn ($o) => rtrim(trim($o), '/'),
    // CORS_ALLOWED_ORIGINS kosong ("") juga dianggap belum diisi -> pakai FRONTEND_URL
    explode(',', (string) (env('CORS_ALLOWED_ORIGINS') ?: env('FRONTEND_URL', 'http://localhost:5173')))
)));

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    // hanya domain frontend yang boleh memanggil API dari browser
    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    // nama file unduhan Excel / backup dibaca frontend dari header ini
    'exposed_headers' => ['Content-Disposition'],

    // browser boleh menyimpan hasil cek CORS 1 hari (lebih sedikit request OPTIONS)
    'max_age' => 86400,

    'supports_credentials' => false,
];
