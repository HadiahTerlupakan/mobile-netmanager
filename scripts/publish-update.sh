#!/bin/bash
# ================================================
# Publish OTA Update ke server netmanager
# ================================================
# Workflow:
#   1. Compute runtimeVersion via @expo/fingerprint (match APK Play Store)
#   2. Run `expo export --platform android` → bundle + assets di dist/
#   3. Generate manifest JSON dari dist/metadata.json
#   4. Multipart POST ke /api/admin/app-update/publish dengan Bearer token
# ================================================
#
# Usage:
#   ./scripts/publish-update.sh staging "Fix typo X"
#   ./scripts/publish-update.sh production "Bugfix login screen"
#
# Env required:
#   APP_UPDATE_PUBLISH_TOKEN  (Bearer token, sama dengan ENV server)
#
# Env optional:
#   RUNTIME_VERSION_OVERRIDE  (skip fingerprint, pakai value ini — testing only)
#
# Exit codes:
#   0  success
#   1  validation error (channel, missing tools, etc)
#   2  expo export gagal
#   3  manifest build gagal
#   4  publish gagal
# ================================================

set -euo pipefail

CHANNEL="${1:-}"
RELEASE_NOTES="${2:-}"
PLATFORM="${PLATFORM:-android}"

if [[ "$CHANNEL" != "staging" && "$CHANNEL" != "production" ]]; then
    echo "❌ Channel harus 'staging' atau 'production'."
    echo "Usage: $0 <staging|production> [release-notes]"
    exit 1
fi

if [[ -z "${APP_UPDATE_PUBLISH_TOKEN:-}" ]]; then
    echo "❌ ENV APP_UPDATE_PUBLISH_TOKEN belum di-set."
    exit 1
fi

case "$CHANNEL" in
    staging)
        BASE_URL="${OTA_BASE_URL_STAGING:-https://staging.radpro.id}"
        EXPO_VARIANT="staging"
        ;;
    production)
        BASE_URL="${OTA_BASE_URL_PRODUCTION:-https://radpro.id}"
        EXPO_VARIANT="production"
        ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OTA Publish — channel=${CHANNEL} platform=${PLATFORM}"
echo "  Target: ${BASE_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DIST_DIR="${DIST_DIR:-./dist}"

# Step 0: Compute runtimeVersion via fingerprint policy
# app.json pakai runtimeVersion.policy = "fingerprint". APK di Play Store
# kirim hash fingerprint (bukan semver) ke manifest endpoint. Publish
# harus pakai hash yang sama, kalau tidak OTA return 204 (no update).
echo ""
echo "🔐 Step 0/4: Computing runtimeVersion (fingerprint)..."
if [[ -n "${RUNTIME_VERSION_OVERRIDE:-}" ]]; then
    RUNTIME_VERSION="${RUNTIME_VERSION_OVERRIDE}"
    echo "   (override) runtimeVersion: ${RUNTIME_VERSION}"
else
    RUNTIME_VERSION=$(node ./scripts/compute-fingerprint.js . "${PLATFORM}") \
        || { echo "❌ Gagal compute fingerprint. Pastikan @expo/fingerprint terinstall (npm ci)."; exit 1; }
    if [[ -z "${RUNTIME_VERSION}" || "${#RUNTIME_VERSION}" -lt 16 ]]; then
        echo "❌ Fingerprint hash invalid: '${RUNTIME_VERSION}'"
        exit 1
    fi
    echo "   runtimeVersion (fingerprint): ${RUNTIME_VERSION}"
fi
# Export agar stage Verify Manifest di Jenkinsfile bisa pakai
export RUNTIME_VERSION

# Step 1: Clean & export bundle
echo ""
echo "📦 Step 1/4: Building bundle (expo export)..."
rm -rf "${DIST_DIR}"
EXPO_PUBLIC_APP_VARIANT="${EXPO_VARIANT}" \
    npx expo export --platform "${PLATFORM}" --output-dir "${DIST_DIR}" \
    || { echo "❌ expo export gagal"; exit 2; }

if [[ ! -f "${DIST_DIR}/metadata.json" ]]; then
    echo "❌ ${DIST_DIR}/metadata.json tidak ditemukan setelah expo export"
    exit 2
fi

