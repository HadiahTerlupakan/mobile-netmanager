#!/usr/bin/env bash
#
# Menyiapkan secret dan variabel CI/CD GitHub Actions di environment
# `production`: empat nilai signing dari credentials.json yang diunduh dari EAS,
# google-services.json, service account Play, token publish OTA, dan EXPO_TOKEN.
#
# Kenapa lewat skrip, bukan salin-tempel manual: satu karakter meleset pada
# password keystore tidak menggagalkan apa pun sampai Gradle mencoba memakainya
# — di menit ke-40 sebuah build. Skrip ini mengalirkan tiap nilai langsung ke
# `gh secret set` lewat stdin: tidak pernah tampil di layar, tidak ada di
# argumen perintah (daftar proses), dan tidak tertinggal di riwayat terminal.
#
# Dipakai ulang saat kunci atau token dirotasi.
#
# Prasyarat: environment `production` sudah dibuat di repo (Settings ->
# Environments) dengan kebijakan branch `main`. Skrip ini tidak membuat atau
# mengubah environment, supaya kebijakan proteksinya tetap satu sumber.
#
# Pemakaian:
#   ./scripts/siapkan-secret-github.sh
#   REPO=pemilik/nama ./scripts/siapkan-secret-github.sh   # repo lain
#
# APP_UPDATE_PUBLISH_TOKEN dan EXPO_TOKEN diambil dari variabel lingkungan
# bernama sama bila diset; kalau tidak, ditanyakan tanpa gema. Jawaban kosong
# berarti nilai yang sudah ada di GitHub dibiarkan.

set -euo pipefail

CREDENTIALS_JSON="credentials.json"
ENVIRONMENT="production"

merah=$'\033[0;31m'; hijau=$'\033[0;32m'; kuning=$'\033[1;33m'; biru=$'\033[0;34m'; nol=$'\033[0m'

gagal() { printf '%s%s%s\n' "$merah" "$1" "$nol" >&2; exit 1; }

# ── Prasyarat ───────────────────────────────────────────────────────────────
command -v node >/dev/null || gagal "node tidak ditemukan"
command -v keytool >/dev/null || gagal "keytool tidak ditemukan (pasang JDK)"
command -v gh >/dev/null || gagal "gh tidak ditemukan (https://cli.github.com)"
gh auth status >/dev/null 2>&1 || gagal "gh belum login — jalankan: gh auth login"

REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
[ -n "${REPO}" ] || gagal "Tidak bisa menentukan repo GitHub; set REPO=pemilik/nama"

gh api "repos/${REPO}/environments/${ENVIRONMENT}" >/dev/null 2>&1 \
    || gagal "Environment '${ENVIRONMENT}' belum ada di ${REPO}. Buat dulu di Settings -> Environments, dengan kebijakan branch main."

if [ ! -f "${CREDENTIALS_JSON}" ]; then
    cat >&2 <<PESAN
${merah}${CREDENTIALS_JSON} tidak ditemukan.${nol}

Ambil dulu dari EAS:

  ${biru}npx eas credentials --platform android${nol}

Lalu di menunya pilih berurutan:
  1. Build profile           -> ${kuning}production${nol}
  2. What do you want to do  -> ${kuning}Download credentials from EAS to credentials.json${nol}

Setelah ${CREDENTIALS_JSON} muncul di direktori ini, jalankan skrip ini lagi.
PESAN
    exit 1
fi

# ── Baca kredensial ─────────────────────────────────────────────────────────
# Nilainya diambil satu per satu lewat node supaya tidak ada yang ikut tercetak
# kalau berkasnya tidak sesuai dugaan.
baca() {
    node -e "
        const c = require('./${CREDENTIALS_JSON}');
        const k = c.android && c.android.keystore;
        if (!k) { console.error('Blok android.keystore tidak ada di ${CREDENTIALS_JSON}'); process.exit(1); }
        const v = k['$1'];
        if (!v) { console.error('Field $1 kosong di ${CREDENTIALS_JSON}'); process.exit(1); }
        process.stdout.write(String(v));
    "
}

JALUR_KEYSTORE="$(baca keystorePath)" || gagal "Gagal membaca keystorePath"
STORE_PASSWORD="$(baca keystorePassword)" || gagal "Gagal membaca keystorePassword"
KEY_ALIAS="$(baca keyAlias)" || gagal "Gagal membaca keyAlias"
KEY_PASSWORD="$(baca keyPassword)" || gagal "Gagal membaca keyPassword"

[ -f "${JALUR_KEYSTORE}" ] || gagal "Berkas keystore tidak ada di ${JALUR_KEYSTORE}"

# ── Sidik jari sertifikat ───────────────────────────────────────────────────
# Ini bagian publik dari kunci, bukan rahasia — aman ditampilkan, dan memang
# harus dibandingkan dengan yang tercatat di Play Console.
SIDIK="$(keytool -list -v \
    -keystore "${JALUR_KEYSTORE}" \
    -alias "${KEY_ALIAS}" \
    -storepass "${STORE_PASSWORD}" 2>/dev/null \
    | awk 'tolower($0) ~ /sha256:/ && !ketemu { sub(/.*SHA256: */, ""); gsub(/ /, ""); print; ketemu=1 }')"

[ -n "${SIDIK}" ] || gagal "Tidak bisa membaca sidik jari — alias atau password di ${CREDENTIALS_JSON} tidak cocok dengan keystore-nya"

