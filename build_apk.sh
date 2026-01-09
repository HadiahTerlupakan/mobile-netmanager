#!/bin/bash

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
echo ""

# File paths
APP_JSON="app.json"
BUILD_GRADLE="android/app/build.gradle"

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

echo ""

# ================================================
# Step 4: Build APK
# ================================================
echo -e "${YELLOW}🔨 Starting Gradle build...${NC}"
echo -e "   Using Android SDK at: $ANDROID_HOME"
echo ""

# Ensure gradlew is executable
chmod +x android/gradlew

# Run the build
cd android && ./gradlew assembleRelease -x lint -x lintVitalRelease && cd ..

# ================================================
# Step 5: Copy APK with version in filename
# ================================================
APK_SOURCE="android/app/build/outputs/apk/release/app-release.apk"
APK_DEST="netman_v${NEW_VERSION_NAME}_build${NEW_VERSION_CODE}.apk"
APK_LATEST="netman.apk"

if [ -f "$APK_SOURCE" ]; then
    # Copy with version name
    cp "$APK_SOURCE" "$APK_DEST"
    # Also copy as latest
    cp "$APK_SOURCE" "$APK_LATEST"
    
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ BUILD SUCCESS!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo -e "   Version:  ${NEW_VERSION_NAME}"
    echo -e "   Build:    ${NEW_VERSION_CODE}"
    echo -e "   APK:      ./${APK_DEST}"
    echo -e "   Latest:   ./${APK_LATEST}"
    echo -e "${GREEN}================================================${NC}"
    
    # Show APK size
    APK_SIZE=$(du -h "$APK_DEST" | cut -f1)
    echo -e "   Size:     ${APK_SIZE}"
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
