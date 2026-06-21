# Local Android Build (`npm run android:dev`)

Panduan build lokal mobile-netmanager ke emulator/device Android. Berisi
hubungan dengan EAS, kapan harus prebuild ulang, dan troubleshooting error
yang sering muncul.

---

## TL;DR

- `app.json` adalah **single source of truth** untuk semua native config.
- Folder `android/` di-gitignore → murni hasil prebuild lokal, **tidak pernah
  sampai ke EAS**.
- Setelah ubah dependency native, plugin Expo, atau `expo-build-properties`
  (minSdk/targetSdk/compileSdk) → wajib `expo prebuild --platform android --clean`.
- EAS build punya prebuild sendiri di server → perubahan folder `android/`
  lokal tidak akan terikut.

---

## Hubungan Lokal vs EAS

| | Lokal (`npm run android:dev`) | EAS Build |
|---|---|---|
| Sumber config native | `android/` lokal hasil prebuild | `app.json` + `package.json` (EAS prebuild fresh di server) |
| Trigger prebuild | Manual: `expo prebuild` | Otomatis setiap EAS build start |
| Yang dikirim ke EAS | — | Hanya file tracked git (`/android` di `.gitignore` → diabaikan) |
| Risiko bocor antar lingkungan | ❌ Terisolasi | ❌ Terisolasi |

**Konsekuensinya:** Apa pun yang diubah di folder `android/` lokal, EAS
tidak akan tahu. Sebaliknya, perubahan di `app.json` akan otomatis terbawa
ke EAS pada build berikutnya, dan harus diturunkan ke lokal lewat prebuild.

---

## Workflow Build Lokal

### Pertama Kali Setup

```bash
npm install
npx expo prebuild --platform android --clean
npm run android:dev
```

### Build Berikutnya (Tidak Ada Perubahan Native)

```bash
npm run android:dev
```

### Setelah Update Dependency Native / Plugin / `app.json`

Wajib re-prebuild karena folder `android/` lokal harus regenerated dari
`app.json` yang baru.

```bash
npx expo prebuild --platform android --clean
npm run android:dev
```

Yang termasuk "perubahan native":

- Ganti versi `react-native`, `expo`, atau library dengan kode native
  (vision-camera, firebase, notifee, dll).
- Tambah/ubah/hapus plugin di `app.json` → `expo.plugins`.
- Ubah `expo-build-properties` (minSdk, targetSdk, compileSdk, dll).
- Tambah/ubah permission, intent filter, atau native config di `app.json`.

### Reset Total Saat Stuck

Ketika error gradle aneh & tidak masuk akal:

```bash
rm -rf android
rm -rf node_modules
npm install
npx expo prebuild --platform android --clean
npm run android:dev
```

---

## Konfigurasi Native via `app.json`

Semua override native **harus** lewat `app.json`, jangan edit langsung
folder `android/` (akan hilang saat prebuild ulang).

Contoh dari project ini (`app.json`):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 26,
            "compileSdkVersion": 35,
            "targetSdkVersion": 35
          }
        }
      ]
    ]
  }
}
```

`minSdkVersion: 26` ada karena `react-native-vision-camera-face-detector`
butuh API level 26.

---

## EAS Build

EAS tidak menyentuh folder `android/` lokal sama sekali. Workflow EAS:

1. EAS clone repo dari git remote (hanya file tracked).
2. Server EAS jalankan `expo prebuild` (default, tanpa custom command di
   `eas.json`).
3. Build APK/AAB dari hasil prebuild server.

Konfigurasi EAS ada di `eas.json` — tidak ada `prebuildCommand` custom
sehingga prebuild jalan dengan default.

**Jadi aturannya:**

- Mau apply config native ke EAS → ubah `app.json` → commit & push.
- Mau test di lokal sebelum EAS → ubah `app.json` → `expo prebuild --clean`
  → `npm run android:dev`.

### Environment Variables

Lokal dan EAS pakai sumber env yang **berbeda dan terisolasi**:

| Build | Sumber Env | Lokasi |
|---|---|---|
| Lokal (`npm run android:dev`) | `.env.local` | File lokal (di-`.gitignore`) |
| EAS Cloud | EAS Secret Env Vars | EAS server (terenkripsi) |

Cek EAS secret env vars per environment:

```bash
eas env:list --environment production
eas env:list --environment preview
eas env:list --environment development
```

Set EAS secret baru:

```bash
eas env:create --environment production
```

**Implikasinya:**

- Edit `.env.local` lokal **tidak akan** mempengaruhi build EAS.
- Tambah secret di EAS **tidak akan** muncul di `.env.local` lokal.
- Kalau update Firebase config / API key, harus update di **dua tempat**:
  `.env.local` (untuk testing lokal) dan EAS env (untuk EAS build).

---

## Troubleshooting

### `Could not find any matches for app.notifee:core:+`

**Penyebab:** Folder `android/` lokal sudah stale, repo Maven lokal Notifee
(`node_modules/@notifee/react-native/android/libs`) tidak ter-register
tepat waktu di Gradle.

**Fix:**

```bash
npx expo prebuild --platform android --clean
```

Prebuild akan regenerate `android/` dari `app.json` dengan repo Notifee
di-inject otomatis.

Kalau setelah prebuild masih error, baru perlu manual workaround di
`android/build.gradle` (akan hilang saat prebuild ulang berikutnya):

```gradle
allprojects {
  repositories {
    // ...
    maven { url "${rootDir}/../node_modules/@notifee/react-native/android/libs" }
  }
}
```

### `uses-sdk:minSdkVersion 24 cannot be smaller than version 26 declared in library [:react-native-vision-camera-face-detector]`

**Penyebab:** `app.json` punya `minSdkVersion: 26`, tapi folder `android/`
lokal di-prebuild sebelum config itu ditambahkan, jadi masih pakai 24.

**Fix:**

```bash
npx expo prebuild --platform android --clean
```

### Error native lain setelah upgrade dependency

Selalu coba clean prebuild dulu sebelum debug lebih dalam:

```bash
npx expo prebuild --platform android --clean
npm run android:dev
```

90% error native lokal selesai dengan ini.

---

## Apa yang TIDAK Boleh Dilakukan

- ❌ Edit `android/build.gradle`, `android/app/build.gradle`, atau
  `AndroidManifest.xml` langsung sebagai solusi permanen — akan hilang saat
  prebuild ulang.
- ❌ Commit folder `android/` ke git — sudah di-`.gitignore`, jangan
  di-`-f` add.
- ❌ Asumsikan EAS build akan ikut perubahan folder `android/` lokal —
  tidak akan.
- ❌ Skip `--clean` saat prebuild setelah upgrade dependency native —
  bisa meninggalkan state corrupt.

---

## Referensi

- [Expo: Continuous Native Generation (CNG)](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Expo Build Properties Plugin](https://docs.expo.dev/versions/latest/sdk/build-properties/)
- [EAS Build Reference](https://docs.expo.dev/build/introduction/)