# Step 2: Build manifest
echo ""
echo "📝 Step 2/4: Building manifest JSON..."
echo "   runtimeVersion: ${RUNTIME_VERSION}"

MANIFEST_FILE=$(mktemp -t ota-manifest.XXXXXX.json)
trap "rm -f '${MANIFEST_FILE}'" EXIT

NOTES_ARG=""
if [[ -n "${RELEASE_NOTES}" ]]; then
    NOTES_ARG="--release-notes=${RELEASE_NOTES}"
fi

node ./scripts/build-update-manifest.js \
    --dist="${DIST_DIR}" \
    --platform="${PLATFORM}" \
    --runtime-version="${RUNTIME_VERSION}" \
    ${NOTES_ARG} > "${MANIFEST_FILE}" \
    || { echo "❌ build-update-manifest gagal"; exit 3; }

BUNDLE_REL=$(node -p "require('${DIST_DIR}/metadata.json').fileMetadata['${PLATFORM}'].bundle")
BUNDLE_PATH="${DIST_DIR}/${BUNDLE_REL}"

if [[ ! -f "${BUNDLE_PATH}" ]]; then
    echo "❌ Bundle file tidak ditemukan: ${BUNDLE_PATH}"
    exit 3
fi

# Build curl args untuk multipart upload (semua asset)
CURL_FORM_ARGS=(
    -F "channel=${CHANNEL}"
    -F "platform=${PLATFORM}"
    -F "runtimeVersion=${RUNTIME_VERSION}"
    -F "manifest=$(cat ${MANIFEST_FILE})"
    -F "bundle=@${BUNDLE_PATH}"
)
if [[ -n "${RELEASE_NOTES}" ]]; then
    CURL_FORM_ARGS+=(-F "releaseNotes=${RELEASE_NOTES}")
fi

# Iterate asset files dari metadata (urutan harus match manifest.assets)
ASSETS_JSON=$(node -p "JSON.stringify(require('${DIST_DIR}/metadata.json').fileMetadata['${PLATFORM}'].assets || [])")
ASSET_COUNT=$(echo "${ASSETS_JSON}" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).length")

if [[ "${ASSET_COUNT}" -gt 0 ]]; then
    while read -r ASSET_PATH; do
        ABS_PATH="${DIST_DIR}/${ASSET_PATH}"
        if [[ ! -f "${ABS_PATH}" ]]; then
            echo "❌ Asset file tidak ditemukan: ${ABS_PATH}"
            exit 3
        fi
        CURL_FORM_ARGS+=(-F "assets=@${ABS_PATH}")
    done < <(echo "${ASSETS_JSON}" | node -e "
        const arr = JSON.parse(require('fs').readFileSync(0,'utf8'));
        arr.forEach(a => console.log(a.path));
    ")
    echo "   assets: ${ASSET_COUNT} file(s)"
fi

# Step 3/4: Publish
echo ""
echo "🚀 Step 3/4: Uploading to ${BASE_URL}/api/admin/app-update/publish..."
RESPONSE_FILE=$(mktemp -t ota-response.XXXXXX.json)
HTTP_STATUS=$(curl -sS \
    -X POST \
    -H "Authorization: Bearer ${APP_UPDATE_PUBLISH_TOKEN}" \
    -o "${RESPONSE_FILE}" \
    -w "%{http_code}" \
    "${CURL_FORM_ARGS[@]}" \
    "${BASE_URL}/api/admin/app-update/publish")

if [[ "${HTTP_STATUS}" != "201" && "${HTTP_STATUS}" != "200" ]]; then
    echo "❌ Publish gagal — HTTP ${HTTP_STATUS}"
    cat "${RESPONSE_FILE}" || true
    rm -f "${RESPONSE_FILE}"
    exit 4
fi

UPDATE_ID=$(node -p "JSON.parse(require('fs').readFileSync('${RESPONSE_FILE}','utf8')).data?.id || 'unknown'")
rm -f "${RESPONSE_FILE}"

# Step 4/4: Print fingerprint untuk dipakai Jenkinsfile Verify Manifest
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ OTA published successfully"
echo "  channel=${CHANNEL} runtimeVersion=${RUNTIME_VERSION}"
echo "  update_id=${UPDATE_ID}"
echo "  FINGERPRINT_RUNTIME_VERSION=${RUNTIME_VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
