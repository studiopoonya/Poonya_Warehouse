# Poonya Warehouse

Sistem stok/gudang untuk bisnis photobooth. Ada 4 venue bawaan, dan owner bisa menambah gudang atau venue baru kapan saja:

| Venue | Tipe |
|---|---|
| Warehouse | Gudang pusat |
| Poonya Box SAT | Photobooth |
| Poonya Box Dobro | Photobooth |
| Self Studio | Self photo studio |

- **Frontend**: React 19 + Vite, React Router, Framer Motion (animasi), Lucide (ikon), Axios
- **Backend**: Laravel 12 (REST API), SQLite secara default (bisa diganti MySQL)

## Cara menjalankan

Butuh PHP 8.2+, Composer, dan Node 20+.

```bash
# 1. Backend (terminal 1)
cd backend
composer install            # skip kalau folder vendor sudah ada
cp .env.example .env        # skip kalau .env sudah ada
php artisan key:generate    # skip kalau .env sudah ada
php artisan migrate --seed         # buat tabel + owner + 4 venue + kategori (tanpa data contoh)
php artisan serve           # http://127.0.0.1:8000

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Vite meneruskan semua request `/api` ke `http://127.0.0.1:8000`, jadi tidak perlu setting CORS saat development.

## Login

Akun yang dibuat saat `db:seed`:

| Email | Password | Peran |
|---|---|---|
| `admin@poonya.test` | `poonya123` | Owner |

Akun staff dibuat owner lewat menu **Pengguna**.

### Data contoh & reset data

```bash
php artisan db:seed --class=PoonyaStockSeeder   # isi stok ASLI dari sheet lama (Warehouse 17 Nov, peralatan Booth 1, SAT & Dobro 19/10) — aman diulang
php artisan db:seed --class=DemoSeeder   # isi data contoh (27 barang, simulasi 30 hari, 4 staff demo: gudang/sat/dobro/studio@poonya.test, password staff123)
php artisan poonya:reset-data            # hapus semua barang, stok, riwayat, transfer, event & akun staff (ada konfirmasi)
php artisan poonya:reset-data --keep-staff   # sama, tapi akun staff dipertahankan
```

`poonya:reset-data` selalu mempertahankan **venue** dan **akun owner** (termasuk password-nya), lalu mengisi ulang kategori dasar.

