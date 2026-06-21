# Upgrade & Deploy ke Google Play Store (EAS Build + Submit)

Panduan langkah-demi-langkah untuk merilis **versi upgrade** aplikasi RADPRO
ke Google Play Store memakai EAS Build + EAS Submit. Ditulis berdasarkan proses
rilis nyata `1.0.8 (versionCode 22)` pada 2026-06-18.

---

## TL;DR (Perintah Sekali Jalan)

Dari root project (`mobile-netmanager/`):

```bash
npx eas build --platform android \
  --profile production \
  --auto-submit-with-profile production \
  --non-interactive --wait
```

Satu perintah ini melakukan **dua hal** sekaligus:

1. **Build** AAB production di server EAS (versionCode auto-increment).
2. **Submit** otomatis AAB ke Google Play `production` track setelah build selesai.

Itu saja untuk kasus normal. Sisanya di dokumen ini menjelaskan **kenapa**,
**prasyarat**, **cara verifikasi**, dan **troubleshooting**.

---

## Konsep Penting: Kenapa Upgrade "Berhasil"

Google Play menolak upload kalau `versionCode` tidak lebih besar dari rilis
sebelumnya. Project ini sudah dikonfigurasi supaya itu **otomatis**:

`eas.json` → profile `production`:

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "production": { "autoIncrement": true }
  }
}
```

- `appVersionSource: "remote"` → sumber kebenaran `versionCode` ada di server
  EAS, **bukan** di `app.json`. Field `extra.versionCode` di `app.json`
  diabaikan untuk keperluan build production.
- `autoIncrement: true` → setiap build production, EAS menaikkan `versionCode`
  remote `+1` secara otomatis (mis. `21 → 22`).

**Konsekuensi:** Kamu **tidak perlu** mengedit `versionCode` manual. Cukup
jalankan build, EAS yang urus.

### Version Name vs Version Code

| | Apa | Diatur di | Naik otomatis? |
|---|---|---|---|
| **Version code** | Angka internal Play (`22`) | Remote EAS (`appVersionSource: remote`) | ✅ Ya (`autoIncrement`) |
| **Version name** | Yang dilihat user (`1.0.8`) | `app.json` → `expo.version` | ❌ Tidak — manual |

- **Rilis bugfix/patch tanpa fitur baru** → biarkan version name tetap, hanya
  versionCode yang naik. Cukup jalankan perintah TL;DR.
- **Rilis fitur baru / rilis publik** → bump version name dulu di `app.json`
  (`"version": "1.0.8"` → `"1.0.9"`), baru jalankan build.

---

## Prasyarat (Cek Sekali, Jarang Berubah)

Semua ini **sudah ter-setup** untuk project ini. Verifikasi kalau ragu atau
pindah mesin.

### 1. Login EAS

```bash
npx eas whoami
```

Harus menampilkan akun `rohadimraja` dengan akses ke organisasi
`rohadimrajas-organization`. Kalau belum login:

```bash
npx eas login
```

### 2. Service Account Key Google Play

File JSON service account ada di root & dirujuk `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./refined-analogy-499422-f8-220fae576969.json",
      "track": "production",
      "releaseStatus": "completed"
    }
  }
}
```

Cek file ada:

```bash
test -f ./refined-analogy-499422-f8-220fae576969.json && echo OK || echo MISSING
```

> ⚠️ File ini berisi kredensial Play Console. Jangan commit ke git publik,
> jangan share. Pastikan masuk `.gitignore`.

Arti `eas.json` submit config:
- `track: "production"` → rilis ke production track (semua user). Untuk uji
  bertahap pakai `internal`, `alpha`, atau `beta`.
- `releaseStatus: "completed"` → langsung dirilis penuh (bukan draft).
  Ganti ke `"draft"` kalau mau review manual dulu di Play Console sebelum
  publish.

### 3. Environment Variables Production di EAS

Build cloud **tidak** memakai `.env.local`. Semua secret (Firebase,
`GOOGLE_SERVICES_JSON`) harus ada di EAS environment `production`:

```bash
npx eas env:list production
```

Harus muncul minimal:
`GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICES_INFO_PLIST`, dan semua
`EXPO_PUBLIC_FIREBASE_*`.

> **Catatan warning yang AMAN diabaikan:** Saat build muncul pesan
> `File specified via "android.googleServicesFile" ... is not checked in to
> your repository and won't be uploaded`. Ini **bukan error**. Builder
> memakai `GOOGLE_SERVICES_JSON` dari EAS env (secret), bukan file lokal.
> Selama `eas env:list production` menampilkan `GOOGLE_SERVICES_JSON`, Firebase
> tetap aktif di build.

---

## Langkah Rilis Upgrade (Detail)

### Langkah 0 — (Opsional) Bump Version Name

Hanya jika rilis fitur/publik. Edit `app.json`:

```json
{ "expo": { "version": "1.0.9" } }
```

Untuk patch internal, lewati langkah ini.

### Langkah 1 — Cek versionCode Remote Saat Ini

Supaya tahu build berikutnya akan jadi berapa:

```bash
npx eas build:version:get --platform android
```

