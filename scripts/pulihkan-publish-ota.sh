#!/bin/bash
# ================================================
# Pulihkan publish OTA yang gagal karena jaringan
# ================================================
# Skenario: workflow "Publish OTA" sudah membangun bundel dengan benar, tetapi
# langkah unggahnya gagal karena jalur runner GitHub ke server merosot. Kejadian
# 7 Okt 2026: ~10 KB/detik, sehingga bundel 13 MB tidak selesai sebelum batas
# baca Traefik 60 detik, dan HTTP 499/502 berulang.
#
# Yang dilakukan skrip ini: mengambil bundel HASIL CI dari artifact, mengirimnya
# ke host produksi, lalu menerbitkannya dari sana — tempat unggahan ke aplikasi
# terukur di atas 14 MB/detik karena tidak melewati internet.
#
# Yang TIDAK dilakukan: membangun ulang bundel. Nilai EXPO_PUBLIC_* ditanam ke
# bundel saat export, jadi membangun di mesin lain berarti pengguna berisiko
# menerima konfigurasi Firebase yang berbeda — persis cacat OTA 8f311761 yang
# dulu mematikan chat dan realtime work order. Bundel yang terbit lewat skrip
# ini bit-per-bit sama dengan yang dibangun CI.
#
# Pemeriksaan isi bundel di publish-update.sh tetap berjalan penuh; skrip ini
# hanya melewati langkah export (SKIP_EXPORT=1).
#
# Usage:
#   ./scripts/pulihkan-publish-ota.sh              # pakai run OTA gagal terbaru
#   ./scripts/pulihkan-publish-ota.sh 37612680571  # run tertentu
#
# Prasyarat:
#   - gh CLI sudah login dan punya akses repo ini
#   - ssh ke host produksi bisa tanpa kata sandi (lihat HOST di bawah)
#   - token publish diambil dari k8s secret DI HOST; ia tidak pernah menyentuh
#     mesin yang menjalankan skrip ini
#
# Exit codes:
#   0  success
#   1  prasyarat tidak terpenuhi
#   2  artifact tidak ditemukan
#   3  pengiriman ke host gagal
#   4  publish gagal
# ================================================

set -euo pipefail

HOST="${OTA_RECOVERY_HOST:-radpro}"
NAMESPACE="${OTA_RECOVERY_NAMESPACE:-netmanager-production}"
SECRET="${OTA_RECOVERY_SECRET:-netmanager-secrets}"
WORKFLOW="${OTA_RECOVERY_WORKFLOW:-Publish OTA}"
CHANNEL="${OTA_RECOVERY_CHANNEL:-production}"
REMOTE_DIR="ota-pulih-$$"

RUN_ID="${1:-}"

command -v gh >/dev/null || { echo "❌ gh CLI tidak ada"; exit 1; }
ssh -o BatchMode=yes "${HOST}" true 2>/dev/null \
    || { echo "❌ ssh ke ${HOST} gagal (butuh akses tanpa kata sandi)"; exit 1; }

# Run OTA gagal terbaru, bila tidak disebut eksplisit.
if [[ -z "${RUN_ID}" ]]; then
    echo "🔎 Mencari run \"${WORKFLOW}\" yang gagal paling baru..."
    RUN_ID=$(gh run list --workflow "${WORKFLOW}" --status failure \
        --limit 1 --json databaseId --jq '.[0].databaseId' || true)
    [[ -n "${RUN_ID}" && "${RUN_ID}" != "null" ]] \
        || { echo "❌ Tidak ada run gagal yang bisa dipulihkan"; exit 2; }
fi
echo "   run: ${RUN_ID}"

# `first(...)` di dalam jq, bukan `| head -1`: memotong pipa bisa memicu SIGPIPE
# pada `set -o pipefail` dan menggagalkan skrip tanpa alasan yang terbaca.
ARTIFACT=$(gh api "repos/{owner}/{repo}/actions/runs/${RUN_ID}/artifacts" \
    --jq 'first(.artifacts[] | select(.expired == false) | select(.name | startswith("ota-dist-")) | .name) // ""' \
    || true)
if [[ -z "${ARTIFACT}" ]]; then
    echo "❌ Artifact ota-dist-* tidak ada pada run ${RUN_ID}."
    echo "   Artifact hanya tersimpan saat langkah publish gagal, dan kedaluwarsa 5 hari."
    exit 2
fi
echo "   artifact: ${ARTIFACT}"

LOKAL=$(mktemp -d -t ota-pulih.XXXXXX)
bersihkan() { rm -rf "${LOKAL}"; ssh -o BatchMode=yes "${HOST}" "rm -rf ~/${REMOTE_DIR}" 2>/dev/null || true; }
trap bersihkan EXIT

echo "⬇️  Mengunduh bundel hasil CI..."
gh run download "${RUN_ID}" -n "${ARTIFACT}" -D "${LOKAL}" \
    || { echo "❌ Unduh artifact gagal"; exit 2; }
[[ -d "${LOKAL}/dist" ]] || { echo "❌ dist/ tidak ada di artifact"; exit 2; }

echo "📤 Mengirim ke ${HOST}..."
tar czf "${LOKAL}/ota.tgz" -C "${LOKAL}" dist native-build.json 2>/dev/null \
    || tar czf "${LOKAL}/ota.tgz" -C "${LOKAL}" dist
ssh -o BatchMode=yes "${HOST}" "rm -rf ~/${REMOTE_DIR} && mkdir -p ~/${REMOTE_DIR}/scripts" \
    || { echo "❌ Gagal menyiapkan direktori di host"; exit 3; }
scp -q "${LOKAL}/ota.tgz" "${HOST}:~/${REMOTE_DIR}/" || { echo "❌ scp bundel gagal"; exit 3; }
scp -q "$(dirname "$0")/publish-update.sh" "$(dirname "$0")/build-update-manifest.js" \
    "${HOST}:~/${REMOTE_DIR}/scripts/" || { echo "❌ scp skrip gagal"; exit 3; }

echo "🚀 Menerbitkan dari host..."
# Token diambil DI HOST dan tidak pernah dicetak: ia tetap di sana.
ssh -o BatchMode=yes "${HOST}" "set -euo pipefail
cd ~/${REMOTE_DIR}
tar xzf ota.tgz
cp scripts/publish-update.sh ./publish-update.sh
RV=\$(node -p 'require(\"./native-build.json\").runtimeVersion' 2>/dev/null || echo '')
TOKEN=\$(sudo -n kubectl get secret -n ${NAMESPACE} ${SECRET} \
    -o jsonpath='{.data.APP_UPDATE_PUBLISH_TOKEN}' | base64 -d)
[ -n \"\$TOKEN\" ] || { echo '❌ Token publish tidak ada di secret'; exit 4; }
# Prefiks env harus literal; hasil ekspansi seperti \${RV:+VAR=...} dibaca bash
# sebagai nama perintah, bukan penugasan variabel.
export SKIP_EXPORT=1
export APP_UPDATE_PUBLISH_TOKEN=\"\$TOKEN\"
# `if`, bukan `&&`: di bawah set -e rantai && yang bernilai salah
# menghentikan skrip, padahal RV kosong adalah keadaan sah.
if [ -n \"\$RV\" ]; then export RUNTIME_VERSION_OVERRIDE=\"\$RV\"; fi
bash publish-update.sh ${CHANNEL} 'pemulihan: bundel CI diterbitkan dari host'" \
    || { echo "❌ Publish dari host gagal"; exit 4; }

echo ""
echo "✅ Pemulihan selesai. Bundel yang terbit adalah bundel hasil CI, bukan build ulang."