**Segera ganti password owner setelah login** (klik nama di pojok kiri bawah, lalu pilih *Ganti password*). Akun owner awal juga bisa diatur sebelum seeding lewat `ADMIN_NAME`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` di `backend/.env`.

### Peran

| | Owner | Staff |
|---|---|---|
| Logistik event | Jadwalkan & tugaskan event, lihat laporan semua event, koreksi laporan, batalkan | Pilih / ambil event, catat barang, lapor sisa; buat event mendadak |
| Dashboard, inventaris, transfer, riwayat stok | ✅ | ❌ |
| Stock opname | ✅ | ❌ |
| Tambah/edit/hapus barang | ✅ | ❌ |
| Kelola akun (menu **Pengguna**) | ✅ | ❌ |

Staff tidak ditugaskan ke venue. Setelah login, staff langsung masuk ke tampilan form logistik event, tanpa sidebar dan tanpa menu lain.

Aturan ini ditegakkan di backend, bukan hanya disembunyikan di tampilan. Setiap pergerakan stok dan transfer mencatat siapa yang melakukannya (kolom **Oleh** di Riwayat Stok).

Akun dikelola owner lewat menu **Pengguna**: tambah akun, ganti peran atau venue, reset password, nonaktifkan, dan hapus. Akun yang dinonaktifkan langsung tidak bisa dipakai, meskipun sedang login. Untuk staff yang berhenti kerja, sebaiknya nonaktifkan saja supaya jejak riwayatnya tetap utuh.

Owner tidak bisa menurunkan peran, menonaktifkan, atau menghapus akunnya sendiri, supaya tidak terkunci di luar sistem.

Kalau owner lupa password atau semua akun owner terkunci, gunakan terminal:

```bash
cd backend
php artisan poonya:user admin@poonya.test --role=owner                                   # reset password owner
php artisan poonya:user andi@poonya.com --name="Andi" --role=staff
```

Password akan ditanyakan. Perintah ini juga mengeluarkan akun tersebut dari semua perangkat.

Cara kerjanya:
- Login memakai token Laravel Sanctum. Token berlaku 7 hari, atau 30 hari kalau "Ingat saya" dicentang. Masa berlaku default bisa diatur lewat `SANCTUM_TOKEN_EXPIRATION` (dalam menit).
- "Ingat saya" menyimpan token di `localStorage`. Tanpa itu, token disimpan di `sessionStorage` dan hilang saat browser ditutup.
- Semua endpoint selain login, lupa password, dan reset password wajib login. Percobaan login dibatasi 5 kali per menit **per email + IP**, jadi staff yang login bersamaan dari WiFi yang sama tidak saling memblokir. Lupa/reset password dibatasi 3 kali per menit per email.
- Kalau token kedaluwarsa atau dicabut, aplikasi otomatis kembali ke halaman login.
- Ganti password mengeluarkan semua perangkat lain, kecuali perangkat yang sedang dipakai.

### Pakai MySQL

Ubah `backend/.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=poonya_warehouse
DB_USERNAME=root
DB_PASSWORD=
```

Lalu jalankan `php artisan migrate --seed`.

### Backup otomatis

```bash
php artisan poonya:backup     # backup sekarang -> backend/storage/app/backups (14 terakhir disimpan)
php artisan schedule:work     # development: jalankan scheduler -> backup otomatis 02.00 & pengingat event H-1 17.00 WIB
php artisan poonya:event-reminders   # kirim pengingat H-1 sekarang (tidak akan dobel)
```

Backup manual dan unduh file backup juga bisa dilakukan dari menu **Pengaturan**. Backup dari aplikasi hanya untuk SQLite; kalau sudah pakai MySQL, pakai `mysqldump` atau backup bawaan hosting.

**Memulihkan backup (SQLite):** hentikan aplikasi dulu, salin file backup menjadi `backend/database/database.sqlite`, lalu **hapus** `database.sqlite-wal` dan `database.sqlite-shm` kalau ada (database berjalan dalam mode WAL — file sisa itu milik database lama). Setelah itu jalankan aplikasi lagi.

### Performa

- Database SQLite berjalan dalam mode **WAL** dengan `busy_timeout` 5 detik (`backend/config/database.php`), jadi owner yang membuka laporan tidak memblokir staff yang menyimpan form. Bisa diubah lewat `DB_JOURNAL_MODE`, `DB_BUSY_TIMEOUT`, `DB_SYNCHRONOUS`.
- Kolom yang sering dicari sudah diberi indeks (migrasi `add_performance_indexes`).
- Daftar event & grafik dashboard dihitung langsung di database, tetap cepat walau data sudah setahun lebih.
- Frontend dipecah per halaman (*code splitting*): HP staff hanya mengunduh halaman yang dibuka.
- Di server production jalankan juga `php artisan optimize` (cache config, route, view) setiap selesai update, dan aktifkan **OPcache** di PHP.

### Email notifikasi (event selesai & stock opname)

Secara default `MAIL_MAILER=log`: email hanya ditulis ke `backend/storage/logs/laravel.log`, belum benar-benar terkirim.
Supaya terkirim, isi SMTP di `backend/.env`. Contoh dengan **Gmail**:

1. Aktifkan **Verifikasi 2 Langkah** di akun Google, lalu buat **App Password** (myaccount.google.com → Keamanan → Sandi aplikasi).
2. Isi `backend/.env`:
   ```
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=akunmu@gmail.com
   MAIL_PASSWORD=sandi-aplikasi-16-huruf
   MAIL_FROM_ADDRESS=akunmu@gmail.com
   MAIL_FROM_NAME="Poonya Warehouse"
   ```
3. Jalankan `php artisan config:clear` (atau restart `php artisan serve`).
4. Buka **Pengaturan → Notifikasi email**, isi alamat penerima, lalu klik **Kirim email tes**.

Penerima default adalah email semua akun owner. Ganti `admin@poonya.test` dengan email aslimu di menu **Pengguna**, atau tambahkan alamat lain di Pengaturan.
Email dikirim setelah respons ke pengguna selesai, jadi aplikasi tidak terasa lambat. Kalau email gagal terkirim, transaksi stok tetap tersimpan dan error-nya dicatat di log.
`FRONTEND_URL` di `.env` dipakai untuk link "Lihat laporan" & reset password di dalam email, dan untuk izin CORS (`https://warehouse.studiopoonya.net` saat online).