printf '\n%sRepo:%s %s  (environment %s)\n' "$hijau" "$nol" "${REPO}" "${ENVIRONMENT}"
printf '%sKeystore terbaca:%s %s (%s byte), alias %s\n' \
    "$hijau" "$nol" "${JALUR_KEYSTORE}" "$(wc -c < "${JALUR_KEYSTORE}" | tr -d ' ')" "${KEY_ALIAS}"
printf '%sSidik jari SHA-256:%s %s\n\n' "$hijau" "$nol" "${SIDIK}"

# ── Kirim secret ────────────────────────────────────────────────────────────
# Nilai dialirkan lewat stdin. `gh secret set` hanya mencetak nama secret.
setel_secret() {
    local nama="$1" nilai="$2" asal="$3"
    [ -n "${nilai}" ] || gagal "Nilai ${nama} kosong (${asal})"
    printf '%s' "${nilai}" | gh secret set "${nama}" --env "${ENVIRONMENT}" --repo "${REPO}" >/dev/null
    printf '  %sok%s %s  (%s)\n' "$hijau" "$nol" "${nama}" "${asal}"
}

base64_berkas() { base64 < "$1" | tr -d '\n'; }

setel_secret RADPRO_RELEASE_KEYSTORE_BASE64 "$(base64_berkas "${JALUR_KEYSTORE}")" "isi keystore, base64"
setel_secret RADPRO_RELEASE_STORE_PASSWORD  "${STORE_PASSWORD}"                     "keystorePassword"
setel_secret RADPRO_RELEASE_KEY_ALIAS       "${KEY_ALIAS}"                          "keyAlias"
setel_secret RADPRO_RELEASE_KEY_PASSWORD    "${KEY_PASSWORD}"                       "keyPassword"

# google-services.json di-.gitignore; dulu EAS menyuntikkannya lewat variabel
# berkas GOOGLE_SERVICES_JSON. Tanpanya `expo prebuild` di runner gagal.
[ -f google-services.json ] || gagal "google-services.json tidak ada di direktori ini"
node -e 'JSON.parse(require("fs").readFileSync("google-services.json","utf8"))' \
    || gagal "google-services.json bukan JSON yang sah"
setel_secret GOOGLE_SERVICES_JSON_BASE64 "$(base64_berkas google-services.json)" "google-services.json, base64"

# Service account Play: menghitung versionCode berikutnya dan mengunggah AAB ke
# track internal. Berkas yang sama dipakai `eas submit` (eas.json).
SA_PLAY="$(node -p 'require("./eas.json").submit.production.android.serviceAccountKeyPath')"
[ -f "${SA_PLAY}" ] || gagal "Service account Play tidak ada di ${SA_PLAY}"
node -e 'const s=require(process.argv[1]); if(!s.client_email||!s.private_key) process.exit(1)' "./${SA_PLAY#./}" \
    || gagal "${SA_PLAY} bukan service account yang sah"
setel_secret GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 "$(base64_berkas "${SA_PLAY}")" "service account Play, base64"

# Token publish OTA dan token EAS (resolusi fingerprint di publish-update.sh).
# Diambil dari env bila ada, kalau tidak ditanyakan tanpa gema.
setel_token() {
    local nama="$1" keterangan="$2" nilai="${!1:-}"
    if [ -z "${nilai}" ]; then
        printf '%s%s%s (%s) — tempel lalu Enter, kosongkan untuk melewati: ' "$kuning" "${nama}" "$nol" "${keterangan}"
        read -rs nilai
        printf '\n'
    fi
    if [ -z "${nilai}" ]; then
        printf '  -- %s dilewati; nilai lama di GitHub dibiarkan\n' "${nama}"
        return
    fi
    setel_secret "${nama}" "${nilai}" "${keterangan}"
}

setel_token APP_UPDATE_PUBLISH_TOKEN "token publish OTA server netmanager"
setel_token EXPO_TOKEN "token akses EAS"

# ── Variabel sidik jari ─────────────────────────────────────────────────────
cat <<PESAN

${kuning}Variabel RADPRO_UPLOAD_CERT_SHA256${nol} (bukan secret)
  Nilai : ${SIDIK}

  Bandingkan dulu dengan sidik jari sertifikat kunci upload di Play Console
  (Setup -> App integrity -> App signing -> Upload key certificate). Kalau
  berbeda, jangan diisi — artinya keystore ini bukan yang dipakai Play Store,
  dan build apa pun darinya akan ditolak saat unggah.
PESAN
printf 'Sidik jari sama dengan Play Console? [y/N] '
read -r cocok
if [ "${cocok}" = "y" ] || [ "${cocok}" = "Y" ]; then
    gh variable set RADPRO_UPLOAD_CERT_SHA256 --env "${ENVIRONMENT}" --repo "${REPO}" --body "${SIDIK}" >/dev/null
    printf '  %sok%s RADPRO_UPLOAD_CERT_SHA256\n' "$hijau" "$nol"
else
    printf '  -- RADPRO_UPLOAD_CERT_SHA256 tidak diubah\n'
fi

cat <<PESAN

${hijau}Selesai.${nol} Periksa daftarnya (nama saja, tanpa nilai):
  gh secret list --env ${ENVIRONMENT} --repo ${REPO}
  gh variable list --env ${ENVIRONMENT} --repo ${REPO}

${merah}Setelah selesai:${nol} hapus ${CREDENTIALS_JSON} dan ${JALUR_KEYSTORE} dari
direktori ini kalau tidak lagi dibutuhkan — keduanya berisi kunci penandatangan
aplikasi, dan .gitignore melindungi repo, bukan disk Anda.
PESAN
