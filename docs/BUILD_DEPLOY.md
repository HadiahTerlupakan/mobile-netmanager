# Mobile App Build & Deploy Guide

Dokumentasi cara build APK dan deploy ke Play Store untuk project **mobile-netmanager**.

## Quick Reference

| | |
|---|---|
| Package ID | `com.netmanager.mobile` |
| Version name | `1.0.9` (di `app.json` → `expo.version`) |
| Version code | Increment tiap rilis (lihat `app.json` → `expo.android.versionCode` & `expo.extra.versionCode`) |
| Play Store URL | <https://play.google.com/store/apps/details?id=com.netmanager.mobile> |
| Signing | Remote credentials di Expo (EAS) |
| Service account | `refined-analogy-499422-f8-220fae576969.json` (root repo) |

---

## Build Local (Recommended)

Pakai `eas build --local` di mesin Anda (laptop/server) — **tidak antri EAS cloud**, gratis selalu.

### Prasyarat

- Java 17+
- Android SDK (`ANDROID_HOME` ter-set)
- Node.js 18+
- `eas` CLI ter-install (`npm install -g eas-cli`) dan sudah login (`eas login`)
- File `google-services.json` ada di root repo (sudah committed)

### Command build

```bash
cd mobile-netmanager

# Set env vars Firebase + path google-services.json
GOOGLE_SERVICES_JSON="$(pwd)/google-services.json" \
EXPO_PUBLIC_FIREBASE_API_KEY="AIzaSyBqMwLWuAurtJnVQ93CFlb5hLYSzQ57UZQ" \
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="netmanager-96742.firebaseapp.com" \
EXPO_PUBLIC_FIREBASE_PROJECT_ID="netmanager-96742" \
EXPO_PUBLIC_FIREBASE_DATABASE_URL="https://netmanager-96742-default-rtdb.asia-southeast1.firebasedatabase.app" \
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="netmanager-96742.firebasestorage.app" \
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="43187781340" \
EXPO_PUBLIC_FIREBASE_APP_ID="1:43187781340:android:903ae303566575e8e67e19" \
eas build --platform android --profile production --local --non-interactive
```

Build ~10-15 menit, hasil AAB di `build-*.aab` (root repo).

### Submit ke Play Store

```bash
eas submit --platform android --profile production --path build-*.aab --non-interactive
```

Tunggu Google review (1-3 jam). Setelah approve, APK live di Play Store.

---

## Checklist Setiap Rilis Baru

Sebelum build:

1. **Update versionCode** di `app.json`:
   - `expo.android.versionCode` (increment dari sebelumnya)
   - `expo.extra.versionCode` (sama dengan `android.versionCode`)
   - **Keduanya harus sync** — EAS `autoIncrement` update gradle, bukan app.json

2. **Commit `app.json`** ke `main`

Setelah submit ke Play Store:

3. **Update `eas-production-fingerprint.txt`** (root repo) dengan fingerprint dari build terbaru:
   ```bash
   node scripts/get-eas-fingerprint.js android > eas-production-fingerprint.txt
   ```
   File ini dipakai Jenkins OTA pipeline untuk match APK di Play Store.

4. **Update `app_releases` di DB netmanager-production**:
   ```sql
   UPDATE app_releases
   SET "versionCode" = <VC_BARU>,
       "isActive" = true,
       "updatedAt" = NOW(),
       "releasedAt" = NOW()
   WHERE id = 'b02eb13d-25b7-4c51-85d7-91a3c996f9ab';
   ```
   Connect: `ssh radpro 'sudo kubectl exec -n netmanager-production db-netmanager-0 -- psql -U netmgr -d netmanager -c "..."'`

5. **Commit `eas-production-fingerprint.txt`** ke `main`

---

## OTA Pipeline (JS only)

Perubahan JS/TS saja (tidak ada native change) cukup **push ke `main`** — Jenkins OTA otomatis:

1. `push main` → trigger `Jenkinsfile.ota`
2. `get-eas-fingerprint.js` ambil fingerprint dari EAS build terbaru (atau file `eas-production-fingerprint.txt`)
3. `publish-update.sh` publish OTA dengan fingerprint yang match APK Play Store
4. User buka app → `expo-updates` cek manifest → OTA ter-apply otomatis

**OTA tidak perlu build APK baru** — selama fingerprint native tidak berubah.

---

## Kapan Butuh Build APK Baru (bukan OTA)

| Perubahan | OTA cukup? |
|---|---|
| Fix UI, logic, text, fitur JS/TS | ✅ OTA |
| Tambah/ubah native plugin | ❌ Build APK |
| Ubah `app.config.ts` native fields | ❌ Build APK |
| Tambah native dependency di `package.json` | ❌ Build APK |
| Ganti icon/splash (native) | ❌ Build APK |
| Ubah `google-services.json` | ❌ Build APK |

---

## Troubleshooting

### App crash: "Firebase mobile config is incomplete"

**Sebab**: Build tanpa env `EXPO_PUBLIC_FIREBASE_*` → `getMobileFirebaseApp()` throw.

**Fix**: Pakai command build local di atas (semua env Firebase di-set). Juga ada fallback hardcode di `src/services/firebaseApp.ts`.

### OTA tidak masuk ke device

Cek:
1. Manifest endpoint return 200 untuk fingerprint APK: `curl -H "expo-runtime-version: <fingerprint>" .../manifest`
2. OTA row aktif di DB: `SELECT * FROM app_updates WHERE isActive=true AND runtimeVersion='<fingerprint>'`
3. Fingerprint APK Play Store ada di `eas-production-fingerprint.txt`
4. User force quit + buka app (OTA apply saat app launch)

### Profil tampil "Build 2" padahal APK sudah VC 40

**Sebab**: `src/constants/appVersion.ts` baca `extra.versionCode` (lama) bukan native APK.

**Fix sudah ada**: baca `Constants.platform.android.versionCode` (native) dulu, fallback ke config.

### EAS cloud build antri lama

Pakai `eas build --local` (lihat command di atas). Tidak antri, gratis.

---

## File Penting

| File | Fungsi |
|---|---|
| `app.json` | Config Expo, versionCode, Firebase build-time |
| `app.config.ts` | Variant config (dev/staging/production), inject google-services.json |
| `google-services.json` | Firebase Android config (committed, tidak di .gitignore) |
| `refined-analogy-*.json` | Play Console service account key (committed) |
| `eas.json` | EAS build profiles |
| `eas-production-fingerprint.txt` | Fingerprint APK live di Play Store (untuk OTA match) |
| `scripts/get-eas-fingerprint.js` | Ambil fingerprint EAS build terbaru |
| `scripts/publish-update.sh` | Publish OTA ke server netmanager |
| `scripts/apk-versioning.js` | Bump versionCode di app.json + build.gradle |
| `src/services/firebaseApp.ts` | Firebase init + fallback hardcode config |
| `src/constants/appVersion.ts` | Resolve versionCode dari native APK |

---

*Last updated: 2026-07-17*
*Build process: `eas build --local` (recommended, no EAS cloud queue)*