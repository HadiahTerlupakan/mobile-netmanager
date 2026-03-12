#!/bin/bash

set -euo pipefail

# ================================================
# Build APK dengan Auto-Versioning
# ================================================
# Script ini otomatis menaikkan versionCode setiap build
# sehingga APK baru dapat meng-update yang sudah terinstall
# ================================================

# Set Android Home
export ANDROID_HOME=$HOME/Library/Android/sdk

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   SBL KARYAWAN - APK Builder with Auto-Version${NC}"
echo -e "${BLUE}================================================${NC}"

# Environment configuration
# Provide variant from argument, default to production
ENV=${1:-production}

if [[ "$ENV" != "development" && "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment. Use: development, staging, or production${NC}"
    exit 1
fi

echo -e "${BLUE}   Environment: $ENV${NC}"
echo ""

# Set variant as an environment variable (used by Config.ts)
export EXPO_PUBLIC_APP_VARIANT=$ENV

# File paths
APP_JSON="app.json"
BUILD_GRADLE="android/app/build.gradle"

# Rollback state
CURRENT_VERSION_CODE=""
CURRENT_VERSION_NAME=""
NEW_VERSION_CODE=""
NEW_VERSION_NAME=""
ROLLBACK_REQUIRED=false

rollback_versions() {
    if [ "$ROLLBACK_REQUIRED" != "true" ]; then
        return
    fi

    echo ""
    echo -e "${YELLOW}🔄 Error detected. Rolling back version changes...${NC}"

    if [ -n "$CURRENT_VERSION_CODE" ] && [ -n "$NEW_VERSION_CODE" ] && [ -f "$BUILD_GRADLE" ]; then
        sed -i '' "s/versionCode ${NEW_VERSION_CODE}/versionCode ${CURRENT_VERSION_CODE}/" "$BUILD_GRADLE" || true
    fi

    if [ -n "$CURRENT_VERSION_NAME" ] && [ -n "$NEW_VERSION_NAME" ] && [ -f "$BUILD_GRADLE" ]; then
        sed -i '' "s/versionName \"${NEW_VERSION_NAME}\"/versionName \"${CURRENT_VERSION_NAME}\"/" "$BUILD_GRADLE" || true
    fi

    if [ -n "$CURRENT_VERSION_NAME" ] && [ -f "$APP_JSON" ]; then
        node -e "
        const fs = require('fs');
        const appJson = JSON.parse(fs.readFileSync('${APP_JSON}', 'utf8'));
        appJson.expo.version = '${CURRENT_VERSION_NAME}';
        fs.writeFileSync('${APP_JSON}', JSON.stringify(appJson, null, 2) + '\n');
        " || true
    fi

    echo -e "${GREEN}✓ Version rolled back to ${CURRENT_VERSION_NAME:-unknown}${NC}"
}

trap rollback_versions ERR

# ================================================
# Step 1: Auto-increment versionCode di build.gradle
# ================================================
echo -e "${YELLOW}📦 Checking current version...${NC}"

# Get current versionCode from build.gradle
CURRENT_VERSION_CODE=$(grep "versionCode" $BUILD_GRADLE | head -1 | sed 's/[^0-9]*//g')
CURRENT_VERSION_NAME=$(grep "versionName" $BUILD_GRADLE | head -1 | sed 's/.*"\(.*\)".*/\1/')

if [ -z "$CURRENT_VERSION_CODE" ]; then
    echo -e "${RED}❌ Could not find versionCode in build.gradle${NC}"
    exit 1
fi

# Increment versionCode
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

# Auto-increment patch version (1.0.0 -> 1.0.1)
if [ -n "$CURRENT_VERSION_NAME" ]; then
    # Split version name by dots
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION_NAME"
    MAJOR=${VERSION_PARTS[0]:-1}
    MINOR=${VERSION_PARTS[1]:-0}
    PATCH=${VERSION_PARTS[2]:-0}
    
    # Increment patch version
    NEW_PATCH=$((PATCH + 1))
    NEW_MINOR=$MINOR
    NEW_MAJOR=$MAJOR

    # Jika patch mencapai 100, reset ke 0 dan naikkan minor (1.0.99 -> 1.1.0)
    if [ "$NEW_PATCH" -ge 100 ]; then
        NEW_PATCH=0
        NEW_MINOR=$((MINOR + 1))
    fi

    NEW_VERSION_NAME="${NEW_MAJOR}.${NEW_MINOR}.${NEW_PATCH}"
else
    NEW_VERSION_NAME="1.0.${NEW_VERSION_CODE}"
fi

echo -e "   Current: v${CURRENT_VERSION_NAME} (build ${CURRENT_VERSION_CODE})"
echo -e "   New:     v${NEW_VERSION_NAME} (build ${NEW_VERSION_CODE})"
echo ""

# ================================================
# Step 2: Update build.gradle
# ================================================
echo -e "${YELLOW}🔄 Updating version in build.gradle...${NC}"

# Update versionCode
sed -i '' "s/versionCode ${CURRENT_VERSION_CODE}/versionCode ${NEW_VERSION_CODE}/" $BUILD_GRADLE

# Update versionName
sed -i '' "s/versionName \"${CURRENT_VERSION_NAME}\"/versionName \"${NEW_VERSION_NAME}\"/" $BUILD_GRADLE

echo -e "${GREEN}✓ build.gradle updated${NC}"

# ================================================
# Step 3: Update app.json (for Expo compatibility)
# ================================================
echo -e "${YELLOW}🔄 Updating version in app.json...${NC}"

# Use node to update app.json properly (handles JSON formatting)
node -e "
const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('${APP_JSON}', 'utf8'));
appJson.expo.version = '${NEW_VERSION_NAME}';
if (!appJson.expo.extra) appJson.expo.extra = {};
appJson.expo.extra.versionCode = ${NEW_VERSION_CODE};
fs.writeFileSync('${APP_JSON}', JSON.stringify(appJson, null, 2) + '\n');
console.log('✓ app.json updated');
"

ROLLBACK_REQUIRED=true

echo ""

# ================================================
# Step 4: Build APK
# ================================================
echo -e "${YELLOW}🔨 Starting Gradle build...${NC}"
echo -e "   Using Android SDK at: $ANDROID_HOME"
echo -e "   EXPO_PUBLIC_APP_VARIANT: $EXPO_PUBLIC_APP_VARIANT"
echo ""

# Ensure gradlew is executable
chmod +x android/gradlew

# Stop daemon + clean to avoid stale env cache across staging/production builds
echo -e "${YELLOW}🧹 Cleaning Gradle daemon/cache...${NC}"
(cd android && ./gradlew --stop >/dev/null 2>&1) || true

# Clean JS bundle/sourcemap outputs only (avoid full `gradlew clean` CMake/codegen issues)
rm -rf android/app/build/generated/assets/react/release
rm -rf android/app/build/generated/sourcemaps/react/release
rm -rf android/app/build/intermediates/merged_assets/release
rm -rf android/app/build/intermediates/assets/release
rm -rf android/app/build/intermediates/sourcemaps

# Run the build (force rerun tasks so JS bundle uses current variant)
(cd android && ./gradlew assembleRelease -x lint -x lintVitalRelease --no-daemon --rerun-tasks --no-build-cache)

# ================================================
# Step 5: Copy APK output (supports split-per-ABI APK)
# ================================================
APK_RELEASE_DIR="android/app/build/outputs/apk/release"
SPLIT_APKS=("$APK_RELEASE_DIR"/app-*-release.apk)
UNIVERSAL_APK="$APK_RELEASE_DIR/app-release.apk"

if [ -f "${SPLIT_APKS[0]}" ]; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ BUILD SUCCESS (Split APK per ABI)!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo -e "   Version:  ${NEW_VERSION_NAME}"
    echo -e "   Build:    ${NEW_VERSION_CODE}"
    echo -e "${GREEN}================================================${NC}"

    echo -e "${YELLOW}📦 Generated APK files:${NC}"
    for APK_SOURCE in "${SPLIT_APKS[@]}"; do
        [ -f "$APK_SOURCE" ] || continue

        APK_FILE=$(basename "$APK_SOURCE")
        ABI=$(echo "$APK_FILE" | sed -E 's/app-([^-]+)-release\.apk/\1/')
        APK_DEST="netman_${ENV}_${ABI}_v${NEW_VERSION_NAME}_build${NEW_VERSION_CODE}.apk"
        APK_LATEST="netman_${ENV}_${ABI}.apk"

        cp "$APK_SOURCE" "$APK_DEST"
        cp "$APK_SOURCE" "$APK_LATEST"

        APK_SIZE=$(du -h "$APK_DEST" | cut -f1)
        echo -e "   - ${ABI}: ./${APK_DEST} (${APK_SIZE})"
    done
    ROLLBACK_REQUIRED=false
elif [ -f "$UNIVERSAL_APK" ]; then
    APK_DEST="netman_${ENV}_v${NEW_VERSION_NAME}_build${NEW_VERSION_CODE}.apk"
    APK_LATEST="netman_${ENV}.apk"

    cp "$UNIVERSAL_APK" "$APK_DEST"
    cp "$UNIVERSAL_APK" "$APK_LATEST"

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ BUILD SUCCESS (Universal APK)!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo -e "   Version:  ${NEW_VERSION_NAME}"
    echo -e "   Build:    ${NEW_VERSION_CODE}"
    echo -e "   APK:      ./${APK_DEST}"
    echo -e "   Latest:   ./${APK_LATEST}"
    echo -e "${GREEN}================================================${NC}"

    APK_SIZE=$(du -h "$APK_DEST" | cut -f1)
    echo -e "   Size:     ${APK_SIZE}"
    ROLLBACK_REQUIRED=false
else
    echo ""
    echo -e "${RED}❌ Build Failed! APK not found.${NC}"
    
    # Rollback version changes
    echo -e "${YELLOW}🔄 Rolling back version changes...${NC}"
    sed -i '' "s/versionCode ${NEW_VERSION_CODE}/versionCode ${CURRENT_VERSION_CODE}/" $BUILD_GRADLE
    sed -i '' "s/versionName \"${NEW_VERSION_NAME}\"/versionName \"${CURRENT_VERSION_NAME}\"/" $BUILD_GRADLE
    
    node -e "
    const fs = require('fs');
    const appJson = JSON.parse(fs.readFileSync('${APP_JSON}', 'utf8'));
    appJson.expo.version = '${CURRENT_VERSION_NAME}';
    fs.writeFileSync('${APP_JSON}', JSON.stringify(appJson, null, 2) + '\n');
    "
    
    echo -e "${GREEN}✓ Version rolled back to ${CURRENT_VERSION_NAME}${NC}"
    exit 1
fi
