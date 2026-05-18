#!/bin/bash
# ================================================
# Rollback OTA Update — kembalikan ke previous active
# ================================================
# Skenario: setelah `publish-update.sh` deploy update baru yang ternyata
# bermasalah, script ini deactivate update terbaru dan re-activate update
# sebelumnya pada channel yang sama. User mobile yang fetch manifest
# berikutnya akan dapat versi lama lagi.
#
# Workflow:
#   1. List updates aktif di channel target
#   2. Deactivate update paling baru (head of stack)
#   3. Re-activate update sebelumnya
#
# Usage:
#   ./scripts/ota-rollback.sh staging
#   ./scripts/ota-rollback.sh production
#
# Env required:
#   APP_UPDATE_PUBLISH_TOKEN  (Bearer token, sama dengan publish)
#   OTA_BASE_URL_STAGING / OTA_BASE_URL_PRODUCTION (default radpro.id)
#
# Exit codes:
#   0  success
#   1  validation error
#   2  list updates gagal
#   3  rollback gagal
# ================================================

set -euo pipefail

CHANNEL="${1:-}"
PLATFORM="${PLATFORM:-android}"

if [[ "$CHANNEL" != "staging" && "$CHANNEL" != "production" ]]; then
    echo "❌ Channel harus 'staging' atau 'production'."
    echo "Usage: $0 <staging|production>"
    exit 1
fi

if [[ -z "${APP_UPDATE_PUBLISH_TOKEN:-}" ]]; then
    echo "❌ ENV APP_UPDATE_PUBLISH_TOKEN belum di-set."
    exit 1
fi

case "$CHANNEL" in
    staging)
        BASE_URL="${OTA_BASE_URL_STAGING:-https://staging.radpro.id}"
        ;;
    production)
        BASE_URL="${OTA_BASE_URL_PRODUCTION:-https://radpro.id}"
        ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OTA Rollback — channel=${CHANNEL} platform=${PLATFORM}"
echo "  Target: ${BASE_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Fetch list updates (sorted by createdAt desc)
echo ""
echo "📋 Step 1/3: Fetching update list..."
LIST_FILE=$(mktemp -t ota-list.XXXXXX.json)
trap "rm -f '${LIST_FILE}'" EXIT

HTTP_STATUS=$(curl -sS \
    -H "Authorization: Bearer ${APP_UPDATE_PUBLISH_TOKEN}" \
    -o "${LIST_FILE}" \
    -w "%{http_code}" \
    "${BASE_URL}/api/admin/app-update?channel=${CHANNEL}&platform=${PLATFORM}&limit=10")

if [[ "${HTTP_STATUS}" != "200" ]]; then
    echo "❌ List updates gagal — HTTP ${HTTP_STATUS}"
    cat "${LIST_FILE}"
    exit 2
fi

# Get current active and previous (active=true sorted by createdAt)
CURRENT_ID=$(node -e "
    const list = JSON.parse(require('fs').readFileSync('${LIST_FILE}','utf8')).data || [];
    const active = list.filter(u => u.isActive).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log(active[0]?.id || '');
")
PREVIOUS_ID=$(node -e "
    const list = JSON.parse(require('fs').readFileSync('${LIST_FILE}','utf8')).data || [];
    const all = list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    // Cari update yang createdAt < current active
    const active = all.find(u => u.isActive);
    if (!active) { console.log(''); process.exit(0); }
    const previous = all.find(u => !u.isActive || (new Date(u.createdAt) < new Date(active.createdAt)));
    console.log(previous?.id || '');
")

if [[ -z "${CURRENT_ID}" ]]; then
    echo "❌ Tidak ada update aktif di channel ${CHANNEL}, tidak ada yang di-rollback."
    exit 1
fi

if [[ -z "${PREVIOUS_ID}" ]]; then
    echo "❌ Tidak ada previous update untuk rollback. Channel ini hanya punya 1 update."
    exit 1
fi

echo "   Current active : ${CURRENT_ID}"
echo "   Previous       : ${PREVIOUS_ID}"
echo ""
read -p "Lanjutkan rollback? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Step 2: Deactivate current
echo ""
echo "⬇️  Step 2/3: Deactivating current ${CURRENT_ID}..."
HTTP_STATUS=$(curl -sS \
    -X PATCH \
    -H "Authorization: Bearer ${APP_UPDATE_PUBLISH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"isActive":false}' \
    -o /tmp/rollback-resp.json \
    -w "%{http_code}" \
    "${BASE_URL}/api/admin/app-update/${CURRENT_ID}")
if [[ "${HTTP_STATUS}" != "200" ]]; then
    echo "❌ Deactivate gagal — HTTP ${HTTP_STATUS}"
    cat /tmp/rollback-resp.json
    exit 3
fi

# Step 3: Activate previous (if not already active)
echo "⬆️  Step 3/3: Activating previous ${PREVIOUS_ID}..."
HTTP_STATUS=$(curl -sS \
    -X PATCH \
    -H "Authorization: Bearer ${APP_UPDATE_PUBLISH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"isActive":true}' \
    -o /tmp/rollback-resp.json \
    -w "%{http_code}" \
    "${BASE_URL}/api/admin/app-update/${PREVIOUS_ID}")
if [[ "${HTTP_STATUS}" != "200" ]]; then
    echo "❌ Activate previous gagal — HTTP ${HTTP_STATUS}"
    cat /tmp/rollback-resp.json
    exit 3
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Rollback completed"
echo "  Deactivated : ${CURRENT_ID}"
echo "  Activated   : ${PREVIOUS_ID}"
echo "  channel=${CHANNEL} platform=${PLATFORM}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