Contoh output: `Android versionCode - 21` → build berikutnya akan jadi `22`.

### Langkah 2 — Jalankan Build + Auto-Submit

```bash
npx eas build --platform android \
  --profile production \
  --auto-submit-with-profile production \
  --non-interactive --wait
```

Flag:
- `--profile production` → pakai profile build `production` di `eas.json`.
- `--auto-submit-with-profile production` → setelah build `FINISHED`, langsung
  submit pakai profile submit `production`.
- `--non-interactive` → tanpa prompt (aman untuk dijalankan sekali jalan).
- `--wait` → tunggu sampai selesai (tampilkan progress). Build EAS biasanya
  **±3–4 jam** di antrian + build. Boleh hilangkan `--wait` kalau tidak mau
  menunggu di terminal (build tetap jalan di cloud).

Output kunci yang menandakan sukses:

```
✔ Incremented versionCode from 21 to 22.
✔ Build finished
✔ Submitted your app to Google Play Store!
All done!
```

### Langkah 3 — Verifikasi

Cek status build final:

```bash
npx eas build:list --platform android --limit 1
```

Pastikan `Status: finished`, `Version code` sesuai (mis. `22`).

Lalu konfirmasi di **Google Play Console** → aplikasi → **Release > Production**
→ rilis baru muncul dengan versionCode yang benar. Play masih butuh waktu
**processing/review Google** sebelum update sampai ke perangkat user.

---

## Kalau Build & Submit Ingin Dipisah

Misal build dulu, submit menyusul (atau submit build lama):

```bash
# Build saja
npx eas build --platform android --profile production --non-interactive

# Submit build terakhir yang sudah jadi
npx eas submit --platform android --latest --non-interactive

# atau submit build ID tertentu
npx eas submit --platform android --id <BUILD_ID> --non-interactive
```

`eas submit` tanpa `--profile` memakai profile `production` di `eas.json`
secara default.

---

## Tabel Track Rilis (Pilih Sesuai Kebutuhan)

Ubah `submit.production.android.track` di `eas.json`:

| Track | Untuk | Audiens |
|---|---|---|
| `internal` | Tes cepat tim internal | Tester terdaftar (sampai 100) |
| `alpha` | Closed testing | Grup tester tertutup |
| `beta` | Open/closed testing | Tester beta |
| `production` | Rilis publik | Semua user ✅ (default project ini) |

Untuk rilis bertahap (staged rollout), atur persentase rollout dari Play
Console setelah submit, atau pakai field `rollout` di submit profile.

---

## Troubleshooting

### `Version code X has already been used`
versionCode bentrok dengan yang sudah ada di Play. Seharusnya tidak terjadi
karena `autoIncrement`. Kalau muncul, cek nilai remote:

```bash
npx eas build:version:get --platform android
# bila perlu set manual ke angka lebih tinggi:
npx eas build:version:set --platform android
```

### Submit gagal: `The service account ... does not have permission`
Service account belum di-grant akses di Play Console. Buka Play Console >
Users & permissions > undang email service account
(`eas-submit@refined-analogy-499422-f8.iam.gserviceaccount.com`) dengan izin
rilis ke track terkait.

### Submit gagal: `Changes cannot be sent for review automatically`
Biasanya rilis pertama sebuah app/track harus dirilis manual sekali lewat
Play Console. Setelah itu auto-submit jalan normal.

### Build `ERRORED`
Buka link logs build (muncul di output, format
`https://expo.dev/accounts/rohadimrajas-organization/projects/netmanager/builds/<id>`),
baca tahap yang gagal. Error native umumnya soal dependency/Gradle — lihat
`docs/guides/local-android-build.md` untuk reproduksi & fix lokal sebelum
build EAS ulang.

### Firebase tidak jalan di build
Pastikan `GOOGLE_SERVICES_JSON` ada di EAS env production
(`npx eas env:list production`). Warning soal `googleServicesFile` di log
build adalah normal dan bukan penyebabnya.

---

## Checklist Cepat Sebelum Rilis

- [ ] `npx eas whoami` → login benar
- [ ] Service account key ada di root (`test -f ./refined-*.json`)
- [ ] `npx eas env:list production` → `GOOGLE_SERVICES_JSON` + Firebase ada
- [ ] (Jika fitur baru) bump `expo.version` di `app.json`
- [ ] Jalankan perintah build + auto-submit (lihat TL;DR)
- [ ] Tunggu `✔ Submitted your app to Google Play Store!`
- [ ] Verifikasi versionCode naik di `eas build:list`
- [ ] Cek rilis muncul di Play Console > Production

---

## Referensi

- [EAS Submit — Android](https://docs.expo.dev/submit/android/)
- [EAS Submit — Konfigurasi `eas.json`](https://docs.expo.dev/submit/eas-json/)
- [EAS Build — App versions (auto increment)](https://docs.expo.dev/build-reference/app-versions/)
- [EAS CLI Reference](https://docs.expo.dev/eas/cli/)
- Build lokal & native config: `docs/guides/local-android-build.md`

---

*Dibuat: 2026-06-18 — berdasarkan rilis `1.0.8 (versionCode 22)`.*