## Pasang online (VPS aaPanel)

| | Domain | Folder di server |
|---|---|---|
| Aplikasi (frontend) | `https://warehouse.studiopoonya.net` | `/www/wwwroot/poonya-warehouse/frontend/dist` |
| API (backend) | `https://api-warehouse.studiopoonya.net` | `/www/wwwroot/poonya-warehouse/backend` (running directory `/public`) |

Semua langkah instal/update dikerjakan `deploy.sh` (composer, `.env`, database + data awal, build frontend, cache, izin file). Aman diulang: database, `.env`, dan backup tidak pernah ditimpa.

### 1. DNS
Di pengelola DNS `studiopoonya.net`, buat dua **A record** ke IP VPS:
`warehouse` → `103.178.153.161` dan `api-warehouse` → `103.178.153.161`.

### 2. Siapkan aaPanel (sekali)
- **App Store → PHP 8.3** (atau 8.2+). Ekstensi yang dibutuhkan dicek otomatis oleh `deploy.sh`; kalau ada yang kurang, pasang di *PHP → Setting → Install extensions* (biasanya `fileinfo`).
- **App Store → Node.js version manager** → install **Node 22** (untuk build frontend).

### 3. Ambil kode & jalankan deploy (aaPanel → Terminal, sebagai root)
```bash
cd /www/wwwroot
git clone https://github.com/studiopoonya/Poonya_Warehouse.git poonya-warehouse
git config --global --add safe.directory /www/wwwroot/poonya-warehouse
cd poonya-warehouse
ADMIN_EMAIL=emailmu@gmail.com ADMIN_PASSWORD='password-kuat' bash deploy.sh
```
Repo **private**: GitHub meminta login saat `git clone`. Username = `studiopoonya`, password = **Personal access token** (GitHub → Settings → Developer settings → Fine-grained tokens → akses *Contents: Read-only* ke repo ini).

### 4. Buat dua website (aaPanel → Website → Add site)
**a. `api-warehouse.studiopoonya.net`**
- Root directory: `/www/wwwroot/poonya-warehouse/backend` · PHP: **8.3** · Database: tidak usah.
- Setelah dibuat, buka *Conf* situsnya:
  - **Site directory** → *Running directory* = **`/public`** → Save.
  - **URL rewrite** → pilih preset **`laravel5`** → Save.
  - **SSL** → *Let's Encrypt* → centang domainnya → Apply, lalu aktifkan **Force HTTPS**.

