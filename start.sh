#!/bin/bash

# Script untuk menjalankan Expo dengan tampilan terminal yang rapi
# dan QR code yang terbaca dengan baik

echo "🚀 Starting Mobile NetManager Expo Development Server..."
echo "========================================================"

# Set environment variables untuk tampilan terminal yang lebih baik
export EXPO_DEBUG=false
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
export TERM=xterm-256color

# Bersihkan cache Metro
echo "🧹 Clearing Metro cache..."
rm -rf node_modules/.cache
npx expo start --clear

echo ""
echo "✅ Expo server stopped"
