#!/usr/bin/env bash
#
# Menyiapkan empat secret signing Android untuk repo Gitea, dari
# credentials.json yang diunduh dari EAS.
#
# Kenapa lewat skrip, bukan salin-tempel manual: satu karakter meleset pada
# password keystore tidak menggagalkan apa pun sampai Gradle mencoba memakainya
# — di menit ke-40 sebuah build. Skrip ini memindahkan nilainya lewat clipboard
# tanpa pernah menampilkannya di layar, jadi tidak ada yang perlu diketik ulang
# dan tidak ada yang tertinggal di riwayat terminal.
#
# Dipakai ulang saat kunci dirotasi.

set -euo pipefail

CREDENTIALS_JSON="credentials.json"
URL_SECRET="http://113.192.1.82:3000/gitea-admin/mobile-netmanager/settings/actions/secrets"
URL_VARIABEL="http://113.192.1.82:3000/gitea-admin/mobile-netmanager/settings/actions/variables"

merah=$'\033[0;31m'; hijau=$'\033[0;32m'; kuning=$'\033[1;33m'; biru=$'\033[0;34m'; nol=$'\033[0m'

gagal() { printf '%s%s%s\n' "$merah" "$1" "$nol" >&2; exit 1; }

# ── Prasyarat ───────────────────────────────────────────────────────────────
command -v node >/dev/null || gagal "node tidak ditemukan"
command -v keytool >/dev/null || gagal "keytool tidak ditemukan (pasang JDK)"

if command -v pbcopy >/dev/null; then salin() { pbcopy; }
elif command -v xclip >/dev/null; then salin() { xclip -selection clipboard; }
elif command -v wl-copy >/dev/null; then salin() { wl-copy; }
else gagal "Tidak ada perintah clipboard (pbcopy/xclip/wl-copy)"
fi

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
    | grep -i 'SHA256:' | head -1 | sed 's/.*SHA256: *//' | tr -d ' ')"

[ -n "${SIDIK}" ] || gagal "Tidak bisa membaca sidik jari — alias atau password di ${CREDENTIALS_JSON} tidak cocok dengan keystore-nya"

printf '\n%sKeystore terbaca:%s %s (%s byte), alias %s\n' \
    "$hijau" "$nol" "${JALUR_KEYSTORE}" "$(wc -c < "${JALUR_KEYSTORE}" | tr -d ' ')" "${KEY_ALIAS}"
printf '%sSidik jari SHA-256:%s %s\n' "$hijau" "$nol" "${SIDIK}"

# ── Pindahkan tiap nilai lewat clipboard ────────────────────────────────────
printf '\n%sBuka halaman secret Gitea:%s\n  %s\n' "$biru" "$nol" "${URL_SECRET}"
printf '\nUntuk tiap langkah: nilainya sudah ada di clipboard, tinggal tempel.\n'

langkah() {
    local nama="$1" nilai="$2" ke="$3" dari="$4"
    printf '%s' "${nilai}" | salin
    printf '\n%s[%s/4]%s %s%s%s  (%s)\n' "$kuning" "$ke" "$nol" "$hijau" "${nama}" "$nol" "${dari}"
    printf '      sudah di clipboard — tempel sebagai secret bernama di atas, lalu tekan Enter'
    read -r _
}

langkah RADPRO_RELEASE_KEYSTORE_BASE64 "$(base64 < "${JALUR_KEYSTORE}" | tr -d '\n')" 1 "isi keystore, base64"
langkah RADPRO_RELEASE_STORE_PASSWORD  "${STORE_PASSWORD}"                            2 "keystorePassword"
langkah RADPRO_RELEASE_KEY_ALIAS       "${KEY_ALIAS}"                                 3 "keyAlias"
langkah RADPRO_RELEASE_KEY_PASSWORD    "${KEY_PASSWORD}"                              4 "keyPassword"

# Clipboard dikosongkan: nilai terakhir yang tertinggal di sana adalah password.
printf '' | salin

cat <<PESAN

${hijau}Empat secret selesai.${nol}

${kuning}Satu langkah lagi — variabel (bukan secret):${nol}
  ${URL_VARIABEL}

  Nama  : RADPRO_UPLOAD_CERT_SHA256
  Nilai : ${SIDIK}

  Bandingkan dulu dengan sidik jari sertifikat kunci upload di Play Console
  (Setup -> App integrity -> App signing -> Upload key certificate). Kalau
  berbeda, jangan diisi — artinya keystore ini bukan yang dipakai Play Store,
  dan build apa pun darinya akan ditolak saat unggah.

  Isi juga RADPRO_VERSION_CODE_BASE = 46  (versionCode terakhir dari EAS;
  build pertama di Gitea akan menjadi 47).

${merah}Setelah selesai:${nol} hapus ${CREDENTIALS_JSON} dan ${JALUR_KEYSTORE} dari
direktori ini kalau tidak lagi dibutuhkan — keduanya berisi kunci penandatangan
aplikasi, dan .gitignore melindungi repo, bukan disk Anda.
PESAN
