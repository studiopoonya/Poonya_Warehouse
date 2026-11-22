#!/usr/bin/env bash
# =============================================================================
#  Poonya Warehouse — pasang / update di server (aaPanel, Ubuntu)
#
#    frontend  https://warehouse.studiopoonya.net      -> frontend/dist   (situs statis)
#    backend   https://api-warehouse.studiopoonya.net  -> backend/public  (Laravel)
#
#  Pertama kali (dari folder project, sebagai root):
#     ADMIN_EMAIL=emailmu@gmail.com ADMIN_PASSWORD='password-kuat' bash deploy.sh
#
#  Update berikutnya:
#     git pull && bash deploy.sh
#
#  Aman diulang: data (database, .env, backup) tidak pernah ditimpa.
#  Domain bisa diganti: FRONTEND_URL=... API_URL=... bash deploy.sh
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"
APP_DIR="$(pwd)"
FRONTEND_URL="${FRONTEND_URL:-https://warehouse.studiopoonya.net}"
API_URL="${API_URL:-https://api-warehouse.studiopoonya.net}"
WEB_USER="${WEB_USER:-www}"          # user web server aaPanel
step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mGAGAL: %s\033[0m\n' "$*"; exit 1; }

# --- PHP aaPanel: utamakan 8.3 (sama dengan PHP website & cron di README), lalu 8.4 / 8.2 ----
if [ -z "${PHP_BIN:-}" ]; then
  for v in 83 84 82; do
    if [ -x "/www/server/php/$v/bin/php" ]; then PHP_BIN="/www/server/php/$v/bin/php"; break; fi
  done
fi
PHP_BIN="${PHP_BIN:-$(command -v php || true)}"
[ -n "$PHP_BIN" ] || fail "PHP tidak ditemukan. Pasang PHP 8.3 di aaPanel → App Store."
# aaPanel menonaktifkan beberapa fungsi (putenv, proc_open, ...) yang dibutuhkan Composer/Artisan
# di command line. -d di bawah hanya berlaku untuk perintah di skrip ini; website tidak berubah.
PHP=("$PHP_BIN" -d disable_functions= -d memory_limit=512M)
PHP_VER="$("${PHP[@]}" -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"

step "PHP $PHP_VER ($PHP_BIN)"
"${PHP[@]}" -r 'exit(version_compare(PHP_VERSION, "8.2", "<") ? 1 : 0);' || fail "Butuh PHP 8.2 atau lebih baru."

# daftar modul diambil sekali (grep -q langsung di pipe bisa gagal palsu karena pipefail/SIGPIPE)
MODULES="$("${PHP[@]}" -m)"
missing=""
for ext in pdo_sqlite mbstring openssl tokenizer ctype dom xml xmlreader xmlwriter simplexml fileinfo zip gd iconv zlib; do
  grep -qix "$ext" <<< "$MODULES" || missing="$missing $ext"
done
[ -z "$missing" ] || fail "Ekstensi PHP belum terpasang:$missing
   aaPanel → App Store → PHP $PHP_VER → Setting → Install extensions."

# set_env KEY VALUE — ubah/tambah baris di backend/.env (diedit lewat PHP, karakter apa pun aman)
set_env() {
  K="$1" V="$2" "${PHP[@]}" -r '
    $f = "backend/.env"; $line = getenv("K") . "=" . getenv("V");
    $re = "/^" . preg_quote(getenv("K"), "/") . "=.*$/m"; $s = file_get_contents($f);
    $s = preg_match($re, $s) ? preg_replace_callback($re, fn () => $line, $s, 1) : rtrim($s) . PHP_EOL . $line . PHP_EOL;
    file_put_contents($f, $s);'
}

# --- Composer ---------------------------------------------------------------------
step "Library backend (composer install)"
COMPOSER_BIN="$(command -v composer || true)"
if [ -z "$COMPOSER_BIN" ]; then
  COMPOSER_BIN="$APP_DIR/backend/composer.phar"
  [ -f "$COMPOSER_BIN" ] || curl -fsSL https://getcomposer.org/download/latest-stable/composer.phar -o "$COMPOSER_BIN"
fi
(cd backend && COMPOSER_ALLOW_SUPERUSER=1 "${PHP[@]}" "$COMPOSER_BIN" install --no-dev --optimize-autoloader --no-interaction --no-progress)

# --- .env (dibuat sekali; isi yang sudah ada tidak ditimpa) ----------------------------
FIRST_INSTALL=0
if [ ! -f backend/.env ]; then
  step "Membuat backend/.env (pertama kali)"
  cp backend/.env.example backend/.env
  set_env APP_NAME '"Poonya Warehouse"'
  set_env APP_ENV production
  set_env APP_DEBUG false
  set_env APP_URL "$API_URL"
  set_env FRONTEND_URL "$FRONTEND_URL"
  set_env CORS_ALLOWED_ORIGINS "$FRONTEND_URL"
  set_env LOG_LEVEL warning
  [ -z "${ADMIN_EMAIL:-}" ] || set_env ADMIN_EMAIL "$ADMIN_EMAIL"
  if [ -n "${ADMIN_PASSWORD:-}" ]; then
    case "$ADMIN_PASSWORD" in *"'"*) fail "ADMIN_PASSWORD jangan mengandung tanda kutip satu ('). Password bisa diganti lewat aplikasi setelah login.";; esac
    set_env ADMIN_PASSWORD "'$ADMIN_PASSWORD'"
  fi
  (cd backend && "${PHP[@]}" artisan key:generate --force --no-interaction)
  FIRST_INSTALL=1
