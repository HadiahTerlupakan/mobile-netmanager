#!/bin/bash
#
# Build APK production lokal untuk sideload sementara.
# APK signed dengan keystore production (sama dengan AAB Play Store).
#
# Use case: distribusi sementara via WhatsApp/email sebelum Play Store rilis
# ke Production track. Tester install langsung tanpa Play Store.
#
# Output: app-release.apk universal (semua ABI dalam 1 file ~210MB).
#
# CATATAN PENTING untuk user:
# - APK ini di-sign dengan keystore production. Saat app available di Play
#   Store production nanti, user yang install dari APK ini perlu UNINSTALL
#   dulu sebelum install dari Play Store (data login akan hilang, login ulang).
# - Kalau hanya butuh test fitur cepat, lebih baik lewat Internal testing
#   track Play Store (lebih clean, tidak ada conflict signature).
#
# Usage: ./build_apk_prod.sh
#

set -euo pipefail

export ANDROID_HOME=$HOME/Library/Android/sdk

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   RADPRO - APK Production Builder (Local)${NC}"
echo -e "${BLUE}   ⚠ Untuk distribusi sementara saja${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Load .env.local untuk keystore credentials
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local tidak ditemukan. Buat dengan RADPRO_RELEASE_* credentials.${NC}"
    exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

# Verify keystore exists
KEYSTORE_RESOLVED=$(python3 -c "import os; print(os.path.realpath('.keystore/release.jks'))")
if [ ! -f "$KEYSTORE_RESOLVED" ]; then
    echo -e "${RED}❌ Keystore tidak ditemukan: ${KEYSTORE_RESOLVED}${NC}"
    echo -e "${YELLOW}   Download dari EAS dashboard: https://expo.dev/accounts/rohadimrajas-organization/projects/netmanager/credentials${NC}"
    exit 1
fi

# Force production variant
export EXPO_PUBLIC_APP_VARIANT=production
echo -e "${BLUE}   Variant:  production${NC}"
echo -e "${BLUE}   Keystore: ${KEYSTORE_RESOLVED}${NC}"
echo -e "${BLUE}   Key alias: ${RADPRO_RELEASE_KEY_ALIAS}${NC}"
echo ""

# Re-prebuild Android native config
echo -e "${YELLOW}🛠  Regenerating Android native config (expo prebuild)...${NC}"
npx expo prebuild --platform android --clean --no-install
echo ""

chmod +x android/gradlew

echo -e "${YELLOW}🧹 Cleaning Gradle daemon/cache...${NC}"
(cd android && ./gradlew --stop >/dev/null 2>&1) || true
rm -rf android/app/build/generated/assets/react/release
rm -rf android/app/build/generated/sourcemaps/react/release
rm -rf android/app/build/intermediates/merged_assets/release
rm -rf android/app/build/intermediates/assets/release
rm -rf android/app/build/intermediates/sourcemaps
rm -rf android/app/build/outputs/apk

# Build APK (assembleRelease, bukan bundleRelease)
echo -e "${YELLOW}🔨 Building APK (gradle assembleRelease)...${NC}"
echo ""
(cd android && ./gradlew :app:assembleRelease -x lint -x lintVitalRelease --no-daemon --rerun-tasks --no-build-cache)

# Copy APK output
APK_RELEASE_DIR="android/app/build/outputs/apk/release"
SPLIT_APKS=("$APK_RELEASE_DIR"/app-*-release.apk)
UNIVERSAL_APK="$APK_RELEASE_DIR/app-release.apk"

VERSION_NAME=$(grep "versionName" android/app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
VERSION_CODE=$(grep "versionCode" android/app/build.gradle | head -1 | sed 's/[^0-9]*//g')

if [ -f "${SPLIT_APKS[0]}" ] && [ ! -f "$UNIVERSAL_APK" ]; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ BUILD SUCCESS (Split APK per ABI)${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo -e "   Version:  ${VERSION_NAME} (build ${VERSION_CODE})"
    echo -e "${GREEN}================================================${NC}"
    echo -e "${YELLOW}📦 Generated APK files:${NC}"

    for APK_SOURCE in "${SPLIT_APKS[@]}"; do
        [ -f "$APK_SOURCE" ] || continue
        APK_FILE=$(basename "$APK_SOURCE")
        ABI=$(echo "$APK_FILE" | sed -E 's/app-([^-]+)-release\.apk/\1/')
        APK_DEST="netman_production_${ABI}_v${VERSION_NAME}_build${VERSION_CODE}.apk"

        cp "$APK_SOURCE" "$APK_DEST"
        APK_SIZE=$(du -h "$APK_DEST" | cut -f1)
        echo -e "   - ${ABI}: ./${APK_DEST} (${APK_SIZE})"
    done
elif [ -f "$UNIVERSAL_APK" ]; then
    APK_DEST="netman_production_v${VERSION_NAME}_build${VERSION_CODE}.apk"
    cp "$UNIVERSAL_APK" "$APK_DEST"

    APK_SIZE=$(du -h "$APK_DEST" | cut -f1)

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ BUILD SUCCESS (Universal APK)${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo -e "   Version:  ${VERSION_NAME} (build ${VERSION_CODE})"
    echo -e "   APK:      ./${APK_DEST}"
    echo -e "   Size:     ${APK_SIZE}"
    echo -e "${GREEN}================================================${NC}"
else
    echo -e "${RED}❌ APK tidak ter-generate${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📤 Distribusi APK:${NC}"
echo -e "   - Kirim file APK via WhatsApp/Email/Drive"
echo -e "   - User aktifkan 'Install dari sumber tidak dikenal' di Settings"
echo -e "   - Tap APK → Install"
echo ""
echo -e "${YELLOW}⚠ Reminder untuk tester:${NC}"
echo -e "   Saat app available di Play Store production nanti, uninstall APK"
echo -e "   ini dulu sebelum install dari Play Store (signature compatibility)."
