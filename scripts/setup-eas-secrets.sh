#!/bin/bash
#
# Sync EXPO_PUBLIC_FIREBASE_* dari .env ke EAS Secrets.
# Jalankan sekali setelah eas.json dibersihkan dari hardcoded secrets.
#
# Usage: ./scripts/setup-eas-secrets.sh
#

set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ File $ENV_FILE tidak ditemukan."
    exit 1
fi

if ! command -v eas >/dev/null 2>&1; then
    echo "❌ EAS CLI belum terpasang. Jalankan: npm install -g eas-cli"
    exit 1
fi

echo "🔐 Sync Firebase secrets ke EAS Secrets dari $ENV_FILE"
echo ""

# Hanya sync key Firebase — sisanya per-variant di-set di app.config.ts
KEYS=(
    "EXPO_PUBLIC_FIREBASE_API_KEY"
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
    "EXPO_PUBLIC_FIREBASE_DATABASE_URL"
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    "EXPO_PUBLIC_FIREBASE_APP_ID"
)

for key in "${KEYS[@]}"; do
    value=$(grep -E "^${key}=" "$ENV_FILE" | cut -d'=' -f2- | sed 's/^"//;s/"$//' || true)

    if [ -z "$value" ]; then
        echo "⏭️  $key tidak ada di $ENV_FILE — skip"
        continue
    fi

    echo "📦 Set $key"
    eas secret:create --scope project --name "$key" --value "$value" --type string --force >/dev/null 2>&1 || {
        echo "   ⚠️  Gagal set $key (mungkin perlu login: eas login)"
    }
done

echo ""
echo "✅ Selesai. Verifikasi: eas secret:list"