fi

# --- Database -----------------------------------------------------------------------
step "Database (migrate)"
[ -f backend/database/database.sqlite ] || touch backend/database/database.sqlite
(cd backend && "${PHP[@]}" artisan migrate --force --no-interaction)

USERS="$("${PHP[@]}" -r 'echo (new PDO("sqlite:backend/database/database.sqlite"))->query("select count(*) from users")->fetchColumn();')"
if [ "$USERS" = "0" ]; then
  step "Data awal: akun owner, venue, kategori + stok asli (PoonyaStockSeeder)"
  (cd backend && "${PHP[@]}" artisan db:seed --force --no-interaction)
  (cd backend && "${PHP[@]}" artisan db:seed --class=PoonyaStockSeeder --force --no-interaction)
  # password owner sudah tersimpan (ter-hash) di database; jangan dibiarkan di .env
  set_env ADMIN_PASSWORD ""
fi

# --- Frontend -----------------------------------------------------------------------
step "Frontend (build React -> frontend/dist, API: $API_URL/api)"
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(ls -d /www/server/nodejs/v*/bin/node 2>/dev/null | sort -V | tail -n1 || true)"
fi
if [ -n "$NODE_BIN" ]; then
  export PATH="$(dirname "$NODE_BIN"):$PATH"
  echo "Node $(node -v)"
  (
    cd frontend
    # npm ci = versi persis sesuai package-lock.json. Kalau versi npm server menolak lock file
    # (beda versi npm), pakai npm install tanpa mengubah package-lock.json supaya git pull tetap bersih.
    if ! npm ci --no-audit --no-fund; then
      echo "npm ci gagal, mencoba npm install..."
      npm install --no-audit --no-fund --no-package-lock
    fi
    # build ke folder sementara: aaPanel menaruh .user.ini terkunci (chattr +i) di frontend/dist,
    # sehingga vite tidak bisa mengosongkan dist langsung
    rm -rf dist-new
    VITE_API_URL="$API_URL/api" npm run build -- --outDir dist-new --emptyOutDir
    mkdir -p dist
    # ganti isi lama, kecuali file milik aaPanel (.user.ini) & verifikasi SSL (.well-known)
    find dist -mindepth 1 -maxdepth 1 ! -name .user.ini ! -name .well-known -exec rm -rf {} +
    cp -r dist-new/. dist/
    rm -rf dist-new
  )
elif [ -f frontend/dist/index.html ]; then
  echo "Node tidak ada; memakai frontend/dist yang sudah di-upload."
else
  fail "Node.js belum terpasang. aaPanel → App Store → Node.js version manager → install Node 22."
fi

# --- Optimasi & izin file -----------------------------------------------------------
step "Cache konfigurasi, route & view"
(cd backend && "${PHP[@]}" artisan optimize --no-interaction)

step "Izin file untuk web server ($WEB_USER)"
# .user.ini dibuat & dikunci (chattr +i) oleh aaPanel -> dilewati supaya chown tidak gagal
find "$APP_DIR/backend" "$APP_DIR/frontend/dist" ! -name .user.ini -exec chown "$WEB_USER:$WEB_USER" {} +
find backend/storage backend/bootstrap/cache backend/database ! -name .user.ini -exec chmod ug+rwX {} +
chmod 640 backend/.env

step "Selesai"
echo "Aplikasi : $FRONTEND_URL"
echo "API      : $API_URL"
if [ "$FIRST_INSTALL" = "1" ]; then
  echo "Login owner: $(grep '^ADMIN_EMAIL=' backend/.env | cut -d= -f2-) (password = ADMIN_PASSWORD yang kamu isi)"
fi
echo "Ingat: setiap ubah backend/.env (mis. SMTP email), jalankan lagi: bash deploy.sh"