**b. `warehouse.studiopoonya.net`**
- Root directory: `/www/wwwroot/poonya-warehouse/frontend/dist` · PHP: **Static**.
- *Conf* → **URL rewrite** → isi lalu Save (supaya refresh di `/events/12` dll. tidak 404):
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```
- **SSL** → *Let's Encrypt* → Apply → **Force HTTPS**.

**Web server OpenLiteSpeed** (cek: `ss -ltnp | grep ':80 '` menampilkan `litespeed`): pengaturan *URL rewrite* di atas tidak dipakai — LiteSpeed membaca `.htaccess` yang sudah ada di `backend/public` dan `frontend/dist`. Setelah menambah situs, **pastikan LiteSpeed mengenalinya** sebelum meminta SSL (kalau tidak: 404/403 dan verifikasi SSL gagal). Di VPS kita, config utama `/usr/local/lsws/conf/httpd_config.conf` menulis listener langsung (blok `listener Default80 {` & `listener SSL443 {`), dan aaPanel tidak menambahkan situs baru ke sana. Perbaikannya (sudah dikerjakan 22 Nov 2026 untuk kedua domain; ulangi kalau domain diganti):
```bash
C=/usr/local/lsws/conf/httpd_config.conf; cp $C $C.bak-$(date +%Y%m%d%H%M)
# 1) muat file vhost situsnya
for s in api-warehouse warehouse; do f=/www/server/panel/vhost/openlitespeed/$s.studiopoonya.net.conf; grep -q "include $f" $C || printf '\ninclude %s\n' "$f" >> $C; done
# 2) daftarkan domain di listener port 80 & 443
for d in api-warehouse.studiopoonya.net warehouse.studiopoonya.net; do grep -qE "^\s*map\s+$d\s" $C || sed -i -e "/^listener Default80 {/a\  map $d $d" -e "/^listener SSL443 {/a\  map $d $d" $C; done
/usr/local/lsws/bin/lswsctrl restart   # graceful, situs lain tidak terputus
```
Tombol **Force HTTPS** aaPanel juga hanya untuk Nginx; pengalihan http → https untuk aplikasi sudah ada di `frontend/public/.htaccess`.

Cek: `https://api-warehouse.studiopoonya.net` menampilkan `{"app":"Poonya Warehouse API", ...}`, lalu buka `https://warehouse.studiopoonya.net` dan login.

### 5. Tugas terjadwal (aaPanel → Cron)
Tambah *Shell Script*, periode **setiap 1 menit**:
```bash
sudo -u www /www/server/php/83/bin/php -d disable_functions= /www/wwwroot/poonya-warehouse/backend/artisan schedule:run >> /dev/null 2>&1
```
Ini menjalankan backup otomatis 02.00 WIB dan pengingat event H-1 17.00 WIB (jam mengikuti `APP_TIMEZONE`, bukan jam server). `sudo -u www` penting supaya file log/backup dimiliki user web server.

### 6. Email (SMTP Gmail)
Isi `MAIL_*` di `backend/.env` (lihat bagian **Email notifikasi**, ubah `MAIL_MAILER=smtp`) lewat aaPanel → Files, lalu jalankan lagi `bash deploy.sh` (supaya cache konfigurasi diperbarui). Uji di aplikasi: **Pengaturan → Notifikasi email → Kirim email tes**.

### Update aplikasi
```bash
cd /www/wwwroot/poonya-warehouse && git pull && bash deploy.sh
```

### Catatan
- `deploy.sh` memakai `-d disable_functions=` hanya untuk perintah di skrip itu (Composer/Artisan butuh `putenv`/`proc_open` yang dimatikan aaPanel). Pengaturan PHP website lain tidak diubah.
- Ganti domain: `FRONTEND_URL=https://... API_URL=https://... bash deploy.sh` (untuk instalasi yang sudah ada, ubah juga `FRONTEND_URL`, `APP_URL`, `CORS_ALLOWED_ORIGINS` di `backend/.env`).
- Mau pakai MySQL alih-alih SQLite: lihat bagian **Pakai MySQL** (backup dari aplikasi khusus SQLite).

## Fitur

- **Overview**: KPI (total unit, jenis barang, stok menipis, transfer bulan ini), chart kotak-kotak pergerakan stok harian (7/14/30 hari), daftar stok menipis, transfer terakhir, aktivitas terbaru, ringkasan per venue, dan export CSV.
- **Filter venue global**: owner memilih venue di sidebar, dan Overview, Inventaris, Transfer, serta Riwayat ikut terfilter.
- **Jadwal event**: owner menjadwalkan event dan memilih **penanggung jawab**. Event itu hanya muncul di akun staff tersebut. Bisa juga **belum ditugaskan**: event muncul di semua staff, dan staff pertama yang menekan *Ambil event ini* yang bertugas. Owner bisa mengganti penanggung jawab atau membatalkan selama barang belum dibawa. Staff tetap bisa mencatat **event mendadak** sendiri (diberi label "dibuat staff").
- **Rusak / hilang**: saat lapor sisa, staff memisahkan barang yang kembali baik, yang **rusak/hilang**, dan yang terpakai (dihitung otomatis: dibawa − tersisa − rusak/hilang). Ada juga catatan laporan. Barang rusak/hilang tidak kembali ke stok, dan jumlah serta nilainya tampil terpisah di laporan, email, dan Excel.
- **Kalender event** (owner): tampilan bulanan di Logistik Event. Klik + di tanggal untuk langsung menjadwalkan. Di HP tampil sebagai titik, dan daftar event hari itu muncul di bawah kalender.
- **Dashboard**: kartu **Event 7 hari ke depan** (penanggung jawab, status, dan event yang belum ditugaskan).
- **Email ke staff**: saat ditugaskan atau dipindah menjadi penanggung jawab, dan **pengingat H-1** jam 17.00 (event yang belum ditugaskan diingatkan ke owner). Bisa dimatikan di Pengaturan.
- **Lupa password**: link di halaman login, lalu link reset dikirim ke email (berlaku 60 menit). Semua sesi lama otomatis keluar.
- **Email ringkasan**: setiap event selesai dan setiap stock opname, owner menerima email berisi jumlah barang (dibawa/sisa/terpakai atau sistem/fisik/selisih) dan nilai rupiahnya.
- **Jenis barang**: *Habis pakai* (paper, coverframe, keychain, kupon, dst.) atau *Peralatan* (kamera, printer, lighting, tripod, dst.). Peralatan punya **jumlah standar dibawa** (daftar Booth 1) dan **kondisi** per venue (Baik / Rusak / Servis, kolom "Status" di sheet lama).
- **Logistik event**: staff mencatat barang yang dibawa dari Warehouse ke event photobooth (3 langkah: info event → barang dibawa → barang tersisa). Di langkah 2 peralatan standar Booth 1 sudah tercentang, dan staff menandai **Dicek** per alat ("Work done"). Barang habis pakai: stok gudang berkurang saat berangkat, sisa kembali saat lapor, terpakai = dibawa − tersisa. Peralatan: stok **tidak** berkurang (tapi tidak bisa dibawa ke dua event sekaligus). Saat pulang, alat rusak ditandai *Rusak* di inventaris, dan hanya alat **hilang** yang mengurangi stok. Owner melihat semua event, unit terpakai per bulan, bisa koreksi laporan, dan bisa membatalkan event yang masih berjalan.
- **Stock opname** (owner): pilih venue, isi hitungan fisik per barang, dan selisih terlihat otomatis. Saat diselesaikan, stok disamakan dengan hitungan fisik. Barang yang tidak dihitung tidak diubah. Setiap opname tersimpan sebagai laporan (kode `OPN-yymmdd-xxxx`), dan isian tersimpan di browser selama proses hitung.
- **Pengguna** (owner): kelola akun owner/staff, status aktif, dan login terakhir.
- **Inventaris**: stok semua venue berdampingan, harga satuan & nilai stok, pencarian, filter kategori, tab Aktif / Menipis / Arsip, dan export Excel. SKU boleh kosong (dibuat otomatis dari nama).
- **Import barang**: dari file Excel/CSV atau tempel langsung dari spreadsheet, dengan pratinjau (baru / sudah ada / error) sebelum disimpan. Format export sistem lama (Nama Barang, Qty Stok, Harga Satuan) dikenali. Kolom **Jenis** (`Habis pakai` / `Peralatan`, kosong = habis pakai) dan **Standar dibawa** (jumlah standar Booth 1, khusus peralatan) ikut dibaca. File lama yang memakai kolom "Jenis" sebagai kategori (tanpa kolom Kategori) tetap dibaca sebagai kategori. Template Excel bisa diunduh.
- **Arsip barang**: barang yang tidak dipakai diarsipkan (riwayat tetap utuh, bisa dipulihkan). Hapus permanen hanya untuk barang yang belum pernah dipakai di transaksi.
- **Kategori**: tambah, ganti nama, dan hapus dari Inventaris atau Pengaturan.
- **Notifikasi** (ikon lonceng): event yang lebih dari 1 hari belum lapor sisa, stok habis/menipis, venue yang lebih dari 30 hari belum di-opname, dan backup yang terlambat.
- **Laporan Excel**: inventaris & nilai stok, pemakaian event per bulan (per barang + rincian per event, termasuk nilai rupiah), dan hasil tiap stock opname.
- **Pengaturan**: akun, venue (tambah/ubah/hapus, warna penanda), kategori, backup (otomatis harian + manual + unduh), dan export data.
- **Bantuan**: panduan singkat semua fitur.
- **Transfer**: pindahkan banyak barang sekaligus antar venue, dengan validasi stok asal. Setiap transfer mendapat kode `TRF-yymmdd-xxxx`.
- **Riwayat stok**: log semua barang masuk, keluar, transfer, dan penyesuaian (stock opname), lengkap dengan saldo akhir.
- **Tambah gudang / venue baru** (owner, di Pengaturan atau halaman Venue): tipe dipilih antara Gudang, Photobooth, atau Studio, lalu isi nama, alamat, dan warna. Venue baru langsung muncul di inventaris, transfer, stock opname, dan riwayat dengan stok 0. Isi stoknya lewat transfer atau stock opname. Nama tidak boleh kembar (huruf besar/kecil dianggap sama).
  - **Gudang utama** = gudang dengan urutan pertama (Warehouse). Event mengambil barang dari gudang utama, kecuali dipilih lain. Kalau ada lebih dari satu gudang, owner bisa memilih gudang asal saat menjadwalkan event, dan staff bisa menggantinya saat berangkat. Sisa barang kembali ke gudang asal.
  - Venue hanya bisa dihapus kalau belum pernah dipakai (tidak ada stok maupun riwayat), dan minimal harus tersisa satu gudang. Venue yang sudah dipakai cukup diganti nama.
- **Detail venue**: stok dan level per barang, aktivitas terakhir, serta tombol barang masuk/keluar.

## Struktur folder

```
Warehouse/
├── backend/                         # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/     # Auth, User, Event, Dashboard, Venue, Category, Item, Transfer, StockMovement
│   │   │   ├── Middleware/          # EnsureOwner (khusus owner), EnsureActiveUser (blokir akun nonaktif)
│   │   │   ├── Requests/            # Validasi (ItemRequest, StoreTransferRequest, StoreMovementRequest)
│   │   │   └── Resources/           # Bentuk JSON response
│   │   ├── Models/                  # User (role, venue), Event, EventItem, Venue, Category, Item, Stock, Transfer, TransferItem, StockMovement
│   │   └── Services/
│   │       ├── EventService.php     # logistik event: berangkat, lapor sisa, batal
│   │       ├── StockService.php     # satu-satunya pintu untuk mengubah stok (+ log)
│   │       └── TransferService.php  # transfer antar venue (atomik)
│   ├── database/
│   │   ├── migrations/              # ..._create_warehouse_tables.php
│   │   └── seeders/                 # BaseDataSeeder (venue + kategori), DemoSeeder (data contoh)
│   └── routes/api.php
│
└── frontend/                        # React + Vite
    └── src/
        ├── api/                     # axios client + endpoint per resource
        ├── components/
        │   ├── auth/RequireAuth.jsx # pelindung halaman yang wajib login
        │   ├── layout/              # Layout, Sidebar (+ menu user), Topbar
        │   ├── events/              # Stepper, ItemPicker (langkah 2), ReturnForm (langkah 3), QtyInput
        │   ├── dashboard/           # MovementChart, LowStockCard, RecentTransfers, RecentActivity, VenueBreakdown
        │   ├── forms/               # ItemFormModal, MovementFormModal, UserFormModal, ChangePasswordModal
        │   └── ui/                  # Card, StatCard, Modal, Segmented, AnimatedNumber, PageHeader, Feedback, motion presets
        ├── context/                 # AuthContext (login/logout), VenueContext (venue aktif), ToastContext
        ├── hooks/useFetch.js
        ├── pages/                   # Login, UsersPage, Events, EventNew, EventDetail, Overview, Inventory, Transfers, Movements, Venues, VenueDetail
        ├── utils/                   # format angka/tanggal, warna & ikon venue
        └── index.css                # design tokens + semua style
```

## API

Semua endpoint (kecuali login) butuh header `Authorization: Bearer <token>`. Akun staff hanya boleh mengakses endpoint `/api/auth/*` dan `/api/events*` (kecuali pembatalan). Endpoint lain membalas 403.

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/forgot-password` | Kirim link reset `{email}` (jawaban selalu sama) |
| POST | `/api/auth/reset-password` | `{token, email, password, password_confirmation}` |
| POST | `/api/auth/login` | `{email, password, remember}` → `{token, expires_at, user}` |
| GET | `/api/auth/me` | User yang sedang login |
| POST | `/api/auth/logout` | Cabut token saat ini |
| PUT | `/api/auth/password` | `{current_password, password, password_confirmation}` |
| GET | `/api/dashboard?venue_id=&days=30` | Statistik, data chart harian, stok menipis, transfer & aktivitas terakhir |
| GET | `/api/venues` | Daftar venue + ringkasan stok |
| GET | `/api/venues/{id}` | Detail venue + stok + aktivitas |
| GET | `/api/categories` | Kategori barang |
| GET | `/api/items?search=&category_id=&kind=consumable\|equipment&low=1&venue_id=` | Barang + stok per venue (+ kondisi alat) |
| POST/PUT/DELETE | `/api/items`, `/api/items/{id}` | Kelola barang `{..., kind, kit_qty}` (owner) |
| POST | `/api/events/schedule` | Owner menjadwalkan event `{name, location, event_date, crew, note, user_id}` (`user_id` null = belum ditugaskan) |
| PUT | `/api/events/{id}` | Owner mengubah jadwal / penanggung jawab (selama belum berangkat) |
| POST | `/api/events/{id}/claim` | Staff mengambil event yang belum ditugaskan |
| POST | `/api/events/{id}/depart` | Catat barang dibawa untuk event terjadwal `{items:[{item_id, quantity}]}` |
| GET/PUT | `/api/settings/notifications`, POST `/test` | Penerima & jenis email notifikasi, kirim email tes (owner) |
| GET/POST | `/api/events` | Daftar event + ringkasan bulanan / buat event `{name, location, event_date, crew, note, source_venue_id, items:[{item_id, quantity}]}` (`source_venue_id` opsional, default gudang utama) |
| GET | `/api/events/available-items?venue_id=` | Barang + stok gudang asal untuk langkah 2, plus daftar gudang (`warehouses`) |
| GET | `/api/events/{id}` | Detail event |
| PUT | `/api/events/{id}/return` | Lapor/koreksi sisa `{items:[{item_id, qty_returned}]}` |
| POST | `/api/events/{id}/cancel` | Batalkan event yang masih berjalan (owner) |
| GET/POST | `/api/opnames` | Riwayat / simpan stock opname `{venue_id, note, items:[{item_id, counted}]}` (owner) |
| GET | `/api/opnames/{id}` | Detail hasil opname (owner) |
| PUT | `/api/items/{id}/condition` | Kondisi peralatan di satu venue `{venue_id, condition: baik\|rusak\|servis}` (owner) |
| PATCH | `/api/items/{id}/archive` | Arsipkan / pulihkan `{archived}` (owner) |
| POST | `/api/items/import/preview` | Pratinjau import: `file` (xlsx/xls/csv) atau `rows` (owner) |
| POST | `/api/items/import` | Simpan import `{venue_id, update_existing, rows}` (owner) |
| GET | `/api/items/export`, `/api/items/import/template` | Excel inventaris / template import (owner) |
| GET/POST/PUT/DELETE | `/api/categories` | Kelola kategori (owner) |
| GET | `/api/reports/events?month=YYYY-MM`, `/api/reports/opnames/{id}` | Laporan Excel (owner) |
| GET | `/api/notifications` | Hal yang perlu perhatian (owner) |
| POST | `/api/venues` | Tambah venue `{name, type: warehouse\|booth\|studio, address, description, color}` (owner) |
| PUT/DELETE | `/api/venues/{id}` | Ubah nama/alamat/warna, atau hapus venue yang belum dipakai (owner) |
| GET/POST | `/api/backups`, GET `/api/backups/{nama}` | Daftar / buat / unduh backup (owner) |
| GET/POST/PUT/DELETE | `/api/users`, `/api/users/{id}` | Kelola akun (owner) `{name, email, role, is_active, password}` |
| GET/POST | `/api/transfers` | Riwayat / buat transfer `{from_venue_id, to_venue_id, items:[{item_id, quantity}], note}` |
| GET/POST | `/api/movements` | Riwayat / catat stok `{type: in\|out\|adjust, venue_id, item_id, quantity, note}` |

## Catatan

- Alamat venue masih kosong. Isi lewat menu **Pengaturan**.
- Zona waktu aplikasi: WIB (`APP_TIMEZONE=Asia/Jakarta` di `backend/.env`).
- Nilai rupiah di laporan memakai **harga saat ini**, bukan harga saat barang dipakai.
- Project belum memakai git.
