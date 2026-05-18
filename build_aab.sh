#!/bin/bash
#
# Build AAB production untuk upload ke Play Store.
# Output: app-release.aab signed dengan keystore production EAS.
#
# Prerequisites:
# - .env.local berisi RADPRO_RELEASE_* credentials
# - android/keystores/release.jks ter-download dari EAS
# - Java 17 + Android SDK terpasang
#
# Usage: ./build_aab.sh
#

set -euo pipefail

# Set Android SDK path
export ANDROID_HOME=$HOME/Library/Android/sdk

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   RADPRO - AAB Production Builder (Local)${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Load .env.local untuk keystore credentials
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local tidak ditemukan. Buat dengan RADPRO_RELEASE_* credentials.${NC}"
    exit 1
fi

set -a  # auto-export
# shellcheck disable=SC1091
source .env.local
set +a

# Verify keystore exists (path di .env.local relatif terhadap android/app/)
KEYSTORE_FULL_PATH="android/app/${RADPRO_RELEASE_STORE_FILE}"
KEYSTORE_RESOLVED=$(cd android/app && python3 -c "import os; print(os.path.realpath('${RADPRO_RELEASE_STORE_FILE}'))")
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

# Re-prebuild Android native config dari app.config.ts agar updates URL,
# channel, signing cert, dan google-services.json path sesuai variant aktif.
echo -e "${YELLOW}🛠  Regenerating Android native config (expo prebuild)...${NC}"
npx expo prebuild --platform android --clean --no-install
echo ""

# Ensure gradlew executable
chmod +x android/gradlew

# Stop daemon + clean stale outputs
echo -e "${YELLOW}🧹 Cleaning Gradle daemon/cache...${NC}"
(cd android && ./gradlew --stop >/dev/null 2>&1) || true
rm -rf android/app/build/generated/assets/react/release
rm -rf android/app/build/generated/sourcemaps/react/release
rm -rf android/app/build/intermediates/merged_assets/release
rm -rf android/app/build/intermediates/assets/release
rm -rf android/app/build/intermediates/sourcemaps
rm -rf android/app/build/outputs/bundle

# Build AAB
echo -e "${YELLOW}🔨 Building AAB (gradle bundleRelease)...${NC}"
echo ""
(cd android && ./gradlew :app:bundleRelease -x lint -x lintVitalRelease --no-daemon --rerun-tasks --no-build-cache)

# Copy AAB output
AAB_SOURCE="android/app/build/outputs/bundle/release/app-release.aab"
if [ ! -f "$AAB_SOURCE" ]; then
    echo -e "${RED}❌ AAB tidak ter-generate di ${AAB_SOURCE}${NC}"
    exit 1
fi

# Get version dari build.gradle
VERSION_NAME=$(grep "versionName" android/app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
VERSION_CODE=$(grep "versionCode" android/app/build.gradle | head -1 | sed 's/[^0-9]*//g')

AAB_DEST="netman_production_v${VERSION_NAME}_build${VERSION_CODE}.aab"
cp "$AAB_SOURCE" "$AAB_DEST"

AAB_SIZE=$(du -h "$AAB_DEST" | cut -f1)

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ BUILD SUCCESS!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "   Version:  ${VERSION_NAME} (build ${VERSION_CODE})"
echo -e "   AAB:      ./${AAB_DEST}"
echo -e "   Size:     ${AAB_SIZE}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}📤 Next: upload AAB ke Play Console Internal Testing track${NC}"
echo -e "${YELLOW}   https://play.google.com/console${NC}"
