# Tampilan Sales Karyawan + Presurvei Mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sales karyawan mendapat tampilan aplikasi sendiri (Beranda · Presurvei · Canvasing · Absensi · Profil) untuk mencatat kegiatan presurvei ber-GPS dan ber-foto — termasuk saat offline — serta mengelola prospeknya, tanpa mengubah tampilan teknisi dan mitra.

**Architecture:** Backend `netmanager` mendapat tiga perubahan kecil: jenis unggahan `presurvei`, endpoint `GET /api/mobile/presurvei/ringkasan` (service modul presurvei, route tipis), dan migration data izin `m_presurvei` untuk role `SALES`. Mobile memilih tampilan dari satu fungsi murni `tentukanPersona(user)`; izin tetap menentukan akses. Semua aturan (transisi status, validasi form, pemetaan antrean) adalah fungsi murni ber-test di `src/utils/presurvei/`; layar hanya merakit hook dan komponen.

**Tech Stack:** Backend: Next.js 16, Prisma, Zod, Vitest. Mobile: Expo SDK 54, Expo Router 6, React 19, TanStack Query v5, twrnc, expo-camera, expo-image-manipulator, expo-location, MapLibre, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-24-tampilan-sales-karyawan-presurvei-design.md` (repo `mobile-netmanager`)

**Repo kerja:**
- Backend: `/Users/rohadimraja/Documents/radpro/netmanager` (branch aktif `main`)
- Mobile: `/Users/rohadimraja/Documents/radpro/mobile-netmanager` (branch aktif `main`)

Jangan membuat branch baru. Setiap task menyebut repo tempatnya bekerja di baris pertama.

---

## Koreksi atas spec (terverifikasi terhadap kode)

| # | Spec menulis | Kenyataan di kode | Keputusan rencana |
|---|---|---|---|
| K1 | Antrian offline memakai `useApiMutation` dengan `meta.photoMap` (§4.3). | `photoMap` memetakan **satu URI per medan**: `payload[field] = url` (`src/hooks/queries/useApiMutation.ts:231-236`, `src/services/SyncService.ts:370-373`). Kegiatan butuh `fotoUrls: string[]` (`netmanager modules/presurvei/validators/kegiatan.validator.ts:80`). | Pakai `meta.photos` + `targetField: "fotoUrls"`, jalur yang sudah dipakai `SyncService` untuk array (`SyncService.ts:317-352`). |
| K2 | (tersirat) `useApiMutation` mengunggah foto meta di jalur online. | Jalur online **mengabaikan** `meta.photos` (`useApiMutation.ts:224-247` hanya memproses `photoMap`), dan jalur antrean hanya menyalin `photoMap` ke penyimpanan tetap (`useApiMutation.ts:297-308`). Bila sinyal kembali di antara keputusan "offline" dan eksekusi mutasi, kegiatan terkirim dengan `fotoUrls: []` — server menerimanya (`default([])`). | Task 9 menambah unggah `meta.photos` di jalur online (setelah cek online) dan menyalin `meta.photos` ke penyimpanan tetap saat mengantre. |
| K3 | `useLocationWithTimeout` dipakai, tampil akurasi "±12 m". | Hook mengembalikan string lat/lng dan nama lokasi saja, tanpa akurasi (`src/hooks/useLocationWithTimeout.ts:6-10, 77-81`), dan selalu `Accuracy.Balanced` (`:42-44`). | Task 10 menambah `accuracy` ke hasil dan parameter opsional tingkat akurasi (default tetap `Balanced`, satu-satunya pemanggil lain tidak berubah). |
| K4 | Kartu absen Beranda memakai ulang `StatusCard` (§5.1). | `StatusCard` adalah **tombol aksi** check-in/out yang menuntut `hasPhoto` dan `hasLocation` (`src/components/organisms/attendance/StatusCard.tsx:12-31`); di Beranda ia tampil nonaktif. | Kartu baca-saja `KartuAbsenHariIni` yang memakai query yang sama dengan layar Absensi (`queryKeys.attendance.status`, `/api/mobile/attendance/status`, `app/(app)/absensi.tsx:581-607`) lalu membuka Absensi. |
| K5 | "Tab tanpa izin tampil terkunci seperti perilaku yang sudah ada (`_layout.tsx:108,118`)". | Kebanyakan tab **disembunyikan** (`href: null`) bila tak berizin: Work Order `:167`, Canvasing `:180-183`, Barang `:199`, Absensi `:215`. Hanya Beranda yang tampil terkunci. | Tab Presurvei sales tampil terkunci (sesuai §9.3: terkunci sampai migration). Canvasing dan Absensi mempertahankan perilaku sembunyi yang ada. |
| K6 | "Daftar paket untuk konversi: endpoint yang dipakai web". | Web **tidak memakai endpoint paket**: `KonversiModal` memakai isian teks bebas (`netmanager app/admin/presurvei/prospek/KonversiModal.tsx:203-209`); canvasing mobile juga teks bebas (`app/(app)/marketing/canvasing/create.tsx:568-574`). Server menerima string 1–120 (`konversi.validator.ts:18`). | Paket = isian teks bebas. |
| K7 | "Buat prospek baru dari form yang sama bila hasilnya berminat" (§4.1). | Server hanya melahirkan prospek bila jenis Kunjungan/Survei, hasil Tertarik/Deal, dan tanpa `prospekId` (`netmanager modules/presurvei/services/KegiatanService.ts:237-256`). Untuk Telepon/Chat `prospekBaru` dibuang diam-diam. | Opsi "Buat prospek baru" hanya ditawarkan saat syarat itu terpenuhi (`isBolehProspekBaru`). |
| K8 | Menu cepat "Presurvei muncul hanya bila punya `m_presurvei`". | `QuickMenu` menampilkan semua tile, yang tak berizin sebagai terkunci (`src/components/organisms/dashboard/QuickMenu.tsx:151-154`), dan menganggap mitra selalu berizin (`:139`). | Tile Presurvei diberi `internalOnly` + `hideWhenLocked`. |
| K9 | (tersirat) Layar baru cukup dibuat. | Tab bar bawaan menampilkan **setiap berkas route yang tidak dideklarasikan** sebagai tab (pola `href: null` di `app/(app)/_layout.tsx:247-402`). | Setiap task yang membuat route mendaftarkannya di `_layout.tsx` di commit yang sama, dijaga `__tests__/app/app-layout-presurvei.test.tsx`. |
| K10 | `KaryawanSalesTabBar` mengikuti pola `MitraSalesTabBar`. | `MitraSalesTabBar` memakai `StyleSheet.create` (`src/components/organisms/navigation/MitraSalesTabBar.tsx:147-165`), yang dilarang `CLAUDE.md` mobile. | Pola whitelist diikuti; styling hanya twrnc. |
| K11 | Jenis unggahan cukup ditambah di `route-handlers-impl.ts`. | `type` di-cast tanpa validasi (`app/api/mobile/upload/route-handlers-impl.ts:151`); tipe tak dikenal jatuh ke `uploads/mobile/general` (lokal) dan `uploads/<ts>-…` (R2). Union ada di tiga tempat: `lib/utils/image-upload.ts:13-30`, `lib/utils/r2-client.ts:552-571` (+ switch `:577-648`), dan mobile `src/services/UploadService.ts:10-18`. | Ketiganya diubah. Validasi `type` di route tidak ditambahkan (di luar cakupan; bisa memutus klien lama). |
| K12 | "Prospek aktif yang paling lama tidak disentuh". | Mencatat follow-up **tidak** mengubah `updatedAt` prospek (`KegiatanService.catat` hanya menulis kegiatan, `:234-250`). Mengurutkan dengan `updatedAt` saja membuat prospek yang baru di-follow-up tetap di daftar. | "Disentuh" = yang lebih akhir antara `prospek.updatedAt` dan `waktuMulai` kegiatan terakhir yang tertaut. |
| K13 | Migration memakai `NOT EXISTS` karena unique produksi `(resource, action)`. | Unique produksi `Permission_resource_action_key` bersifat **global** (`prisma/migrations/20260313000000_init_squashed/migration.sql:2670`), bukan per tenant. `NOT EXISTS` per tenant saja masih bisa melanggar unique bila tenant lain sudah memiliki pasangan itu. | `NOT EXISTS` + `ON CONFLICT DO NOTHING` **tanpa target** (berlaku untuk constraint apa pun). Ditambah pemeriksaan produksi baca-saja sebelum deploy (Task 20). |
| K14 | `npx expo-fingerprint diff` (§9.2). | Paket `expo-fingerprint` tidak ada; yang benar `npx @expo/fingerprint fingerprint:generate` / `fingerprint:diff` dengan dua berkas JSON (`netmanager docs/standards/mobile-update-strategy.md:110-133`). | Baseline dibuat di awal Task 6, dibandingkan di Task 21. |
| K15 | Form mobile memakai React Hook Form (`CLAUDE.md` mobile, "Form state"). | Validasi form kegiatan bergantung pada konteks non-medan (titik GPS, foto kamera); layar lapangan yang ada (`canvasing/create.tsx`, `request-work-order.tsx`, `izin/form.tsx`) memakai `useState` + validasi murni. RHF hanya di `login`, `change-password`, `edit-profile`. | `useState` di dalam hook + fungsi validasi murni ber-test. Dicatat sebagai penyimpangan sadar. |

## Asumsi

- [Asumsi A1] Foto KTP **wajib** di layar Jadikan Canvasing mobile (spec §4.2 menyebutnya; server menerimanya opsional). Diunggah sebagai tipe `marketing` karena menjadi data canvasing.
- [Asumsi A2] Nomor KTP mengikuti server apa adanya: 16–20 karakter setelah dirapikan (`konversi.validator.ts:17`), keyboard numerik.
- [Asumsi A3] Daftar kegiatan per tanggal memakai **hari lokal perangkat** (yang dilihat sales), sedangkan ringkasan Beranda memakai **hari UTC** (keputusan spec §7.1). Antara 00:00–07:00 WIB keduanya bisa berbeda; dicatat di CHANGELOG sebagai keterbatasan yang sudah ada.
- [Asumsi A4] Pemeriksaan prospek aktif untuk "Perlu di-follow-up" dibatasi 200 prospek aktif dengan `updatedAt` terlama. Hasil tepat selama sales memegang ≤ 200 prospek aktif.
- [Asumsi A5] Endpoint ringkasan hanya menerima `m_presurvei:read` (spec §7.1); pemegang `presurvei:read` web saja mendapat 403. Super admin tanpa tenant sesi mendapat 400.
- [Asumsi A6] GPS kegiatan meminta `Accuracy.High`; pencarian dimulai saat layar catat difokuskan, bukan menunggu jenis dipilih, supaya fix GPS sudah siap saat sales selesai memilih.
- [Asumsi A7] Sales yang kehilangan izin `m_presurvei` tetap melihat tab Presurvei terkunci, bukan hilang (konsisten dengan §9.3).

## Kontrak API yang dipakai mobile (dibaca dari route + validator netmanager)

Semua route memakai `createHandler` (`lib/api/handler.ts`): sesi web **atau** Bearer mobile; izin dicek "salah satu" (`.some()`); badan hanya diparse bila `Content-Type: application/json`. Amplop: daftar `{ success: true, data: T[], meta: { page, limit, total, totalPages } }`, tunggal `{ success: true, data: T }`, galat `{ success: false, error, code }`. Pemanggil tanpa `presurvei:read` (sales mobile) **selalu** diikat ke datanya sendiri (`app/api/presurvei/akses-presurvei.ts`).

| Endpoint | Izin | Request | Respons / galat |
|---|---|---|---|
| `GET /api/presurvei/kegiatan` | `presurvei:read` \| `m_presurvei:read` | Query (`kegiatan/route.ts:20-31`, `kegiatan.validator.ts:120-136`): `userId` (ditimpa id sesi untuk mobile), `peran` (`SALES`\|`NON_SALES`), `departemenId`, `jenis`, `hasil`, `prospekId`, `dariTanggal`, `sampaiTanggal` (coerce date), `page` ≥1 (default 1), `limit` 1–100 (default 20). Nilai asing → 400. | `KegiatanListItemDto[]` (`dto/kegiatan.dto.ts:17-38`), urut `waktuMulai` desc. |
| `POST /api/presurvei/kegiatan` | `presurvei:create` \| `m_presurvei:create` | Badan `catatKegiatanSchema` (`kegiatan.validator.ts:65-110`): `jenis`, `hasil` (enum), `waktuMulai` (≤ jam server + 15 menit), `prospekId?`, `iklanId?` (wajib untuk IKLAN), `waktuSelesai?`, `latitude?`/`longitude?` (wajib untuk KUNJUNGAN/SURVEI_LOKASI), `alamatDikunjungi?` ≤500, `ditemuiNama?` ≤120, `catatan?` ≤1000, `fotoUrls` URL[] ≤6 (default `[]`), `odpTerdekat?` ≤120, `estimasiKabelMeter?` int 0–5000, `catatanTeknis?` ≤1000 (tiga medan teknis hanya untuk SURVEI_LOKASI), `siteId?`, `prospekBaru?` `{ nama 2–120, noTelp 8–20, alamat 5–500, email?, paketDiminati? ≤120 }`. `userId` selalu dari sesi. | 201 `{ kegiatan: KegiatanDetailDto, prospek: ProspekDetailDto \| null }`. `prospek` terisi hanya untuk lapangan + Tertarik/Deal + tanpa `prospekId` (K7). 400 validasi. |
| `GET /api/presurvei/kegiatan/[id]` | `presurvei:read` \| `m_presurvei:read` | — | `KegiatanRincianDto` (detail + `updatedAt` + `riwayat`). 403 milik orang lain, 404. (Tidak dipakai layar mobile di rencana ini; rincian prospek memakai daftar ber-`prospekId`.) |
| `GET /api/presurvei/prospek` | `presurvei:read` \| `m_presurvei:read` | Query (`prospek/route.ts:30-38`, `prospek.validator.ts:78-98`): `status`, `sumber`, `pemilikId` (ditimpa), `tanpaPemilik` (`"true"` → 403 untuk mobile), `search` ≤120 (nama/noTelp/alamat, tidak peka huruf), `page`, `limit` ≤100. | `ProspekListItemDto[]` (`dto/prospek.dto.ts:15-32`), urut `createdAt` desc. |
| `POST /api/presurvei/prospek` | `presurvei:create` \| `m_presurvei:create` | `buatProspekSchema` — **tidak dipakai mobile** di rencana ini (prospek baru lahir lewat `prospekBaru` pada kegiatan). | 201 `ProspekDetailDto`. |
| `GET /api/presurvei/prospek/[id]` | `presurvei:read` \| `m_presurvei:read` | — | `ProspekDetailDto` (`dto/prospek.dto.ts:34-46`). 403 milik orang lain, 404. |
| `PATCH /api/presurvei/prospek/[id]` | `presurvei:update` \| `m_presurvei:update` | Mobile mengirim `{ status }` saja (`ubahProspekSchema`, `prospek.validator.ts:60-76`; `pemilikId` dibuang untuk mobile). | `ProspekDetailDto`. 409 `INVALID_STATE` bila transisi tak sah (`ProspekService.ts:168-176`). |
| `POST /api/presurvei/prospek/[id]/jadikan-canvasing` | `presurvei:update` \| `m_presurvei:update` | `jadikanCanvasingSchema` (`konversi.validator.ts:16-24`): `noKtp` 16–20, `paket` 1–120, `kabel?` int 0–5000 (validator marketing menolak <1 → 400), `odp?`, `sn?`, `foto?` URL, `fotoKtp?` URL. | `{ prospek: ProspekDetailDto, canvasingId }`. 409 bila bukan DEAL atau sudah dikonversi; 403 milik orang lain. Medan kosong diisi server dari survei terakhir. |
| Daftar paket untuk konversi | — | **Tidak ada endpoint** (K6). | Paket = teks bebas. |
| `GET /api/mobile/presurvei/ringkasan` (baru, Task 4) | `m_presurvei:read` | Tanpa param. | `RingkasanSalesDto`; 403 tanpa izin mobile; 400 sesi tanpa tenant. |
| `POST /api/mobile/upload` (Task 1) | Bearer mobile (`getMobileAuthPayload`) | Multipart `file` (gambar ≤10 MB), `type=presurvei` atau `marketing`, `subFolder?`, `watermarkLines?`. | `{ success: true, url, data: { url, fileName } }`. |

Aturan domain yang disalin mobile: `TRANSISI_SAH` (`domain/prospek-rules.ts:28-36`), `resolveAksiKanban` (`domain/prospek-kanban.ts:26-49`: dirinya sendiri/tak sah → null; tujuan DEAL → `buka-konversi`; lainnya → `ubah-status`), `isButuhLokasi`/`isButuhDataTeknis`/`isHasilMelahirkanProspek` (`domain/kegiatan-rules.ts`). Paritasnya dijaga fixture Task 5/6.

## Urutan task dan alasannya

Urutan diminta: backend → persona/tab bar/layout → Beranda → tab Presurvei → QuickMenu → migration. Rencana ini **menukar** posisi persona/tab bar dan Beranda ke **setelah** layar Presurvei selesai, dengan dua alasan yang bisa diperiksa:

1. Tab bar sales menunjuk route `presurvei/index`. Bila tab bar dibuat lebih dulu, commit di antaranya menunjuk route yang belum ada. Dengan urutan ini setiap commit tetap bisa dijalankan.
2. Beranda sales memakai hook ringkasan (Task 8), `QuickMenu` dengan `menuIds` (Task 18), dan membuka layar rincian prospek (Task 15). Dibuat terakhir, ia tidak perlu stub.

Teknisi tidak melihat apa pun di antara commit: setiap route baru didaftarkan `href: null` di task yang membuatnya (K9), dan tab bar sales baru aktif di Task 17.

| Task | Repo | Judul |
|---|---|---|
| 1 | netmanager | Jenis unggahan `presurvei` |
| 2 | netmanager | Ringkasan sales: aturan domain dan repository |
| 3 | netmanager | Ringkasan sales: `TargetService.pencapaianSendiri` dan service |
| 4 | netmanager | Ringkasan sales: DTO dan route `GET /api/mobile/presurvei/ringkasan` |
| 5 | netmanager | Fixture kontrak presurvei untuk mobile |
| 6 | mobile | Fondasi: konstanta, tipe, aturan presurvei, paritas kontrak |
| 7 | mobile | Lapisan data: `PresurveiService`, rentang hari, antrean kegiatan |
| 8 | mobile | Hook query presurvei, `useIsOnline`, penyegar setelah sinkron |
| 9 | mobile | `useApiMutation`: unggah `meta.photos` online, salin saat antre |
| 10 | mobile | Lokasi GPS kegiatan |
| 11 | mobile | Aturan form kegiatan dan `useCatatKegiatan` |
| 12 | mobile | State form, blok GPS, blok foto, kamera |
| 13 | mobile | Layar Catat Kegiatan |
| 14 | mobile | Tab Presurvei: daftar kegiatan dan prospek |
| 15 | mobile | Rincian prospek dan Ubah Status |
| 16 | mobile | Jadikan Canvasing |
| 17 | mobile | Persona, `KaryawanSalesTabBar`, dan layout |
| 18 | mobile | QuickMenu: `menuIds` dan tile Presurvei |
| 19 | mobile | Beranda sales |
| 20 | netmanager | Migration izin `m_presurvei` untuk role `SALES` |
| 21 | keduanya | Verifikasi menyeluruh, fingerprint, CHANGELOG, dokumentasi |

---

## Global Constraints

**Kedua repo**
- Penamaan Bahasa Indonesia; boolean berprefiks `is`/`has`/`can`; tanpa magic number (konstanta bernama).
- Setiap fungsi publik punya komentar singkat tujuannya.
- Commit per task, format Conventional Commits, diakhiri baris `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Jangan membuat branch baru.
- Setiap task menutup dengan **tabel mutasi**: terapkan tiap mutasi, pastikan test yang disebut merah, kembalikan, lalu `git status --short` hanya berisi berkas task sebelum commit.
- Kelas cacat yang wajib dijaga (dari `netmanager .superpowers/sdd/2026-09-22-presurvei-fase-3/global-constraints.md`): (1) assertion "terpanggil" tanpa argumen → pakai `toHaveBeenCalledWith`; (2) assertion referensi bersama → bekukan input atau bandingkan dengan literal terpisah; (3) nilai kembar pada medan bersebelahan bertipe sama → beri nilai berbeda; (4) `||` di tempat `0`/`""` sah → pakai `??` atau perbandingan eksplisit; (5) daftar turunan tak exhaustive → `Record<Union, T>`; (6) fungsi mengembalikan array level-modul → kembalikan salinan.
- Klaim konsekuensi di komentar wajib bersumber (berkas:baris). Bila tidak bisa ditunjuk, tulis yang diketahui saja.

**Backend (`netmanager`)**
- Test: `npx vitest run <scope> --maxWorkers=50% --reporter=dot`. **Jangan** `npx vitest run` polos.
- Typecheck terpisah: `npx tsc -p tsconfig.typecheck.json --noEmit` (Vitest tidak melakukan typecheck).
- `strictNullChecks: false`: `x?.y` tanpa `?? null` lolos kompilasi. Fixture ber-`null` wajib diberi anotasi tipe (TS7018).
- Route tipis: parse → izin → service → DTO. Tenant **hanya** dari sesi. Service tidak berisi logika otorisasi.
- Modul lain dan route mengimpor dari `@/modules/presurvei` (barrel), bukan berkas dalam.
- `docs/CHANGELOG.md` hanya disentuh di Task 21.
- Tidak ada perubahan `prisma/schema.prisma`. Satu-satunya migration adalah migration data di Task 20.

**Mobile (`mobile-netmanager`)**
- **OTA saja.** Jangan menyentuh `package.json`, `package-lock.json`, `app.json`, `app.config.ts`, `plugins/`, `android/`, `ios/`. Kamera, GPS, peta, SQLite sudah terpasang.
- Server state hanya lewat TanStack Query; `useState` hanya untuk state UI/form.
- Styling hanya twrnc; `StyleSheet.create` dilarang.
- Navigasi hanya Expo Router. Setiap route baru didaftarkan di `app/(app)/_layout.tsx` pada task yang membuatnya.
- Target 20 baris per fungsi logika, ≤ 3 parameter (lebih → objek), nesting ≤ 2, ≤ 300 baris per berkas, satu komponen per berkas, props interface eksplisit. Logika keluar dari komponen ke `src/hooks/` atau `src/utils/`.
- Query key `[domain, action, params]` lewat `queryKeys.presurvei` (Task 7).
- Test: `npx jest <path>`; lokasi `__tests__/`; pola `require()` layar setelah `jest.mock`. TZ test dipatok `Asia/Jakarta` (`jest.global-setup.js`).
- Typecheck: `npx tsc --noEmit`. Lint: `npx expo lint`.
- Jenis `IKLAN` **tidak pernah** ditawarkan di aplikasi.
- Lokasi kegiatan lapangan **hanya** dari GPS; tidak memakai `LocationPickerModal`, tidak ada isian koordinat manual.
- Foto bukti dari kamera belakang, diperkecil lebar 1024, JPEG kualitas 0.7 (`expo-image-manipulator`), maksimal 6 foto (`kegiatan.validator.ts:22`).
- Ubah Status dan Jadikan Canvasing **butuh online**: tombol nonaktif + pesan saat offline; tidak pernah diantrekan.
- Urutan dan nilai enum presurvei mobile wajib sama dengan fixture kontrak backend (Task 5/6).

---

## Review Focus

Lima kondisi yang disiratkan spec, paling mungkin menggigit pengguna, beserta task yang memegang test-nya:

1. **Kunjungan dicatat tanpa sinyal harus terkirim nanti lengkap dengan foto dan titik GPS** — bukan `fotoUrls: []` dan bukan foto yang sudah dihapus OS dari cache. Test: Task 9 ("menyimpan salinan tetap meta.photos saat masuk antrean offline") dan Task 11 ("mengantre kegiatan offline beserta titik GPS dan foto yang disalin").
2. **Sinyal kembali di antara keputusan layar dan eksekusi mutasi**, atau sinyal hilang di tengah unggah — foto tetap terunggah atau kegiatan masuk antrean, tidak pernah terkirim tanpa foto. Test: Task 9 ("mengunggah meta.photos di jalur online…", "memasukkan ke antrean bila sinyal hilang saat unggah", "memasukkan ke antrean bila unggah foto habis waktu").
3. **Tombol "Simpan Kegiatan" ditekan dua kali beruntun di sinyal lemah** — hanya satu kegiatan tercatat. Test: Task 13 ("tidak mengirim dua kali saat Simpan ditekan beruntun").
4. **Sales sebelum migration izin (Task 20)** — Beranda tidak menampilkan error dan tidak memanggil endpoint ringkasan; tab Presurvei terkunci dengan pesan akses. Test: Task 19 ("tanpa m_presurvei tidak memanggil ringkasan dan menampilkan pesan belum aktif", "403 dari server ditampilkan sebagai belum aktif, bukan galat") dan Task 17 ("menampilkan Presurvei terkunci bagi sales tanpa m_presurvei").
5. **Prospek yang baru di-follow-up harus turun dari "Perlu di-follow-up"** walau baris prospeknya tidak berubah. Test: Task 2 ("kegiatan tertaut yang lebih baru menggeser sentuhan terakhir").

---

## Peta berkas

**Backend (`netmanager`)**

| Berkas | Tanggung jawab | Task |
|---|---|---|
| `lib/utils/image-upload.ts` | (ubah) Union `UploadType` + `presurvei`. | 1 |
| `lib/utils/r2-client.ts` | (ubah) Kunci R2 `uploads/presurvei/kegiatan/…`. | 1 |
| `app/api/mobile/upload/route-handlers-impl.ts` | (ubah) Folder lokal `public/uploads/presurvei/kegiatan`. | 1 |
| `modules/presurvei/domain/ringkasan-sales.ts` | Tipe dan fungsi murni ringkasan: rentang hari/bulan UTC, pelengkap hitungan, pemilih follow-up. | 2 |
| `modules/presurvei/domain/ports/IRingkasanSalesRepository.ts` | Port baca-saja ringkasan. | 2 |
| `modules/presurvei/repositories/pastikan-tenant-terisi.ts` | Penjaga fail-closed `tenantId` bersama. | 2 |
| `modules/presurvei/repositories/RingkasanSalesRepository.ts` | Tiga query ringkasan dengan `tenantId` eksplisit. | 2 |
| `modules/presurvei/repositories/TargetRepository.ts` | (ubah) Pakai penjaga bersama. | 2 |
| `modules/presurvei/services/TargetService.ts` | (ubah) `pencapaianSendiri`. | 3 |
| `modules/presurvei/services/RingkasanSalesService.ts` | Orkestrasi ringkasan. | 3 |
| `modules/presurvei/dto/ringkasan-sales.dto.ts` | Bentuk JSON ringkasan. | 4 |
| `modules/presurvei/index.ts` | (ubah) Ekspor service, tipe, DTO. | 3, 4 |
| `app/api/mobile/presurvei/ringkasan/route.ts` | Route tipis. | 4 |
| `tests/fixtures/presurvei/kontrak-mobile.json` | Kontrak enum/aturan yang disalin mobile. | 5 |
| `prisma/migrations/<ts>_grant_mobile_presurvei_permissions_to_sales_role/migration.sql` | Migration data izin SALES. | 20 |

**Mobile (`mobile-netmanager`)**

| Berkas | Tanggung jawab | Task |
|---|---|---|
| `src/constants/features.ts` | (ubah) `AppFeature.PRESURVEI`. | 6 |
| `src/constants/presurvei.ts` | Enum, label, batas, endpoint presurvei. | 6 |
| `src/types/presurvei.ts` | Tipe DTO dan muatan API. | 6 |
| `src/utils/presurvei/aturanPresurvei.ts` | Transisi status, aksi ubah status, aturan jenis/hasil. | 6 |
| `src/services/PresurveiService.ts` | Panggilan HTTP presurvei. | 7 |
| `src/utils/presurvei/rentangHari.ts` | Rentang hari lokal, geser hari. | 7 |
| `src/utils/presurvei/antreanKegiatan.ts` | Kegiatan "Menunggu kirim" dari antrean SQLite. | 7 |
| `src/lib/queryClient.ts` | (ubah) `queryKeys.presurvei`. | 7 |
| `src/utils/httpStatus.ts` | `isAksesDitolak` (403). | 8 |
| `src/utils/statusJaringan.ts`, `src/hooks/useIsOnline.ts` | Status online. | 8 |
| `src/hooks/queries/usePresurveiKegiatan.ts`, `usePresurveiProspek.ts`, `useRingkasanPresurvei.ts` | Hook query. | 8 |
| `src/utils/fotoMutasi.ts` | Unggah `meta.photos`, deteksi habis waktu. | 9 |
| `src/hooks/queries/useApiMutation.ts` | (ubah) Pakai `fotoMutasi`, salin `meta.photos` saat antre. | 9 |
| `src/services/UploadService.ts` | (ubah) `UploadType` + `presurvei`; nama galat habis waktu bersama. | 9 |
| `src/hooks/useLocationWithTimeout.ts` | (ubah) `accuracy` + parameter akurasi. | 10 |
| `src/utils/presurvei/lokasiGps.ts`, `src/hooks/presurvei/useLokasiKegiatan.ts` | Titik GPS kegiatan. | 10 |
| `src/utils/presurvei/formKegiatan.ts` | Validasi dan muatan form kegiatan. | 11 |
| `src/hooks/presurvei/useCatatKegiatan.ts` | Mutasi catat kegiatan. | 11 |
| `src/hooks/presurvei/useFormKegiatan.ts` | State form. | 12 |
| `src/utils/presurvei/fotoBukti.ts` | Perkecil foto. | 12 |
| `src/constants/gayaPetaOsm.ts` | Gaya peta OSM bersama. | 12 |
| `src/components/molecules/PilihanChip.tsx`, `IsianTeks.tsx`, `NavigasiTanggal.tsx` | Molekul form/navigasi. | 12, 14 |
| `src/components/organisms/presurvei/*` | Blok UI presurvei. | 12–16 |
| `app/(app)/presurvei/index.tsx` | Tab Presurvei. | 14 |
| `app/(app)/presurvei/kegiatan/catat.tsx` | Layar catat kegiatan. | 13 |
| `app/(app)/presurvei/prospek/[id]/index.tsx` | Rincian prospek. | 15 |
| `app/(app)/presurvei/prospek/[id]/jadikan-canvasing.tsx` | Jadikan canvasing. | 16 |
| `src/utils/presurvei/daftarKegiatan.ts` | Gabung kegiatan server + antrean. | 14 |
| `src/utils/presurvei/formKonversi.ts`, `src/hooks/presurvei/useJadikanCanvasing.ts` | Konversi prospek. | 16 |
| `src/hooks/presurvei/useUbahStatusProspek.ts` | Mutasi status online. | 15 |
| `src/utils/persona.ts`, `src/utils/tabKaryawanSales.ts` | Persona dan susunan tab sales. | 17 |
| `src/components/organisms/navigation/KaryawanSalesTabBar.tsx`, `TombolTabSales.tsx` | Tab bar sales. | 17 |
| `app/(app)/_layout.tsx` | (ubah) Registrasi route, tab bar per persona. | 13–17 |
| `src/components/organisms/dashboard/QuickMenu.tsx` | (ubah) `menuIds`, tile Presurvei. | 18 |
| `src/utils/presurvei/berandaSales.ts`, `src/hooks/useStatusAbsenHariIni.ts` | Logika Beranda sales. | 19 |
| `src/components/organisms/dashboard/Kartu*.tsx`, `DaftarPerluFollowUp.tsx`, `BagianPresurveiBeranda.tsx` | Blok Beranda. | 19 |
| `src/components/screens/KaryawanSalesDashboardScreen.tsx` | Beranda sales. | 19 |
| `app/(app)/dashboard.tsx` | (ubah) Multiplexer per persona. | 19 |

---

## Task 1: Jenis unggahan `presurvei`

**Repo:** `netmanager`

**Files:**
- Modify: `lib/utils/image-upload.ts:13-30` (union `UploadType`)
- Modify: `lib/utils/r2-client.ts:552-571` (union parameter `generateR2Key`) dan `:635-639` (switch)
- Modify: `app/api/mobile/upload/route-handlers-impl.ts:34-87` (`resolveUploadDir`)
- Test: `tests/api/mobile-upload-route.test.ts`, `tests/lib/r2-client.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `UploadType` (`lib/utils/image-upload.ts`) memuat `"presurvei"`.
  - `generateR2Key("presurvei", filename, subFolder?)` → `uploads/presurvei/kegiatan[/<subFolder>]/<timestamp>-<filename>`.
  - `POST /api/mobile/upload` dengan `type=presurvei` menyimpan ke `public/uploads/presurvei/kegiatan` (lokal). Respons tetap `{ success: true, url, data: { url, fileName } }`. Dipakai mobile Task 9/11 (`photoType: "presurvei"`).

- [ ] **Step 1: Tulis test route yang gagal**

Tambahkan impor `path` di baris paling atas `tests/api/mobile-upload-route.test.ts`:

```ts
import path from "path";
```

Lalu tambahkan test ini di dalam `describe("mobile upload route", ...)`, setelah test pertama:

```ts
  it("menyimpan foto kegiatan presurvei di folder presurvei/kegiatan", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "kunjungan.jpg", {
        type: "image/jpeg",
      }),
    );
    formData.set("type", "presurvei");

    const response = await POST(
      new NextRequest("http://localhost/api/mobile/upload", {
        method: "POST",
        body: formData,
        headers: { host: "localhost:3000", "x-forwarded-proto": "https" },
      }),
    );

    expect(response.status).toBe(200);
    // Argumen keempat adalah tipe yang diteruskan ke kunci R2; argumen
    // kedua folder lokal. Tanpa case "presurvei", folder jatuh ke
    // uploads/mobile/general (route-handlers-impl.ts:84-85).
    expect(mockFns.convertAndSaveImage).toHaveBeenCalledWith(
      expect.anything(),
      path.join(process.cwd(), "public", "uploads", "presurvei", "kegiatan"),
      expect.any(String),
      "presurvei",
      undefined,
      undefined,
    );
  });
```

- [ ] **Step 2: Tulis test kunci R2 yang gagal**

Di `tests/lib/r2-client.test.ts`, ganti blok impor `@/lib/utils/r2-client` menjadi:

```ts
import {
  clearR2SettingsCache,
  generateR2Key,
  getR2PublicBaseUrl,
  getR2Settings,
} from "@/lib/utils/r2-client";
```

Tambahkan di akhir berkas:

```ts
describe("generateR2Key — presurvei", () => {
  it("menaruh foto kegiatan presurvei di uploads/presurvei/kegiatan", () => {
    expect(generateR2Key("presurvei", "foto.webp")).toMatch(
      /^uploads\/presurvei\/kegiatan\/\d+-foto\.webp$/,
    );
  });

  it("menaruh subFolder di bawah folder kegiatan", () => {
    expect(generateR2Key("presurvei", "foto.webp", "sales-1")).toMatch(
      /^uploads\/presurvei\/kegiatan\/sales-1\/\d+-foto\.webp$/,
    );
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run tests/api/mobile-upload-route.test.ts tests/lib/r2-client.test.ts --maxWorkers=50% --reporter=dot`
Expected: 3 FAIL — route menerima folder `.../uploads/mobile/general`; kedua test R2 menerima `uploads/<angka>-foto.webp` (cabang `default`).

- [ ] **Step 4: Implementasi**

`lib/utils/image-upload.ts` — tambah anggota union setelah `"marketing"`:

```ts
  | "marketing"
  | "presurvei"
  | "app-version"
```

`lib/utils/r2-client.ts` — tambah anggota union parameter `type` setelah `| "marketing"`:

```ts
    | "marketing"
    | "presurvei"
    | "general"
```

dan tambah case setelah case `"marketing"` (sebelum `"map-nodes"`):

```ts
    case "presurvei":
      if (subFolder) {
        return `uploads/presurvei/kegiatan/${subFolder}/${timestamp}-${sanitizedFilename}`;
      }
      return `uploads/presurvei/kegiatan/${timestamp}-${sanitizedFilename}`;
```

`app/api/mobile/upload/route-handlers-impl.ts` — tambah case di `resolveUploadDir`, setelah case `"marketing"`:

```ts
    case "presurvei":
      return path.join(
        process.cwd(),
        "public",
        "uploads",
        "presurvei",
        "kegiatan",
      );
```

- [ ] **Step 5: Jalankan test dan typecheck**

Run: `npx vitest run tests/api/mobile-upload-route.test.ts tests/lib/r2-client.test.ts --maxWorkers=50% --reporter=dot`
Expected: semua PASS.

Run: `npx tsc -p tsconfig.typecheck.json --noEmit`
Expected: exit 0.

- [ ] **Step 6: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Hapus case `"presurvei"` di `resolveUploadDir` | "menyimpan foto kegiatan presurvei di folder presurvei/kegiatan" |
| Ganti `uploads/presurvei/kegiatan/${timestamp}` jadi `uploads/presurvei/${timestamp}` | "menaruh foto kegiatan presurvei di uploads/presurvei/kegiatan" |
| Hapus cabang `if (subFolder)` di case `"presurvei"` R2 | "menaruh subFolder di bawah folder kegiatan" |

Kembalikan tiap mutasi; `git status --short` hanya berisi lima berkas task ini.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/image-upload.ts lib/utils/r2-client.ts app/api/mobile/upload/route-handlers-impl.ts tests/api/mobile-upload-route.test.ts tests/lib/r2-client.test.ts
git commit -m "$(cat <<'EOF'
feat(upload): tambah jenis unggahan presurvei untuk foto kegiatan

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Ringkasan sales — aturan domain dan repository

**Repo:** `netmanager`

**Files:**
- Create: `modules/presurvei/domain/ringkasan-sales.ts`
- Create: `modules/presurvei/domain/ports/IRingkasanSalesRepository.ts`
- Create: `modules/presurvei/repositories/pastikan-tenant-terisi.ts`
- Create: `modules/presurvei/repositories/RingkasanSalesRepository.ts`
- Modify: `modules/presurvei/repositories/TargetRepository.ts:1,36,65,87-97` (pakai penjaga bersama)
- Test: `tests/modules/presurvei/ringkasan-sales-rules.test.ts`, `tests/modules/presurvei/ringkasan-sales-repository.test.ts`

**Interfaces:**
- Consumes: `KEGIATAN_JENIS`, `KegiatanJenis` (`domain/entities/Kegiatan.ts`), `ProspekStatus` (`domain/entities/Prospek.ts`), `PeriodeTarget` (`domain/entities/Target.ts`), `Pencapaian` (`domain/target-rules.ts`), `RentangPeriode` (`domain/ports/IKegiatanRepository.ts`), `daftarStatusBebanAktif()` (`domain/prospek-rules.ts:87`), `TenantContextError` (`lib/prisma-extension.ts:17`).
- Produces:
  - `const BATAS_PERLU_FOLLOW_UP = 5`
  - `interface ProspekSentuhan { id: string; nama: string; noTelp: string; status: ProspekStatus; updatedAt: Date }`
  - `interface ProspekPerluFollowUp { id: string; nama: string; noTelp: string; status: ProspekStatus; sentuhanTerakhir: Date }`
  - `interface TargetSendiri { periodeTahun: number; periodeBulan: number; pencapaian: Pencapaian }`
  - `interface RingkasanSales { tanggal: Date; kegiatanHariIni: Record<KegiatanJenis, number>; target: TargetSendiri | null; perluFollowUp: ProspekPerluFollowUp[] }`
  - `rentangHariUtc(sekarang: Date): RentangPeriode`
  - `periodeBulanUtc(sekarang: Date): PeriodeTarget`
  - `lengkapiHitunganPerJenis(parsial: Partial<Record<KegiatanJenis, number>>): Record<KegiatanJenis, number>`
  - `pilihPerluFollowUp(prospek: readonly ProspekSentuhan[], kegiatanTerakhir: Readonly<Record<string, Date>>, batas: number): ProspekPerluFollowUp[]`
  - `interface IRingkasanSalesRepository { hitungKegiatanPerJenis(userId: string, rentang: RentangPeriode, tenantId: string): Promise<Partial<Record<KegiatanJenis, number>>>; daftarProspekAktif(pemilikId: string, tenantId: string): Promise<ProspekSentuhan[]>; waktuKegiatanTerakhir(prospekIds: readonly string[], tenantId: string): Promise<Record<string, Date>> }`
  - `class RingkasanSalesRepository implements IRingkasanSalesRepository`
  - `const BATAS_PROSPEK_AKTIF_DIPERIKSA = 200` (diekspor dari `RingkasanSalesRepository.ts`)
  - `pastikanTenantTerisi(tenantId: string, keterangan: string): void`

- [ ] **Step 1: Tulis test aturan domain yang gagal**

```ts
// tests/modules/presurvei/ringkasan-sales-rules.test.ts
import { describe, expect, it } from "vitest";

import {
  lengkapiHitunganPerJenis,
  periodeBulanUtc,
  pilihPerluFollowUp,
  rentangHariUtc,
  type ProspekSentuhan,
} from "@/modules/presurvei/domain/ringkasan-sales";

/**
 * Batas "hari ini" dan "bulan ini" ringkasan Beranda adalah UTC, sama dengan
 * laporan pencapaian (`TargetService.bangunRentangBulan`). Semua waktu di
 * berkas ini ditulis eksplisit dengan akhiran Z supaya tidak bergantung pada
 * zona mesin.
 */

describe("rentangHariUtc", () => {
  it("mencakup seluruh hari UTC yang memuat waktu itu", () => {
    expect(rentangHariUtc(new Date("2026-09-24T23:30:00.000Z"))).toEqual({
      mulai: new Date("2026-09-24T00:00:00.000Z"),
      selesai: new Date("2026-09-24T23:59:59.999Z"),
    });
  });

  it("tidak melompat ke hari berikutnya di akhir bulan", () => {
    expect(rentangHariUtc(new Date("2026-09-30T23:59:59.999Z"))).toEqual({
      mulai: new Date("2026-09-30T00:00:00.000Z"),
      selesai: new Date("2026-09-30T23:59:59.999Z"),
    });
  });
});

describe("periodeBulanUtc", () => {
  it("memberi bulan 1–12, bukan indeks 0–11", () => {
    expect(periodeBulanUtc(new Date("2026-12-31T23:00:00.000Z"))).toEqual({
      tahun: 2026,
      bulan: 12,
    });
  });

  it("berganti tahun tepat di tengah malam UTC", () => {
    expect(periodeBulanUtc(new Date("2027-01-01T00:00:00.000Z"))).toEqual({
      tahun: 2027,
      bulan: 1,
    });
  });
});

describe("lengkapiHitunganPerJenis", () => {
  it("mengisi nol untuk jenis yang tidak muncul dan mempertahankan yang ada", () => {
    expect(lengkapiHitunganPerJenis({ KUNJUNGAN: 3, TELEPON: 4 })).toEqual({
      KUNJUNGAN: 3,
      SURVEI_LOKASI: 0,
      TELEPON: 4,
      CHAT: 0,
      IKLAN: 0,
    });
  });
});

const prospek = (
  id: string,
  updatedAt: string,
): ProspekSentuhan => ({
  id,
  nama: `Nama ${id}`,
  noTelp: `0812${id}`,
  status: "DIHUBUNGI",
  updatedAt: new Date(updatedAt),
});

describe("pilihPerluFollowUp", () => {
  it("kegiatan tertaut yang lebih baru menggeser sentuhan terakhir", () => {
    // A diubah paling awal tapi baru di-follow-up; B tidak disentuh sejak
    // 5 September. Mencatat follow-up tidak mengubah updatedAt prospek
    // (KegiatanService.catat hanya menulis kegiatan), jadi tanpa kegiatan
    // terakhir A akan tetap di puncak daftar.
    const hasil = pilihPerluFollowUp(
      [
        prospek("a", "2026-09-01T00:00:00.000Z"),
        prospek("b", "2026-09-05T00:00:00.000Z"),
      ],
      { a: new Date("2026-09-20T00:00:00.000Z") },
      5,
    );

    expect(hasil.map((baris) => baris.id)).toEqual(["b", "a"]);
    expect(hasil[1].sentuhanTerakhir).toEqual(
      new Date("2026-09-20T00:00:00.000Z"),
    );
  });

  it("kegiatan yang lebih lama dari updatedAt tidak memundurkan sentuhan", () => {
    const hasil = pilihPerluFollowUp(
      [prospek("c", "2026-09-10T00:00:00.000Z")],
      { c: new Date("2026-09-02T00:00:00.000Z") },
      5,
    );

    expect(hasil[0].sentuhanTerakhir).toEqual(
      new Date("2026-09-10T00:00:00.000Z"),
    );
  });

  it("memotong ke batas dan mengurutkan seri dengan id", () => {
    const hasil = pilihPerluFollowUp(
      [
        prospek("z", "2026-09-01T00:00:00.000Z"),
        prospek("y", "2026-09-01T00:00:00.000Z"),
        prospek("x", "2026-09-03T00:00:00.000Z"),
      ],
      {},
      2,
    );

    expect(hasil.map((baris) => baris.id)).toEqual(["y", "z"]);
  });

  it("memetakan nama, nomor, dan status apa adanya", () => {
    const hasil = pilihPerluFollowUp(
      [{ ...prospek("d", "2026-09-01T00:00:00.000Z"), status: "NEGOSIASI" }],
      {},
      5,
    );

    expect(hasil[0]).toEqual({
      id: "d",
      nama: "Nama d",
      noTelp: "0812d",
      status: "NEGOSIASI",
      sentuhanTerakhir: new Date("2026-09-01T00:00:00.000Z"),
    });
  });

  it("tidak mengurutkan ulang array masukan", () => {
    const masukan = Object.freeze([
      prospek("m", "2026-09-09T00:00:00.000Z"),
      prospek("n", "2026-09-01T00:00:00.000Z"),
    ]);

    pilihPerluFollowUp(masukan, {}, 5);

    expect(masukan.map((baris) => baris.id)).toEqual(["m", "n"]);
  });
});
```

- [ ] **Step 2: Tulis test repository yang gagal**

```ts
// tests/modules/presurvei/ringkasan-sales-repository.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/database", () => ({
  prisma: {
    presurveiKegiatan: { groupBy: vi.fn() },
    presurveiProspek: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/modules/database";
import { TenantContextError } from "@/lib/prisma-extension";
import {
  BATAS_PROSPEK_AKTIF_DIPERIKSA,
  RingkasanSalesRepository,
} from "@/modules/presurvei/repositories/RingkasanSalesRepository";

/**
 * Setiap query menulis `tenantId` eksplisit di `where` — isolasi di
 * repository, tidak diserahkan ke ekstensi saja — dan menolak tenant kosong,
 * yang bagi Prisma berarti "tanpa syarat". userId dan tenantId sengaja
 * bernilai berbeda supaya tertukarnya terlihat.
 */

const ID_SALES = "sales-a";
const ID_TENANT = "tenant-x";
const RENTANG = {
  mulai: new Date("2026-09-24T00:00:00.000Z"),
  selesai: new Date("2026-09-24T23:59:59.999Z"),
};

describe("RingkasanSalesRepository.hitungKegiatanPerJenis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mengelompokkan kegiatan pemanggil per jenis dalam rentang dan tenant", async () => {
    vi.mocked(prisma.presurveiKegiatan.groupBy).mockResolvedValue([
      { jenis: "KUNJUNGAN", _count: { _all: 3 } },
      { jenis: "TELEPON", _count: { _all: 4 } },
    ] as never);

    const hasil = await new RingkasanSalesRepository().hitungKegiatanPerJenis(
      ID_SALES,
      RENTANG,
      ID_TENANT,
    );

    expect(prisma.presurveiKegiatan.groupBy).toHaveBeenCalledWith({
      by: ["jenis"],
      where: {
        userId: ID_SALES,
        tenantId: ID_TENANT,
        waktuMulai: { gte: RENTANG.mulai, lte: RENTANG.selesai },
      },
      _count: { _all: true },
    });
    expect(hasil).toEqual({ KUNJUNGAN: 3, TELEPON: 4 });
  });

  it("menolak tenant kosong tanpa menyentuh database", async () => {
    await expect(
      new RingkasanSalesRepository().hitungKegiatanPerJenis(ID_SALES, RENTANG, ""),
    ).rejects.toBeInstanceOf(TenantContextError);
    expect(prisma.presurveiKegiatan.groupBy).not.toHaveBeenCalled();
  });
});

describe("RingkasanSalesRepository.daftarProspekAktif", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mengambil prospek beban aktif milik pemanggil, terlama lebih dulu", async () => {
    const diubah = new Date("2026-09-01T00:00:00.000Z");
    vi.mocked(prisma.presurveiProspek.findMany).mockResolvedValue([
      { id: "p-1", nama: "Budi", noTelp: "081200", status: "BARU", updatedAt: diubah },
    ] as never);

    const hasil = await new RingkasanSalesRepository().daftarProspekAktif(
      ID_SALES,
      ID_TENANT,
    );

    expect(prisma.presurveiProspek.findMany).toHaveBeenCalledWith({
      where: {
        pemilikId: ID_SALES,
        tenantId: ID_TENANT,
        status: { in: ["BARU", "DIHUBUNGI", "TERTARIK", "NEGOSIASI"] },
      },
      orderBy: { updatedAt: "asc" },
      take: BATAS_PROSPEK_AKTIF_DIPERIKSA,
      select: { id: true, nama: true, noTelp: true, status: true, updatedAt: true },
    });
    expect(hasil).toEqual([
      { id: "p-1", nama: "Budi", noTelp: "081200", status: "BARU", updatedAt: diubah },
    ]);
  });

  it("menolak tenant kosong", async () => {
    await expect(
      new RingkasanSalesRepository().daftarProspekAktif(ID_SALES, ""),
    ).rejects.toBeInstanceOf(TenantContextError);
  });
});

describe("RingkasanSalesRepository.waktuKegiatanTerakhir", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tidak bertanya ke database bila tidak ada prospek", async () => {
    const hasil = await new RingkasanSalesRepository().waktuKegiatanTerakhir(
      [],
      ID_TENANT,
    );

    expect(hasil).toEqual({});
    expect(prisma.presurveiKegiatan.groupBy).not.toHaveBeenCalled();
  });

  it("mengambil waktu kegiatan terakhir per prospek dan membuang baris kosong", async () => {
    const terakhir = new Date("2026-09-20T08:00:00.000Z");
    vi.mocked(prisma.presurveiKegiatan.groupBy).mockResolvedValue([
      { prospekId: "p-1", _max: { waktuMulai: terakhir } },
      { prospekId: null, _max: { waktuMulai: terakhir } },
      { prospekId: "p-2", _max: { waktuMulai: null } },
    ] as never);

    const hasil = await new RingkasanSalesRepository().waktuKegiatanTerakhir(
      ["p-1", "p-2"],
      ID_TENANT,
    );

    expect(prisma.presurveiKegiatan.groupBy).toHaveBeenCalledWith({
      by: ["prospekId"],
      where: { prospekId: { in: ["p-1", "p-2"] }, tenantId: ID_TENANT },
      _max: { waktuMulai: true },
    });
    expect(hasil).toEqual({ "p-1": terakhir });
  });

  it("menolak tenant kosong walau daftar prospek terisi", async () => {
    await expect(
      new RingkasanSalesRepository().waktuKegiatanTerakhir(["p-1"], ""),
    ).rejects.toBeInstanceOf(TenantContextError);
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run tests/modules/presurvei/ringkasan-sales-rules.test.ts tests/modules/presurvei/ringkasan-sales-repository.test.ts --maxWorkers=50% --reporter=dot`
Expected: FAIL — `Failed to resolve import "@/modules/presurvei/domain/ringkasan-sales"` dan `.../RingkasanSalesRepository`.

- [ ] **Step 4: Implementasi aturan domain**

```ts
// modules/presurvei/domain/ringkasan-sales.ts
/**
 * Aturan ringkasan Beranda sales mobile — fungsi murni, tanpa I/O.
 *
 * Murni: tidak mengimpor apa pun dari luar folder domain. Batas hari dan
 * bulan adalah UTC, sama dengan laporan pencapaian
 * (`services/TargetService.ts`, `bangunRentangBulan`).
 */

import { KEGIATAN_JENIS, type KegiatanJenis } from "./entities/Kegiatan";
import type { ProspekStatus } from "./entities/Prospek";
import type { PeriodeTarget } from "./entities/Target";
import type { RentangPeriode } from "./ports/IKegiatanRepository";
import type { Pencapaian } from "./target-rules";

/** Jumlah prospek aktif terlama yang ditampilkan di Beranda. */
export const BATAS_PERLU_FOLLOW_UP = 5;

const SATU_HARI_MS = 24 * 60 * 60 * 1000;
const SATU_MILIDETIK = 1;
const INDEKS_BULAN_KE_NOMOR = 1;

/** Prospek aktif beserta waktu terakhir baris prospeknya berubah. */
export interface ProspekSentuhan {
  id: string;
  nama: string;
  noTelp: string;
  status: ProspekStatus;
  updatedAt: Date;
}

/** Prospek yang perlu di-follow-up beserta waktu sentuhan terakhirnya. */
export interface ProspekPerluFollowUp {
  id: string;
  nama: string;
  noTelp: string;
  status: ProspekStatus;
  sentuhanTerakhir: Date;
}

/** Target bulan berjalan milik pemanggil beserta pencapaiannya. */
export interface TargetSendiri {
  periodeTahun: number;
  periodeBulan: number;
  pencapaian: Pencapaian;
}

/** Ringkasan Beranda sales. `target` null berarti target belum ditetapkan. */
export interface RingkasanSales {
  tanggal: Date;
  kegiatanHariIni: Record<KegiatanJenis, number>;
  target: TargetSendiri | null;
  perluFollowUp: ProspekPerluFollowUp[];
}

/** Rentang tertutup satu hari UTC yang memuat `sekarang`. */
export function rentangHariUtc(sekarang: Date): RentangPeriode {
  const mulai = Date.UTC(
    sekarang.getUTCFullYear(),
    sekarang.getUTCMonth(),
    sekarang.getUTCDate(),
  );
  return {
    mulai: new Date(mulai),
    selesai: new Date(mulai + SATU_HARI_MS - SATU_MILIDETIK),
  };
}

/** Periode bulan UTC yang memuat `sekarang`, dengan bulan 1–12. */
export function periodeBulanUtc(sekarang: Date): PeriodeTarget {
  return {
    tahun: sekarang.getUTCFullYear(),
    bulan: sekarang.getUTCMonth() + INDEKS_BULAN_KE_NOMOR,
  };
}

/** Hitungan per jenis dengan nol untuk jenis yang tidak muncul di agregasi. */
export function lengkapiHitunganPerJenis(
  parsial: Partial<Record<KegiatanJenis, number>>,
): Record<KegiatanJenis, number> {
  return Object.fromEntries(
    KEGIATAN_JENIS.map((jenis) => [jenis, parsial[jenis] ?? 0]),
  ) as Record<KegiatanJenis, number>;
}

/**
 * Prospek yang paling lama tak disentuh, terlama lebih dulu, paling banyak
 * `batas`.
 *
 * "Disentuh" adalah yang lebih akhir antara perubahan baris prospek dan
 * kegiatan terakhir yang tertaut: mencatat follow-up tidak mengubah
 * `updatedAt` prospek (`services/KegiatanService.ts`, `catat`). Seri
 * diurutkan dengan id supaya urutannya stabil. Masukan tidak diubah.
 */
export function pilihPerluFollowUp(
  prospek: readonly ProspekSentuhan[],
  kegiatanTerakhir: Readonly<Record<string, Date>>,
  batas: number,
): ProspekPerluFollowUp[] {
  return prospek
    .map((baris) => ({
      id: baris.id,
      nama: baris.nama,
      noTelp: baris.noTelp,
      status: baris.status,
      sentuhanTerakhir: yangTerakhir(baris.updatedAt, kegiatanTerakhir[baris.id]),
    }))
    .sort(bandingkanSentuhan)
    .slice(0, batas);
}

function yangTerakhir(diubah: Date, kegiatan: Date | undefined): Date {
  if (kegiatan === undefined) return diubah;
  return kegiatan.getTime() > diubah.getTime() ? kegiatan : diubah;
}

function bandingkanSentuhan(
  a: ProspekPerluFollowUp,
  b: ProspekPerluFollowUp,
): number {
  const selisih = a.sentuhanTerakhir.getTime() - b.sentuhanTerakhir.getTime();
  return selisih !== 0 ? selisih : a.id.localeCompare(b.id);
}
```

- [ ] **Step 5: Implementasi port, penjaga tenant, dan repository**

```ts
// modules/presurvei/domain/ports/IRingkasanSalesRepository.ts
import type { KegiatanJenis } from "../entities/Kegiatan";
import type { ProspekSentuhan } from "../ringkasan-sales";
import type { RentangPeriode } from "./IKegiatanRepository";

/**
 * Kontrak baca-saja untuk ringkasan Beranda sales.
 *
 * Dipisah dari `IKegiatanRepository`/`IProspekRepository` supaya kebutuhan
 * satu layar tidak melebarkan port yang dipakai seluruh modul. Setiap
 * method menerima `tenantId` dan wajib menuliskannya eksplisit.
 */
export interface IRingkasanSalesRepository {
  /** Jumlah kegiatan `userId` per jenis dalam rentang; jenis kosong tidak muncul. */
  hitungKegiatanPerJenis(
    userId: string,
    rentang: RentangPeriode,
    tenantId: string,
  ): Promise<Partial<Record<KegiatanJenis, number>>>;
  /** Prospek beban aktif milik `pemilikId`, `updatedAt` terlama lebih dulu. */
  daftarProspekAktif(
    pemilikId: string,
    tenantId: string,
  ): Promise<ProspekSentuhan[]>;
  /** Waktu mulai kegiatan terakhir per prospek; prospek tanpa kegiatan tidak muncul. */
  waktuKegiatanTerakhir(
    prospekIds: readonly string[],
    tenantId: string,
  ): Promise<Record<string, Date>>;
}
```

```ts
// modules/presurvei/repositories/pastikan-tenant-terisi.ts
import { TenantContextError } from "@/lib/prisma-extension";

/**
 * Tolak query tanpa tenant sebelum sampai ke database.
 *
 * `tenantId` kosong di `where` berarti "tanpa syarat" bagi Prisma, dan
 * ekstensi tenant tidak menyaring apa pun untuk super admin
 * (`lib/prisma-extension.ts`). Pola sama dengan `SalesRepository`.
 */
export function pastikanTenantTerisi(tenantId: string, keterangan: string): void {
  if (tenantId) return;
  throw new TenantContextError(
    "missing-context",
    `${keterangan} diminta tanpa tenantId`,
  );
}
```

```ts
// modules/presurvei/repositories/RingkasanSalesRepository.ts
import { prisma } from "@/modules/database";
import type { KegiatanJenis } from "../domain/entities/Kegiatan";
import type { ProspekStatus } from "../domain/entities/Prospek";
import type { RentangPeriode } from "../domain/ports/IKegiatanRepository";
import type { IRingkasanSalesRepository } from "../domain/ports/IRingkasanSalesRepository";
import { daftarStatusBebanAktif } from "../domain/prospek-rules";
import type { ProspekSentuhan } from "../domain/ringkasan-sales";
import { pastikanTenantTerisi } from "./pastikan-tenant-terisi";

/**
 * Batas prospek aktif yang diperiksa untuk "Perlu di-follow-up".
 *
 * Diambil yang `updatedAt`-nya terlama. Hasil tepat selama seorang sales
 * memegang tidak lebih dari batas ini; di atasnya prospek yang barisnya
 * baru berubah tapi belum pernah di-follow-up bisa terlewat.
 */
export const BATAS_PROSPEK_AKTIF_DIPERIKSA = 200;

/**
 * Akses data baca-saja untuk ringkasan Beranda sales.
 *
 * `tenantId` ditulis eksplisit di setiap `where`, tidak diserahkan ke
 * ekstensi saja (pola `TargetRepository.findByUserPeriode`).
 */
export class RingkasanSalesRepository implements IRingkasanSalesRepository {
  /** Jumlah kegiatan pemanggil per jenis dalam satu rentang. */
  async hitungKegiatanPerJenis(
    userId: string,
    rentang: RentangPeriode,
    tenantId: string,
  ): Promise<Partial<Record<KegiatanJenis, number>>> {
    pastikanTenantTerisi(tenantId, "Ringkasan presurvei hitungKegiatanPerJenis");
    const hasil = await prisma.presurveiKegiatan.groupBy({
      by: ["jenis"],
      where: {
        userId,
        tenantId,
        waktuMulai: { gte: rentang.mulai, lte: rentang.selesai },
      },
      _count: { _all: true },
    });
    return Object.fromEntries(
      hasil.map((baris) => [baris.jenis, baris._count._all]),
    ) as Partial<Record<KegiatanJenis, number>>;
  }

  /** Prospek beban aktif milik pemanggil, `updatedAt` terlama lebih dulu. */
  async daftarProspekAktif(
    pemilikId: string,
    tenantId: string,
  ): Promise<ProspekSentuhan[]> {
    pastikanTenantTerisi(tenantId, "Ringkasan presurvei daftarProspekAktif");
    const rows = await prisma.presurveiProspek.findMany({
      where: { pemilikId, tenantId, status: { in: daftarStatusBebanAktif() } },
      orderBy: { updatedAt: "asc" },
      take: BATAS_PROSPEK_AKTIF_DIPERIKSA,
      select: { id: true, nama: true, noTelp: true, status: true, updatedAt: true },
    });
    return rows.map((baris) => ({
      id: baris.id,
      nama: baris.nama,
      noTelp: baris.noTelp,
      status: baris.status as ProspekStatus,
      updatedAt: baris.updatedAt,
    }));
  }

  /** Waktu mulai kegiatan terakhir per prospek. */
  async waktuKegiatanTerakhir(
    prospekIds: readonly string[],
    tenantId: string,
  ): Promise<Record<string, Date>> {
    pastikanTenantTerisi(tenantId, "Ringkasan presurvei waktuKegiatanTerakhir");
    if (prospekIds.length === 0) return {};
    const hasil = await prisma.presurveiKegiatan.groupBy({
      by: ["prospekId"],
      where: { prospekId: { in: [...prospekIds] }, tenantId },
      _max: { waktuMulai: true },
    });
    return Object.fromEntries(
      hasil
        .filter((baris) => baris.prospekId !== null && baris._max.waktuMulai !== null)
        .map((baris) => [baris.prospekId as string, baris._max.waktuMulai as Date]),
    );
  }
}
```

`modules/presurvei/repositories/TargetRepository.ts` — ganti impor `TenantContextError` di baris 1 dengan:

```ts
import { pastikanTenantTerisi } from "./pastikan-tenant-terisi";
```

ganti dua pemanggilan `pastikanTenantTerisi(tenantId, "findByUserPeriode")` dan `pastikanTenantTerisi(input.tenantId, "simpan")` menjadi:

```ts
    pastikanTenantTerisi(tenantId, "Target presurvei findByUserPeriode");
```

```ts
    pastikanTenantTerisi(input.tenantId, "Target presurvei simpan");
```

lalu hapus fungsi lokal `pastikanTenantTerisi` beserta komentarnya (baris 87-97). Pesan galat tetap `Target presurvei <operasi> diminta tanpa tenantId`, sehingga `tests/modules/presurvei/target-repository.test.ts:222` (`toThrow("simpan")`) tetap hijau.

- [ ] **Step 6: Jalankan test, test target lama, dan typecheck**

Run: `npx vitest run tests/modules/presurvei/ringkasan-sales-rules.test.ts tests/modules/presurvei/ringkasan-sales-repository.test.ts tests/modules/presurvei/target-repository.test.ts --maxWorkers=50% --reporter=dot`
Expected: semua PASS.

Run: `npx tsc -p tsconfig.typecheck.json --noEmit`
Expected: exit 0.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `yangTerakhir` selalu mengembalikan `diubah` | "kegiatan tertaut yang lebih baru menggeser sentuhan terakhir" |
| `kegiatan.getTime() > diubah.getTime()` jadi `true` | "kegiatan yang lebih lama dari updatedAt tidak memundurkan sentuhan" |
| Hapus `a.id.localeCompare(b.id)` (kembalikan `selisih` saja) | "memotong ke batas dan mengurutkan seri dengan id" |
| Ganti `prospek.map(...)` jadi `(prospek as ProspekSentuhan[]).sort(...)` tanpa `map` (sort di tempat) | "tidak mengurutkan ulang array masukan" |
| `INDEKS_BULAN_KE_NOMOR = 0` | "memberi bulan 1–12, bukan indeks 0–11" |
| `?? 0` jadi `?? 1` di `lengkapiHitunganPerJenis` | "mengisi nol untuk jenis yang tidak muncul…" |
| Hapus `tenantId` dari `where` `hitungKegiatanPerJenis` | "mengelompokkan kegiatan pemanggil per jenis…" |
| Tukar `userId` dan `tenantId` di `where` `hitungKegiatanPerJenis` | "mengelompokkan kegiatan pemanggil per jenis…" |
| `orderBy: { updatedAt: "desc" }` | "mengambil prospek beban aktif milik pemanggil, terlama lebih dulu" |
| Hapus `if (prospekIds.length === 0) return {}` | "tidak bertanya ke database bila tidak ada prospek" |
| Hapus filter `baris.prospekId !== null` | "mengambil waktu kegiatan terakhir per prospek dan membuang baris kosong" |
| Hapus `pastikanTenantTerisi(...)` di `waktuKegiatanTerakhir` | "menolak tenant kosong walau daftar prospek terisi" |

Catatan untuk reviewer: memindahkan penjaga tenant di `waktuKegiatanTerakhir` ke **bawah** guard daftar kosong **tidak** membuat test apa pun merah, dan memang tidak berbahaya — daftar kosong tidak menyentuh database. Jangan menambah test untuk mengunci urutan itu.

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add modules/presurvei/domain/ringkasan-sales.ts modules/presurvei/domain/ports/IRingkasanSalesRepository.ts modules/presurvei/repositories/pastikan-tenant-terisi.ts modules/presurvei/repositories/RingkasanSalesRepository.ts modules/presurvei/repositories/TargetRepository.ts tests/modules/presurvei/ringkasan-sales-rules.test.ts tests/modules/presurvei/ringkasan-sales-repository.test.ts
git commit -m "$(cat <<'EOF'
feat(presurvei): aturan dan repository ringkasan beranda sales

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Ringkasan sales — `TargetService.pencapaianSendiri` dan service

**Repo:** `netmanager`

**Files:**
- Modify: `modules/presurvei/services/TargetService.ts:1-126`
- Create: `modules/presurvei/services/RingkasanSalesService.ts`
- Modify: `modules/presurvei/index.ts` (ekspor service dan tipe)
- Test: `tests/modules/presurvei/target-service.test.ts` (tambah describe), `tests/modules/presurvei/ringkasan-sales-service.test.ts`

**Interfaces:**
- Consumes: Task 2 — `IRingkasanSalesRepository`, `RingkasanSalesRepository`, `rentangHariUtc`, `periodeBulanUtc`, `lengkapiHitunganPerJenis`, `pilihPerluFollowUp`, `BATAS_PERLU_FOLLOW_UP`, `RingkasanSales`, `TargetSendiri`.
- Produces:
  - `TargetService.pencapaianSendiri(userId: string, periode: PeriodeTarget, tenantId: string): Promise<BarisLaporan | null>`
  - `interface MasukanRingkasanSales { userId: string; tenantId: string; sekarang: Date }`
  - `class RingkasanSalesService { constructor(repository?: IRingkasanSalesRepository, targetService?: Pick<TargetService, "pencapaianSendiri">); ringkasan(masukan: MasukanRingkasanSales): Promise<RingkasanSales> }`
  - Ekspor barrel: `RingkasanSalesService`, `type MasukanRingkasanSales`, `type RingkasanSales`, `type ProspekPerluFollowUp`, `type TargetSendiri`.

- [ ] **Step 1: Tulis test `pencapaianSendiri` yang gagal**

Tambahkan di akhir `tests/modules/presurvei/target-service.test.ts` (memakai `target`, `bangunTargetRepo`, `bangunKegiatanRepo`, `bangunProspekRepo` yang sudah ada di berkas):

```ts
describe("TargetService.pencapaianSendiri", () => {
  let targetRepo: ITargetRepository;
  let kegiatanRepo: IKegiatanRepository;
  let prospekRepo: IProspekRepository;

  beforeEach(() => {
    targetRepo = bangunTargetRepo();
    kegiatanRepo = bangunKegiatanRepo();
    prospekRepo = bangunProspekRepo();
  });

  const service = () => new TargetService(targetRepo, kegiatanRepo, prospekRepo);
  const SEPTEMBER = { tahun: 2026, bulan: 9 };

  it("null bila target periode itu belum ditetapkan, tanpa menghitung realisasi", async () => {
    vi.mocked(targetRepo.findByUserPeriode).mockResolvedValue(null);

    const hasil = await service().pencapaianSendiri("sales-1", SEPTEMBER, "tenant-1");

    expect(hasil).toBeNull();
    expect(targetRepo.findByUserPeriode).toHaveBeenCalledWith(
      "sales-1",
      SEPTEMBER,
      "tenant-1",
    );
    expect(kegiatanRepo.hitungPerUser).not.toHaveBeenCalled();
  });

  it("hanya memakai realisasi milik user itu", async () => {
    vi.mocked(targetRepo.findByUserPeriode).mockResolvedValue(target());
    vi.mocked(kegiatanRepo.hitungPerUser).mockResolvedValue({ "sales-1": 10, "sales-2": 99 });
    vi.mocked(prospekRepo.hitungBaruPerUser).mockResolvedValue({ "sales-1": 3, "sales-2": 88 });
    vi.mocked(prospekRepo.hitungKonversiPerUser).mockResolvedValue({ "sales-1": 1, "sales-2": 77 });

    const hasil = await service().pencapaianSendiri("sales-1", SEPTEMBER, "tenant-1");

    expect(hasil).toEqual({
      userId: "sales-1",
      periodeTahun: 2026,
      periodeBulan: 9,
      pencapaian: {
        kunjungan: { target: 20, tercapai: 10, persen: 50 },
        prospek: { target: 10, tercapai: 3, persen: 30 },
        konversi: { target: 5, tercapai: 1, persen: 20 },
      },
    });
  });

  it("realisasi nol bila user belum punya kegiatan sama sekali", async () => {
    vi.mocked(targetRepo.findByUserPeriode).mockResolvedValue(target());
    vi.mocked(kegiatanRepo.hitungPerUser).mockResolvedValue({});
    vi.mocked(prospekRepo.hitungBaruPerUser).mockResolvedValue({});
    vi.mocked(prospekRepo.hitungKonversiPerUser).mockResolvedValue({});

    const hasil = await service().pencapaianSendiri("sales-1", SEPTEMBER, "tenant-1");

    expect(hasil?.pencapaian.kunjungan).toEqual({ target: 20, tercapai: 0, persen: 0 });
  });

  it("menghitung realisasi dalam rentang bulan penuh periode itu", async () => {
    vi.mocked(targetRepo.findByUserPeriode).mockResolvedValue(target());

    await service().pencapaianSendiri("sales-1", SEPTEMBER, "tenant-1");

    expect(kegiatanRepo.hitungPerUser).toHaveBeenCalledWith({
      mulai: new Date("2026-09-01T00:00:00.000Z"),
      selesai: new Date("2026-09-30T23:59:59.999Z"),
    });
  });
});
```

- [ ] **Step 2: Tulis test service ringkasan yang gagal**

```ts
// tests/modules/presurvei/ringkasan-sales-service.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IRingkasanSalesRepository } from "@/modules/presurvei/domain/ports/IRingkasanSalesRepository";
import type { ProspekSentuhan } from "@/modules/presurvei/domain/ringkasan-sales";
import type { BarisLaporan } from "@/modules/presurvei/services/TargetService";
import { RingkasanSalesService } from "@/modules/presurvei/services/RingkasanSalesService";

/**
 * Service hanya merangkai: identitas dan tenant berasal dari masukan (route
 * mengisinya dari sesi), batas waktu dari `sekarang`. `userId` dan
 * `tenantId` bernilai berbeda supaya tertukarnya terlihat.
 */

const ID_SALES = "sales-a";
const ID_TENANT = "tenant-x";
const SEKARANG = new Date("2026-09-24T23:30:00.000Z");

const PROSPEK_A: ProspekSentuhan = {
  id: "p-a",
  nama: "Andi",
  noTelp: "081201",
  status: "TERTARIK",
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};
const PROSPEK_B: ProspekSentuhan = {
  id: "p-b",
  nama: "Bela",
  noTelp: "081202",
  status: "DIHUBUNGI",
  updatedAt: new Date("2026-09-10T00:00:00.000Z"),
};

const bangunRepo = (): IRingkasanSalesRepository => ({
  hitungKegiatanPerJenis: vi.fn().mockResolvedValue({ KUNJUNGAN: 3, TELEPON: 4 }),
  daftarProspekAktif: vi.fn().mockResolvedValue([PROSPEK_A, PROSPEK_B]),
  waktuKegiatanTerakhir: vi
    .fn()
    .mockResolvedValue({ "p-a": new Date("2026-09-20T00:00:00.000Z") }),
});

describe("RingkasanSalesService.ringkasan", () => {
  let repo: IRingkasanSalesRepository;
  let pencapaianSendiri: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = bangunRepo();
    pencapaianSendiri = vi.fn().mockResolvedValue(null);
  });

  const jalankan = () =>
    new RingkasanSalesService(repo, { pencapaianSendiri }).ringkasan({
      userId: ID_SALES,
      tenantId: ID_TENANT,
      sekarang: SEKARANG,
    });

  it("meneruskan userId dan tenantId ke setiap sumber tanpa tertukar", async () => {
    await jalankan();

    expect(repo.hitungKegiatanPerJenis).toHaveBeenCalledWith(
      ID_SALES,
      {
        mulai: new Date("2026-09-24T00:00:00.000Z"),
        selesai: new Date("2026-09-24T23:59:59.999Z"),
      },
      ID_TENANT,
    );
    expect(repo.daftarProspekAktif).toHaveBeenCalledWith(ID_SALES, ID_TENANT);
    expect(pencapaianSendiri).toHaveBeenCalledWith(
      ID_SALES,
      { tahun: 2026, bulan: 9 },
      ID_TENANT,
    );
    expect(repo.waktuKegiatanTerakhir).toHaveBeenCalledWith(["p-a", "p-b"], ID_TENANT);
  });

  it("target belum ditetapkan tetap null, bukan nol", async () => {
    const hasil = await jalankan();

    expect(hasil.target).toBeNull();
  });

  it("memetakan target yang ada tanpa membawa userId", async () => {
    const baris: BarisLaporan = {
      userId: ID_SALES,
      periodeTahun: 2026,
      periodeBulan: 9,
      pencapaian: {
        kunjungan: { target: 20, tercapai: 10, persen: 50 },
        prospek: { target: 10, tercapai: 3, persen: 30 },
        konversi: { target: 5, tercapai: 1, persen: 20 },
      },
    };
    pencapaianSendiri.mockResolvedValue(baris);

    const hasil = await jalankan();

    expect(hasil.target).toEqual({
      periodeTahun: 2026,
      periodeBulan: 9,
      pencapaian: baris.pencapaian,
    });
  });

  it("melengkapi hitungan hari ini dengan nol", async () => {
    const hasil = await jalankan();

    expect(hasil.kegiatanHariIni).toEqual({
      KUNJUNGAN: 3,
      SURVEI_LOKASI: 0,
      TELEPON: 4,
      CHAT: 0,
      IKLAN: 0,
    });
  });

  it("mengurutkan follow-up menurut sentuhan terakhir", async () => {
    const hasil = await jalankan();

    expect(hasil.perluFollowUp.map((baris) => baris.id)).toEqual(["p-b", "p-a"]);
  });

  it("tanggal ringkasan adalah awal hari UTC", async () => {
    const hasil = await jalankan();

    expect(hasil.tanggal).toEqual(new Date("2026-09-24T00:00:00.000Z"));
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run tests/modules/presurvei/target-service.test.ts tests/modules/presurvei/ringkasan-sales-service.test.ts --maxWorkers=50% --reporter=dot`
Expected: FAIL — `pencapaianSendiri is not a function` dan impor `RingkasanSalesService` tidak ditemukan.

- [ ] **Step 4: Implementasi `TargetService`**

Di `modules/presurvei/services/TargetService.ts`, ganti method `laporanPencapaian` (baris 80-103) dengan tiga method berikut:

```ts
  /** Target beserta realisasinya untuk seluruh sales pada satu periode. */
  async laporanPencapaian(periode: PeriodeTarget): Promise<BarisLaporan[]> {
    const target = await this.targetRepository.findByPeriode(periode);
    if (target.length === 0) return [];

    const realisasi = await this.hitungRealisasi(periode);
    return target.map((baris) => bangunBarisLaporan(baris, realisasi));
  }

  /**
   * Target seorang sales pada satu periode beserta realisasinya, atau null
   * bila targetnya belum ditetapkan.
   *
   * Null, bukan baris bernilai nol: `hitungPersen` menganggap target nol
   * tercapai penuh (`domain/target-rules.ts:53-54`), jadi "belum ada target"
   * yang dipetakan ke nol akan tampil 100%. Realisasi tidak dihitung bila
   * target tidak ada. Realisasi disaring tenant oleh ekstensi Prisma, sama
   * dengan `laporanPencapaian`; hanya angka milik `userId` yang dipakai.
   */
  async pencapaianSendiri(
    userId: string,
    periode: PeriodeTarget,
    tenantId: string,
  ): Promise<BarisLaporan | null> {
    const target = await this.targetRepository.findByUserPeriode(
      userId,
      periode,
      tenantId,
    );
    if (!target) return null;
    return bangunBarisLaporan(target, await this.hitungRealisasi(periode));
  }

  /** Realisasi per user pada satu bulan penuh, lewat agregasi repository. */
  private async hitungRealisasi(
    periode: PeriodeTarget,
  ): Promise<RealisasiPerUser> {
    const rentang = bangunRentangBulan(periode);
    const [kunjungan, prospek, konversi] = await Promise.all([
      this.kegiatanRepository.hitungPerUser(rentang),
      this.prospekRepository.hitungBaruPerUser(rentang),
      this.prospekRepository.hitungKonversiPerUser(rentang),
    ]);
    return { kunjungan, prospek, konversi };
  }
```

Tambahkan di bawah konstanta `SATU_MILIDETIK` (baris 26):

```ts
/** Realisasi per user, berkunci userId, untuk satu periode. */
interface RealisasiPerUser {
  kunjungan: Record<string, number>;
  prospek: Record<string, number>;
  konversi: Record<string, number>;
}
```

dan di akhir berkas, setelah `bangunRentangBulan`:

```ts
/** Satu baris laporan untuk target ini; user tanpa kegiatan dihitung nol. */
function bangunBarisLaporan(
  target: TargetEntity,
  realisasi: RealisasiPerUser,
): BarisLaporan {
  return {
    userId: target.userId,
    periodeTahun: target.periodeTahun,
    periodeBulan: target.periodeBulan,
    pencapaian: hitungPencapaian(target, {
      kunjungan: realisasi.kunjungan[target.userId] ?? 0,
      prospek: realisasi.prospek[target.userId] ?? 0,
      konversi: realisasi.konversi[target.userId] ?? 0,
    }),
  };
}
```

- [ ] **Step 5: Implementasi `RingkasanSalesService`**

```ts
// modules/presurvei/services/RingkasanSalesService.ts
import type { IRingkasanSalesRepository } from "../domain/ports/IRingkasanSalesRepository";
import {
  BATAS_PERLU_FOLLOW_UP,
  lengkapiHitunganPerJenis,
  periodeBulanUtc,
  pilihPerluFollowUp,
  rentangHariUtc,
  type RingkasanSales,
  type TargetSendiri,
} from "../domain/ringkasan-sales";
import { RingkasanSalesRepository } from "../repositories/RingkasanSalesRepository";
import { TargetService, type BarisLaporan } from "./TargetService";

/** Masukan ringkasan: identitas dan tenant sesi, serta jam server. */
export interface MasukanRingkasanSales {
  userId: string;
  tenantId: string;
  sekarang: Date;
}

/**
 * Orkestrasi ringkasan Beranda sales mobile.
 *
 * Tidak memuat otorisasi: route menurunkan `userId` dan `tenantId` dari sesi.
 */
export class RingkasanSalesService {
  constructor(
    private readonly repository: IRingkasanSalesRepository = new RingkasanSalesRepository(),
    private readonly targetService: Pick<TargetService, "pencapaianSendiri"> = new TargetService(),
  ) {}

  /** Ringkasan milik `userId` untuk hari dan bulan UTC yang memuat `sekarang`. */
  async ringkasan(masukan: MasukanRingkasanSales): Promise<RingkasanSales> {
    const { userId, tenantId, sekarang } = masukan;
    const hariIni = rentangHariUtc(sekarang);
    const [hitungan, target, prospekAktif] = await Promise.all([
      this.repository.hitungKegiatanPerJenis(userId, hariIni, tenantId),
      this.targetService.pencapaianSendiri(userId, periodeBulanUtc(sekarang), tenantId),
      this.repository.daftarProspekAktif(userId, tenantId),
    ]);
    const kegiatanTerakhir = await this.repository.waktuKegiatanTerakhir(
      prospekAktif.map((prospek) => prospek.id),
      tenantId,
    );

    return {
      tanggal: hariIni.mulai,
      kegiatanHariIni: lengkapiHitunganPerJenis(hitungan),
      target: keTargetSendiri(target),
      perluFollowUp: pilihPerluFollowUp(prospekAktif, kegiatanTerakhir, BATAS_PERLU_FOLLOW_UP),
    };
  }
}

/** Buang `userId` dari baris laporan; null tetap null. */
function keTargetSendiri(baris: BarisLaporan | null): TargetSendiri | null {
  if ((baris ?? null) === null) return null;
  return {
    periodeTahun: baris.periodeTahun,
    periodeBulan: baris.periodeBulan,
    pencapaian: baris.pencapaian,
  };
}
```

Di `modules/presurvei/index.ts`, setelah baris `export { SalesPresurveiService } ...`, tambahkan:

```ts
export {
  RingkasanSalesService,
  type MasukanRingkasanSales,
} from "./services/RingkasanSalesService";

export {
  type ProspekPerluFollowUp,
  type RingkasanSales,
  type TargetSendiri,
} from "./domain/ringkasan-sales";
```

- [ ] **Step 6: Jalankan test modul presurvei dan typecheck**

Run: `npx vitest run tests/modules/presurvei --maxWorkers=50% --reporter=dot`
Expected: semua PASS (termasuk `laporanPencapaian` lama sebagai penjaga refactor).

Run: `npx tsc -p tsconfig.typecheck.json --noEmit`
Expected: exit 0.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Hapus `if (!target) return null;` | "null bila target periode itu belum ditetapkan…" |
| `realisasi.kunjungan[target.userId]` jadi `Math.max(...Object.values(realisasi.kunjungan))` | "hanya memakai realisasi milik user itu" |
| Tukar `realisasi.prospek` dan `realisasi.konversi` di `bangunBarisLaporan` | "hanya memakai realisasi milik user itu" |
| `?? 0` jadi `?? 1` di `bangunBarisLaporan` | "realisasi nol bila user belum punya kegiatan sama sekali" |
| Tukar `userId` dan `tenantId` di panggilan `hitungKegiatanPerJenis` | "meneruskan userId dan tenantId ke setiap sumber tanpa tertukar" |
| `keTargetSendiri` mengembalikan objek nol saat null | "target belum ditetapkan tetap null, bukan nol" |
| `pilihPerluFollowUp(prospekAktif, {}, …)` | "mengurutkan follow-up menurut sentuhan terakhir" |
| `tanggal: sekarang` | "tanggal ringkasan adalah awal hari UTC" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add modules/presurvei/services/TargetService.ts modules/presurvei/services/RingkasanSalesService.ts modules/presurvei/index.ts tests/modules/presurvei/target-service.test.ts tests/modules/presurvei/ringkasan-sales-service.test.ts
git commit -m "$(cat <<'EOF'
feat(presurvei): service ringkasan beranda sales dan pencapaian sendiri

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Ringkasan sales — DTO dan route mobile

**Repo:** `netmanager`

**Files:**
- Create: `modules/presurvei/dto/ringkasan-sales.dto.ts`
- Modify: `modules/presurvei/index.ts` (ekspor DTO)
- Create: `app/api/mobile/presurvei/ringkasan/route.ts`
- Test: `tests/modules/presurvei/ringkasan-sales-dto.test.ts`, `tests/api/presurvei-ringkasan-mobile-route.test.ts`

**Interfaces:**
- Consumes: Task 3 — `RingkasanSalesService`, `RingkasanSales`; `createHandler`, `apiSuccess`, `requireSessionTenantId` (`@/lib/api`).
- Produces (kontrak yang dikonsumsi mobile Task 7/8/19):
  - `GET /api/mobile/presurvei/ringkasan`, izin `m_presurvei:read`, tanpa query param.
  - 200 → `{ success: true, data: RingkasanSalesDto }`
  - 403 → pemanggil tanpa `m_presurvei:read` (termasuk pemegang `presurvei:read` web saja).
  - 400 → sesi tanpa `tenantId` (`TENANT_ID_REQUIRED`).
  - `interface BarisPencapaianDto { target: number; tercapai: number; persen: number }`
  - `interface RingkasanSalesDto { tanggal: string /* YYYY-MM-DD, UTC */; kegiatanHariIni: Record<KegiatanJenis, number>; target: { periodeTahun: number; periodeBulan: number; kunjungan: BarisPencapaianDto; prospek: BarisPencapaianDto; konversi: BarisPencapaianDto } | null; perluFollowUp: { id: string; nama: string; noTelp: string; status: ProspekStatus; sentuhanTerakhir: string /* ISO */ }[] }`
  - `toRingkasanSalesDto(ringkasan: RingkasanSales): RingkasanSalesDto`

- [ ] **Step 1: Tulis test DTO yang gagal**

```ts
// tests/modules/presurvei/ringkasan-sales-dto.test.ts
import { describe, expect, it } from "vitest";

import type { RingkasanSales } from "@/modules/presurvei";
import { toRingkasanSalesDto } from "@/modules/presurvei/dto/ringkasan-sales.dto";

// Anotasi eksplisit wajib: `target: null` tanpa tipe kontekstual memicu
// TS7018 karena strictNullChecks mati (lihat Global Constraints).
const dasar: RingkasanSales = {
  tanggal: new Date("2026-09-24T00:00:00.000Z"),
  kegiatanHariIni: { KUNJUNGAN: 3, SURVEI_LOKASI: 1, TELEPON: 4, CHAT: 2, IKLAN: 0 },
  target: null,
  perluFollowUp: [
    {
      id: "p-1",
      nama: "Budi",
      noTelp: "081200",
      status: "TERTARIK",
      sentuhanTerakhir: new Date("2026-09-20T08:15:00.000Z"),
    },
  ],
};

describe("toRingkasanSalesDto", () => {
  it("menulis tanggal sebagai YYYY-MM-DD dan sentuhan sebagai ISO", () => {
    const dto = toRingkasanSalesDto(dasar);

    expect(dto.tanggal).toBe("2026-09-24");
    expect(dto.perluFollowUp).toEqual([
      {
        id: "p-1",
        nama: "Budi",
        noTelp: "081200",
        status: "TERTARIK",
        sentuhanTerakhir: "2026-09-20T08:15:00.000Z",
      },
    ]);
  });

  it("target belum ditetapkan tetap null", () => {
    expect(toRingkasanSalesDto(dasar).target).toBeNull();
  });

  it("meratakan pencapaian target tanpa menukar barisnya", () => {
    const dto = toRingkasanSalesDto({
      ...dasar,
      target: {
        periodeTahun: 2026,
        periodeBulan: 9,
        pencapaian: {
          kunjungan: { target: 20, tercapai: 10, persen: 50 },
          prospek: { target: 10, tercapai: 3, persen: 30 },
          konversi: { target: 5, tercapai: 1, persen: 20 },
        },
      },
    });

    expect(dto.target).toEqual({
      periodeTahun: 2026,
      periodeBulan: 9,
      kunjungan: { target: 20, tercapai: 10, persen: 50 },
      prospek: { target: 10, tercapai: 3, persen: 30 },
      konversi: { target: 5, tercapai: 1, persen: 20 },
    });
  });

  it("menyalin hitungan per jenis, bukan meneruskan referensinya", () => {
    const hitungan = Object.freeze({ ...dasar.kegiatanHariIni });

    const dto = toRingkasanSalesDto({ ...dasar, kegiatanHariIni: hitungan });

    expect(dto.kegiatanHariIni).toEqual({
      KUNJUNGAN: 3,
      SURVEI_LOKASI: 1,
      TELEPON: 4,
      CHAT: 2,
      IKLAN: 0,
    });
    expect(dto.kegiatanHariIni).not.toBe(hitungan);
  });
});
```

- [ ] **Step 2: Tulis test route yang gagal**

```ts
// tests/api/presurvei-ringkasan-mobile-route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RingkasanSales } from "@/modules/presurvei";

/**
 * Route ringkasan tidak menerima parameter: pemilik selalu id sesi, tenant
 * selalu tenant sesi. Test ini memastikan masukan klien tidak pernah bisa
 * menunjuk data orang lain, dan pemanggil tanpa izin mobile atau tanpa
 * tenant ditolak sebelum service disentuh.
 */

const mockFns = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getUserPermissions: vi.fn(),
  ringkasan: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mockFns.getServerSession }));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
  authConfig: {},
  getUserPermissions: mockFns.getUserPermissions,
}));

vi.mock("@/modules/presurvei", async () => {
  const actual = await vi.importActual<typeof import("@/modules/presurvei")>(
    "@/modules/presurvei",
  );
  return {
    ...actual,
    RingkasanSalesService: class {
      ringkasan = mockFns.ringkasan;
    },
  };
});

import { GET } from "@/app/api/mobile/presurvei/ringkasan/route";

const ID_SESI = "sales-a";
const TENANT_SESI = "tenant-1";

const RINGKASAN: RingkasanSales = {
  tanggal: new Date("2026-09-24T00:00:00.000Z"),
  kegiatanHariIni: { KUNJUNGAN: 3, SURVEI_LOKASI: 1, TELEPON: 4, CHAT: 2, IKLAN: 0 },
  target: null,
  perluFollowUp: [],
};

const beriSesi = (permissions: string[], tenantId: string | undefined = TENANT_SESI) => {
  mockFns.getServerSession.mockResolvedValue({
    user: { id: ID_SESI, email: "sales-a@contoh.id", permissions, tenantId },
  });
};

const minta = (query = "") =>
  GET(new NextRequest(`http://localhost/api/mobile/presurvei/ringkasan${query}`), {
    params: Promise.resolve({}),
  } as never);

describe("GET /api/mobile/presurvei/ringkasan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFns.ringkasan.mockResolvedValue(RINGKASAN);
  });

  it("mengembalikan ringkasan milik sesi dengan tenant sesi", async () => {
    beriSesi(["m_presurvei:read"]);

    const respons = await minta();

    expect(respons.status).toBe(200);
    expect(mockFns.ringkasan).toHaveBeenCalledWith({
      userId: ID_SESI,
      tenantId: TENANT_SESI,
      sekarang: expect.any(Date),
    });
    expect(await respons.json()).toEqual({
      success: true,
      data: {
        tanggal: "2026-09-24",
        kegiatanHariIni: { KUNJUNGAN: 3, SURVEI_LOKASI: 1, TELEPON: 4, CHAT: 2, IKLAN: 0 },
        target: null,
        perluFollowUp: [],
      },
    });
  });

  it("mengabaikan userId dan tenantId dari query", async () => {
    beriSesi(["m_presurvei:read"]);

    await minta("?userId=sales-b&tenantId=tenant-9");

    expect(mockFns.ringkasan).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ID_SESI, tenantId: TENANT_SESI }),
    );
  });

  it("menolak pemegang izin web saja dengan 403", async () => {
    beriSesi(["presurvei:read"]);

    const respons = await minta();

    expect(respons.status).toBe(403);
    expect(mockFns.ringkasan).not.toHaveBeenCalled();
  });

  it("menolak pemanggil tanpa izin presurvei dengan 403", async () => {
    beriSesi(["m_canvasing:read"]);

    const respons = await minta();

    expect(respons.status).toBe(403);
    expect(mockFns.ringkasan).not.toHaveBeenCalled();
  });

  it("menolak sesi tanpa tenant dengan 400", async () => {
    beriSesi(["*"], undefined);

    const respons = await minta();

    expect(respons.status).toBe(400);
    expect(mockFns.ringkasan).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx vitest run tests/modules/presurvei/ringkasan-sales-dto.test.ts tests/api/presurvei-ringkasan-mobile-route.test.ts --maxWorkers=50% --reporter=dot`
Expected: FAIL — DTO dan route belum ada (`Failed to resolve import`).

- [ ] **Step 4: Implementasi DTO**

```ts
// modules/presurvei/dto/ringkasan-sales.dto.ts
import type { KegiatanJenis } from "../domain/entities/Kegiatan";
import type { ProspekStatus } from "../domain/entities/Prospek";
import type { RingkasanSales } from "../domain/ringkasan-sales";

/**
 * Bentuk ringkasan Beranda sales yang dikirim ke aplikasi mobile.
 *
 * `tanggal` hanya bagian tanggal (hari UTC yang dihitung), supaya klien
 * tidak menafsirkan ulang jam di zona perangkat.
 */

const PANJANG_TANGGAL_ISO = 10;

export interface BarisPencapaianDto {
  target: number;
  tercapai: number;
  persen: number;
}

export interface TargetSendiriDto {
  periodeTahun: number;
  periodeBulan: number;
  kunjungan: BarisPencapaianDto;
  prospek: BarisPencapaianDto;
  konversi: BarisPencapaianDto;
}

export interface ProspekPerluFollowUpDto {
  id: string;
  nama: string;
  noTelp: string;
  status: ProspekStatus;
  sentuhanTerakhir: string;
}

export interface RingkasanSalesDto {
  tanggal: string;
  kegiatanHariIni: Record<KegiatanJenis, number>;
  target: TargetSendiriDto | null;
  perluFollowUp: ProspekPerluFollowUpDto[];
}

/** Ringkasan untuk klien; target yang belum ditetapkan tetap null. */
export function toRingkasanSalesDto(ringkasan: RingkasanSales): RingkasanSalesDto {
  const target = ringkasan.target ?? null;
  return {
    tanggal: ringkasan.tanggal.toISOString().slice(0, PANJANG_TANGGAL_ISO),
    kegiatanHariIni: { ...ringkasan.kegiatanHariIni },
    target:
      target === null
        ? null
        : {
            periodeTahun: target.periodeTahun,
            periodeBulan: target.periodeBulan,
            kunjungan: target.pencapaian.kunjungan,
            prospek: target.pencapaian.prospek,
            konversi: target.pencapaian.konversi,
          },
    perluFollowUp: ringkasan.perluFollowUp.map((prospek) => ({
      id: prospek.id,
      nama: prospek.nama,
      noTelp: prospek.noTelp,
      status: prospek.status,
      sentuhanTerakhir: prospek.sentuhanTerakhir.toISOString(),
    })),
  };
}
```

Di `modules/presurvei/index.ts`, setelah blok ekspor `./dto/target.dto`, tambahkan:

```ts
export {
  toRingkasanSalesDto,
  type RingkasanSalesDto,
} from "./dto/ringkasan-sales.dto";
```

- [ ] **Step 5: Implementasi route**

```ts
// app/api/mobile/presurvei/ringkasan/route.ts
import { apiSuccess, createHandler, requireSessionTenantId } from "@/lib/api";
import { RingkasanSalesService, toRingkasanSalesDto } from "@/modules/presurvei";

const service = new RingkasanSalesService();

/**
 * GET /api/mobile/presurvei/ringkasan — ringkasan Beranda sales milik pemanggil.
 *
 * Tanpa parameter: pemilik selalu id sesi dan tenant selalu tenant sesi,
 * sehingga tidak ada masukan klien yang bisa menunjuk data orang lain.
 * Sesi tanpa tenant — termasuk super admin — ditolak 400 oleh
 * `requireSessionTenantId` (`lib/api/session-tenant.ts:13-23`).
 */
export const GET = createHandler(
  { auth: true, permissions: ["m_presurvei:read"] },
  async (_request, ctx) => {
    const ringkasan = await service.ringkasan({
      userId: ctx.session!.user.id,
      tenantId: requireSessionTenantId(ctx),
      sekarang: new Date(),
    });
    return apiSuccess(toRingkasanSalesDto(ringkasan));
  },
);
```

- [ ] **Step 6: Jalankan test dan typecheck**

Run: `npx vitest run tests/modules/presurvei/ringkasan-sales-dto.test.ts tests/api/presurvei-ringkasan-mobile-route.test.ts --maxWorkers=50% --reporter=dot`
Expected: semua PASS.

Run: `npx tsc -p tsconfig.typecheck.json --noEmit`
Expected: exit 0.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `PANJANG_TANGGAL_ISO = 19` | "menulis tanggal sebagai YYYY-MM-DD…" dan "mengembalikan ringkasan milik sesi…" |
| Tukar `prospek` dan `konversi` di DTO | "meratakan pencapaian target tanpa menukar barisnya" |
| `kegiatanHariIni: ringkasan.kegiatanHariIni` (tanpa spread) | "menyalin hitungan per jenis, bukan meneruskan referensinya" |
| `permissions: ["presurvei:read", "m_presurvei:read"]` | "menolak pemegang izin web saja dengan 403" |
| `tenantId: ctx.session!.user.tenantId ?? ""` (bukan `requireSessionTenantId`) | "menolak sesi tanpa tenant dengan 400" |
| `userId: new URL(_request.url).searchParams.get("userId") ?? ctx.session!.user.id` | "mengabaikan userId dan tenantId dari query" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Review keamanan tenant**

Periksa dan tulis hasilnya di pesan commit bila ada temuan:
- Tidak ada nilai dari request yang mencapai service (baca ulang route).
- Ketiga query `RingkasanSalesRepository` menulis `tenantId` eksplisit dan fail-closed (Task 2).
- `pencapaianSendiri` membaca target dengan `tenantId` eksplisit; realisasi disaring ekstensi tenant — hanya angka milik `userId` yang dipakai (Task 3).
- Nama prospek di `perluFollowUp` berasal dari baris prospek yang sudah disaring `pemilikId` + `tenantId`; tidak ada join nama sales lintas tenant.

- [ ] **Step 9: Commit**

```bash
git add modules/presurvei/dto/ringkasan-sales.dto.ts modules/presurvei/index.ts app/api/mobile/presurvei/ringkasan/route.ts tests/modules/presurvei/ringkasan-sales-dto.test.ts tests/api/presurvei-ringkasan-mobile-route.test.ts
git commit -m "$(cat <<'EOF'
feat(presurvei): endpoint ringkasan beranda sales untuk mobile

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Fixture kontrak presurvei untuk mobile

**Repo:** `netmanager`

**Files:**
- Create: `tests/fixtures/presurvei/kontrak-mobile.json`
- Test: `tests/modules/presurvei/kontrak-mobile.test.ts`

**Interfaces:**
- Consumes: `KEGIATAN_JENIS`, `KEGIATAN_HASIL`, `PROSPEK_STATUSES`, `getStatusLanjutan`, `isButuhLokasi`, `isButuhDataTeknis`, `isHasilMelahirkanProspek`, `catatKegiatanSchema` (`@/modules/presurvei`), `resolveAksiKanban` (`@/modules/presurvei/domain/prospek-kanban`).
- Produces: berkas JSON dengan kunci `kegiatanJenis`, `kegiatanHasil`, `prospekStatus`, `transisiStatus`, `tujuanBukaKonversi`, `jenisButuhLokasi`, `jenisBerdataTeknis`, `hasilMelahirkanProspek`, `jumlahFotoMaks`, `kabelMeterMaks`. Disalin byte-demi-byte ke mobile `__tests__/fixtures/presurvei/kontrak-mobile.json` di Task 6.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// tests/modules/presurvei/kontrak-mobile.test.ts
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  catatKegiatanSchema,
  getStatusLanjutan,
  isButuhDataTeknis,
  isButuhLokasi,
  isHasilMelahirkanProspek,
  KEGIATAN_HASIL,
  KEGIATAN_JENIS,
  PROSPEK_STATUSES,
  type ProspekStatus,
} from "@/modules/presurvei";
import { resolveAksiKanban } from "@/modules/presurvei/domain/prospek-kanban";

/**
 * Aplikasi mobile menyalin enum dan aturan presurvei sebagai fungsi murni
 * (tidak bisa mengimpor backend). Fixture ini satu-satunya titik temu: test
 * di sini memastikan fixture sama dengan backend, test mobile
 * (`__tests__/utils/presurvei/aturanPresurvei.test.ts`) memastikan mobile
 * sama dengan salinannya. Mengubah aturan backend membuat test ini merah —
 * perbarui fixture, lalu salin ke mobile.
 *
 * Urutan array dibandingkan apa adanya: mobile menampilkan pilihan dalam
 * urutan ini.
 */

interface KontrakMobile {
  kegiatanJenis: string[];
  kegiatanHasil: string[];
  prospekStatus: string[];
  transisiStatus: Record<string, string[]>;
  tujuanBukaKonversi: string[];
  jenisButuhLokasi: string[];
  jenisBerdataTeknis: string[];
  hasilMelahirkanProspek: string[];
  jumlahFotoMaks: number;
  kabelMeterMaks: number;
}

const kontrak = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), "tests/fixtures/presurvei/kontrak-mobile.json"),
    "utf8",
  ),
) as KontrakMobile;

const FOTO = "https://cdn.contoh.id/uploads/presurvei/kegiatan/a.webp";

const kegiatanTelepon = (fotoUrls: string[]) => ({
  jenis: "TELEPON",
  hasil: "TIDAK_MINAT",
  waktuMulai: new Date().toISOString(),
  fotoUrls,
});

const surveiDenganKabel = (estimasiKabelMeter: number) => ({
  jenis: "SURVEI_LOKASI",
  hasil: "PERLU_FOLLOWUP",
  waktuMulai: new Date().toISOString(),
  latitude: -6.2,
  longitude: 106.8,
  estimasiKabelMeter,
});

describe("kontrak presurvei untuk mobile", () => {
  it("enum sama dan berurutan sama dengan domain", () => {
    expect(kontrak.kegiatanJenis).toEqual([...KEGIATAN_JENIS]);
    expect(kontrak.kegiatanHasil).toEqual([...KEGIATAN_HASIL]);
    expect(kontrak.prospekStatus).toEqual([...PROSPEK_STATUSES]);
  });

  it("tabel transisi sama dengan getStatusLanjutan untuk setiap status", () => {
    expect(Object.keys(kontrak.transisiStatus)).toEqual([...PROSPEK_STATUSES]);
    for (const status of PROSPEK_STATUSES) {
      expect(kontrak.transisiStatus[status]).toEqual(getStatusLanjutan(status));
    }
  });

  it("tujuan yang membuka form konversi sama dengan resolveAksiKanban", () => {
    const tujuan = new Set<ProspekStatus>();
    for (const dari of PROSPEK_STATUSES) {
      for (const ke of PROSPEK_STATUSES) {
        if (resolveAksiKanban(dari, ke)?.jenis === "buka-konversi") tujuan.add(ke);
      }
    }
    expect(kontrak.tujuanBukaKonversi).toEqual([...tujuan]);
  });

  it("aturan jenis dan hasil sama dengan kegiatan-rules", () => {
    expect(kontrak.jenisButuhLokasi).toEqual(KEGIATAN_JENIS.filter(isButuhLokasi));
    expect(kontrak.jenisBerdataTeknis).toEqual(KEGIATAN_JENIS.filter(isButuhDataTeknis));
    expect(kontrak.hasilMelahirkanProspek).toEqual(
      KEGIATAN_HASIL.filter(isHasilMelahirkanProspek),
    );
  });

  it("jumlah foto maksimum sama dengan yang ditegakkan schema", () => {
    const pas = Array.from({ length: kontrak.jumlahFotoMaks }, () => FOTO);
    expect(catatKegiatanSchema.safeParse(kegiatanTelepon(pas)).success).toBe(true);
    expect(
      catatKegiatanSchema.safeParse(kegiatanTelepon([...pas, FOTO])).success,
    ).toBe(false);
  });

  it("estimasi kabel maksimum sama dengan yang ditegakkan schema", () => {
    expect(
      catatKegiatanSchema.safeParse(surveiDenganKabel(kontrak.kabelMeterMaks)).success,
    ).toBe(true);
    expect(
      catatKegiatanSchema.safeParse(surveiDenganKabel(kontrak.kabelMeterMaks + 1)).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/modules/presurvei/kontrak-mobile.test.ts --maxWorkers=50% --reporter=dot`
Expected: FAIL — `ENOENT: no such file or directory, open '.../tests/fixtures/presurvei/kontrak-mobile.json'`.

- [ ] **Step 3: Tulis fixture**

```json
{
  "kegiatanJenis": ["KUNJUNGAN", "SURVEI_LOKASI", "TELEPON", "CHAT", "IKLAN"],
  "kegiatanHasil": ["TERTARIK", "PERLU_FOLLOWUP", "TIDAK_MINAT", "TIDAK_ADA_ORANG", "DEAL"],
  "prospekStatus": ["BARU", "DIHUBUNGI", "TERTARIK", "NEGOSIASI", "DEAL", "TIDAK_MINAT", "TIDAK_LAYAK"],
  "transisiStatus": {
    "BARU": ["DIHUBUNGI", "TIDAK_MINAT"],
    "DIHUBUNGI": ["TERTARIK", "TIDAK_MINAT", "TIDAK_LAYAK"],
    "TERTARIK": ["NEGOSIASI", "TIDAK_MINAT", "TIDAK_LAYAK"],
    "NEGOSIASI": ["DEAL", "TIDAK_MINAT", "TIDAK_LAYAK"],
    "DEAL": [],
    "TIDAK_MINAT": ["DIHUBUNGI"],
    "TIDAK_LAYAK": []
  },
  "tujuanBukaKonversi": ["DEAL"],
  "jenisButuhLokasi": ["KUNJUNGAN", "SURVEI_LOKASI"],
  "jenisBerdataTeknis": ["SURVEI_LOKASI"],
  "hasilMelahirkanProspek": ["TERTARIK", "DEAL"],
  "jumlahFotoMaks": 6,
  "kabelMeterMaks": 5000
}
```

Simpan sebagai `tests/fixtures/presurvei/kontrak-mobile.json` (akhiri dengan satu baris baru).

- [ ] **Step 4: Jalankan test dan typecheck**

Run: `npx vitest run tests/modules/presurvei/kontrak-mobile.test.ts --maxWorkers=50% --reporter=dot`
Expected: 6 PASS.

Run: `npx tsc -p tsconfig.typecheck.json --noEmit`
Expected: exit 0.

- [ ] **Step 5: Buktikan test bergigi**

| Mutasi (pada fixture) | Harus merah |
|---|---|
| `"TIDAK_MINAT": []` | "tabel transisi sama dengan getStatusLanjutan…" |
| Tukar urutan `"TELEPON"` dan `"CHAT"` di `kegiatanJenis` | "enum sama dan berurutan sama dengan domain" |
| `"tujuanBukaKonversi": ["DEAL", "NEGOSIASI"]` | "tujuan yang membuka form konversi…" |
| `"jumlahFotoMaks": 5` | "jumlah foto maksimum sama dengan yang ditegakkan schema" |
| `"kabelMeterMaks": 4999` | "estimasi kabel maksimum sama…" |

Kembalikan; `git status --short` hanya berisi dua berkas task ini.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/presurvei/kontrak-mobile.json tests/modules/presurvei/kontrak-mobile.test.ts
git commit -m "$(cat <<'EOF'
test(presurvei): fixture kontrak enum dan aturan untuk aplikasi mobile

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Fondasi mobile — konstanta, tipe, aturan presurvei, paritas kontrak

**Repo:** `mobile-netmanager`

**Files:**
- Modify: `src/constants/features.ts:5-43` (tambah `PRESURVEI`)
- Create: `src/constants/presurvei.ts`
- Create: `src/types/presurvei.ts`
- Create: `src/utils/presurvei/aturanPresurvei.ts`
- Create: `__tests__/fixtures/presurvei/kontrak-mobile.json` (salinan persis dari netmanager Task 5)
- Test: `__tests__/utils/presurvei/aturanPresurvei.test.ts`

**Interfaces:**
- Consumes: `netmanager/tests/fixtures/presurvei/kontrak-mobile.json` (Task 5).
- Produces:
  - `AppFeature.PRESURVEI = 'm_presurvei'`
  - `KEGIATAN_JENIS`, `KEGIATAN_HASIL`, `PROSPEK_STATUSES` (`as const`), tipe `KegiatanJenis`, `KegiatanHasil`, `ProspekStatus`
  - `LABEL_JENIS_KEGIATAN: Record<KegiatanJenis, string>`, `LABEL_HASIL_KEGIATAN: Record<KegiatanHasil, string>`, `LABEL_STATUS_PROSPEK: Record<ProspekStatus, string>`
  - `JUMLAH_FOTO_KEGIATAN_MAKS = 6`, `KABEL_METER_MAKS = 5000`
  - `ENDPOINT_KEGIATAN_PRESURVEI = '/api/presurvei/kegiatan'`, `ENDPOINT_PROSPEK_PRESURVEI = '/api/presurvei/prospek'`, `ENDPOINT_RINGKASAN_PRESURVEI = '/api/mobile/presurvei/ringkasan'`, `AWALAN_ENDPOINT_PRESURVEI = '/api/presurvei'`
  - `TIPE_UNGGAH_FOTO_KEGIATAN = 'presurvei'`, `TIPE_UNGGAH_FOTO_KTP = 'marketing'`
  - Tipe: `ProspekSumber`, `KegiatanListItem`, `ProspekListItem`, `ProspekDetail`, `HalamanPresurvei<T>`, `BarisPencapaian`, `TargetBulanIni`, `ProspekPerluFollowUp`, `RingkasanPresurvei`, `ProspekBaruKegiatan`, `MuatanCatatKegiatan`, `HasilCatatKegiatan`, `MuatanJadikanCanvasing`, `HasilJadikanCanvasing`
  - `getStatusLanjutan(status: ProspekStatus): ProspekStatus[]`
  - `isTransisiStatusSah(dari: ProspekStatus, ke: ProspekStatus): boolean`
  - `type AksiUbahStatus = { jenis: 'ubah-status'; tujuan: ProspekStatus } | { jenis: 'buka-konversi' }`
  - `resolveAksiProspek(dari: ProspekStatus, ke: ProspekStatus): AksiUbahStatus | null`
  - `interface PilihanUbahStatus { tujuan: ProspekStatus; aksi: AksiUbahStatus }`
  - `daftarPilihanUbahStatus(dari: ProspekStatus): PilihanUbahStatus[]`
  - `isButuhLokasi(jenis: KegiatanJenis): boolean`, `isButuhDataTeknis(jenis: KegiatanJenis): boolean`, `isHasilMelahirkanProspek(hasil: KegiatanHasil): boolean`
  - `daftarJenisDitawarkan(): KegiatanJenis[]`
  - `isBolehProspekBaru(kegiatan: { jenis: KegiatanJenis | null; hasil: KegiatanHasil | null; prospekId: string | null }): boolean`
  - `isBolehJadikanCanvasing(prospek: { status: ProspekStatus; canvasingId: string | null }): boolean`

- [ ] **Step 1: Rekam baseline fingerprint OTA**

Run:
```bash
npx @expo/fingerprint fingerprint:generate > "${TMPDIR:-/tmp}/fp-presurvei-sebelum.json"
node scripts/compute-fingerprint.js . android > "${TMPDIR:-/tmp}/fp-presurvei-sebelum.hash"
git rev-parse HEAD > "${TMPDIR:-/tmp}/presurvei-mobile-awal.commit"
cat "${TMPDIR:-/tmp}/fp-presurvei-sebelum.hash" "${TMPDIR:-/tmp}/presurvei-mobile-awal.commit"
```
Expected: sebuah hash dan satu SHA commit tercetak. Ketiga berkas dipakai di Task 21.

- [ ] **Step 2: Salin fixture kontrak dari backend**

Run:
```bash
mkdir -p __tests__/fixtures/presurvei
cp ../netmanager/tests/fixtures/presurvei/kontrak-mobile.json __tests__/fixtures/presurvei/kontrak-mobile.json
cmp ../netmanager/tests/fixtures/presurvei/kontrak-mobile.json __tests__/fixtures/presurvei/kontrak-mobile.json && echo SAMA
```
Expected: `SAMA`.

- [ ] **Step 3: Tulis test yang gagal**

```ts
// __tests__/utils/presurvei/aturanPresurvei.test.ts
import { describe, expect, it } from '@jest/globals';

import kontrak from '../../fixtures/presurvei/kontrak-mobile.json';
import {
  JUMLAH_FOTO_KEGIATAN_MAKS,
  KABEL_METER_MAKS,
  KEGIATAN_HASIL,
  KEGIATAN_JENIS,
  PROSPEK_STATUSES,
  type ProspekStatus,
} from '@/constants/presurvei';
import {
  daftarJenisDitawarkan,
  daftarPilihanUbahStatus,
  getStatusLanjutan,
  isBolehJadikanCanvasing,
  isBolehProspekBaru,
  isButuhDataTeknis,
  isButuhLokasi,
  isHasilMelahirkanProspek,
  resolveAksiProspek,
} from '@/utils/presurvei/aturanPresurvei';

/**
 * Fixture disalin byte-demi-byte dari netmanager
 * `tests/fixtures/presurvei/kontrak-mobile.json`, yang dijaga
 * `tests/modules/presurvei/kontrak-mobile.test.ts` terhadap domain backend.
 * Test di sini menjaga sisi mobile terhadap salinan itu. Server tetap penentu.
 */

describe('paritas dengan kontrak backend', () => {
  it('enum sama dan berurutan sama', () => {
    expect([...KEGIATAN_JENIS]).toEqual(kontrak.kegiatanJenis);
    expect([...KEGIATAN_HASIL]).toEqual(kontrak.kegiatanHasil);
    expect([...PROSPEK_STATUSES]).toEqual(kontrak.prospekStatus);
  });

  it('tabel transisi sama untuk setiap status', () => {
    expect(Object.keys(kontrak.transisiStatus)).toEqual([...PROSPEK_STATUSES]);
    for (const status of PROSPEK_STATUSES) {
      expect(getStatusLanjutan(status)).toEqual(kontrak.transisiStatus[status]);
    }
  });

  it('tujuan yang membuka form konversi sama', () => {
    const tujuan = new Set<ProspekStatus>();
    for (const dari of PROSPEK_STATUSES) {
      for (const ke of PROSPEK_STATUSES) {
        if (resolveAksiProspek(dari, ke)?.jenis === 'buka-konversi') tujuan.add(ke);
      }
    }
    expect([...tujuan]).toEqual(kontrak.tujuanBukaKonversi);
  });

  it('aturan jenis dan hasil sama', () => {
    expect(KEGIATAN_JENIS.filter(isButuhLokasi)).toEqual(kontrak.jenisButuhLokasi);
    expect(KEGIATAN_JENIS.filter(isButuhDataTeknis)).toEqual(kontrak.jenisBerdataTeknis);
    expect(KEGIATAN_HASIL.filter(isHasilMelahirkanProspek)).toEqual(
      kontrak.hasilMelahirkanProspek,
    );
  });

  it('batas foto dan kabel sama', () => {
    expect(JUMLAH_FOTO_KEGIATAN_MAKS).toBe(kontrak.jumlahFotoMaks);
    expect(KABEL_METER_MAKS).toBe(kontrak.kabelMeterMaks);
  });
});

describe('aturan presurvei', () => {
  it('tidak menawarkan jenis Iklan', () => {
    expect(daftarJenisDitawarkan()).toEqual(['KUNJUNGAN', 'SURVEI_LOKASI', 'TELEPON', 'CHAT']);
  });

  it('mengembalikan salinan, bukan tabel modul', () => {
    const lanjutan = getStatusLanjutan('BARU');
    lanjutan.push('DEAL');
    const jenis = daftarJenisDitawarkan();
    jenis.push('IKLAN');

    expect(getStatusLanjutan('BARU')).toEqual(['DIHUBUNGI', 'TIDAK_MINAT']);
    expect(daftarJenisDitawarkan()).not.toContain('IKLAN');
  });

  it('pilihan dari NEGOSIASI: Deal membuka konversi, lainnya ubah langsung', () => {
    expect(daftarPilihanUbahStatus('NEGOSIASI')).toEqual([
      { tujuan: 'DEAL', aksi: { jenis: 'buka-konversi' } },
      { tujuan: 'TIDAK_MINAT', aksi: { jenis: 'ubah-status', tujuan: 'TIDAK_MINAT' } },
      { tujuan: 'TIDAK_LAYAK', aksi: { jenis: 'ubah-status', tujuan: 'TIDAK_LAYAK' } },
    ]);
  });

  it('status final tidak menawarkan pilihan', () => {
    expect(daftarPilihanUbahStatus('DEAL')).toEqual([]);
    expect(daftarPilihanUbahStatus('TIDAK_LAYAK')).toEqual([]);
  });

  it('menolak perpindahan tak sah dan perpindahan ke dirinya sendiri', () => {
    expect(resolveAksiProspek('BARU', 'DEAL')).toBeNull();
    expect(resolveAksiProspek('BARU', 'BARU')).toBeNull();
  });

  it.each([
    ['KUNJUNGAN', 'TERTARIK', null, true],
    ['SURVEI_LOKASI', 'DEAL', null, true],
    ['KUNJUNGAN', 'PERLU_FOLLOWUP', null, false],
    ['TELEPON', 'TERTARIK', null, false],
    ['KUNJUNGAN', 'TERTARIK', 'prospek-1', false],
    [null, 'TERTARIK', null, false],
    ['KUNJUNGAN', null, null, false],
  ] as const)(
    'prospek baru untuk %s/%s dengan prospekId %s → %s',
    (jenis, hasil, prospekId, harapan) => {
      expect(isBolehProspekBaru({ jenis, hasil, prospekId })).toBe(harapan);
    },
  );

  it('jadikan canvasing hanya untuk Deal yang belum punya canvasing', () => {
    expect(isBolehJadikanCanvasing({ status: 'DEAL', canvasingId: null })).toBe(true);
    expect(isBolehJadikanCanvasing({ status: 'DEAL', canvasingId: 'cv-1' })).toBe(false);
    expect(isBolehJadikanCanvasing({ status: 'NEGOSIASI', canvasingId: null })).toBe(false);
  });
});
```

- [ ] **Step 4: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/presurvei/aturanPresurvei.test.ts`
Expected: FAIL — `Cannot find module '@/constants/presurvei'`.

- [ ] **Step 5: Implementasi konstanta dan fitur**

`src/constants/features.ts` — tambah di blok `// Core`, setelah `CANVASING`:

```ts
  PRESURVEI = 'm_presurvei',
```

```ts
// src/constants/presurvei.ts
/**
 * Konstanta presurvei, disalin dari netmanager `modules/presurvei/`.
 *
 * Urutan enum ikut backend dan dijaga `__tests__/utils/presurvei/aturanPresurvei.test.ts`
 * terhadap `__tests__/fixtures/presurvei/kontrak-mobile.json`.
 */

export const KEGIATAN_JENIS = ['KUNJUNGAN', 'SURVEI_LOKASI', 'TELEPON', 'CHAT', 'IKLAN'] as const;
export type KegiatanJenis = (typeof KEGIATAN_JENIS)[number];

export const KEGIATAN_HASIL = [
  'TERTARIK',
  'PERLU_FOLLOWUP',
  'TIDAK_MINAT',
  'TIDAK_ADA_ORANG',
  'DEAL',
] as const;
export type KegiatanHasil = (typeof KEGIATAN_HASIL)[number];

export const PROSPEK_STATUSES = [
  'BARU',
  'DIHUBUNGI',
  'TERTARIK',
  'NEGOSIASI',
  'DEAL',
  'TIDAK_MINAT',
  'TIDAK_LAYAK',
] as const;
export type ProspekStatus = (typeof PROSPEK_STATUSES)[number];

/** Label jenis kegiatan; `Record` memaksa jenis baru dijawab saat kompilasi. */
export const LABEL_JENIS_KEGIATAN: Record<KegiatanJenis, string> = {
  KUNJUNGAN: 'Kunjungan',
  SURVEI_LOKASI: 'Survei Lokasi',
  TELEPON: 'Telepon',
  CHAT: 'Chat',
  IKLAN: 'Iklan',
};

/** Label hasil kegiatan (sama dengan netmanager `utils/statusConfig.ts:54-66`). */
export const LABEL_HASIL_KEGIATAN: Record<KegiatanHasil, string> = {
  TERTARIK: 'Tertarik',
  PERLU_FOLLOWUP: 'Perlu follow-up',
  TIDAK_MINAT: 'Tidak minat',
  TIDAK_ADA_ORANG: 'Tidak ada orang',
  DEAL: 'Deal',
};

/** Label status prospek (sama dengan netmanager `utils/statusConfig.ts:25-33`). */
export const LABEL_STATUS_PROSPEK: Record<ProspekStatus, string> = {
  BARU: 'Baru',
  DIHUBUNGI: 'Dihubungi',
  TERTARIK: 'Tertarik',
  NEGOSIASI: 'Negosiasi',
  DEAL: 'Deal',
  TIDAK_MINAT: 'Tidak minat',
  TIDAK_LAYAK: 'Tidak layak',
};

/** Batas foto per kegiatan (`kegiatan.validator.ts:22`). */
export const JUMLAH_FOTO_KEGIATAN_MAKS = 6;

/** Batas estimasi kabel survei dalam meter (`kegiatan.validator.ts:23`). */
export const KABEL_METER_MAKS = 5000;

export const ENDPOINT_KEGIATAN_PRESURVEI = '/api/presurvei/kegiatan';
export const ENDPOINT_PROSPEK_PRESURVEI = '/api/presurvei/prospek';
export const ENDPOINT_RINGKASAN_PRESURVEI = '/api/mobile/presurvei/ringkasan';

/** Awalan seluruh endpoint presurvei; dipakai mengenali antrean yang tersinkron. */
export const AWALAN_ENDPOINT_PRESURVEI = '/api/presurvei';

/** Jenis unggahan foto kegiatan (netmanager `route-handlers-impl.ts`, Task 1). */
export const TIPE_UNGGAH_FOTO_KEGIATAN = 'presurvei';

/** Foto KTP ikut ke data canvasing, jadi disimpan di folder marketing. */
export const TIPE_UNGGAH_FOTO_KTP = 'marketing';
```

```ts
// src/types/presurvei.ts
import type { KegiatanHasil, KegiatanJenis, ProspekStatus } from '@/constants/presurvei';

/** Sumber prospek (netmanager `domain/entities/Prospek.ts:19-25`). */
export type ProspekSumber = 'LAPANGAN' | 'IKLAN' | 'WEBSITE' | 'REFERRAL' | 'WALK_IN';

/** Item daftar kegiatan (netmanager `dto/kegiatan.dto.ts:17-38`). */
export interface KegiatanListItem {
  id: string;
  jenis: KegiatanJenis;
  userId: string;
  namaSales: string | null;
  peranPelaku: 'SALES' | 'NON_SALES' | null;
  departemenPelaku: string | null;
  prospekId: string | null;
  waktuMulai: string;
  alamatDikunjungi: string | null;
  ditemuiNama: string | null;
  latitude: number | null;
  longitude: number | null;
  hasil: KegiatanHasil;
  jumlahFoto: number;
}

/** Item daftar prospek (netmanager `dto/prospek.dto.ts:15-32`). */
export interface ProspekListItem {
  id: string;
  nama: string;
  noTelp: string;
  alamat: string;
  sumber: ProspekSumber;
  status: ProspekStatus;
  pemilikId: string | null;
  namaPemilik: string | null;
  paketDiminati: string | null;
  canvasingId: string | null;
  createdAt: string;
}

/** Rincian prospek (netmanager `dto/prospek.dto.ts:34-46`). */
export interface ProspekDetail extends ProspekListItem {
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  shareloc: string | null;
  iklanId: string | null;
  registrationId: string | null;
  referralNama: string | null;
  catatan: string | null;
  konversiAt: string | null;
  isSiapDipromosikan: boolean;
  updatedAt: string;
}

/** Satu halaman daftar (`apiPaginated`, netmanager `lib/api-response.ts:216-236`). */
export interface HalamanPresurvei<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface BarisPencapaian {
  target: number;
  tercapai: number;
  persen: number;
}

export interface TargetBulanIni {
  periodeTahun: number;
  periodeBulan: number;
  kunjungan: BarisPencapaian;
  prospek: BarisPencapaian;
  konversi: BarisPencapaian;
}

export interface ProspekPerluFollowUp {
  id: string;
  nama: string;
  noTelp: string;
  status: ProspekStatus;
  sentuhanTerakhir: string;
}

/** Ringkasan Beranda (netmanager `dto/ringkasan-sales.dto.ts`, Task 4). */
export interface RingkasanPresurvei {
  tanggal: string;
  kegiatanHariIni: Record<KegiatanJenis, number>;
  target: TargetBulanIni | null;
  perluFollowUp: ProspekPerluFollowUp[];
}

/** Prospek yang lahir dari kegiatan (netmanager `kegiatan.validator.ts:57-63`). */
export interface ProspekBaruKegiatan {
  nama: string;
  noTelp: string;
  alamat: string;
  paketDiminati: string | null;
}

/**
 * Badan `POST /api/presurvei/kegiatan` tanpa `fotoUrls`.
 * `fotoUrls` diisi dari `meta.photos` saat mutasi berjalan (Task 9).
 */
export interface MuatanCatatKegiatan {
  jenis: KegiatanJenis;
  hasil: KegiatanHasil;
  waktuMulai: string;
  prospekId: string | null;
  ditemuiNama: string | null;
  catatan: string | null;
  latitude?: number;
  longitude?: number;
  alamatDikunjungi?: string | null;
  odpTerdekat?: string | null;
  estimasiKabelMeter?: number | null;
  catatanTeknis?: string | null;
  prospekBaru?: ProspekBaruKegiatan;
}

/** Isi `data` respons `POST /api/presurvei/kegiatan` (route baris 63-69). */
export interface HasilCatatKegiatan {
  kegiatan: KegiatanListItem;
  prospek: ProspekDetail | null;
}

/** Badan `POST .../jadikan-canvasing` (netmanager `konversi.validator.ts:16-24`). */
export interface MuatanJadikanCanvasing {
  noKtp: string;
  paket: string;
  kabel?: number;
  fotoKtp: string;
}

/** Isi `data` respons jadikan-canvasing (route baris 27-30). */
export interface HasilJadikanCanvasing {
  prospek: ProspekDetail;
  canvasingId: string;
}
```

- [ ] **Step 6: Implementasi aturan**

```ts
// src/utils/presurvei/aturanPresurvei.ts
import {
  KEGIATAN_JENIS,
  type KegiatanHasil,
  type KegiatanJenis,
  type ProspekStatus,
} from '@/constants/presurvei';

/**
 * Aturan presurvei yang disalin dari netmanager sebagai fungsi murni:
 * `domain/prospek-rules.ts` (transisi), `domain/prospek-kanban.ts` (aksi),
 * `domain/kegiatan-rules.ts` (jenis/hasil). Hanya untuk UX — server tetap
 * penentu dan menolak transisi tak sah dengan 409.
 */

const TRANSISI_SAH: Record<ProspekStatus, readonly ProspekStatus[]> = {
  BARU: ['DIHUBUNGI', 'TIDAK_MINAT'],
  DIHUBUNGI: ['TERTARIK', 'TIDAK_MINAT', 'TIDAK_LAYAK'],
  TERTARIK: ['NEGOSIASI', 'TIDAK_MINAT', 'TIDAK_LAYAK'],
  NEGOSIASI: ['DEAL', 'TIDAK_MINAT', 'TIDAK_LAYAK'],
  DEAL: [],
  TIDAK_MINAT: ['DIHUBUNGI'],
  TIDAK_LAYAK: [],
};

const STATUS_DEAL: ProspekStatus = 'DEAL';
const JENIS_DI_LAPANGAN: readonly KegiatanJenis[] = ['KUNJUNGAN', 'SURVEI_LOKASI'];
const JENIS_BERDATA_TEKNIS: readonly KegiatanJenis[] = ['SURVEI_LOKASI'];
const JENIS_TIDAK_DICATAT_DARI_HP: readonly KegiatanJenis[] = ['IKLAN'];
const HASIL_BERMINAT: readonly KegiatanHasil[] = ['TERTARIK', 'DEAL'];

/** Status yang boleh dituju dari `status`. Selalu salinan baru. */
export function getStatusLanjutan(status: ProspekStatus): ProspekStatus[] {
  return [...TRANSISI_SAH[status]];
}

/** Apakah perpindahan status diizinkan aturan funnel. */
export function isTransisiStatusSah(dari: ProspekStatus, ke: ProspekStatus): boolean {
  return TRANSISI_SAH[dari].includes(ke);
}

/** Aksi saat sales memilih status tujuan. */
export type AksiUbahStatus =
  | { jenis: 'ubah-status'; tujuan: ProspekStatus }
  | { jenis: 'buka-konversi' };

/**
 * Aksi untuk perpindahan `dari` → `ke`, atau null bila tidak sah.
 * Deal membuka form konversi karena menuntut data yang tidak ada di prospek.
 */
export function resolveAksiProspek(dari: ProspekStatus, ke: ProspekStatus): AksiUbahStatus | null {
  if (dari === ke) return null;
  if (!isTransisiStatusSah(dari, ke)) return null;
  return ke === STATUS_DEAL ? { jenis: 'buka-konversi' } : { jenis: 'ubah-status', tujuan: ke };
}

/** Satu pilihan di lembar Ubah Status. */
export interface PilihanUbahStatus {
  tujuan: ProspekStatus;
  aksi: AksiUbahStatus;
}

/** Pilihan Ubah Status yang sah dari `dari`, dalam urutan tabel transisi. */
export function daftarPilihanUbahStatus(dari: ProspekStatus): PilihanUbahStatus[] {
  return getStatusLanjutan(dari).flatMap((tujuan) => {
    const aksi = resolveAksiProspek(dari, tujuan);
    return aksi ? [{ tujuan, aksi }] : [];
  });
}

/** Apakah jenis kegiatan terjadi di lokasi sehingga wajib GPS dan foto. */
export function isButuhLokasi(jenis: KegiatanJenis): boolean {
  return JENIS_DI_LAPANGAN.includes(jenis);
}

/** Apakah jenis kegiatan boleh membawa data teknis survei. */
export function isButuhDataTeknis(jenis: KegiatanJenis): boolean {
  return JENIS_BERDATA_TEKNIS.includes(jenis);
}

/** Apakah hasil kegiatan menunjukkan minat yang layak jadi prospek. */
export function isHasilMelahirkanProspek(hasil: KegiatanHasil): boolean {
  return HASIL_BERMINAT.includes(hasil);
}

/** Jenis yang ditawarkan di aplikasi; Iklan adalah pekerjaan marketing kantor. */
export function daftarJenisDitawarkan(): KegiatanJenis[] {
  return KEGIATAN_JENIS.filter((jenis) => !JENIS_TIDAK_DICATAT_DARI_HP.includes(jenis));
}

/**
 * Apakah form boleh menawarkan "Buat prospek baru".
 * Sama dengan syarat server (netmanager `KegiatanService.ts:252-256`); di luar
 * syarat itu server membuang `prospekBaru` diam-diam.
 */
export function isBolehProspekBaru(kegiatan: {
  jenis: KegiatanJenis | null;
  hasil: KegiatanHasil | null;
  prospekId: string | null;
}): boolean {
  if (kegiatan.prospekId !== null) return false;
  if (kegiatan.jenis === null || kegiatan.hasil === null) return false;
  return isButuhLokasi(kegiatan.jenis) && isHasilMelahirkanProspek(kegiatan.hasil);
}

/** Apakah prospek boleh dijadikan canvasing (netmanager `prospek-rules.ts:97-105`). */
export function isBolehJadikanCanvasing(prospek: {
  status: ProspekStatus;
  canvasingId: string | null;
}): boolean {
  return prospek.status === STATUS_DEAL && (prospek.canvasingId ?? null) === null;
}
```

- [ ] **Step 7: Jalankan test dan typecheck**

Run: `npx jest __tests__/utils/presurvei/aturanPresurvei.test.ts`
Expected: semua PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `TIDAK_MINAT: []` di `TRANSISI_SAH` | "tabel transisi sama untuk setiap status" |
| Hapus `'IKLAN'` dari `JENIS_TIDAK_DICATAT_DARI_HP` | "tidak menawarkan jenis Iklan" |
| `getStatusLanjutan` mengembalikan `TRANSISI_SAH[status] as ProspekStatus[]` | "mengembalikan salinan, bukan tabel modul" |
| `ke === STATUS_DEAL` jadi `false` | "tujuan yang membuka form konversi sama" dan "pilihan dari NEGOSIASI…" |
| Hapus `if (kegiatan.prospekId !== null) return false;` | "prospek baru untuk KUNJUNGAN/TERTARIK dengan prospekId prospek-1 → false" |
| `HASIL_BERMINAT` = `['TERTARIK']` | "aturan jenis dan hasil sama" |
| `(prospek.canvasingId ?? null) === null` jadi `true` | "jadikan canvasing hanya untuk Deal yang belum punya canvasing" |
| `JUMLAH_FOTO_KEGIATAN_MAKS = 5` | "batas foto dan kabel sama" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 9: Commit**

```bash
git add src/constants/features.ts src/constants/presurvei.ts src/types/presurvei.ts src/utils/presurvei/aturanPresurvei.ts __tests__/fixtures/presurvei/kontrak-mobile.json __tests__/utils/presurvei/aturanPresurvei.test.ts
git commit -m "$(cat <<'EOF'
feat(presurvei): konstanta, tipe, dan aturan presurvei mobile

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Lapisan data — `PresurveiService`, rentang hari, antrean kegiatan

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/services/PresurveiService.ts`
- Create: `src/utils/presurvei/rentangHari.ts`
- Create: `src/utils/presurvei/antreanKegiatan.ts`
- Modify: `src/lib/queryClient.ts:149-235` (tambah `queryKeys.presurvei`)
- Test: `__tests__/services/PresurveiService.test.ts`, `__tests__/utils/presurvei/rentangHari.test.ts`, `__tests__/utils/presurvei/antreanKegiatan.test.ts`

**Interfaces:**
- Consumes: Task 6 — konstanta endpoint, tipe presurvei. `SyncQueueItem` (`src/services/DatabaseService.ts:41-51`). Route backend: `GET /api/presurvei/kegiatan` (param `dariTanggal`, `sampaiTanggal`, `prospekId`, `page`, `limit` — `netmanager app/api/presurvei/kegiatan/route.ts:20-31`), `GET /api/presurvei/prospek` (`status`, `search`, `page`, `limit` — `prospek/route.ts:30-38`), `GET /api/presurvei/prospek/[id]`, `PATCH /api/presurvei/prospek/[id]` (`{ status }`), `POST .../jadikan-canvasing`, `GET /api/mobile/presurvei/ringkasan` (Task 4).
- Produces:
  - `buildProspekUrl(id: string): string`, `buildJadikanCanvasingUrl(id: string): string`
  - `interface FilterKegiatanPresurvei { dariTanggal?: string; sampaiTanggal?: string; prospekId?: string; page: number; limit: number }`
  - `interface FilterProspekPresurvei { status?: ProspekStatus; search?: string; page: number; limit: number }`
  - `PresurveiService.daftarKegiatan(filter): Promise<HalamanPresurvei<KegiatanListItem>>`
  - `PresurveiService.daftarProspek(filter): Promise<HalamanPresurvei<ProspekListItem>>`
  - `PresurveiService.rincianProspek(id: string): Promise<ProspekDetail>`
  - `PresurveiService.ringkasan(): Promise<RingkasanPresurvei>`
  - `PresurveiService.ubahStatusProspek(id: string, status: ProspekStatus): Promise<ProspekDetail>`
  - `PresurveiService.jadikanCanvasing(id: string, muatan: MuatanJadikanCanvasing): Promise<HasilJadikanCanvasing>`
  - `interface RentangTanggalIso { dariTanggal: string; sampaiTanggal: string }`
  - `rentangHariLokal(tanggal: Date): RentangTanggalIso`, `geserHari(tanggal: Date, jumlahHari: number): Date`, `isDalamRentang(waktuIso: string, rentang: RentangTanggalIso): boolean`
  - `interface KegiatanMenunggu { idAntrean: number; jenis: KegiatanJenis; hasil: KegiatanHasil; waktuMulai: string; alamatDikunjungi: string | null; ditemuiNama: string | null; jumlahFoto: number }`
  - `ambilKegiatanMenunggu(antrean: readonly SyncQueueItem[]): KegiatanMenunggu[]`
  - `queryKeys.presurvei.{ all, kegiatanHarian(rentang), kegiatanProspek(prospekId), antrean(), prospekList(filter), prospekDetail(id), ringkasan() }`

- [ ] **Step 1: Tulis test service yang gagal**

```ts
// __tests__/services/PresurveiService.test.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<{ data: unknown }>>();
const mockPatch = jest.fn<(url: string, body?: unknown, config?: unknown) => Promise<{ data: unknown }>>();
const mockPost = jest.fn<(url: string, body?: unknown, config?: unknown) => Promise<{ data: unknown }>>();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: (u: string, c?: unknown) => mockGet(u, c),
    patch: (u: string, b?: unknown, c?: unknown) => mockPatch(u, b, c),
    post: (u: string, b?: unknown, c?: unknown) => mockPost(u, b, c),
  },
}));

import {
  buildJadikanCanvasingUrl,
  buildProspekUrl,
  PresurveiService,
} from '@/services/PresurveiService';

/**
 * Nama query param dicocokkan huruf demi huruf dengan route netmanager
 * (`app/api/presurvei/kegiatan/route.ts:20-31`, `prospek/route.ts:30-38`).
 * Salah satu huruf berarti 400 di setiap pembukaan layar.
 */

const META = { page: 2, limit: 20, total: 45, totalPages: 3 };

describe('PresurveiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: { success: true, data: [], meta: META } });
  });

  it('daftar kegiatan memakai nama param route dan membuang yang kosong', async () => {
    await PresurveiService.daftarKegiatan({
      dariTanggal: '2026-09-23T17:00:00.000Z',
      sampaiTanggal: '2026-09-24T16:59:59.999Z',
      prospekId: undefined,
      page: 1,
      limit: 100,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/presurvei/kegiatan', {
      params: {
        dariTanggal: '2026-09-23T17:00:00.000Z',
        sampaiTanggal: '2026-09-24T16:59:59.999Z',
        page: 1,
        limit: 100,
      },
    });
  });

  it('daftar prospek memakai status dan search', async () => {
    const halaman = await PresurveiService.daftarProspek({
      status: 'TERTARIK',
      search: '',
      page: 2,
      limit: 20,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/presurvei/prospek', {
      params: { status: 'TERTARIK', page: 2, limit: 20 },
    });
    expect(halaman.meta).toEqual(META);
  });

  it('rincian prospek membaca data dari amplop', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { id: 'p/1' } } });

    const rincian = await PresurveiService.rincianProspek('p/1');

    expect(mockGet).toHaveBeenCalledWith('/api/presurvei/prospek/p%2F1', undefined);
    expect(rincian).toEqual({ id: 'p/1' });
  });

  it('ringkasan memanggil endpoint mobile', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { tanggal: '2026-09-24' } } });

    const ringkasan = await PresurveiService.ringkasan();

    expect(mockGet).toHaveBeenCalledWith('/api/mobile/presurvei/ringkasan', undefined);
    expect(ringkasan).toEqual({ tanggal: '2026-09-24' });
  });

  it('ubah status mengirim PATCH hanya berisi status', async () => {
    mockPatch.mockResolvedValue({ data: { success: true, data: { id: 'p-1', status: 'NEGOSIASI' } } });

    await PresurveiService.ubahStatusProspek('p-1', 'NEGOSIASI');

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/presurvei/prospek/p-1',
      { status: 'NEGOSIASI' },
      { skipErrorToast: true },
    );
  });

  it('jadikan canvasing mengirim badan apa adanya ke URL promosi', async () => {
    const muatan = { noKtp: '3201234567890001', paket: 'Home 20 Mbps', kabel: 35, fotoKtp: 'https://cdn.test/ktp.webp' };
    mockPost.mockResolvedValue({ data: { success: true, data: { canvasingId: 'cv-1' } } });

    const hasil = await PresurveiService.jadikanCanvasing('p-1', muatan);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/presurvei/prospek/p-1/jadikan-canvasing',
      muatan,
      { skipErrorToast: true },
    );
    expect(hasil).toEqual({ canvasingId: 'cv-1' });
  });

  it('URL prospek dan promosi dibangun dari id yang di-encode', () => {
    expect(buildProspekUrl('a b')).toBe('/api/presurvei/prospek/a%20b');
    expect(buildJadikanCanvasingUrl('a b')).toBe('/api/presurvei/prospek/a%20b/jadikan-canvasing');
  });
});
```

- [ ] **Step 2: Tulis test rentang hari dan antrean yang gagal**

```ts
// __tests__/utils/presurvei/rentangHari.test.ts
import { describe, expect, it } from '@jest/globals';

import { geserHari, isDalamRentang, rentangHariLokal } from '@/utils/presurvei/rentangHari';

/**
 * Bergantung pada TZ yang dipatok `Asia/Jakarta` (UTC+7) di
 * `jest.global-setup.js`. Tanpa pemakuan itu, harapan di bawah bergeser
 * menurut zona mesin — cari masalahnya di sana, bukan di kode produksi.
 */

describe('rentangHariLokal', () => {
  it('mencakup satu hari lokal penuh sebagai ISO UTC', () => {
    expect(rentangHariLokal(new Date(2026, 8, 24, 10, 30))).toEqual({
      dariTanggal: '2026-09-23T17:00:00.000Z',
      sampaiTanggal: '2026-09-24T16:59:59.999Z',
    });
  });
});

describe('geserHari', () => {
  it('melewati batas bulan', () => {
    expect(geserHari(new Date(2026, 8, 30, 15), 1)).toEqual(new Date(2026, 9, 1));
  });

  it('mundur dengan jumlah negatif', () => {
    expect(geserHari(new Date(2026, 9, 1, 8), -1)).toEqual(new Date(2026, 8, 30));
  });
});

describe('isDalamRentang', () => {
  const rentang = {
    dariTanggal: '2026-09-23T17:00:00.000Z',
    sampaiTanggal: '2026-09-24T16:59:59.999Z',
  };

  it('inklusif di kedua ujung', () => {
    expect(isDalamRentang('2026-09-23T17:00:00.000Z', rentang)).toBe(true);
    expect(isDalamRentang('2026-09-24T16:59:59.999Z', rentang)).toBe(true);
  });

  it('menolak waktu di luar rentang', () => {
    expect(isDalamRentang('2026-09-23T16:59:59.999Z', rentang)).toBe(false);
    expect(isDalamRentang('2026-09-24T17:00:00.000Z', rentang)).toBe(false);
  });
});
```

```ts
// __tests__/utils/presurvei/antreanKegiatan.test.ts
import { describe, expect, it } from '@jest/globals';

import type { SyncQueueItem } from '@/services/DatabaseService';
import { ambilKegiatanMenunggu } from '@/utils/presurvei/antreanKegiatan';

const item = (over: Partial<SyncQueueItem>): SyncQueueItem => ({
  id: 7,
  url: '/api/presurvei/kegiatan',
  method: 'POST',
  body: JSON.stringify({
    jenis: 'KUNJUNGAN',
    hasil: 'TERTARIK',
    waktuMulai: '2026-09-24T03:15:00.000Z',
    alamatDikunjungi: 'Jl. Melati 9',
    ditemuiNama: 'Bu Sari',
  }),
  status: 'PENDING',
  createdAt: '2026-09-24T03:16:00.000Z',
  meta: JSON.stringify({ photos: ['file:///a.jpg', 'file:///b.jpg'], targetField: 'fotoUrls' }),
  ...over,
});

describe('ambilKegiatanMenunggu', () => {
  it('memetakan kegiatan dari antrean beserta jumlah fotonya', () => {
    expect(ambilKegiatanMenunggu([item({})])).toEqual([
      {
        idAntrean: 7,
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        waktuMulai: '2026-09-24T03:15:00.000Z',
        alamatDikunjungi: 'Jl. Melati 9',
        ditemuiNama: 'Bu Sari',
        jumlahFoto: 2,
      },
    ]);
  });

  it('mengabaikan antrean endpoint lain dan metode lain', () => {
    expect(
      ambilKegiatanMenunggu([
        item({ url: '/api/presurvei/prospek' }),
        item({ url: '/api/marketing/canvasing' }),
        item({ method: 'PATCH' }),
      ]),
    ).toEqual([]);
  });

  it('melewati badan rusak dan jenis asing tanpa melempar', () => {
    expect(
      ambilKegiatanMenunggu([
        item({ id: 1, body: '{bukan json' }),
        item({ id: 2, body: JSON.stringify({ jenis: 'SULAP', hasil: 'DEAL', waktuMulai: 'x' }) }),
        item({ id: 3 }),
      ]).map((kegiatan) => kegiatan.idAntrean),
    ).toEqual([3]);
  });

  it('jumlah foto nol bila meta tidak membawa foto', () => {
    expect(ambilKegiatanMenunggu([item({ meta: '{}' })])[0].jumlahFoto).toBe(0);
  });

  it('teks kosong menjadi null', () => {
    const [kegiatan] = ambilKegiatanMenunggu([
      item({ body: JSON.stringify({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', waktuMulai: '2026-09-24T03:15:00.000Z' }) }),
    ]);
    expect(kegiatan.alamatDikunjungi).toBeNull();
    expect(kegiatan.ditemuiNama).toBeNull();
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx jest __tests__/services/PresurveiService.test.ts __tests__/utils/presurvei/rentangHari.test.ts __tests__/utils/presurvei/antreanKegiatan.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 4: Implementasi service**

```ts
// src/services/PresurveiService.ts
import api from './api';
import {
  ENDPOINT_KEGIATAN_PRESURVEI,
  ENDPOINT_PROSPEK_PRESURVEI,
  ENDPOINT_RINGKASAN_PRESURVEI,
  type ProspekStatus,
} from '@/constants/presurvei';
import type {
  HalamanPresurvei,
  HasilJadikanCanvasing,
  KegiatanListItem,
  MuatanJadikanCanvasing,
  ProspekDetail,
  ProspekListItem,
  RingkasanPresurvei,
} from '@/types/presurvei';

/** Filter `GET /api/presurvei/kegiatan`; nama sama persis dengan route (baris 20-31). */
export interface FilterKegiatanPresurvei {
  dariTanggal?: string;
  sampaiTanggal?: string;
  prospekId?: string;
  page: number;
  limit: number;
}

/** Filter `GET /api/presurvei/prospek` (route baris 30-38). */
export interface FilterProspekPresurvei {
  status?: ProspekStatus;
  search?: string;
  page: number;
  limit: number;
}

interface AmplopDaftar<T> {
  success: boolean;
  data: T[];
  meta: HalamanPresurvei<T>['meta'];
}

interface AmplopTunggal<T> {
  success: boolean;
  data: T;
}

/** Mutasi menampilkan galatnya sendiri; toast interceptor akan menggandakannya. */
const TANPA_TOAST = { skipErrorToast: true };

/** URL rincian/ubah satu prospek. */
export const buildProspekUrl = (id: string): string =>
  `${ENDPOINT_PROSPEK_PRESURVEI}/${encodeURIComponent(id)}`;

/** URL promosi prospek menjadi canvasing. */
export const buildJadikanCanvasingUrl = (id: string): string =>
  `${buildProspekUrl(id)}/jadikan-canvasing`;

/** Buang param kosong supaya query string bersih dan validator tidak menerima "". */
const tanpaNilaiKosong = (params: object): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries(params).filter(([, nilai]) => nilai !== undefined && nilai !== ''),
  ) as Record<string, string | number>;

async function ambilHalaman<T>(url: string, filter: object): Promise<HalamanPresurvei<T>> {
  const respons = await api.get<AmplopDaftar<T>>(url, { params: tanpaNilaiKosong(filter) });
  return { data: respons.data.data, meta: respons.data.meta };
}

export const PresurveiService = {
  /** Satu halaman kegiatan; server mengikat pemanggil mobile ke miliknya sendiri. */
  daftarKegiatan(filter: FilterKegiatanPresurvei): Promise<HalamanPresurvei<KegiatanListItem>> {
    return ambilHalaman<KegiatanListItem>(ENDPOINT_KEGIATAN_PRESURVEI, filter);
  },

  /** Satu halaman prospek milik pemanggil. */
  daftarProspek(filter: FilterProspekPresurvei): Promise<HalamanPresurvei<ProspekListItem>> {
    return ambilHalaman<ProspekListItem>(ENDPOINT_PROSPEK_PRESURVEI, filter);
  },

  /** Rincian satu prospek. */
  async rincianProspek(id: string): Promise<ProspekDetail> {
    const respons = await api.get<AmplopTunggal<ProspekDetail>>(buildProspekUrl(id));
    return respons.data.data;
  },

  /** Ringkasan Beranda sales. */
  async ringkasan(): Promise<RingkasanPresurvei> {
    const respons = await api.get<AmplopTunggal<RingkasanPresurvei>>(ENDPOINT_RINGKASAN_PRESURVEI);
    return respons.data.data;
  },

  /** Ubah status prospek; server menolak transisi tak sah dengan 409. */
  async ubahStatusProspek(id: string, status: ProspekStatus): Promise<ProspekDetail> {
    const respons = await api.patch<AmplopTunggal<ProspekDetail>>(
      buildProspekUrl(id),
      { status },
      TANPA_TOAST,
    );
    return respons.data.data;
  },

  /** Promosikan prospek Deal menjadi canvasing. */
  async jadikanCanvasing(id: string, muatan: MuatanJadikanCanvasing): Promise<HasilJadikanCanvasing> {
    const respons = await api.post<AmplopTunggal<HasilJadikanCanvasing>>(
      buildJadikanCanvasingUrl(id),
      muatan,
      TANPA_TOAST,
    );
    return respons.data.data;
  },
};
```

Catatan: `api.get(url)` tanpa config dipanggil dengan satu argumen; test menegaskan `undefined` sebagai argumen kedua karena mock meneruskan `(u, c)`.

- [ ] **Step 5: Implementasi rentang hari dan antrean**

```ts
// src/utils/presurvei/rentangHari.ts
const JAM_TERAKHIR = 23;
const MENIT_TERAKHIR = 59;
const DETIK_TERAKHIR = 59;
const MILIDETIK_TERAKHIR = 999;

/** Rentang tanggal dalam ISO UTC, bentuk yang diterima `daftarKegiatanSchema`. */
export interface RentangTanggalIso {
  dariTanggal: string;
  sampaiTanggal: string;
}

/** Awal dan akhir hari LOKAL perangkat yang memuat `tanggal`, sebagai ISO UTC. */
export function rentangHariLokal(tanggal: Date): RentangTanggalIso {
  const tahun = tanggal.getFullYear();
  const bulan = tanggal.getMonth();
  const hari = tanggal.getDate();
  return {
    dariTanggal: new Date(tahun, bulan, hari).toISOString(),
    sampaiTanggal: new Date(
      tahun, bulan, hari, JAM_TERAKHIR, MENIT_TERAKHIR, DETIK_TERAKHIR, MILIDETIK_TERAKHIR,
    ).toISOString(),
  };
}

/** Awal hari lokal yang digeser `jumlahHari` hari kalender (negatif = mundur). */
export function geserHari(tanggal: Date, jumlahHari: number): Date {
  return new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate() + jumlahHari);
}

/** Apakah `waktuIso` jatuh di dalam rentang, inklusif di kedua ujung. */
export function isDalamRentang(waktuIso: string, rentang: RentangTanggalIso): boolean {
  const waktu = Date.parse(waktuIso);
  return waktu >= Date.parse(rentang.dariTanggal) && waktu <= Date.parse(rentang.sampaiTanggal);
}
```

```ts
// src/utils/presurvei/antreanKegiatan.ts
import {
  ENDPOINT_KEGIATAN_PRESURVEI,
  KEGIATAN_HASIL,
  KEGIATAN_JENIS,
  type KegiatanHasil,
  type KegiatanJenis,
} from '@/constants/presurvei';
import type { SyncQueueItem } from '@/services/DatabaseService';

/** Kegiatan yang tersimpan di antrean offline dan belum terkirim. */
export interface KegiatanMenunggu {
  idAntrean: number;
  jenis: KegiatanJenis;
  hasil: KegiatanHasil;
  waktuMulai: string;
  alamatDikunjungi: string | null;
  ditemuiNama: string | null;
  jumlahFoto: number;
}

const METODE_CATAT = 'POST';

type BadanAntrean = Record<string, unknown>;

function bacaJson(teks: string): BadanAntrean | null {
  try {
    const nilai: unknown = JSON.parse(teks);
    return nilai !== null && typeof nilai === 'object' ? (nilai as BadanAntrean) : null;
  } catch {
    return null;
  }
}

function teksAtauNull(nilai: unknown): string | null {
  return typeof nilai === 'string' && nilai.trim() !== '' ? nilai : null;
}

function isKegiatanDikenal(badan: BadanAntrean): boolean {
  return (
    (KEGIATAN_JENIS as readonly unknown[]).includes(badan.jenis) &&
    (KEGIATAN_HASIL as readonly unknown[]).includes(badan.hasil) &&
    typeof badan.waktuMulai === 'string'
  );
}

function jumlahFotoMeta(item: SyncQueueItem): number {
  const photos = bacaJson(item.meta)?.photos;
  return Array.isArray(photos) ? photos.length : 0;
}

function keKegiatanMenunggu(item: SyncQueueItem, badan: BadanAntrean): KegiatanMenunggu {
  return {
    idAntrean: item.id,
    jenis: badan.jenis as KegiatanJenis,
    hasil: badan.hasil as KegiatanHasil,
    waktuMulai: badan.waktuMulai as string,
    alamatDikunjungi: teksAtauNull(badan.alamatDikunjungi),
    ditemuiNama: teksAtauNull(badan.ditemuiNama),
    jumlahFoto: jumlahFotoMeta(item),
  };
}

/**
 * Kegiatan presurvei di antrean offline. Badan yang rusak atau jenis yang
 * tidak dikenal dilewati, bukan dilempar: antrean dipakai bersama modul lain.
 */
export function ambilKegiatanMenunggu(antrean: readonly SyncQueueItem[]): KegiatanMenunggu[] {
  return antrean
    .filter((item) => item.url === ENDPOINT_KEGIATAN_PRESURVEI && item.method === METODE_CATAT)
    .flatMap((item) => {
      const badan = bacaJson(item.body);
      return badan && isKegiatanDikenal(badan) ? [keKegiatanMenunggu(item, badan)] : [];
    });
}
```

`src/lib/queryClient.ts` — tambahkan di dalam objek `queryKeys`, setelah blok `profile`:

```ts
  // Presurvei
  presurvei: {
    all: ["presurvei"] as const,
    kegiatanHarian: (rentang: { dariTanggal: string; sampaiTanggal: string }) =>
      [...queryKeys.presurvei.all, "kegiatan", rentang] as const,
    kegiatanProspek: (prospekId: string) =>
      [...queryKeys.presurvei.all, "kegiatan", { prospekId }] as const,
    antrean: () => [...queryKeys.presurvei.all, "antrean"] as const,
    prospekList: (filter: { status?: string; search?: string }) =>
      [...queryKeys.presurvei.all, "prospek", "list", filter] as const,
    prospekDetail: (id: string) =>
      [...queryKeys.presurvei.all, "prospek", "detail", id] as const,
    ringkasan: () => [...queryKeys.presurvei.all, "ringkasan"] as const,
  },
```

- [ ] **Step 6: Jalankan test dan typecheck**

Run: `npx jest __tests__/services/PresurveiService.test.ts __tests__/utils/presurvei/rentangHari.test.ts __tests__/utils/presurvei/antreanKegiatan.test.ts`
Expected: semua PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Ganti kunci `dariTanggal` jadi `dari` di `FilterKegiatanPresurvei` dan pemakainya | "daftar kegiatan memakai nama param route…" |
| `tanpaNilaiKosong` hanya membuang `undefined` | "daftar prospek memakai status dan search" |
| Hapus `encodeURIComponent` | "rincian prospek membaca data dari amplop" dan "URL prospek dan promosi dibangun dari id yang di-encode" |
| `ubahStatusProspek` mengirim `{ status, pemilikId: null }` | "ubah status mengirim PATCH hanya berisi status" |
| `MILIDETIK_TERAKHIR = 0` | "mencakup satu hari lokal penuh sebagai ISO UTC" |
| `waktu <= Date.parse(rentang.sampaiTanggal)` jadi `<` | "inklusif di kedua ujung" |
| Hapus `&& item.method === METODE_CATAT` | "mengabaikan antrean endpoint lain dan metode lain" |
| Hapus `isKegiatanDikenal(badan) &&` | "melewati badan rusak dan jenis asing tanpa melempar" |
| `teksAtauNull` mengembalikan `nilai as string` apa adanya | "teks kosong menjadi null" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add src/services/PresurveiService.ts src/utils/presurvei/rentangHari.ts src/utils/presurvei/antreanKegiatan.ts src/lib/queryClient.ts __tests__/services/PresurveiService.test.ts __tests__/utils/presurvei/rentangHari.test.ts __tests__/utils/presurvei/antreanKegiatan.test.ts
git commit -m "$(cat <<'EOF'
feat(presurvei): service API, rentang hari, dan pembaca antrean kegiatan

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Hook query presurvei, `useIsOnline`, penyegar setelah sinkron

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/utils/httpStatus.ts`
- Create: `src/utils/statusJaringan.ts`
- Create: `src/hooks/useIsOnline.ts`
- Create: `src/hooks/queries/usePresurveiKegiatan.ts`
- Create: `src/hooks/queries/usePresurveiProspek.ts`
- Create: `src/hooks/queries/useRingkasanPresurvei.ts`
- Test: `__tests__/hooks/usePresurveiQueries.test.ts`, `__tests__/hooks/useSegarkanPresurvei.test.tsx`, `__tests__/hooks/useIsOnline.test.ts`, `__tests__/utils/httpStatus.test.ts`

**Interfaces:**
- Consumes: Task 7 — `PresurveiService`, `queryKeys.presurvei`, `rentangHariLokal`, `ambilKegiatanMenunggu`; `DatabaseService.getPendingQueue()` (`src/services/DatabaseService.ts:365-375`); event `'sync:succeeded'` dengan muatan `{ endpoint, method, requestId }` (`src/services/SyncService.ts:431-435`).
- Produces:
  - `isAksesDitolak(error: unknown): boolean` (403 axios)
  - `isStatusOnline(state: { isConnected: boolean | null; isInternetReachable?: boolean | null }): boolean`
  - `useIsOnline(): boolean`
  - `useKegiatanHarian(tanggal: Date)` → `UseQueryResult<HalamanPresurvei<KegiatanListItem>>`
  - `useKegiatanProspek(prospekId: string)` → `UseQueryResult<HalamanPresurvei<KegiatanListItem>>`
  - `useKegiatanMenungguKirim()` → `UseQueryResult<KegiatanMenunggu[]>`
  - `isEndpointPresurvei(endpoint: unknown): boolean`
  - `useSegarkanPresurveiSetelahSinkron(): void`
  - `interface FilterDaftarProspek { status?: ProspekStatus; search?: string }`
  - `getHalamanProspekBerikutnya(halaman: HalamanPresurvei<ProspekListItem>): number | undefined`
  - `useDaftarProspek(filter: FilterDaftarProspek)` → `UseInfiniteQueryResult<InfiniteData<HalamanPresurvei<ProspekListItem>>>`
  - `useRincianProspek(id: string)` → `UseQueryResult<ProspekDetail>`
  - `bolehUlangRingkasan(jumlahGagal: number, error: unknown): boolean`
  - `useRingkasanPresurvei(isAktif: boolean)` → `UseQueryResult<RingkasanPresurvei>`

- [ ] **Step 1: Tulis test yang gagal**

```ts
// __tests__/utils/httpStatus.test.ts
import { describe, expect, it } from '@jest/globals';

import { isAksesDitolak } from '@/utils/httpStatus';

// axios di-mock global (`jest.setup.js`): isAxiosError membaca `isAxiosError === true`.
const galatAxios = (status?: number) => ({ isAxiosError: true, response: status ? { status } : undefined });

describe('isAksesDitolak', () => {
  it('benar hanya untuk respons 403', () => {
    expect(isAksesDitolak(galatAxios(403))).toBe(true);
    expect(isAksesDitolak(galatAxios(401))).toBe(false);
    expect(isAksesDitolak(galatAxios(500))).toBe(false);
  });

  it('salah untuk galat jaringan tanpa respons dan galat biasa', () => {
    expect(isAksesDitolak(galatAxios())).toBe(false);
    expect(isAksesDitolak(new Error('403'))).toBe(false);
  });
});
```

```ts
// __tests__/hooks/useIsOnline.test.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

type Pendengar = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;
let mockPendengar: Pendengar | null = null;
const mockBerhenti = jest.fn();
const mockFetch = jest.fn<() => Promise<{ isConnected: boolean | null; isInternetReachable: boolean | null }>>();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: () => mockFetch(),
    addEventListener: (pendengar: Pendengar) => {
      mockPendengar = pendengar;
      return mockBerhenti;
    },
  },
}));

import { useIsOnline } from '@/hooks/useIsOnline';
import { isStatusOnline } from '@/utils/statusJaringan';

describe('isStatusOnline', () => {
  it('status tak diketahui (null) dianggap online', () => {
    expect(isStatusOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it('offline bila tidak tersambung atau internet tak terjangkau', () => {
    expect(isStatusOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
    expect(isStatusOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });
});

describe('useIsOnline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPendengar = null;
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
  });

  it('membaca status awal lalu mengikuti perubahan', async () => {
    const { result } = renderHook(() => useIsOnline());

    await waitFor(() => expect(result.current).toBe(false));

    act(() => mockPendengar?.({ isConnected: true, isInternetReachable: true }));
    expect(result.current).toBe(true);
  });

  it('berhenti mendengar saat dilepas', () => {
    const { unmount } = renderHook(() => useIsOnline());

    unmount();

    expect(mockBerhenti).toHaveBeenCalledTimes(1);
  });
});
```

```ts
// __tests__/hooks/usePresurveiQueries.test.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockUseQuery = jest.fn();
const mockUseInfiniteQuery = jest.fn();

// Mock sebagian: `QueryClient` asli tetap ada karena `src/lib/queryClient.ts:73`
// membuatnya saat modul dimuat (sumber `queryKeys`). Yang diganti hanya hook
// yang opsinya diperiksa.
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useInfiniteQuery: (...args: unknown[]) => mockUseInfiniteQuery(...args),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  keepPreviousData: 'keepPreviousData-sentinel',
}));

const mockDaftarKegiatan = jest.fn();
const mockDaftarProspek = jest.fn();
const mockRincianProspek = jest.fn();
const mockRingkasan = jest.fn();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: {
    daftarKegiatan: (...a: unknown[]) => mockDaftarKegiatan(...a),
    daftarProspek: (...a: unknown[]) => mockDaftarProspek(...a),
    rincianProspek: (...a: unknown[]) => mockRincianProspek(...a),
    ringkasan: (...a: unknown[]) => mockRingkasan(...a),
  },
}));

const mockGetPendingQueue = jest.fn<() => Promise<unknown[]>>();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: { getPendingQueue: () => mockGetPendingQueue() },
}));

import { useKegiatanHarian, useKegiatanMenungguKirim, useKegiatanProspek } from '@/hooks/queries/usePresurveiKegiatan';
import { getHalamanProspekBerikutnya, useDaftarProspek, useRincianProspek } from '@/hooks/queries/usePresurveiProspek';
import { bolehUlangRingkasan, useRingkasanPresurvei } from '@/hooks/queries/useRingkasanPresurvei';

type OpsiQuery = { queryKey: unknown[]; queryFn: (konteks?: { pageParam: number }) => unknown; enabled?: boolean; retry?: unknown; initialPageParam?: number; placeholderData?: unknown };
const opsiTerakhir = (mock: { mock: { calls: unknown[][] } }) =>
  mock.mock.calls[mock.mock.calls.length - 1][0] as OpsiQuery;

describe('hook kegiatan presurvei', () => {
  beforeEach(() => jest.clearAllMocks());

  it('kegiatan harian meminta hari lokal penuh dengan batas 100', () => {
    renderHook(() => useKegiatanHarian(new Date(2026, 8, 24, 10)));
    const opsi = opsiTerakhir(mockUseQuery);

    opsi.queryFn();

    const rentang = { dariTanggal: '2026-09-23T17:00:00.000Z', sampaiTanggal: '2026-09-24T16:59:59.999Z' };
    expect(opsi.queryKey).toEqual(['presurvei', 'kegiatan', rentang]);
    expect(mockDaftarKegiatan).toHaveBeenCalledWith({ ...rentang, page: 1, limit: 100 });
  });

  it('riwayat kegiatan prospek memakai prospekId dan nonaktif tanpa id', () => {
    renderHook(() => useKegiatanProspek('p-9'));
    opsiTerakhir(mockUseQuery).queryFn();
    expect(mockDaftarKegiatan).toHaveBeenCalledWith({ prospekId: 'p-9', page: 1, limit: 20 });

    renderHook(() => useKegiatanProspek(''));
    expect(opsiTerakhir(mockUseQuery).enabled).toBe(false);
  });

  it('antrean membaca kegiatan presurvei dari antrean offline', async () => {
    mockGetPendingQueue.mockResolvedValue([
      {
        id: 4,
        url: '/api/presurvei/kegiatan',
        method: 'POST',
        body: JSON.stringify({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', waktuMulai: '2026-09-24T01:00:00.000Z' }),
        status: 'PENDING',
        createdAt: '2026-09-24T01:00:01.000Z',
        meta: '{}',
      },
    ]);
    renderHook(() => useKegiatanMenungguKirim());
    const opsi = opsiTerakhir(mockUseQuery);

    const hasil = (await opsi.queryFn()) as { idAntrean: number }[];

    expect(opsi.queryKey).toEqual(['presurvei', 'antrean']);
    expect(hasil.map((kegiatan) => kegiatan.idAntrean)).toEqual([4]);
  });
});

describe('hook prospek presurvei', () => {
  beforeEach(() => jest.clearAllMocks());

  it('daftar prospek berhalaman dengan filter', () => {
    renderHook(() => useDaftarProspek({ status: 'BARU', search: 'budi' }));
    const opsi = opsiTerakhir(mockUseInfiniteQuery);

    opsi.queryFn({ pageParam: 3 });

    expect(opsi.queryKey).toEqual(['presurvei', 'prospek', 'list', { status: 'BARU', search: 'budi' }]);
    expect(opsi.initialPageParam).toBe(1);
    expect(opsi.placeholderData).toBe('keepPreviousData-sentinel');
    expect(mockDaftarProspek).toHaveBeenCalledWith({ status: 'BARU', search: 'budi', page: 3, limit: 20 });
  });

  it('halaman berikutnya berhenti di halaman terakhir', () => {
    const halaman = (page: number, totalPages: number) => ({ data: [], meta: { page, limit: 20, total: 0, totalPages } });
    expect(getHalamanProspekBerikutnya(halaman(1, 3))).toBe(2);
    expect(getHalamanProspekBerikutnya(halaman(3, 3))).toBeUndefined();
    expect(getHalamanProspekBerikutnya(halaman(1, 0))).toBeUndefined();
  });

  it('rincian prospek memakai id dan nonaktif tanpa id', () => {
    renderHook(() => useRincianProspek('p-2'));
    const opsi = opsiTerakhir(mockUseQuery);
    opsi.queryFn();
    expect(opsi.queryKey).toEqual(['presurvei', 'prospek', 'detail', 'p-2']);
    expect(mockRincianProspek).toHaveBeenCalledWith('p-2');

    renderHook(() => useRincianProspek(''));
    expect(opsiTerakhir(mockUseQuery).enabled).toBe(false);
  });
});

describe('hook ringkasan presurvei', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tidak memanggil server bila presurvei belum aktif', () => {
    renderHook(() => useRingkasanPresurvei(false));
    const opsi = opsiTerakhir(mockUseQuery);

    expect(opsi.queryKey).toEqual(['presurvei', 'ringkasan']);
    expect(opsi.enabled).toBe(false);
    expect(opsi.retry).toBe(bolehUlangRingkasan);
  });

  it('403 tidak diulang, galat lain diulang sampai dua kali', () => {
    const galat403 = { isAxiosError: true, response: { status: 403 } };
    const galat500 = { isAxiosError: true, response: { status: 500 } };
    expect(bolehUlangRingkasan(0, galat403)).toBe(false);
    expect(bolehUlangRingkasan(1, galat500)).toBe(true);
    expect(bolehUlangRingkasan(2, galat500)).toBe(false);
  });
});
```

```tsx
// __tests__/hooks/useSegarkanPresurvei.test.tsx
import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceEventEmitter } from 'react-native';

jest.mock('@/services/PresurveiService', () => ({ PresurveiService: {} }));
jest.mock('@/services/DatabaseService', () => ({ DatabaseService: { getPendingQueue: jest.fn() } }));

import { isEndpointPresurvei, useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useSegarkanPresurveiSetelahSinkron', () => {
  it('menyegarkan data presurvei hanya setelah antrean presurvei terkirim', () => {
    const client = new QueryClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { unmount } = renderHook(() => useSegarkanPresurveiSetelahSinkron(), { wrapper: bungkus(client) });

    DeviceEventEmitter.emit('sync:succeeded', { endpoint: '/api/mobile/attendance/check-in' });
    expect(invalidasi).not.toHaveBeenCalled();

    DeviceEventEmitter.emit('sync:succeeded', { endpoint: '/api/presurvei/kegiatan', method: 'POST' });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });

    unmount();
    invalidasi.mockClear();
    DeviceEventEmitter.emit('sync:succeeded', { endpoint: '/api/presurvei/kegiatan' });
    expect(invalidasi).not.toHaveBeenCalled();
    client.clear();
  });

  it('isEndpointPresurvei menolak nilai bukan string', () => {
    expect(isEndpointPresurvei(undefined)).toBe(false);
    expect(isEndpointPresurvei('/api/presurvei/prospek/p-1')).toBe(true);
    expect(isEndpointPresurvei('/api/marketing/canvasing')).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/httpStatus.test.ts __tests__/hooks/useIsOnline.test.ts __tests__/hooks/usePresurveiQueries.test.ts __tests__/hooks/useSegarkanPresurvei.test.tsx`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Implementasi utilitas**

```ts
// src/utils/httpStatus.ts
import { isAxiosError } from 'axios';

const STATUS_DILARANG = 403;

/** Apakah galat adalah respons 403 dari server (izin tidak ada). */
export function isAksesDitolak(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === STATUS_DILARANG;
}
```

```ts
// src/utils/statusJaringan.ts
/**
 * Apakah perangkat dianggap online. Nilai null (belum diketahui) dianggap
 * online, sama dengan penentu offline di `src/hooks/useOfflineQuery.ts:48`.
 */
export function isStatusOnline(state: {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}
```

```ts
// src/hooks/useIsOnline.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { isStatusOnline } from '@/utils/statusJaringan';

/** Status online terkini untuk menonaktifkan aksi yang butuh server. */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isTerpasang = true;
    void NetInfo.fetch().then((state) => {
      if (isTerpasang) setIsOnline(isStatusOnline(state));
    });
    const berhenti = NetInfo.addEventListener((state) => setIsOnline(isStatusOnline(state)));
    return () => {
      isTerpasang = false;
      berhenti();
    };
  }, []);

  return isOnline;
}
```

- [ ] **Step 4: Implementasi hook query**

```ts
// src/hooks/queries/usePresurveiKegiatan.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { AWALAN_ENDPOINT_PRESURVEI } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { DatabaseService } from '@/services/DatabaseService';
import { PresurveiService } from '@/services/PresurveiService';
import { ambilKegiatanMenunggu } from '@/utils/presurvei/antreanKegiatan';
import { rentangHariLokal } from '@/utils/presurvei/rentangHari';

/** Batas `limit` route (`kegiatan.validator.ts:24`); satu hari satu sales tidak melebihinya. */
const BATAS_KEGIATAN_SEHARI = 100;
const BATAS_RIWAYAT_PROSPEK = 20;
const WAKTU_SEGAR_MS = 60_000;

/** Event yang dipancarkan `SyncService` setelah satu item antrean terkirim (`SyncService.ts:431`). */
const EVENT_SINKRON_BERHASIL = 'sync:succeeded';

/** Kegiatan milik sendiri pada satu hari lokal. */
export function useKegiatanHarian(tanggal: Date) {
  const rentang = rentangHariLokal(tanggal);
  return useQuery({
    queryKey: queryKeys.presurvei.kegiatanHarian(rentang),
    queryFn: () =>
      PresurveiService.daftarKegiatan({ ...rentang, page: 1, limit: BATAS_KEGIATAN_SEHARI }),
    staleTime: WAKTU_SEGAR_MS,
  });
}

/** Kegiatan yang tertaut ke satu prospek, terbaru lebih dulu. */
export function useKegiatanProspek(prospekId: string) {
  return useQuery({
    queryKey: queryKeys.presurvei.kegiatanProspek(prospekId),
    queryFn: () =>
      PresurveiService.daftarKegiatan({ prospekId, page: 1, limit: BATAS_RIWAYAT_PROSPEK }),
    enabled: prospekId !== '',
  });
}

/** Kegiatan yang masih di antrean offline ("Menunggu kirim"). */
export function useKegiatanMenungguKirim() {
  return useQuery({
    queryKey: queryKeys.presurvei.antrean(),
    queryFn: async () => ambilKegiatanMenunggu(await DatabaseService.getPendingQueue()),
    staleTime: 0,
  });
}

/** Apakah endpoint antrean yang terkirim milik presurvei. */
export function isEndpointPresurvei(endpoint: unknown): boolean {
  return typeof endpoint === 'string' && endpoint.startsWith(AWALAN_ENDPOINT_PRESURVEI);
}

/** Segarkan data presurvei setiap kali antrean presurvei berhasil terkirim. */
export function useSegarkanPresurveiSetelahSinkron(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const langganan = DeviceEventEmitter.addListener(
      EVENT_SINKRON_BERHASIL,
      (muatan?: { endpoint?: unknown }) => {
        if (!isEndpointPresurvei(muatan?.endpoint)) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
      },
    );
    return () => langganan.remove();
  }, [queryClient]);
}
```

```ts
// src/hooks/queries/usePresurveiProspek.ts
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import type { HalamanPresurvei, ProspekListItem } from '@/types/presurvei';

const UKURAN_HALAMAN_PROSPEK = 20;

/** Filter layar daftar prospek. */
export interface FilterDaftarProspek {
  status?: ProspekStatus;
  search?: string;
}

/** Halaman berikutnya, atau undefined bila sudah di halaman terakhir. */
export const getHalamanProspekBerikutnya = (
  halaman: HalamanPresurvei<ProspekListItem>,
): number | undefined =>
  halaman.meta.page < halaman.meta.totalPages ? halaman.meta.page + 1 : undefined;

/** Daftar prospek milik sendiri, berhalaman. */
export function useDaftarProspek(filter: FilterDaftarProspek) {
  return useInfiniteQuery({
    queryKey: queryKeys.presurvei.prospekList(filter),
    queryFn: ({ pageParam }) =>
      PresurveiService.daftarProspek({
        ...filter,
        page: pageParam as number,
        limit: UKURAN_HALAMAN_PROSPEK,
      }),
    initialPageParam: 1,
    getNextPageParam: getHalamanProspekBerikutnya,
    // Pencarian ter-debounce mengganti query key; tanpa ini daftar berkedip kosong.
    placeholderData: keepPreviousData,
  });
}

/** Rincian satu prospek. */
export function useRincianProspek(id: string) {
  return useQuery({
    queryKey: queryKeys.presurvei.prospekDetail(id),
    queryFn: () => PresurveiService.rincianProspek(id),
    enabled: id !== '',
  });
}
```

```ts
// src/hooks/queries/useRingkasanPresurvei.ts
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { isAksesDitolak } from '@/utils/httpStatus';

const BATAS_ULANG_RINGKASAN = 2;

/** 403 tidak diulang: izin tidak akan muncul sendiri di tengah percobaan ulang. */
export function bolehUlangRingkasan(jumlahGagal: number, error: unknown): boolean {
  return !isAksesDitolak(error) && jumlahGagal < BATAS_ULANG_RINGKASAN;
}

/** Ringkasan Beranda sales; tidak dipanggil selama presurvei belum aktif. */
export function useRingkasanPresurvei(isAktif: boolean) {
  return useQuery({
    queryKey: queryKeys.presurvei.ringkasan(),
    queryFn: () => PresurveiService.ringkasan(),
    enabled: isAktif,
    retry: bolehUlangRingkasan,
  });
}
```

- [ ] **Step 5: Jalankan test dan typecheck**

Run: `npx jest __tests__/utils/httpStatus.test.ts __tests__/hooks/useIsOnline.test.ts __tests__/hooks/usePresurveiQueries.test.ts __tests__/hooks/useSegarkanPresurvei.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `STATUS_DILARANG = 401` | "benar hanya untuk respons 403" |
| `state.isInternetReachable !== false` jadi `state.isInternetReachable === true` | "status tak diketahui (null) dianggap online" |
| Hapus `berhenti()` di cleanup `useIsOnline` | "berhenti mendengar saat dilepas" |
| `BATAS_KEGIATAN_SEHARI = 20` | "kegiatan harian meminta hari lokal penuh dengan batas 100" |
| `enabled: true` di `useKegiatanProspek` | "riwayat kegiatan prospek memakai prospekId dan nonaktif tanpa id" |
| Hapus `if (!isEndpointPresurvei(...)) return;` | "menyegarkan data presurvei hanya setelah antrean presurvei terkirim" |
| Hapus `langganan.remove()` | "menyegarkan data presurvei…" (bagian setelah `unmount`) |
| `enabled: isAktif` jadi `enabled: true` | "tidak memanggil server bila presurvei belum aktif" |
| Hapus `!isAksesDitolak(error) &&` | "403 tidak diulang, galat lain diulang sampai dua kali" |
| Hapus `placeholderData: keepPreviousData` | "daftar prospek berhalaman dengan filter" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 7: Commit**

```bash
git add src/utils/httpStatus.ts src/utils/statusJaringan.ts src/hooks/useIsOnline.ts src/hooks/queries/usePresurveiKegiatan.ts src/hooks/queries/usePresurveiProspek.ts src/hooks/queries/useRingkasanPresurvei.ts __tests__/utils/httpStatus.test.ts __tests__/hooks/useIsOnline.test.ts __tests__/hooks/usePresurveiQueries.test.ts __tests__/hooks/useSegarkanPresurvei.test.tsx
git commit -m "$(cat <<'EOF'
feat(presurvei): hook query, status online, dan penyegar setelah sinkron

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `useApiMutation` — unggah `meta.photos` online, salin saat antre

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/utils/fotoMutasi.ts`
- Modify: `src/hooks/queries/useApiMutation.ts:12-34` (impor), `:249-253` (setelah cek online), `:297-308` (salin `meta.photos`)
- Modify: `src/services/UploadService.ts:10-18` (`UploadType` + `'presurvei'`), `:70-79` (nama galat dari konstanta bersama)
- Test: `__tests__/utils/fotoMutasi.test.ts`, `__tests__/hooks/useApiMutation.test.tsx` (tambah test)

**Interfaces:**
- Consumes: `uploadService.uploadFile(uri, type)` (`src/services/UploadService.ts:130-240`), `persistPhotoForOffline(uri)` (`src/utils/persistPhoto.ts:25`), `SyncService.isOnline()` (`src/services/SyncService.ts:109-112`).
- Produces:
  - `NAMA_GALAT_UNGGAH_HABIS_WAKTU = 'UploadTimeoutError'`
  - `type PengunggahFoto = (uri: string, tipe: string) => Promise<string>`
  - `interface MetaFotoMutasi { photos?: string[]; photoType?: string; targetField?: string; singleFile?: boolean }`
  - `unggahFotoMeta(meta: MetaFotoMutasi | undefined, payload: Record<string, unknown>, unggah: PengunggahFoto): Promise<void>`
  - `isUnggahHabisWaktu(error: unknown): boolean`
  - Perilaku baru `useApiMutation`: saat online, `meta.photos` non-http diunggah dengan `meta.photoType` lalu `payload[meta.targetField]` diisi (array, atau URL pertama bila `singleFile`). Habis waktu unggah, atau offline setelah unggah gagal → mutasi diantre. Saat diantre, `meta.photos` disalin ke penyimpanan tetap.
  - `UploadType` mobile memuat `'presurvei'`.

- [ ] **Step 1: Tulis test unit yang gagal**

```ts
// __tests__/utils/fotoMutasi.test.ts
import { describe, expect, it, jest } from '@jest/globals';

import { isUnggahHabisWaktu, unggahFotoMeta } from '@/utils/fotoMutasi';

const unggah = jest.fn(async (uri: string) => `https://cdn.test/${uri.split('/').pop()}`);

describe('unggahFotoMeta', () => {
  it('daftar foto kosong tidak menimpa targetField', async () => {
    // Pola `work-order-detail/[id].tsx:299-300`: `photos: []` + `targetField`
    // dengan URL sudah ada di payload. Menimpanya jadi [] menghapus foto.
    const payload: Record<string, unknown> = { photoUrl: 'https://cdn.test/lama.jpg' };

    await unggahFotoMeta({ photos: [], targetField: 'photoUrl' }, payload, unggah);

    expect(payload).toEqual({ photoUrl: 'https://cdn.test/lama.jpg' });
    expect(unggah).not.toHaveBeenCalled();
  });

  it('tanpa targetField tidak mengunggah apa pun', async () => {
    const payload: Record<string, unknown> = {};

    await unggahFotoMeta({ photos: ['file:///cache/a.jpg'] }, payload, unggah);

    expect(payload).toEqual({});
    expect(unggah).not.toHaveBeenCalled();
  });

  it('memakai tipe general bila photoType tidak diisi', async () => {
    unggah.mockClear();
    await unggahFotoMeta({ photos: ['file:///cache/a.jpg'], targetField: 'foto' }, {}, unggah);

    expect(unggah).toHaveBeenCalledWith('file:///cache/a.jpg', 'general');
  });
});

describe('isUnggahHabisWaktu', () => {
  it('mengenali galat habis waktu UploadService dari namanya', () => {
    const galat = new Error('Upload melebihi batas waktu');
    galat.name = 'UploadTimeoutError';
    expect(isUnggahHabisWaktu(galat)).toBe(true);
    expect(isUnggahHabisWaktu(new Error('Upload failed with status 413'))).toBe(false);
    expect(isUnggahHabisWaktu('UploadTimeoutError')).toBe(false);
  });
});
```

- [ ] **Step 2: Tulis test `useApiMutation` yang gagal**

Di `__tests__/hooks/useApiMutation.test.tsx`:

1. Ganti mock `@/services/UploadService` (baris 47-52) dengan:

```tsx
const mockUploadFile = jest.fn<(uri: string, tipe: string) => Promise<string>>();
jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadFile: (uri: string, tipe: string) => mockUploadFile(uri, tipe),
  },
  UploadType: {},
}));

const mockPersist = jest.fn<(uri: string) => Promise<string>>();
jest.mock('@/utils/persistPhoto', () => ({
  persistPhotoForOffline: (uri: string) => mockPersist(uri),
}));
```

2. Di `beforeEach` (baris 84-91), tambahkan:

```tsx
    mockUploadFile.mockImplementation(async (uri) => `https://cdn.test/${uri.split('/').pop()}`);
    mockPersist.mockImplementation(async (uri) =>
      uri.replace('file:///cache/', 'file:///dokumen/offline-photos/'),
    );
```

3. Tambahkan blok ini di dalam `describe('useApiMutation', ...)`, setelah test terakhir:

```tsx
  describe('foto meta (meta.photos + targetField)', () => {
    const buatClient = () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: Infinity },
          mutations: { retry: false, gcTime: Infinity },
        },
      });

    const META_KEGIATAN = {
      photos: ['file:///cache/a.jpg', 'file:///cache/b.jpg'],
      targetField: 'fotoUrls',
      photoType: 'presurvei',
    };

    const renderMutasi = (client: QueryClient) => {
      const { useApiMutation } = require('@/hooks/queries/useApiMutation');
      return renderHook(
        () =>
          useApiMutation({
            endpoint: '/api/presurvei/kegiatan',
            method: 'POST',
            buildPayload: ({ meta: _meta, ...isi }: Record<string, unknown>) => isi,
          }),
        { wrapper: createWrapper(client) },
      );
    };

    it('mengunggah meta.photos di jalur online lalu mengisi targetField sesuai urutan', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockRequest.mockResolvedValue({ data: { success: true } } as never);
      const client = buatClient();
      const { result, unmount } = renderMutasi(client);

      await act(async () => {
        await result.current.mutateAsync({ jenis: 'KUNJUNGAN', meta: META_KEGIATAN });
      });

      expect(mockUploadFile.mock.calls).toEqual([
        ['file:///cache/a.jpg', 'presurvei'],
        ['file:///cache/b.jpg', 'presurvei'],
      ]);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { jenis: 'KUNJUNGAN', fotoUrls: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'] },
        }),
      );
      expect(mockAddToQueue).not.toHaveBeenCalled();
      unmount();
      client.clear();
    });

    it('tidak mengunggah ulang foto yang sudah berupa URL', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockRequest.mockResolvedValue({ data: { success: true } } as never);
      const client = buatClient();
      const { result, unmount } = renderMutasi(client);

      await act(async () => {
        await result.current.mutateAsync({
          jenis: 'KUNJUNGAN',
          meta: { ...META_KEGIATAN, photos: ['https://cdn.test/lama.jpg', 'file:///cache/b.jpg'] },
        });
      });

      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { jenis: 'KUNJUNGAN', fotoUrls: ['https://cdn.test/lama.jpg', 'https://cdn.test/b.jpg'] },
        }),
      );
      unmount();
      client.clear();
    });

    it('mengisi URL tunggal bila singleFile', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockRequest.mockResolvedValue({ data: { success: true } } as never);
      const client = buatClient();
      const { result, unmount } = renderMutasi(client);

      await act(async () => {
        await result.current.mutateAsync({
          nama: 'KTP',
          meta: { photos: ['file:///cache/ktp.jpg'], targetField: 'fotoKtp', singleFile: true },
        });
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ data: { nama: 'KTP', fotoKtp: 'https://cdn.test/ktp.jpg' } }),
      );
      unmount();
      client.clear();
    });

    it('menyimpan salinan tetap meta.photos saat masuk antrean offline', async () => {
      mockIsOnline.mockResolvedValue(false as never);
      const client = buatClient();
      const { result, unmount } = renderMutasi(client);

      await act(async () => {
        await result.current.mutateAsync({ jenis: 'KUNJUNGAN', meta: META_KEGIATAN });
      });

      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(mockAddToQueue).toHaveBeenCalledWith(
        '/api/presurvei/kegiatan',
        'POST',
        { jenis: 'KUNJUNGAN' },
        {
          photos: [
            'file:///dokumen/offline-photos/a.jpg',
            'file:///dokumen/offline-photos/b.jpg',
          ],
          targetField: 'fotoUrls',
          photoType: 'presurvei',
        },
      );
      unmount();
      client.clear();
    });

    it('memasukkan ke antrean bila unggah foto habis waktu', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      const habisWaktu = new Error('Upload melebihi batas waktu 60 detik.');
      habisWaktu.name = 'UploadTimeoutError';
      mockUploadFile.mockRejectedValue(habisWaktu);
      const client = buatClient();
      const { result, unmount } = renderMutasi(client);

      let hasil: unknown;
      await act(async () => {
        hasil = await result.current.mutateAsync({ jenis: 'KUNJUNGAN', meta: META_KEGIATAN });
      });

      const { isOfflineMutationQueuedResult } = require('@/hooks/queries/useApiMutation');
      expect(isOfflineMutationQueuedResult(hasil)).toBe(true);
      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockAddToQueue).toHaveBeenCalledWith(
        '/api/presurvei/kegiatan',
        'POST',
        { jenis: 'KUNJUNGAN' },
        expect.objectContaining({
          photos: ['file:///dokumen/offline-photos/a.jpg', 'file:///dokumen/offline-photos/b.jpg'],
        }),
      );
      unmount();
      client.clear();
    });

    it('memasukkan ke antrean bila sinyal hilang saat unggah', async () => {
      mockIsOnline.mockResolvedValueOnce(true as never).mockResolvedValueOnce(false as never);
      mockUploadFile.mockRejectedValue(new Error('Network request failed'));
      const client = buatClient();
      const { result, unmount } = renderMutasi(client);

      await act(async () => {
        await result.current.mutateAsync({ jenis: 'KUNJUNGAN', meta: META_KEGIATAN });
      });

      expect(mockAddToQueue).toHaveBeenCalledTimes(1);
      expect(mockRequest).not.toHaveBeenCalled();
      unmount();
      client.clear();
    });

    it('melempar kegagalan unggah biasa saat masih online', async () => {
      mockIsOnline.mockResolvedValue(true as never);
      mockUploadFile.mockRejectedValue(new Error('Upload failed with status 413'));
      const client = buatClient();
      const { result, unmount } = renderMutasi(client);

      await act(async () => {
        await expect(
          result.current.mutateAsync({ jenis: 'KUNJUNGAN', meta: META_KEGIATAN }),
        ).rejects.toThrow('status 413');
      });

      expect(mockAddToQueue).not.toHaveBeenCalled();
      unmount();
      client.clear();
    });
  });
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/fotoMutasi.test.ts __tests__/hooks/useApiMutation.test.tsx`
Expected: FAIL — `fotoMutasi` belum ada; test online menerima `data: { jenis: 'KUNJUNGAN' }` tanpa `fotoUrls`; test antrean menerima `photos` asli (`file:///cache/...`); tiga test lama tetap PASS.

- [ ] **Step 4: Implementasi `fotoMutasi`**

```ts
// src/utils/fotoMutasi.ts
/**
 * Unggah foto meta mutasi di jalur online.
 *
 * Cermin jalur antrean `SyncService.ts:317-352` (`meta.photos` +
 * `meta.targetField`), supaya mutasi yang ternyata online tidak terkirim
 * dengan medan foto kosong.
 */

/** Nama galat habis waktu `UploadService` (dipakai juga di sana). */
export const NAMA_GALAT_UNGGAH_HABIS_WAKTU = 'UploadTimeoutError';

const TIPE_UNGGAH_BAWAAN = 'general';

/** Pengunggah satu berkas; mengembalikan URL server. */
export type PengunggahFoto = (uri: string, tipe: string) => Promise<string>;

/** Bagian `MutationMeta` yang dibaca di sini. */
export interface MetaFotoMutasi {
  photos?: string[];
  photoType?: string;
  targetField?: string;
  singleFile?: boolean;
}

const isSudahDiunggah = (uri: string): boolean => uri.startsWith('http');

/**
 * Unggah `meta.photos` lokal lalu isi `payload[meta.targetField]` dengan URL
 * dalam urutan yang sama. Tanpa `targetField` atau tanpa foto, payload tidak
 * disentuh — pemanggil lama mengirim `photos: []` bersama URL yang sudah ada.
 */
export async function unggahFotoMeta(
  meta: MetaFotoMutasi | undefined,
  payload: Record<string, unknown>,
  unggah: PengunggahFoto,
): Promise<void> {
  if (!meta?.targetField || !Array.isArray(meta.photos) || meta.photos.length === 0) return;
  const tipe = meta.photoType ?? TIPE_UNGGAH_BAWAAN;
  const urls = await Promise.all(
    meta.photos.map((uri) => (isSudahDiunggah(uri) ? Promise.resolve(uri) : unggah(uri, tipe))),
  );
  payload[meta.targetField] = meta.singleFile ? (urls[0] ?? null) : urls;
}

/** Apakah galat unggah adalah habis waktu `UploadService` (sinyal lemah). */
export function isUnggahHabisWaktu(error: unknown): boolean {
  return error instanceof Error && error.name === NAMA_GALAT_UNGGAH_HABIS_WAKTU;
}
```

- [ ] **Step 5: Implementasi di `useApiMutation` dan `UploadService`**

`src/hooks/queries/useApiMutation.ts`:

Tambah impor setelah impor `extractApiErrorMessage`:

```ts
import { isUnggahHabisWaktu, unggahFotoMeta } from "@/utils/fotoMutasi";
```

Tambah fungsi modul setelah `uploadFile` (baris 158-166):

```ts
/**
 * Unggah `meta.photos` di jalur online.
 *
 * Habis waktu, atau sinyal yang hilang di tengah unggah, dilempar sebagai
 * "Offline" supaya mutasi masuk antrean alih-alih gagal — kegiatan lapangan
 * tidak boleh hilang karena sinyal lemah. Galat lain (mis. 413) diteruskan.
 */
async function unggahFotoMetaAtauAntre(
  meta: MutationMeta | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await unggahFotoMeta(meta, payload, uploadFile);
  } catch (error) {
    if (isUnggahHabisWaktu(error) || !(await SyncService.isOnline())) {
      throw new Error("Offline");
    }
    throw error;
  }
}
```

Tepat setelah blok cek online (baris 249-253, `if (!isOnline) { throw new Error("Offline"); }`), sisipkan:

```ts
        // Diunggah SETELAH cek online: saat offline, UploadService hanya akan
        // menghabiskan tiga percobaan sebelum gagal (UploadService.ts:141-235).
        await unggahFotoMetaAtauAntre(variables.meta, payload);
```

Di blok antrean, tepat setelah blok penyalinan `photoMap` (baris 297-308), sisipkan:

```ts
          // `meta.photos` juga harus disalin: URI kamera/manipulator ada di
          // cache yang bisa dibersihkan OS sebelum antrean terkirim.
          if (Array.isArray(queueMeta.photos)) {
            queueMeta.photos = await Promise.all(
              (queueMeta.photos as string[]).map((uri) => persistPhotoForOffline(uri)),
            );
          }
```

`src/services/UploadService.ts`:

```ts
export type UploadType =
  | 'employee-attendance'
  | 'employee-leave'
  | 'work-order-updates'
  | 'workorder-completion'
  | 'inventory-masuk'
  | 'inventory-keluar'
  | 'marketing/point-claims'
  | 'marketing' // Added for Canvasing
  | 'presurvei'; // Foto bukti kegiatan presurvei
```

Tambah impor `import { NAMA_GALAT_UNGGAH_HABIS_WAKTU } from '@/utils/fotoMutasi';` dan di `UploadTimeoutError` ganti `this.name = 'UploadTimeoutError';` menjadi:

```ts
    this.name = NAMA_GALAT_UNGGAH_HABIS_WAKTU;
```

- [ ] **Step 6: Jalankan test terkait, seluruh suite, dan typecheck**

Run: `npx jest __tests__/utils/fotoMutasi.test.ts __tests__/hooks/useApiMutation.test.tsx __tests__/services/UploadService.test.ts __tests__/services/SyncService.test.ts __tests__/services/SyncService.processQueue.test.ts`
Expected: semua PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Hapus pemanggilan `unggahFotoMetaAtauAntre(...)` | "mengunggah meta.photos di jalur online…" |
| Pindahkan pemanggilan ke **sebelum** cek online | "menyimpan salinan tetap meta.photos saat masuk antrean offline" (`uploadFile` terpanggil) |
| Hapus blok penyalinan `queueMeta.photos` | "menyimpan salinan tetap meta.photos…" |
| Hapus `isUnggahHabisWaktu(error) \|\|` | "memasukkan ke antrean bila unggah foto habis waktu" |
| Hapus `\|\| !(await SyncService.isOnline())` | "memasukkan ke antrean bila sinyal hilang saat unggah" |
| Selalu `throw new Error("Offline")` di catch | "melempar kegagalan unggah biasa saat masih online" |
| Abaikan `singleFile` | "mengisi URL tunggal bila singleFile" |
| Hapus `isSudahDiunggah` (unggah semua) | "tidak mengunggah ulang foto yang sudah berupa URL" |
| Hapus `meta.photos.length === 0` dari guard | "daftar foto kosong tidak menimpa targetField" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add src/utils/fotoMutasi.ts src/hooks/queries/useApiMutation.ts src/services/UploadService.ts __tests__/utils/fotoMutasi.test.ts __tests__/hooks/useApiMutation.test.tsx
git commit -m "$(cat <<'EOF'
fix(offline): unggah meta.photos di jalur online dan salin saat antre

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Lokasi GPS kegiatan

**Repo:** `mobile-netmanager`

**Files:**
- Modify: `src/hooks/useLocationWithTimeout.ts:6-86`
- Create: `src/utils/presurvei/lokasiGps.ts`
- Create: `src/hooks/presurvei/useLokasiKegiatan.ts`
- Test: `__tests__/hooks/useLocationWithTimeout.test.ts`, `__tests__/utils/presurvei/lokasiGps.test.ts`, `__tests__/hooks/useLokasiKegiatan.test.ts`

**Interfaces:**
- Consumes: `requestForegroundLocationWithDisclosure()` (`src/utils/locationDisclosure.ts:56`), `expo-location`.
- Produces:
  - `export interface LocationResult { latitude: string; longitude: string; locationName: string; accuracy: number | null }`
  - `getLocationWithTimeout(cachedLocation: Location.LocationObject | null, timeoutMs?: number, akurasiGps?: Location.Accuracy): Promise<LocationResult>` (default `Accuracy.Balanced`, perilaku pemanggil lama tetap)
  - `interface TitikGps { latitude: number; longitude: number; akurasiMeter: number | null }`
  - `type StatusLokasi = 'belum' | 'mencari' | 'siap' | 'gagal'`
  - `interface KeadaanLokasi { status: StatusLokasi; titik: TitikGps | null; alamatTerdeteksi: string }`
  - `KEADAAN_LOKASI_AWAL`, `KEADAAN_LOKASI_MENCARI`, `TEKS_STATUS_LOKASI: Record<StatusLokasi, string>`
  - `bacaTitikGps(hasil: LocationResult): TitikGps | null`, `keadaanDariHasil(hasil: LocationResult): KeadaanLokasi`, `teksAkurasi(akurasiMeter: number | null): string`
  - `interface LokasiKegiatan extends KeadaanLokasi { cari: () => void }`
  - `useLokasiKegiatan(): LokasiKegiatan` (`cari` stabil; hasil pencarian lama dan hasil setelah unmount diabaikan)

- [ ] **Step 1: Tulis test yang gagal**

```ts
// __tests__/hooks/useLocationWithTimeout.test.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockIzin = jest.fn<() => Promise<{ status: string }>>();
const mockPosisi = jest.fn<(opsi: unknown) => Promise<unknown>>();
const mockGeocode = jest.fn<(koordinat: unknown) => Promise<unknown[]>>();

jest.mock('@/utils/locationDisclosure', () => ({
  requestForegroundLocationWithDisclosure: () => mockIzin(),
}));
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: (opsi: unknown) => mockPosisi(opsi),
  reverseGeocodeAsync: (koordinat: unknown) => mockGeocode(koordinat),
  Accuracy: { Balanced: 3, High: 4 },
}));

import { useLocationWithTimeout } from '@/hooks/useLocationWithTimeout';

describe('useLocationWithTimeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIzin.mockResolvedValue({ status: 'granted' });
    mockPosisi.mockResolvedValue({ coords: { latitude: -6.2, longitude: 106.8, accuracy: 12 } });
    mockGeocode.mockResolvedValue([{ street: 'Jl. Melati', district: 'Cibubur', city: 'Jakarta Timur' }]);
  });

  it('mengembalikan akurasi dan alamat, dengan tingkat akurasi yang diminta', async () => {
    const { result } = renderHook(() => useLocationWithTimeout());

    const hasil = await result.current.getLocationWithTimeout(null, 1_000, 4);

    expect(mockPosisi).toHaveBeenCalledWith({ accuracy: 4 });
    expect(hasil).toEqual({
      latitude: '-6.2',
      longitude: '106.8',
      locationName: 'Jl. Melati Cibubur Jakarta Timur',
      accuracy: 12,
    });
  });

  it('pemanggil lama tetap memakai akurasi Balanced', async () => {
    const { result } = renderHook(() => useLocationWithTimeout());

    await result.current.getLocationWithTimeout(null, 1_000);

    expect(mockPosisi).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('izin ditolak tanpa cache memberi koordinat kosong dan akurasi null', async () => {
    mockIzin.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useLocationWithTimeout());

    const hasil = await result.current.getLocationWithTimeout(null, 1_000);

    expect(hasil).toEqual({ latitude: '', longitude: '', locationName: '', accuracy: null });
  });
});
```

```ts
// __tests__/utils/presurvei/lokasiGps.test.ts
import { describe, expect, it } from '@jest/globals';

import { bacaTitikGps, keadaanDariHasil, teksAkurasi } from '@/utils/presurvei/lokasiGps';

const hasil = (latitude: string, longitude: string, accuracy: number | null = 12) => ({
  latitude,
  longitude,
  locationName: 'Jl. Melati',
  accuracy,
});

describe('bacaTitikGps', () => {
  it('koordinat 0,0 tetap titik yang sah', () => {
    expect(bacaTitikGps(hasil('0', '0'))).toEqual({ latitude: 0, longitude: 0, akurasiMeter: 12 });
  });

  it('string kosong atau bukan angka berarti tidak ada titik', () => {
    expect(bacaTitikGps(hasil('', '106.8'))).toBeNull();
    expect(bacaTitikGps(hasil('-6.2', 'abc'))).toBeNull();
  });

  it('akurasi null diteruskan apa adanya', () => {
    expect(bacaTitikGps(hasil('-6.2', '106.8', null))?.akurasiMeter).toBeNull();
  });
});

describe('keadaanDariHasil', () => {
  it('siap dengan alamat terdeteksi bila titik ada', () => {
    expect(keadaanDariHasil(hasil('-6.2', '106.8'))).toEqual({
      status: 'siap',
      titik: { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 },
      alamatTerdeteksi: 'Jl. Melati',
    });
  });

  it('gagal tanpa alamat bila titik tidak ada', () => {
    expect(keadaanDariHasil(hasil('', ''))).toEqual({ status: 'gagal', titik: null, alamatTerdeteksi: '' });
  });
});

describe('teksAkurasi', () => {
  it('dibulatkan ke meter', () => {
    expect(teksAkurasi(12.4)).toBe('±12 m');
    expect(teksAkurasi(0)).toBe('±0 m');
  });

  it('akurasi tak diketahui disebut jelas', () => {
    expect(teksAkurasi(null)).toBe('Akurasi tidak diketahui');
  });
});
```

```ts
// __tests__/hooks/useLokasiKegiatan.test.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

type Hasil = { latitude: string; longitude: string; locationName: string; accuracy: number | null };
const mockAmbil = jest.fn<(cache: unknown, batas: number, akurasi: number) => Promise<Hasil>>();

jest.mock('@/hooks/useLocationWithTimeout', () => ({
  useLocationWithTimeout: () => ({ getLocationWithTimeout: mockAmbil }),
}));
jest.mock('expo-location', () => ({ Accuracy: { High: 4 } }));

import { useLokasiKegiatan } from '@/hooks/presurvei/useLokasiKegiatan';

const SIAP: Hasil = { latitude: '-6.2', longitude: '106.8', locationName: 'Jl. Melati', accuracy: 12 };

describe('useLokasiKegiatan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('meminta GPS akurasi tinggi dengan batas 20 detik lalu siap', async () => {
    mockAmbil.mockResolvedValue(SIAP);
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());

    expect(result.current.status).toBe('mencari');
    await waitFor(() => expect(result.current.status).toBe('siap'));
    expect(mockAmbil).toHaveBeenCalledWith(null, 20_000, 4);
    expect(result.current.titik).toEqual({ latitude: -6.2, longitude: 106.8, akurasiMeter: 12 });
    expect(result.current.alamatTerdeteksi).toBe('Jl. Melati');
  });

  it('gagal bila GPS tidak memberi koordinat', async () => {
    mockAmbil.mockResolvedValue({ ...SIAP, latitude: '', longitude: '' });
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());

    await waitFor(() => expect(result.current.status).toBe('gagal'));
    expect(result.current.titik).toBeNull();
  });

  it('mencari ulang membuang titik lama sampai titik baru didapat', async () => {
    mockAmbil.mockResolvedValueOnce(SIAP).mockReturnValueOnce(new Promise<Hasil>(() => undefined));
    const { result } = renderHook(() => useLokasiKegiatan());
    act(() => result.current.cari());
    await waitFor(() => expect(result.current.status).toBe('siap'));

    act(() => result.current.cari());

    expect(result.current.status).toBe('mencari');
    expect(result.current.titik).toBeNull();
  });

  it('hasil pencarian lama yang datang terlambat diabaikan', async () => {
    let selesaikanLama: (hasil: Hasil) => void = () => undefined;
    mockAmbil
      .mockReturnValueOnce(new Promise<Hasil>((resolve) => { selesaikanLama = resolve; }))
      .mockResolvedValueOnce({ ...SIAP, latitude: '-7.1' });
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());
    act(() => result.current.cari());
    await waitFor(() => expect(result.current.titik?.latitude).toBe(-7.1));
    await act(async () => selesaikanLama(SIAP));

    expect(result.current.titik?.latitude).toBe(-7.1);
  });

  it('fungsi cari stabil antar render', () => {
    const { result, rerender } = renderHook(() => useLokasiKegiatan());
    const cariAwal = result.current.cari;

    rerender({});

    expect(result.current.cari).toBe(cariAwal);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/hooks/useLocationWithTimeout.test.ts __tests__/utils/presurvei/lokasiGps.test.ts __tests__/hooks/useLokasiKegiatan.test.ts`
Expected: FAIL — `accuracy` tidak ada di hasil, `getCurrentPositionAsync` dipanggil dengan `{ accuracy: 3 }` di test pertama; `lokasiGps` dan `useLokasiKegiatan` belum ada.

- [ ] **Step 3: Implementasi `useLocationWithTimeout`**

Ganti isi `src/hooks/useLocationWithTimeout.ts` dengan:

```ts
import { useCallback } from "react";
import * as Location from "expo-location";
import { logger } from "@/utils/logger";
import { requestForegroundLocationWithDisclosure } from "@/utils/locationDisclosure";

/** Hasil pencarian lokasi; string kosong berarti koordinat tidak didapat. */
export interface LocationResult {
  latitude: string;
  longitude: string;
  locationName: string;
  /** Akurasi horizontal dalam meter, null bila tidak diketahui. */
  accuracy: number | null;
}

const BATAS_TUNGGU_BAWAAN_MS = 15_000;

function keHasil(lokasi: Location.LocationObject | null, locationName: string): LocationResult {
  return {
    latitude: lokasi?.coords.latitude.toString() ?? "",
    longitude: lokasi?.coords.longitude.toString() ?? "",
    locationName,
    accuracy: lokasi?.coords.accuracy ?? null,
  };
}

async function namaLokasi(lokasi: Location.LocationObject): Promise<string> {
  try {
    const hasil = await Location.reverseGeocodeAsync({
      latitude: lokasi.coords.latitude,
      longitude: lokasi.coords.longitude,
    });
    if (hasil.length === 0) return "";
    const alamat = hasil[0];
    const nama = `${alamat.street || ""} ${alamat.district || ""} ${alamat.city || ""}`.trim();
    return nama || alamat.name || alamat.region || "";
  } catch (geoError) {
    logger.error("Geocoding failed:", geoError);
    return "";
  }
}

/**
 * Provides a reusable function to fetch current location with a timeout
 * and reverse geocode it into a human-readable address.
 */
export function useLocationWithTimeout() {
  /**
   * Ambil posisi GPS dengan batas waktu (fix pertama di luar ruangan bisa
   * 10 detik lebih) lalu reverse geocode. Jatuh ke `cachedLocation` bila
   * izin ditolak atau waktu habis. `akurasiGps` default `Balanced` agar
   * pemanggil lama tidak berubah.
   */
  const getLocationWithTimeout = useCallback(
    async (
      cachedLocation: Location.LocationObject | null,
      timeoutMs = BATAS_TUNGGU_BAWAAN_MS,
      akurasiGps: Location.Accuracy = Location.Accuracy.Balanced,
    ): Promise<LocationResult> => {
      try {
        const { status } = await requestForegroundLocationWithDisclosure();
        if (status !== "granted") {
          logger.info("Location permission not granted, using cached/last known");
          return keHasil(cachedLocation, "");
        }
        const batasWaktu = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
        const posisi = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: akurasiGps }),
          batasWaktu,
        ]);
        if (!posisi) {
          logger.info("Location fetch timed out, using cached/last known");
          return keHasil(cachedLocation, "");
        }
        return keHasil(posisi, await namaLokasi(posisi));
      } catch (e) {
        logger.error("Could not update location/geocode:", e);
        return keHasil(cachedLocation, "");
      }
    },
    [],
  );

  return { getLocationWithTimeout };
}
```

Pemanggil lain (`app/(app)/work-order-detail/[id].tsx:124`) hanya membaca `latitude`, `longitude`, `locationName`; tidak ada yang berubah baginya.

- [ ] **Step 4: Implementasi `lokasiGps` dan `useLokasiKegiatan`**

```ts
// src/utils/presurvei/lokasiGps.ts
import type { LocationResult } from '@/hooks/useLocationWithTimeout';

/** Titik GPS kegiatan; tidak pernah diketik manual. */
export interface TitikGps {
  latitude: number;
  longitude: number;
  akurasiMeter: number | null;
}

export type StatusLokasi = 'belum' | 'mencari' | 'siap' | 'gagal';

/** Keadaan pencarian lokasi kegiatan. */
export interface KeadaanLokasi {
  status: StatusLokasi;
  titik: TitikGps | null;
  alamatTerdeteksi: string;
}

export const KEADAAN_LOKASI_AWAL: KeadaanLokasi = { status: 'belum', titik: null, alamatTerdeteksi: '' };
export const KEADAAN_LOKASI_MENCARI: KeadaanLokasi = { status: 'mencari', titik: null, alamatTerdeteksi: '' };

/** Teks status lokasi; `Record` memaksa status baru dijawab saat kompilasi. */
export const TEKS_STATUS_LOKASI: Record<StatusLokasi, string> = {
  belum: 'Menunggu GPS…',
  mencari: 'Mencari lokasi GPS…',
  siap: 'Lokasi didapat',
  gagal: 'GPS gagal. Pastikan GPS aktif lalu coba lagi.',
};

/**
 * Titik dari hasil hook lokasi, atau null bila koordinat tidak didapat.
 * Dibandingkan dengan string kosong, bukan truthiness: "0" adalah koordinat sah.
 */
export function bacaTitikGps(hasil: LocationResult): TitikGps | null {
  if (hasil.latitude === '' || hasil.longitude === '') return null;
  const latitude = Number(hasil.latitude);
  const longitude = Number(hasil.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, akurasiMeter: hasil.accuracy };
}

/** Keadaan akhir satu pencarian lokasi. */
export function keadaanDariHasil(hasil: LocationResult): KeadaanLokasi {
  const titik = bacaTitikGps(hasil);
  if (titik === null) return { status: 'gagal', titik: null, alamatTerdeteksi: '' };
  return { status: 'siap', titik, alamatTerdeteksi: hasil.locationName };
}

/** Teks akurasi untuk ditampilkan di bawah peta. */
export function teksAkurasi(akurasiMeter: number | null): string {
  return akurasiMeter === null ? 'Akurasi tidak diketahui' : `±${Math.round(akurasiMeter)} m`;
}
```

```ts
// src/hooks/presurvei/useLokasiKegiatan.ts
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocationWithTimeout } from '@/hooks/useLocationWithTimeout';
import {
  KEADAAN_LOKASI_AWAL,
  KEADAAN_LOKASI_MENCARI,
  keadaanDariHasil,
  type KeadaanLokasi,
} from '@/utils/presurvei/lokasiGps';

/** Batas tunggu fix GPS kegiatan. */
const BATAS_TUNGGU_GPS_MS = 20_000;

/** Keadaan lokasi kegiatan beserta pemicu pencarian ulang. */
export interface LokasiKegiatan extends KeadaanLokasi {
  cari: () => void;
}

/**
 * Lokasi GPS kegiatan lapangan. Tiap pencarian membuang titik lama supaya
 * simpan terblokir sampai titik baru didapat; hasil pencarian yang sudah
 * digantikan, atau yang datang setelah layar dilepas, diabaikan.
 */
export function useLokasiKegiatan(): LokasiKegiatan {
  const { getLocationWithTimeout } = useLocationWithTimeout();
  const [keadaan, setKeadaan] = useState<KeadaanLokasi>(KEADAAN_LOKASI_AWAL);
  const nomorPencarian = useRef(0);

  const cari = useCallback(() => {
    nomorPencarian.current += 1;
    const nomor = nomorPencarian.current;
    setKeadaan(KEADAAN_LOKASI_MENCARI);
    void getLocationWithTimeout(null, BATAS_TUNGGU_GPS_MS, Location.Accuracy.High).then((hasil) => {
      if (nomor === nomorPencarian.current) setKeadaan(keadaanDariHasil(hasil));
    });
  }, [getLocationWithTimeout]);

  useEffect(() => () => {
    nomorPencarian.current += 1;
  }, []);

  return { ...keadaan, cari };
}
```

- [ ] **Step 5: Jalankan test dan typecheck**

Run: `npx jest __tests__/hooks/useLocationWithTimeout.test.ts __tests__/utils/presurvei/lokasiGps.test.ts __tests__/hooks/useLokasiKegiatan.test.ts`
Expected: semua PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })` (abaikan parameter) | "mengembalikan akurasi dan alamat, dengan tingkat akurasi yang diminta" |
| Default `akurasiGps` jadi `High` | "pemanggil lama tetap memakai akurasi Balanced" |
| `accuracy: lokasi?.coords.accuracy ?? 0` | "izin ditolak tanpa cache memberi … akurasi null" |
| `if (!hasil.latitude \|\| !hasil.longitude) return null;` | "koordinat 0,0 tetap titik yang sah" |
| Hapus cek `Number.isFinite` | "string kosong atau bukan angka berarti tidak ada titik" |
| `Math.round` jadi `Math.ceil` | "dibulatkan ke meter" |
| `setKeadaan(KEADAAN_LOKASI_MENCARI)` jadi `setKeadaan((lama) => ({ ...lama, status: 'mencari' }))` | "mencari ulang membuang titik lama…" |
| Hapus `if (nomor === nomorPencarian.current)` | "hasil pencarian lama yang datang terlambat diabaikan" |
| `BATAS_TUNGGU_GPS_MS = 15_000` | "meminta GPS akurasi tinggi dengan batas 20 detik lalu siap" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useLocationWithTimeout.ts src/utils/presurvei/lokasiGps.ts src/hooks/presurvei/useLokasiKegiatan.ts __tests__/hooks/useLocationWithTimeout.test.ts __tests__/utils/presurvei/lokasiGps.test.ts __tests__/hooks/useLokasiKegiatan.test.ts
git commit -m "$(cat <<'EOF'
feat(presurvei): lokasi GPS kegiatan dengan akurasi dan pencarian ulang

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Aturan form kegiatan dan `useCatatKegiatan`

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/utils/presurvei/formKegiatan.ts`
- Create: `src/utils/presurvei/variabelCatat.ts`
- Create: `src/hooks/presurvei/useCatatKegiatan.ts`
- Test: `__tests__/utils/presurvei/formKegiatan.test.ts`, `__tests__/hooks/useCatatKegiatan.test.tsx`

**Interfaces:**
- Consumes: Task 6 — `isBolehProspekBaru`, `isButuhLokasi`, `isButuhDataTeknis`, `daftarJenisDitawarkan`, konstanta batas; Task 9 — `useApiMutation` dengan `meta.photos`; Task 10 — `TitikGps`.
- Produces:
  - `interface IsianProspekBaru { nama: string; noTelp: string; alamat: string; paketDiminati: string }`
  - `interface NilaiFormKegiatan { jenis: KegiatanJenis | null; hasil: KegiatanHasil | null; ditemuiNama: string; alamat: string; catatan: string; odpTerdekat: string; estimasiKabel: string; catatanTeknis: string; prospekId: string | null; isBuatProspekBaru: boolean; prospekBaru: IsianProspekBaru }`
  - `NILAI_FORM_KEGIATAN_KOSONG: NilaiFormKegiatan`
  - `type MedanFormKegiatan = 'jenis' | 'hasil' | 'lokasi' | 'foto' | 'ditemuiNama' | 'alamat' | 'catatan' | 'odpTerdekat' | 'estimasiKabel' | 'catatanTeknis' | 'prospekBaruNama' | 'prospekBaruNoTelp' | 'prospekBaruAlamat'`
  - `type KesalahanFormKegiatan = Partial<Record<MedanFormKegiatan, string>>`
  - `interface KonteksFormKegiatan { titik: TitikGps | null; jumlahFoto: number }`
  - `PESAN_FORM_KEGIATAN` (objek pesan)
  - `validasiFormKegiatan(nilai: NilaiFormKegiatan, konteks: KonteksFormKegiatan): KesalahanFormKegiatan`
  - `isProspekBaruDipakai(nilai: NilaiFormKegiatan): boolean`
  - `keMuatanKegiatan(nilai: NilaiFormKegiatan, konteks: { titik: TitikGps | null; waktuMulai: Date }): MuatanCatatKegiatan`
  - `type VariabelCatatKegiatan = MuatanCatatKegiatan & { meta?: { photos: string[]; targetField: string; photoType: string } }`
  - `bangunVariabelCatat(muatan: MuatanCatatKegiatan, fotoLokal: readonly string[]): VariabelCatatKegiatan`
  - `badanCatatKegiatan(variabel: VariabelCatatKegiatan): Record<string, unknown>`
  - `interface HasilSimpanKegiatan { isAntre: boolean }`
  - `useCatatKegiatan(onTersimpan: (hasil: HasilSimpanKegiatan) => void)` → hasil `useApiMutation`

- [ ] **Step 1: Tulis test aturan form yang gagal**

```ts
// __tests__/utils/presurvei/formKegiatan.test.ts
import { describe, expect, it } from '@jest/globals';

import {
  keMuatanKegiatan,
  NILAI_FORM_KEGIATAN_KOSONG,
  PESAN_FORM_KEGIATAN,
  validasiFormKegiatan,
  type NilaiFormKegiatan,
} from '@/utils/presurvei/formKegiatan';
import { badanCatatKegiatan, bangunVariabelCatat } from '@/utils/presurvei/variabelCatat';

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };
const WAKTU = new Date('2026-09-24T03:15:00.000Z');

const nilai = (over: Partial<NilaiFormKegiatan>): NilaiFormKegiatan => ({
  ...NILAI_FORM_KEGIATAN_KOSONG,
  ...over,
});

describe('validasiFormKegiatan', () => {
  it('menuntut jenis dan hasil', () => {
    expect(validasiFormKegiatan(nilai({}), { titik: null, jumlahFoto: 0 })).toEqual({
      jenis: PESAN_FORM_KEGIATAN.jenis,
      hasil: PESAN_FORM_KEGIATAN.hasil,
    });
  });

  it('menolak jenis Iklan walau terkirim dari state', () => {
    const kesalahan = validasiFormKegiatan(nilai({ jenis: 'IKLAN', hasil: 'TERTARIK' }), { titik: null, jumlahFoto: 0 });
    expect(kesalahan.jenis).toBe(PESAN_FORM_KEGIATAN.jenis);
  });

  it.each(['KUNJUNGAN', 'SURVEI_LOKASI'] as const)('%s wajib titik GPS dan foto', (jenis) => {
    expect(validasiFormKegiatan(nilai({ jenis, hasil: 'TERTARIK' }), { titik: null, jumlahFoto: 0 })).toEqual({
      lokasi: PESAN_FORM_KEGIATAN.lokasi,
      foto: PESAN_FORM_KEGIATAN.fotoKurang,
    });
  });

  it('menolak lebih dari enam foto', () => {
    const kesalahan = validasiFormKegiatan(nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }), { titik: TITIK, jumlahFoto: 7 });
    expect(kesalahan).toEqual({ foto: PESAN_FORM_KEGIATAN.fotoLebih });
  });

  it('enam foto masih diterima', () => {
    expect(
      validasiFormKegiatan(nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }), { titik: TITIK, jumlahFoto: 6 }),
    ).toEqual({});
  });

  it.each(['TELEPON', 'CHAT'] as const)('%s tidak menuntut GPS maupun foto', (jenis) => {
    expect(validasiFormKegiatan(nilai({ jenis, hasil: 'TIDAK_MINAT' }), { titik: null, jumlahFoto: 0 })).toEqual({});
  });

  it.each([
    ['', undefined],
    ['0', undefined],
    ['5000', undefined],
    ['5001', PESAN_FORM_KEGIATAN.kabel],
    ['12.5', PESAN_FORM_KEGIATAN.kabel],
    ['-1', PESAN_FORM_KEGIATAN.kabel],
  ])('estimasi kabel survei "%s" → %s', (estimasiKabel, harapan) => {
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'SURVEI_LOKASI', hasil: 'PERLU_FOLLOWUP', estimasiKabel }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan.estimasiKabel).toBe(harapan);
  });

  it('isian teknis tidak divalidasi untuk kunjungan karena tidak dikirim', () => {
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', estimasiKabel: 'abc' }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan).toEqual({});
  });

  it('menolak nama yang ditemui lebih dari 120 huruf', () => {
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', ditemuiNama: 'a'.repeat(121) }),
      { titik: null, jumlahFoto: 0 },
    );
    expect(kesalahan).toEqual({ ditemuiNama: PESAN_FORM_KEGIATAN.terlaluPanjang });
  });

  it('memeriksa prospek baru hanya bila benar-benar dipakai', () => {
    const prospekBaru = { nama: 'A', noTelp: '0812', alamat: 'Jl', paketDiminati: '' };
    const lapangan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    const telepon = validasiFormKegiatan(
      nilai({ jenis: 'TELEPON', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: null, jumlahFoto: 0 },
    );

    expect(lapangan).toEqual({
      prospekBaruNama: PESAN_FORM_KEGIATAN.namaProspek,
      prospekBaruNoTelp: PESAN_FORM_KEGIATAN.telpProspek,
      prospekBaruAlamat: PESAN_FORM_KEGIATAN.alamatProspek,
    });
    expect(telepon).toEqual({});
  });
});

describe('keMuatanKegiatan', () => {
  it('kunjungan membawa titik GPS dan alamat, tanpa kolom teknis', () => {
    const muatan = keMuatanKegiatan(
      nilai({
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        ditemuiNama: '  Bu Sari ',
        alamat: 'Jl. Melati 9',
        catatan: '',
        odpTerdekat: 'ODP-1',
        estimasiKabel: '40',
      }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan).toEqual({
      jenis: 'KUNJUNGAN',
      hasil: 'TERTARIK',
      waktuMulai: '2026-09-24T03:15:00.000Z',
      prospekId: null,
      ditemuiNama: 'Bu Sari',
      catatan: null,
      latitude: -6.2,
      longitude: 106.8,
      alamatDikunjungi: 'Jl. Melati 9',
    });
  });

  it('survei membawa kabel nol sebagai angka, bukan null', () => {
    const muatan = keMuatanKegiatan(
      nilai({ jenis: 'SURVEI_LOKASI', hasil: 'PERLU_FOLLOWUP', estimasiKabel: '0', odpTerdekat: 'ODP-3', catatanTeknis: '' }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan.estimasiKabelMeter).toBe(0);
    expect(muatan.odpTerdekat).toBe('ODP-3');
    expect(muatan.catatanTeknis).toBeNull();
  });

  it('telepon tidak membawa koordinat walau titik tersedia', () => {
    const muatan = keMuatanKegiatan(
      nilai({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', prospekId: 'p-7', alamat: 'Jl. X' }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan).toEqual({
      jenis: 'TELEPON',
      hasil: 'TIDAK_MINAT',
      waktuMulai: '2026-09-24T03:15:00.000Z',
      prospekId: 'p-7',
      ditemuiNama: null,
      catatan: null,
    });
  });

  it('prospek baru ikut hanya bila diizinkan, paket kosong menjadi null', () => {
    const muatan = keMuatanKegiatan(
      nilai({
        jenis: 'KUNJUNGAN',
        hasil: 'DEAL',
        isBuatProspekBaru: true,
        prospekBaru: { nama: ' Budi ', noTelp: '081234567890', alamat: 'Jl. Kenanga 1', paketDiminati: '' },
      }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan.prospekBaru).toEqual({
      nama: 'Budi',
      noTelp: '081234567890',
      alamat: 'Jl. Kenanga 1',
      paketDiminati: null,
    });
  });

  it('menolak dipanggil sebelum jenis dan hasil dipilih', () => {
    expect(() => keMuatanKegiatan(nilai({}), { titik: null, waktuMulai: WAKTU })).toThrow();
  });
});

describe('variabel catat', () => {
  const MUATAN = keMuatanKegiatan(nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }), { titik: TITIK, waktuMulai: WAKTU });

  it('foto lokal ikut lewat meta.photos ke medan fotoUrls bertipe presurvei', () => {
    const foto = Object.freeze(['file:///cache/a.jpg', 'file:///cache/b.jpg']);

    const variabel = bangunVariabelCatat(MUATAN, foto);

    expect(variabel.meta).toEqual({
      photos: ['file:///cache/a.jpg', 'file:///cache/b.jpg'],
      targetField: 'fotoUrls',
      photoType: 'presurvei',
    });
    expect(variabel.meta?.photos).not.toBe(foto);
  });

  it('tanpa foto tidak ada meta', () => {
    expect('meta' in bangunVariabelCatat(MUATAN, [])).toBe(false);
  });

  it('badan request tidak pernah membawa meta', () => {
    const badan = badanCatatKegiatan(bangunVariabelCatat(MUATAN, ['file:///cache/a.jpg']));
    expect(badan).toEqual({ ...MUATAN });
  });
});
```

- [ ] **Step 2: Tulis test `useCatatKegiatan` (jalur antrean nyata) yang gagal**

```tsx
// __tests__/hooks/useCatatKegiatan.test.tsx
import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Memakai `useApiMutation` asli — yang diuji adalah apa yang benar-benar
 * masuk antrean SQLite saat offline: badan dengan titik GPS, dan meta foto
 * yang sudah disalin ke penyimpanan tetap.
 */

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));
const mockRequest = jest.fn<(config: unknown) => Promise<{ data: unknown }>>();
jest.mock('@/services/api', () => ({ __esModule: true, default: { request: (c: unknown) => mockRequest(c) } }));
const mockIsOnline = jest.fn<() => Promise<boolean>>();
jest.mock('@/services/SyncService', () => ({ SyncService: { isOnline: () => mockIsOnline() } }));
const mockAddToQueue = jest.fn<(...args: unknown[]) => Promise<void>>();
jest.mock('@/services/DatabaseService', () => ({ DatabaseService: { addToQueue: (...a: unknown[]) => mockAddToQueue(...a) } }));
jest.mock('@/services/AttendanceTelemetryService', () => ({ AttendanceTelemetryService: { track: jest.fn() } }));
const mockUploadFile = jest.fn<(uri: string, tipe: string) => Promise<string>>();
jest.mock('@/services/UploadService', () => ({ uploadService: { uploadFile: (u: string, t: string) => mockUploadFile(u, t) } }));
jest.mock('@/utils/persistPhoto', () => ({
  persistPhotoForOffline: async (uri: string) => uri.replace('file:///cache/', 'file:///dokumen/offline-photos/'),
}));
jest.mock('@/utils/attendanceIdempotency', () => ({
  buildAttendanceIdempotencyHeaders: jest.fn(() => ({})),
  ensureAttendanceRequestId: jest.fn((payload: unknown) => payload),
  isAttendanceEndpoint: jest.fn(() => false),
}));
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { useCatatKegiatan } from '@/hooks/presurvei/useCatatKegiatan';
import { keMuatanKegiatan, NILAI_FORM_KEGIATAN_KOSONG } from '@/utils/presurvei/formKegiatan';
import { bangunVariabelCatat } from '@/utils/presurvei/variabelCatat';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

const buatClient = () =>
  new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });

const VARIABEL = bangunVariabelCatat(
  keMuatanKegiatan(
    { ...NILAI_FORM_KEGIATAN_KOSONG, jenis: 'KUNJUNGAN', hasil: 'TERTARIK', ditemuiNama: 'Bu Sari', alamat: 'Jl. Melati 9' },
    { titik: { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 }, waktuMulai: new Date('2026-09-24T03:15:00.000Z') },
  ),
  ['file:///cache/a.jpg'],
);

describe('useCatatKegiatan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddToQueue.mockResolvedValue(undefined);
    mockUploadFile.mockImplementation(async (uri) => `https://cdn.test/${uri.split('/').pop()}`);
  });

  it('mengantre kegiatan offline beserta titik GPS dan foto yang disalin', async () => {
    mockIsOnline.mockResolvedValue(false);
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const onTersimpan = jest.fn();
    const { result, unmount } = renderHook(() => useCatatKegiatan(onTersimpan), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync(VARIABEL);
    });

    expect(mockAddToQueue).toHaveBeenCalledWith(
      '/api/presurvei/kegiatan',
      'POST',
      {
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        waktuMulai: '2026-09-24T03:15:00.000Z',
        prospekId: null,
        ditemuiNama: 'Bu Sari',
        catatan: null,
        latitude: -6.2,
        longitude: 106.8,
        alamatDikunjungi: 'Jl. Melati 9',
      },
      {
        photos: ['file:///dokumen/offline-photos/a.jpg'],
        targetField: 'fotoUrls',
        photoType: 'presurvei',
      },
    );
    expect(onTersimpan).toHaveBeenCalledWith({ isAntre: true });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei', 'antrean'] });
    unmount();
    client.clear();
  });

  it('online: mengunggah foto lalu menyegarkan seluruh data presurvei', async () => {
    mockIsOnline.mockResolvedValue(true);
    mockRequest.mockResolvedValue({ data: { success: true, data: { kegiatan: { id: 'k-1' }, prospek: null } } });
    const client = buatClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const onTersimpan = jest.fn();
    const { result, unmount } = renderHook(() => useCatatKegiatan(onTersimpan), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync(VARIABEL);
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/presurvei/kegiatan',
        method: 'POST',
        data: expect.objectContaining({ fotoUrls: ['https://cdn.test/a.jpg'], latitude: -6.2 }),
      }),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ meta: expect.anything() }) }),
    );
    expect(onTersimpan).toHaveBeenCalledWith({ isAntre: false });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    unmount();
    client.clear();
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/presurvei/formKegiatan.test.ts __tests__/hooks/useCatatKegiatan.test.tsx`
Expected: FAIL — modul belum ada.

- [ ] **Step 4: Implementasi aturan form**

```ts
// src/utils/presurvei/formKegiatan.ts
import {
  JUMLAH_FOTO_KEGIATAN_MAKS,
  KABEL_METER_MAKS,
  type KegiatanHasil,
  type KegiatanJenis,
} from '@/constants/presurvei';
import type { MuatanCatatKegiatan, ProspekBaruKegiatan } from '@/types/presurvei';
import {
  daftarJenisDitawarkan,
  isBolehProspekBaru,
  isButuhDataTeknis,
  isButuhLokasi,
} from './aturanPresurvei';
import type { TitikGps } from './lokasiGps';

/**
 * Aturan form catat kegiatan. Meniru `catatKegiatanSchema`
 * (netmanager `kegiatan.validator.ts`) untuk UX; server tetap penentu.
 * Medan yang tidak berlaku untuk jenisnya tidak divalidasi dan tidak dikirim.
 */

// Batas panjang = kegiatan.validator.ts:19-21 dan 57-63.
const PANJANG_NAMA_MAKS = 120;
const PANJANG_ALAMAT_MAKS = 500;
const PANJANG_CATATAN_MAKS = 1000;
const PANJANG_NAMA_PROSPEK_MIN = 2;
const PANJANG_TELP_MIN = 8;
const PANJANG_TELP_MAKS = 20;
const PANJANG_ALAMAT_PROSPEK_MIN = 5;
const POLA_BILANGAN_BULAT = /^\d+$/;
const POLA_NOMOR_TELP = /^\+?\d+$/;

export interface IsianProspekBaru {
  nama: string;
  noTelp: string;
  alamat: string;
  paketDiminati: string;
}

export interface NilaiFormKegiatan {
  jenis: KegiatanJenis | null;
  hasil: KegiatanHasil | null;
  ditemuiNama: string;
  alamat: string;
  catatan: string;
  odpTerdekat: string;
  estimasiKabel: string;
  catatanTeknis: string;
  prospekId: string | null;
  isBuatProspekBaru: boolean;
  prospekBaru: IsianProspekBaru;
}

export const NILAI_FORM_KEGIATAN_KOSONG: NilaiFormKegiatan = Object.freeze({
  jenis: null,
  hasil: null,
  ditemuiNama: '',
  alamat: '',
  catatan: '',
  odpTerdekat: '',
  estimasiKabel: '',
  catatanTeknis: '',
  prospekId: null,
  isBuatProspekBaru: false,
  prospekBaru: Object.freeze({ nama: '', noTelp: '', alamat: '', paketDiminati: '' }),
});

export type MedanFormKegiatan =
  | 'jenis'
  | 'hasil'
  | 'lokasi'
  | 'foto'
  | 'ditemuiNama'
  | 'alamat'
  | 'catatan'
  | 'odpTerdekat'
  | 'estimasiKabel'
  | 'catatanTeknis'
  | 'prospekBaruNama'
  | 'prospekBaruNoTelp'
  | 'prospekBaruAlamat';

export type KesalahanFormKegiatan = Partial<Record<MedanFormKegiatan, string>>;

/** Konteks non-medan yang ikut menentukan keabsahan form. */
export interface KonteksFormKegiatan {
  titik: TitikGps | null;
  jumlahFoto: number;
}

export const PESAN_FORM_KEGIATAN = {
  jenis: 'Pilih jenis kegiatan',
  hasil: 'Pilih hasil kegiatan',
  lokasi: 'Lokasi GPS belum didapat',
  fotoKurang: 'Ambil minimal 1 foto bukti',
  fotoLebih: `Maksimal ${JUMLAH_FOTO_KEGIATAN_MAKS} foto`,
  kabel: `Estimasi kabel harus bilangan bulat 0–${KABEL_METER_MAKS} meter`,
  terlaluPanjang: 'Isian terlalu panjang',
  namaProspek: `Nama minimal ${PANJANG_NAMA_PROSPEK_MIN} huruf`,
  telpProspek: `Nomor HP ${PANJANG_TELP_MIN}–${PANJANG_TELP_MAKS} digit`,
  alamatProspek: `Alamat minimal ${PANJANG_ALAMAT_PROSPEK_MIN} huruf`,
} as const;

const isTerlaluPanjang = (teks: string, batas: number): boolean => teks.trim().length > batas;

/** Apakah prospek baru benar-benar akan dikirim. */
export function isProspekBaruDipakai(nilai: NilaiFormKegiatan): boolean {
  return nilai.isBuatProspekBaru && isBolehProspekBaru(nilai);
}

function validasiPilihan(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  const kesalahan: KesalahanFormKegiatan = {};
  if (nilai.jenis === null || !daftarJenisDitawarkan().includes(nilai.jenis)) {
    kesalahan.jenis = PESAN_FORM_KEGIATAN.jenis;
  }
  if (nilai.hasil === null) kesalahan.hasil = PESAN_FORM_KEGIATAN.hasil;
  return kesalahan;
}

function validasiLapangan(nilai: NilaiFormKegiatan, konteks: KonteksFormKegiatan): KesalahanFormKegiatan {
  if (nilai.jenis === null || !isButuhLokasi(nilai.jenis)) return {};
  const kesalahan: KesalahanFormKegiatan = {};
  if (konteks.titik === null) kesalahan.lokasi = PESAN_FORM_KEGIATAN.lokasi;
  if (konteks.jumlahFoto < 1) kesalahan.foto = PESAN_FORM_KEGIATAN.fotoKurang;
  if (konteks.jumlahFoto > JUMLAH_FOTO_KEGIATAN_MAKS) kesalahan.foto = PESAN_FORM_KEGIATAN.fotoLebih;
  if (isTerlaluPanjang(nilai.alamat, PANJANG_ALAMAT_MAKS)) kesalahan.alamat = PESAN_FORM_KEGIATAN.terlaluPanjang;
  return kesalahan;
}

function validasiUmum(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  const kesalahan: KesalahanFormKegiatan = {};
  if (isTerlaluPanjang(nilai.ditemuiNama, PANJANG_NAMA_MAKS)) kesalahan.ditemuiNama = PESAN_FORM_KEGIATAN.terlaluPanjang;
  if (isTerlaluPanjang(nilai.catatan, PANJANG_CATATAN_MAKS)) kesalahan.catatan = PESAN_FORM_KEGIATAN.terlaluPanjang;
  return kesalahan;
}

function isKabelSah(teks: string): boolean {
  const kabel = teks.trim();
  if (kabel === '') return true;
  return POLA_BILANGAN_BULAT.test(kabel) && Number(kabel) <= KABEL_METER_MAKS;
}

function validasiTeknis(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  if (nilai.jenis === null || !isButuhDataTeknis(nilai.jenis)) return {};
  const kesalahan: KesalahanFormKegiatan = {};
  if (!isKabelSah(nilai.estimasiKabel)) kesalahan.estimasiKabel = PESAN_FORM_KEGIATAN.kabel;
  if (isTerlaluPanjang(nilai.odpTerdekat, PANJANG_NAMA_MAKS)) kesalahan.odpTerdekat = PESAN_FORM_KEGIATAN.terlaluPanjang;
  if (isTerlaluPanjang(nilai.catatanTeknis, PANJANG_CATATAN_MAKS)) kesalahan.catatanTeknis = PESAN_FORM_KEGIATAN.terlaluPanjang;
  return kesalahan;
}

function isTelpSah(teks: string): boolean {
  const telp = teks.trim();
  return POLA_NOMOR_TELP.test(telp) && telp.length >= PANJANG_TELP_MIN && telp.length <= PANJANG_TELP_MAKS;
}

function validasiProspekBaru(nilai: NilaiFormKegiatan): KesalahanFormKegiatan {
  if (!isProspekBaruDipakai(nilai)) return {};
  const { nama, alamat, noTelp } = nilai.prospekBaru;
  const kesalahan: KesalahanFormKegiatan = {};
  const panjangNama = nama.trim().length;
  if (panjangNama < PANJANG_NAMA_PROSPEK_MIN || panjangNama > PANJANG_NAMA_MAKS) kesalahan.prospekBaruNama = PESAN_FORM_KEGIATAN.namaProspek;
  if (!isTelpSah(noTelp)) kesalahan.prospekBaruNoTelp = PESAN_FORM_KEGIATAN.telpProspek;
  if (alamat.trim().length < PANJANG_ALAMAT_PROSPEK_MIN) kesalahan.prospekBaruAlamat = PESAN_FORM_KEGIATAN.alamatProspek;
  return kesalahan;
}

/** Kesalahan per medan; objek kosong berarti boleh disimpan. */
export function validasiFormKegiatan(
  nilai: NilaiFormKegiatan,
  konteks: KonteksFormKegiatan,
): KesalahanFormKegiatan {
  return {
    ...validasiPilihan(nilai),
    ...validasiLapangan(nilai, konteks),
    ...validasiUmum(nilai),
    ...validasiTeknis(nilai),
    ...validasiProspekBaru(nilai),
  };
}

const teksAtauNull = (teks: string): string | null => {
  const bersih = teks.trim();
  return bersih === '' ? null : bersih;
};

/** Kabel kosong → null; "0" tetap 0 (hasil survei yang sah). */
const kabelAtauNull = (teks: string): number | null => {
  const kabel = teks.trim();
  return kabel === '' ? null : Number(kabel);
};

function bagianLapangan(jenis: KegiatanJenis, nilai: NilaiFormKegiatan, titik: TitikGps | null): Partial<MuatanCatatKegiatan> {
  if (!isButuhLokasi(jenis) || titik === null) return {};
  return { latitude: titik.latitude, longitude: titik.longitude, alamatDikunjungi: teksAtauNull(nilai.alamat) };
}

function bagianTeknis(jenis: KegiatanJenis, nilai: NilaiFormKegiatan): Partial<MuatanCatatKegiatan> {
  if (!isButuhDataTeknis(jenis)) return {};
  return {
    odpTerdekat: teksAtauNull(nilai.odpTerdekat),
    estimasiKabelMeter: kabelAtauNull(nilai.estimasiKabel),
    catatanTeknis: teksAtauNull(nilai.catatanTeknis),
  };
}

function bagianProspekBaru(nilai: NilaiFormKegiatan): { prospekBaru?: ProspekBaruKegiatan } {
  if (!isProspekBaruDipakai(nilai)) return {};
  const { nama, noTelp, alamat, paketDiminati } = nilai.prospekBaru;
  return {
    prospekBaru: { nama: nama.trim(), noTelp: noTelp.trim(), alamat: alamat.trim(), paketDiminati: teksAtauNull(paketDiminati) },
  };
}

/**
 * Badan `POST /api/presurvei/kegiatan` tanpa `fotoUrls`. Dipanggil setelah
 * `validasiFormKegiatan` bersih; melempar bila jenis/hasil belum dipilih.
 */
export function keMuatanKegiatan(
  nilai: NilaiFormKegiatan,
  konteks: { titik: TitikGps | null; waktuMulai: Date },
): MuatanCatatKegiatan {
  if (nilai.jenis === null || nilai.hasil === null) {
    throw new Error('Form kegiatan belum divalidasi');
  }
  return {
    jenis: nilai.jenis,
    hasil: nilai.hasil,
    waktuMulai: konteks.waktuMulai.toISOString(),
    prospekId: nilai.prospekId,
    ditemuiNama: teksAtauNull(nilai.ditemuiNama),
    catatan: teksAtauNull(nilai.catatan),
    ...bagianLapangan(nilai.jenis, nilai, konteks.titik),
    ...bagianTeknis(nilai.jenis, nilai),
    ...bagianProspekBaru(nilai),
  };
}
```

```ts
// src/utils/presurvei/variabelCatat.ts
import { TIPE_UNGGAH_FOTO_KEGIATAN } from '@/constants/presurvei';
import type { MuatanCatatKegiatan } from '@/types/presurvei';

/** Medan badan yang diisi URL foto oleh `useApiMutation`/`SyncService` (K1). */
const MEDAN_FOTO_KEGIATAN = 'fotoUrls';

/** Variabel mutasi catat kegiatan: muatan + foto lokal di `meta`. */
export type VariabelCatatKegiatan = MuatanCatatKegiatan & {
  meta?: { photos: string[]; targetField: string; photoType: string };
};

/** Bangun variabel mutasi; foto lokal disalin ke `meta.photos`. */
export function bangunVariabelCatat(
  muatan: MuatanCatatKegiatan,
  fotoLokal: readonly string[],
): VariabelCatatKegiatan {
  if (fotoLokal.length === 0) return { ...muatan };
  return {
    ...muatan,
    meta: { photos: [...fotoLokal], targetField: MEDAN_FOTO_KEGIATAN, photoType: TIPE_UNGGAH_FOTO_KEGIATAN },
  };
}

/** Badan request; `meta` tidak pernah dikirim ke server. */
export function badanCatatKegiatan(variabel: VariabelCatatKegiatan): Record<string, unknown> {
  const { meta: _meta, ...muatan } = variabel;
  return muatan;
}
```

- [ ] **Step 5: Implementasi `useCatatKegiatan`**

```ts
// src/hooks/presurvei/useCatatKegiatan.ts
import { useQueryClient } from '@tanstack/react-query';

import { ENDPOINT_KEGIATAN_PRESURVEI } from '@/constants/presurvei';
import { isOfflineMutationQueuedResult, useApiMutation } from '@/hooks/queries/useApiMutation';
import { queryKeys } from '@/lib/queryClient';
import type { HasilCatatKegiatan } from '@/types/presurvei';
import { badanCatatKegiatan, type VariabelCatatKegiatan } from '@/utils/presurvei/variabelCatat';

const PESAN_TERCATAT = 'Kegiatan tercatat';

/** Hasil simpan untuk layar: terkirim langsung atau masuk antrean. */
export interface HasilSimpanKegiatan {
  isAntre: boolean;
}

interface AmplopCatatKegiatan {
  success: boolean;
  data: HasilCatatKegiatan;
}

/**
 * Mutasi catat kegiatan presurvei. Offline → antrean SQLite beserta foto
 * (Task 9); daftar "Menunggu kirim" disegarkan saat itu juga.
 */
export function useCatatKegiatan(onTersimpan: (hasil: HasilSimpanKegiatan) => void) {
  const queryClient = useQueryClient();
  return useApiMutation<AmplopCatatKegiatan, VariabelCatatKegiatan>({
    endpoint: ENDPOINT_KEGIATAN_PRESURVEI,
    method: 'POST',
    buildPayload: badanCatatKegiatan,
    invalidateKeys: [queryKeys.presurvei.all],
    successMessage: PESAN_TERCATAT,
    onSuccess: (data) => {
      const isAntre = isOfflineMutationQueuedResult(data);
      if (isAntre) void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.antrean() });
      onTersimpan({ isAntre });
    },
  });
}
```

Catatan tipe: `useApiMutation` mensyaratkan `TVariables extends ApiMutationVariables` (`useApiMutation.ts:182-185`), yang memiliki index signature. Bila `tsc` menolak `VariabelCatatKegiatan`, ubah deklarasinya menjadi `MuatanCatatKegiatan & ApiMutationVariables & { meta?: … }` dengan mengimpor `type ApiMutationVariables` dari `@/hooks/queries/useApiMutation` — jangan melonggarkan `useApiMutation`.

- [ ] **Step 6: Jalankan test dan typecheck**

Run: `npx jest __tests__/utils/presurvei/formKegiatan.test.ts __tests__/hooks/useCatatKegiatan.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Hapus `!daftarJenisDitawarkan().includes(nilai.jenis)` | "menolak jenis Iklan walau terkirim dari state" |
| `validasiLapangan` selalu `{}` | "KUNJUNGAN wajib titik GPS dan foto" dan "SURVEI_LOKASI wajib …" |
| `konteks.jumlahFoto > JUMLAH_FOTO_KEGIATAN_MAKS` jadi `>=` | "enam foto masih diterima" |
| `Number(kabel) <= KABEL_METER_MAKS` jadi `<` | `estimasi kabel survei "5000" → undefined` |
| `kabelAtauNull` jadi `(teks) => Number(teks.trim()) \|\| null` | "survei membawa kabel nol sebagai angka, bukan null" |
| Hapus guard `isButuhDataTeknis` di `bagianTeknis` | "kunjungan membawa titik GPS dan alamat, tanpa kolom teknis" |
| Hapus guard `isButuhLokasi` di `bagianLapangan` | "telepon tidak membawa koordinat walau titik tersedia" |
| `isProspekBaruDipakai` mengembalikan `nilai.isBuatProspekBaru` saja | "memeriksa prospek baru hanya bila benar-benar dipakai" |
| `photos: fotoLokal as string[]` (tanpa salin) | "foto lokal ikut lewat meta.photos …" (`not.toBe`) |
| `buildPayload` dihapus dari `useCatatKegiatan` | "online: … menyegarkan seluruh data presurvei" (`meta` ikut terkirim) |
| Hapus invalidasi `antrean()` | "mengantre kegiatan offline beserta titik GPS dan foto yang disalin" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add src/utils/presurvei/formKegiatan.ts src/utils/presurvei/variabelCatat.ts src/hooks/presurvei/useCatatKegiatan.ts __tests__/utils/presurvei/formKegiatan.test.ts __tests__/hooks/useCatatKegiatan.test.tsx
git commit -m "$(cat <<'EOF'
feat(presurvei): aturan form kegiatan dan mutasi catat dengan antrean offline

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: State form, blok GPS, blok foto, kamera

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/hooks/presurvei/useFormKegiatan.ts`
- Create: `src/utils/presurvei/fotoBukti.ts`
- Create: `src/constants/gayaPetaOsm.ts`
- Modify: `src/components/organisms/marketing/LocationPickerModal.tsx:73-92, 322` (pakai `GAYA_PETA_OSM`)
- Create: `src/components/molecules/PilihanChip.tsx`
- Create: `src/components/molecules/IsianTeks.tsx`
- Create: `src/components/organisms/presurvei/PetaTitik.tsx`
- Create: `src/components/organisms/presurvei/BlokLokasiGps.tsx`
- Create: `src/components/organisms/presurvei/BlokFotoBukti.tsx`
- Create: `src/components/organisms/presurvei/KameraBukti.tsx`
- Test: `__tests__/hooks/useFormKegiatan.test.ts`, `__tests__/utils/presurvei/fotoBukti.test.ts`, `__tests__/components/presurvei/BlokLokasiGps.test.tsx`, `__tests__/components/presurvei/BlokFotoBukti.test.tsx`, `__tests__/components/PilihanChip.test.tsx`

**Interfaces:**
- Consumes: Task 10 — `TitikGps`, `StatusLokasi`, `TEKS_STATUS_LOKASI`, `teksAkurasi`; Task 11 — `NilaiFormKegiatan`, `NILAI_FORM_KEGIATAN_KOSONG`, `IsianProspekBaru`, `KesalahanFormKegiatan`, `validasiFormKegiatan`; `getMapLibre()` (`src/utils/maplibre.ts:21`).
- Produces:
  - `interface FormKegiatan { nilai: NilaiFormKegiatan; fotoLokal: string[]; kesalahan: KesalahanFormKegiatan; ubah(perubahan: Partial<NilaiFormKegiatan>): void; ubahProspekBaru(perubahan: Partial<IsianProspekBaru>): void; tambahFoto(uri: string): void; hapusFoto(uri: string): void; periksa(titik: TitikGps | null): boolean; reset(awal: Partial<NilaiFormKegiatan>): void }` — `ubah`, `ubahProspekBaru`, `tambahFoto`, `hapusFoto`, `reset` stabil.
  - `useFormKegiatan(): FormKegiatan`
  - `LEBAR_FOTO_BUKTI = 1024`, `KUALITAS_FOTO_BUKTI = 0.7`, `perkecilFoto(uri: string): Promise<string>`
  - `GAYA_PETA_OSM`
  - `interface OpsiChip<T extends string> { nilai: T; label: string }`, `PilihanChip<T>(props: { opsi: readonly OpsiChip<T>[]; terpilih: T | null; onPilih: (nilai: T) => void })`
  - `IsianTeks(props: { label: string; nilai: string; onUbah: (isian: string) => void; kesalahan?: string; placeholder?: string; keyboardType?; multiline?; maxLength? })` — `accessibilityLabel` = `label`
  - `PetaTitik(props: { titik: TitikGps })`
  - `BlokLokasiGps(props: { status: StatusLokasi; titik: TitikGps | null; kesalahan?: string; onCobaLagi: () => void })`
  - `BlokFotoBukti(props: { fotoLokal: readonly string[]; kesalahan?: string; onTambah: () => void; onHapus: (uri: string) => void })`
  - `KameraBukti(props: { onAmbil: (uri: string) => void; onTutup: () => void })`

- [ ] **Step 1: Tulis test yang gagal**

```ts
// __tests__/hooks/useFormKegiatan.test.ts
import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useFormKegiatan } from '@/hooks/presurvei/useFormKegiatan';
import { PESAN_FORM_KEGIATAN } from '@/utils/presurvei/formKegiatan';

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };

describe('useFormKegiatan', () => {
  it('tidak menerima foto ketujuh', () => {
    const { result } = renderHook(() => useFormKegiatan());

    act(() => {
      for (let i = 1; i <= 7; i += 1) result.current.tambahFoto(`file:///cache/${i}.jpg`);
    });

    expect(result.current.fotoLokal).toHaveLength(6);
    expect(result.current.fotoLokal[5]).toBe('file:///cache/6.jpg');
  });

  it('menghapus hanya foto yang dipilih', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => {
      result.current.tambahFoto('file:///cache/a.jpg');
      result.current.tambahFoto('file:///cache/b.jpg');
    });

    act(() => result.current.hapusFoto('file:///cache/a.jpg'));

    expect(result.current.fotoLokal).toEqual(['file:///cache/b.jpg']);
  });

  it('periksa menyimpan kesalahan dan mengembalikan false bila belum sah', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => result.current.ubah({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }));

    let isSah = true;
    act(() => {
      isSah = result.current.periksa(null);
    });

    expect(isSah).toBe(false);
    expect(result.current.kesalahan).toEqual({
      lokasi: PESAN_FORM_KEGIATAN.lokasi,
      foto: PESAN_FORM_KEGIATAN.fotoKurang,
    });
  });

  it('periksa memakai foto yang sudah diambil', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => {
      result.current.ubah({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' });
      result.current.tambahFoto('file:///cache/a.jpg');
    });

    let isSah = false;
    act(() => {
      isSah = result.current.periksa(TITIK);
    });

    expect(isSah).toBe(true);
    expect(result.current.kesalahan).toEqual({});
  });

  it('ubahProspekBaru menggabungkan tanpa menghapus medan lain', () => {
    const { result } = renderHook(() => useFormKegiatan());

    act(() => result.current.ubahProspekBaru({ nama: 'Budi' }));
    act(() => result.current.ubahProspekBaru({ noTelp: '0812345678' }));

    expect(result.current.nilai.prospekBaru).toEqual({
      nama: 'Budi',
      noTelp: '0812345678',
      alamat: '',
      paketDiminati: '',
    });
  });

  it('reset mengosongkan nilai, kesalahan, dan foto lalu memakai nilai awal', () => {
    const { result } = renderHook(() => useFormKegiatan());
    act(() => {
      result.current.ubah({ jenis: 'KUNJUNGAN', catatan: 'lama' });
      result.current.tambahFoto('file:///cache/a.jpg');
      result.current.periksa(null);
    });

    act(() => result.current.reset({ prospekId: 'p-7' }));

    expect(result.current.nilai.jenis).toBeNull();
    expect(result.current.nilai.catatan).toBe('');
    expect(result.current.nilai.prospekId).toBe('p-7');
    expect(result.current.fotoLokal).toEqual([]);
    expect(result.current.kesalahan).toEqual({});
  });

  it('fungsi pengubah stabil antar render', () => {
    const { result, rerender } = renderHook(() => useFormKegiatan());
    const awal = result.current;

    rerender({});

    expect(result.current.ubah).toBe(awal.ubah);
    expect(result.current.reset).toBe(awal.reset);
    expect(result.current.tambahFoto).toBe(awal.tambahFoto);
  });
});
```

```ts
// __tests__/utils/presurvei/fotoBukti.test.ts
import { describe, expect, it, jest } from '@jest/globals';

const mockManipulate = jest.fn<(uri: string, aksi: unknown, opsi: unknown) => Promise<{ uri: string }>>();
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (uri: string, aksi: unknown, opsi: unknown) => mockManipulate(uri, aksi, opsi),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { perkecilFoto } from '@/utils/presurvei/fotoBukti';

describe('perkecilFoto', () => {
  it('mengubah ukuran ke lebar 1024 dan JPEG kualitas 0.7', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file:///cache/kecil.jpg' });

    const hasil = await perkecilFoto('file:///cache/asli.jpg');

    expect(mockManipulate).toHaveBeenCalledWith(
      'file:///cache/asli.jpg',
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: 'jpeg' },
    );
    expect(hasil).toBe('file:///cache/kecil.jpg');
  });
});
```

```tsx
// __tests__/components/presurvei/BlokLokasiGps.test.tsx
import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/components/organisms/presurvei/PetaTitik', () => ({ PetaTitik: () => null }));
jest.mock('twrnc', () => () => ({}));

import { BlokLokasiGps } from '@/components/organisms/presurvei/BlokLokasiGps';

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };

describe('BlokLokasiGps', () => {
  it('GPS gagal menawarkan coba lagi', () => {
    const onCobaLagi = jest.fn();
    const { getByText } = render(<BlokLokasiGps status="gagal" titik={null} onCobaLagi={onCobaLagi} />);

    fireEvent.press(getByText('Coba lagi'));

    expect(getByText('GPS gagal. Pastikan GPS aktif lalu coba lagi.')).toBeTruthy();
    expect(onCobaLagi).toHaveBeenCalledTimes(1);
  });

  it('saat mencari tidak menawarkan coba lagi', () => {
    const { queryByText, getByText } = render(<BlokLokasiGps status="mencari" titik={null} onCobaLagi={jest.fn()} />);

    expect(getByText('Mencari lokasi GPS…')).toBeTruthy();
    expect(queryByText('Coba lagi')).toBeNull();
  });

  it('titik didapat menampilkan akurasi tanpa isian manual', () => {
    const { getByText, queryByText, UNSAFE_queryAllByType } = render(
      <BlokLokasiGps status="siap" titik={TITIK} onCobaLagi={jest.fn()} />,
    );
    const { TextInput } = require('react-native');

    expect(getByText('±12 m')).toBeTruthy();
    expect(queryByText('Coba lagi')).toBeNull();
    expect(UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });

  it('menampilkan pesan kesalahan dari form', () => {
    const { getByText } = render(
      <BlokLokasiGps status="gagal" titik={null} kesalahan="Lokasi GPS belum didapat" onCobaLagi={jest.fn()} />,
    );

    expect(getByText('Lokasi GPS belum didapat')).toBeTruthy();
  });
});
```

```tsx
// __tests__/components/presurvei/BlokFotoBukti.test.tsx
import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { BlokFotoBukti } from '@/components/organisms/presurvei/BlokFotoBukti';

const foto = (jumlah: number) => Array.from({ length: jumlah }, (_, i) => `file:///cache/${i + 1}.jpg`);

describe('BlokFotoBukti', () => {
  it('menampilkan hitungan dan tombol ambil selama belum penuh', () => {
    const onTambah = jest.fn();
    const { getByText } = render(<BlokFotoBukti fotoLokal={foto(2)} onTambah={onTambah} onHapus={jest.fn()} />);

    fireEvent.press(getByText('Ambil Foto'));

    expect(getByText('Foto bukti (2/6)')).toBeTruthy();
    expect(onTambah).toHaveBeenCalledTimes(1);
  });

  it('menyembunyikan tombol ambil saat enam foto', () => {
    const { queryByText } = render(<BlokFotoBukti fotoLokal={foto(6)} onTambah={jest.fn()} onHapus={jest.fn()} />);

    expect(queryByText('Ambil Foto')).toBeNull();
  });

  it('menghapus foto yang ditekan', () => {
    const onHapus = jest.fn();
    const { getByLabelText } = render(<BlokFotoBukti fotoLokal={foto(3)} onTambah={jest.fn()} onHapus={onHapus} />);

    fireEvent.press(getByLabelText('Hapus foto 2'));

    expect(onHapus).toHaveBeenCalledWith('file:///cache/2.jpg');
  });
});
```

```tsx
// __tests__/components/PilihanChip.test.tsx
import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('twrnc', () => () => ({}));

import { PilihanChip } from '@/components/molecules/PilihanChip';

const OPSI = [
  { nilai: 'KUNJUNGAN', label: 'Kunjungan' },
  { nilai: 'TELEPON', label: 'Telepon' },
] as const;

describe('PilihanChip', () => {
  it('mengirim nilai opsi yang ditekan dan menandai yang terpilih', () => {
    const onPilih = jest.fn();
    const { getByText, getByRole } = render(<PilihanChip opsi={OPSI} terpilih="TELEPON" onPilih={onPilih} />);

    fireEvent.press(getByText('Kunjungan'));

    expect(onPilih).toHaveBeenCalledWith('KUNJUNGAN');
    expect(getByRole('button', { name: 'Telepon' }).props.accessibilityState).toEqual({ selected: true });
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/hooks/useFormKegiatan.test.ts __tests__/utils/presurvei/fotoBukti.test.ts __tests__/components/presurvei __tests__/components/PilihanChip.test.tsx`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Implementasi hook dan utilitas**

```ts
// src/hooks/presurvei/useFormKegiatan.ts
import { useCallback, useState } from 'react';

import { JUMLAH_FOTO_KEGIATAN_MAKS } from '@/constants/presurvei';
import {
  NILAI_FORM_KEGIATAN_KOSONG,
  validasiFormKegiatan,
  type IsianProspekBaru,
  type KesalahanFormKegiatan,
  type NilaiFormKegiatan,
} from '@/utils/presurvei/formKegiatan';
import type { TitikGps } from '@/utils/presurvei/lokasiGps';

/** State dan aksi form catat kegiatan. */
export interface FormKegiatan {
  nilai: NilaiFormKegiatan;
  fotoLokal: string[];
  kesalahan: KesalahanFormKegiatan;
  ubah: (perubahan: Partial<NilaiFormKegiatan>) => void;
  ubahProspekBaru: (perubahan: Partial<IsianProspekBaru>) => void;
  tambahFoto: (uri: string) => void;
  hapusFoto: (uri: string) => void;
  periksa: (titik: TitikGps | null) => boolean;
  reset: (awal: Partial<NilaiFormKegiatan>) => void;
}

function useFotoKegiatan() {
  const [fotoLokal, setFotoLokal] = useState<string[]>([]);
  const tambahFoto = useCallback((uri: string) => {
    setFotoLokal((lama) => (lama.length >= JUMLAH_FOTO_KEGIATAN_MAKS ? lama : [...lama, uri]));
  }, []);
  const hapusFoto = useCallback((uri: string) => {
    setFotoLokal((lama) => lama.filter((foto) => foto !== uri));
  }, []);
  const kosongkan = useCallback(() => setFotoLokal([]), []);
  return { fotoLokal, tambahFoto, hapusFoto, kosongkan };
}

function useNilaiKegiatan() {
  const [nilai, setNilai] = useState<NilaiFormKegiatan>(NILAI_FORM_KEGIATAN_KOSONG);
  const ubah = useCallback((perubahan: Partial<NilaiFormKegiatan>) => {
    setNilai((lama) => ({ ...lama, ...perubahan }));
  }, []);
  const ubahProspekBaru = useCallback((perubahan: Partial<IsianProspekBaru>) => {
    setNilai((lama) => ({ ...lama, prospekBaru: { ...lama.prospekBaru, ...perubahan } }));
  }, []);
  return { nilai, setNilai, ubah, ubahProspekBaru };
}

/** Form catat kegiatan; aturan validasi ada di `utils/presurvei/formKegiatan.ts`. */
export function useFormKegiatan(): FormKegiatan {
  const { nilai, setNilai, ubah, ubahProspekBaru } = useNilaiKegiatan();
  const { fotoLokal, tambahFoto, hapusFoto, kosongkan } = useFotoKegiatan();
  const [kesalahan, setKesalahan] = useState<KesalahanFormKegiatan>({});

  const periksa = useCallback((titik: TitikGps | null) => {
    const hasil = validasiFormKegiatan(nilai, { titik, jumlahFoto: fotoLokal.length });
    setKesalahan(hasil);
    return Object.keys(hasil).length === 0;
  }, [nilai, fotoLokal.length]);

  const reset = useCallback((awal: Partial<NilaiFormKegiatan>) => {
    setNilai({ ...NILAI_FORM_KEGIATAN_KOSONG, ...awal });
    setKesalahan({});
    kosongkan();
  }, [setNilai, kosongkan]);

  return { nilai, fotoLokal, kesalahan, ubah, ubahProspekBaru, tambahFoto, hapusFoto, periksa, reset };
}
```

```ts
// src/utils/presurvei/fotoBukti.ts
import * as ImageManipulator from 'expo-image-manipulator';

/** Lebar foto bukti setelah diperkecil (pola `canvasing/create.tsx:147-160`). */
export const LEBAR_FOTO_BUKTI = 1024;

/** Kualitas JPEG foto bukti. */
export const KUALITAS_FOTO_BUKTI = 0.7;

/** Perkecil foto kamera ke lebar 1024, JPEG 0.7; mengembalikan URI baru. */
export async function perkecilFoto(uri: string): Promise<string> {
  const hasil = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: LEBAR_FOTO_BUKTI } }],
    { compress: KUALITAS_FOTO_BUKTI, format: ImageManipulator.SaveFormat.JPEG },
  );
  return hasil.uri;
}
```

```ts
// src/constants/gayaPetaOsm.ts
/**
 * Gaya peta raster OpenStreetMap untuk MapLibre, dipakai `LocationPickerModal`
 * dan `PetaTitik`. Konstanta modul, jadi referensinya stabil tanpa `useMemo`.
 */
export const GAYA_PETA_OSM = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};
```

Di `src/components/organisms/marketing/LocationPickerModal.tsx`: tambah `import { GAYA_PETA_OSM } from '@/constants/gayaPetaOsm';`, hapus blok `const mapStyle = React.useMemo(() => ({ ... }), []);` (baris 73-92), dan ganti `mapStyle={mapStyle}` (baris 322) menjadi `mapStyle={GAYA_PETA_OSM}`. Komentar di baris 70-72 tetap (berlaku untuk `cameraSettings`).

- [ ] **Step 4: Implementasi komponen**

```tsx
// src/components/molecules/PilihanChip.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

/** Satu opsi chip. */
export interface OpsiChip<T extends string> {
  nilai: T;
  label: string;
}

interface PilihanChipProps<T extends string> {
  opsi: readonly OpsiChip<T>[];
  terpilih: T | null;
  onPilih: (nilai: T) => void;
}

/** Deretan chip pilihan tunggal. */
export function PilihanChip<T extends string>({ opsi, terpilih, onPilih }: PilihanChipProps<T>) {
  return (
    <View style={tw`flex-row flex-wrap -m-1`}>
      {opsi.map((pilihan) => {
        const isTerpilih = pilihan.nilai === terpilih;
        return (
          <TouchableOpacity
            key={pilihan.nilai}
            accessibilityRole="button"
            accessibilityLabel={pilihan.label}
            accessibilityState={{ selected: isTerpilih }}
            onPress={() => onPilih(pilihan.nilai)}
            style={tw`m-1 px-3 py-2 rounded-full border ${isTerpilih ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
          >
            <Text style={tw`text-sm ${isTerpilih ? 'text-white font-semibold' : 'text-gray-700'}`}>
              {pilihan.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
```

```tsx
// src/components/molecules/IsianTeks.tsx
import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import tw from 'twrnc';

interface IsianTeksProps extends Pick<TextInputProps, 'keyboardType' | 'multiline' | 'maxLength'> {
  label: string;
  nilai: string;
  onUbah: (isian: string) => void;
  kesalahan?: string;
  placeholder?: string;
}

/** Isian teks berlabel dengan pesan kesalahan; label juga menjadi label aksesibilitas. */
export function IsianTeks({ label, nilai, onUbah, kesalahan, placeholder, ...sisa }: IsianTeksProps) {
  return (
    <View style={tw`mb-3`}>
      <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={nilai}
        onChangeText={onUbah}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        style={tw`bg-white border ${kesalahan ? 'border-red-500' : 'border-gray-300'} rounded-xl px-3 py-2 text-gray-900`}
        {...sisa}
      />
      {kesalahan ? <Text style={tw`text-red-600 text-xs mt-1`}>{kesalahan}</Text> : null}
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/PetaTitik.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { GAYA_PETA_OSM } from '@/constants/gayaPetaOsm';
import { getMapLibre } from '@/utils/maplibre';
import type { TitikGps } from '@/utils/presurvei/lokasiGps';

// null di Expo Go dan web (`src/utils/maplibre.ts:16-24`).
const MapLibreGL = getMapLibre();

const ZOOM_PETA_TITIK = 16;
const DIGIT_KOORDINAT = 6;

interface PetaTitikProps {
  titik: TitikGps;
}

/** Peta kecil non-interaktif penanda titik kegiatan; teks koordinat bila MapLibre tak tersedia. */
export function PetaTitik({ titik }: PetaTitikProps) {
  const koordinat: [number, number] = [titik.longitude, titik.latitude];
  if (!MapLibreGL) {
    return (
      <Text style={tw`text-sm text-gray-700`}>
        {`${titik.latitude.toFixed(DIGIT_KOORDINAT)}, ${titik.longitude.toFixed(DIGIT_KOORDINAT)}`}
      </Text>
    );
  }
  return (
    <View style={tw`h-40 rounded-xl overflow-hidden`} pointerEvents="none">
      <MapLibreGL.MapView
        style={tw`flex-1`}
        mapStyle={GAYA_PETA_OSM}
        logoEnabled={false}
        attributionEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <MapLibreGL.Camera centerCoordinate={koordinat} zoomLevel={ZOOM_PETA_TITIK} />
        <MapLibreGL.PointAnnotation id="titik-kegiatan" coordinate={koordinat}>
          <View style={tw`w-4 h-4 rounded-full bg-red-500 border-2 border-white`} />
        </MapLibreGL.PointAnnotation>
      </MapLibreGL.MapView>
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/BlokLokasiGps.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { PetaTitik } from './PetaTitik';
import {
  TEKS_STATUS_LOKASI,
  teksAkurasi,
  type StatusLokasi,
  type TitikGps,
} from '@/utils/presurvei/lokasiGps';

interface BlokLokasiGpsProps {
  status: StatusLokasi;
  titik: TitikGps | null;
  kesalahan?: string;
  onCobaLagi: () => void;
}

/** Lokasi GPS kegiatan: hanya ditampilkan, tidak bisa diketik atau dipilih manual. */
export function BlokLokasiGps({ status, titik, kesalahan, onCobaLagi }: BlokLokasiGpsProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-1`}>Lokasi GPS</Text>
      <Text style={tw`text-xs text-gray-500 mb-2`}>Diambil otomatis dari GPS dan tidak bisa diubah.</Text>
      {titik !== null ? (
        <View>
          <PetaTitik titik={titik} />
          <Text style={tw`text-xs text-gray-600 mt-2`}>{teksAkurasi(titik.akurasiMeter)}</Text>
        </View>
      ) : (
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-sm text-gray-600 flex-1`}>{TEKS_STATUS_LOKASI[status]}</Text>
          {status === 'gagal' ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onCobaLagi}
              style={tw`ml-3 px-3 py-2 rounded-lg bg-blue-600`}
            >
              <Text style={tw`text-white font-semibold text-sm`}>Coba lagi</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {kesalahan ? <Text style={tw`text-red-600 text-xs mt-2`}>{kesalahan}</Text> : null}
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/BlokFotoBukti.tsx
import { X } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { JUMLAH_FOTO_KEGIATAN_MAKS } from '@/constants/presurvei';

interface BlokFotoBuktiProps {
  fotoLokal: readonly string[];
  kesalahan?: string;
  onTambah: () => void;
  onHapus: (uri: string) => void;
}

/** Foto bukti kegiatan lapangan: minimal satu, maksimal enam, dari kamera. */
export function BlokFotoBukti({ fotoLokal, kesalahan, onTambah, onHapus }: BlokFotoBuktiProps) {
  const isPenuh = fotoLokal.length >= JUMLAH_FOTO_KEGIATAN_MAKS;
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>
        {`Foto bukti (${fotoLokal.length}/${JUMLAH_FOTO_KEGIATAN_MAKS})`}
      </Text>
      <View style={tw`flex-row flex-wrap`}>
        {fotoLokal.map((uri, indeks) => (
          <View key={uri} style={tw`w-20 h-20 mr-2 mb-2 rounded-lg overflow-hidden`}>
            <Image source={{ uri }} style={tw`w-full h-full`} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Hapus foto ${indeks + 1}`}
              onPress={() => onHapus(uri)}
              style={tw`absolute top-1 right-1 bg-black/60 rounded-full p-1`}
            >
              <X size={12} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      {!isPenuh ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onTambah}
          style={tw`mt-1 border border-dashed border-blue-400 rounded-xl py-3 items-center`}
        >
          <Text style={tw`text-blue-600 font-semibold`}>Ambil Foto</Text>
        </TouchableOpacity>
      ) : null}
      {kesalahan ? <Text style={tw`text-red-600 text-xs mt-2`}>{kesalahan}</Text> : null}
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/KameraBukti.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { presentAppError } from '@/utils/errorPresenter';
import { KUALITAS_FOTO_BUKTI, perkecilFoto } from '@/utils/presurvei/fotoBukti';

interface KameraBuktiProps {
  onAmbil: (uri: string) => void;
  onTutup: () => void;
}

/** Kamera belakang layar penuh untuk foto bukti; foto diperkecil sebelum dikembalikan. */
export function KameraBukti({ onAmbil, onTutup }: KameraBuktiProps) {
  const [izin, mintaIzin] = useCameraPermissions();
  const kamera = useRef<CameraView>(null);
  const [isMemotret, setIsMemotret] = useState(false);

  const potret = async () => {
    if (!kamera.current || isMemotret) return;
    setIsMemotret(true);
    try {
      const foto = await kamera.current.takePictureAsync({ quality: KUALITAS_FOTO_BUKTI });
      if (foto?.uri) onAmbil(await perkecilFoto(foto.uri));
    } catch (error) {
      presentAppError(error, { screen: 'KameraBukti' });
    } finally {
      setIsMemotret(false);
    }
  };

  if (!izin?.granted) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-black p-6`}>
        <Text style={tw`text-white text-center mb-4`}>Aplikasi butuh izin kamera untuk foto bukti.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => void mintaIzin()} style={tw`bg-blue-600 rounded-xl px-5 py-3 mb-3`}>
          <Text style={tw`text-white font-bold`}>Izinkan Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={onTutup}>
          <Text style={tw`text-gray-300`}>Batal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-black`}>
      <CameraView ref={kamera} style={tw`flex-1`} facing="back" />
      <View style={tw`absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-6`}>
        <TouchableOpacity accessibilityRole="button" onPress={onTutup}>
          <Text style={tw`text-white font-semibold`}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Jepret"
          disabled={isMemotret}
          onPress={() => void potret()}
          style={tw`w-16 h-16 rounded-full border-4 border-white ${isMemotret ? 'bg-gray-400' : 'bg-white/30'}`}
        />
        <View style={tw`w-12`} />
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Jalankan test dan typecheck**

Run: `npx jest __tests__/hooks/useFormKegiatan.test.ts __tests__/utils/presurvei/fotoBukti.test.ts __tests__/components/presurvei __tests__/components/PilihanChip.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit`
Expected: exit 0. Bila `mapStyle` MapLibre menolak objek biasa, beri anotasi tipe `StyleSpecification` dari `@maplibre/maplibre-react-native` pada `GAYA_PETA_OSM`; jangan mengubah bentuk nilainya.

- [ ] **Step 6: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `lama.length >= JUMLAH_FOTO_KEGIATAN_MAKS` jadi `>` | "tidak menerima foto ketujuh" |
| `hapusFoto` memakai `lama.slice(1)` | "menghapus hanya foto yang dipilih" |
| `periksa` memakai `jumlahFoto: 0` | "periksa memakai foto yang sudah diambil" |
| `ubahProspekBaru` jadi `prospekBaru: { ...NILAI_FORM_KEGIATAN_KOSONG.prospekBaru, ...perubahan }` | "ubahProspekBaru menggabungkan tanpa menghapus medan lain" |
| Hapus `kosongkan()` dari `reset` | "reset mengosongkan nilai, kesalahan, dan foto…" |
| Hapus `useCallback` dari `ubah` | "fungsi pengubah stabil antar render" |
| `LEBAR_FOTO_BUKTI = 2048` | "mengubah ukuran ke lebar 1024 dan JPEG kualitas 0.7" |
| Tampilkan tombol "Coba lagi" untuk semua status | "saat mencari tidak menawarkan coba lagi" |
| `!isPenuh` jadi `true` | "menyembunyikan tombol ambil saat enam foto" |
| `accessibilityState={{ selected: isTerpilih }}` dihapus | "mengirim nilai opsi yang ditekan dan menandai yang terpilih" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/presurvei/useFormKegiatan.ts src/utils/presurvei/fotoBukti.ts src/constants/gayaPetaOsm.ts src/components/organisms/marketing/LocationPickerModal.tsx src/components/molecules/PilihanChip.tsx src/components/molecules/IsianTeks.tsx src/components/organisms/presurvei/PetaTitik.tsx src/components/organisms/presurvei/BlokLokasiGps.tsx src/components/organisms/presurvei/BlokFotoBukti.tsx src/components/organisms/presurvei/KameraBukti.tsx __tests__/hooks/useFormKegiatan.test.ts __tests__/utils/presurvei/fotoBukti.test.ts __tests__/components/presurvei __tests__/components/PilihanChip.test.tsx
git commit -m "$(cat <<'EOF'
feat(presurvei): state form kegiatan, blok GPS, blok foto, dan kamera bukti

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Layar Catat Kegiatan

**Repo:** `mobile-netmanager`

**Files:**
- Modify: `src/constants/presurvei.ts` (tambah `JEDA_CARI_PROSPEK_MS`)
- Create: `src/components/organisms/presurvei/IsianDataTeknis.tsx`
- Create: `src/components/organisms/presurvei/BlokProspekKegiatan.tsx`
- Create: `src/components/organisms/presurvei/PilihProspekModal.tsx`
- Create: `src/components/organisms/presurvei/FormCatatKegiatan.tsx`
- Create: `src/hooks/presurvei/useLayarCatatKegiatan.ts`
- Create: `app/(app)/presurvei/kegiatan/catat.tsx`
- Modify: `app/(app)/_layout.tsx:374-394` (daftarkan route tersembunyi)
- Test: `__tests__/app/presurvei-catat-kegiatan.test.tsx`, `__tests__/app/app-layout-presurvei.test.tsx` (baru)

**Interfaces:**
- Consumes: Task 8 — `useDaftarProspek`; Task 10 — `useLokasiKegiatan`; Task 11 — `keMuatanKegiatan`, `bangunVariabelCatat`, `useCatatKegiatan`; Task 12 — `useFormKegiatan`, blok dan molekul.
- Produces:
  - Route `/(app)/presurvei/kegiatan/catat`, param opsional `prospekId`, `prospekNama` (dipakai Task 15 "Catat Follow-up").
  - `JEDA_CARI_PROSPEK_MS = 400`
  - `interface ParamCatatKegiatan { prospekId?: string; prospekNama?: string }`
  - `useLayarCatatKegiatan(param: ParamCatatKegiatan, onSelesai: () => void)` → `{ form: FormKegiatan; lokasi: LokasiKegiatan; namaProspek: string | null; pilihProspek(prospek: Pick<ProspekListItem, 'id' | 'nama'>): void; lepasProspek(): void; simpan(): void; isMenyimpan: boolean }`
  - `PilihProspekModal(props: { onTutup: () => void; onPilih: (prospek: ProspekListItem) => void })` — dirender hanya saat dibuka.
  - `__tests__/app/app-layout-presurvei.test.tsx` dengan konstanta `RUTE_PRESURVEI_TERSEMBUNYI` yang diperluas Task 14–16.

- [ ] **Step 1: Tulis test layout yang gagal**

```tsx
// __tests__/app/app-layout-presurvei.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Tab bar bawaan menampilkan setiap route yang tidak dideklarasikan sebagai
 * tab. Test ini menangkap props setiap `Tabs.Screen` untuk memastikan route
 * presurvei tersembunyi dan tab teknisi tidak berubah.
 */

type PropsLayar = {
  name: string;
  options?: { href?: unknown; title?: string };
  listeners?: { tabPress?: (e: { preventDefault: () => void }) => void };
};

const mockLayar: PropsLayar[] = [];
let mockPropsTabs: { tabBar?: unknown } = {};
const mockUseAuth = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = (props: { tabBar?: unknown; children: React.ReactNode }) => {
    mockPropsTabs = props;
    return <>{props.children}</>;
  };
  Tabs.Screen = (props: PropsLayar) => {
    mockLayar.push(props);
    return null;
  };
  return {
    Tabs,
    usePathname: () => '/dashboard',
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  };
});
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/hooks/useProfileSync', () => ({ useProfileSync: () => ({ profileData: null }) }));
jest.mock('@/utils/leaveAccess', () => ({ isRouteAllowedDuringLeave: () => true }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/organisms/FaceVerificationModal', () => ({ FaceVerificationModal: () => null }));
jest.mock('@/components/providers/LocationDisclosureProvider', () => ({
  LocationDisclosureProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/organisms/navigation/MitraSalesTabBar', () => ({ MitraSalesTabBar: () => null }));
jest.mock('@/components/organisms/navigation/MitraTeknisiTabBar', () => ({ MitraTeknisiTabBar: () => null }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

/** Route presurvei yang tidak boleh muncul sebagai tab di tab bar bawaan. */
const RUTE_PRESURVEI_TERSEMBUNYI = ['presurvei/kegiatan/catat'];

const TEKNISI = {
  id: 'u-1',
  role: 'TEKNISI',
  employeeType: 'KARYAWAN',
  isSales: false,
  isOnLeave: false,
  features: ['m_dashboard', 'm_work_order', 'm_barang', 'm_absensi', 'm_presurvei'],
};

const renderLayout = (user: Record<string, unknown>) => {
  mockLayar.length = 0;
  mockUseAuth.mockReturnValue({ user });
  const AppLayout = require('../../app/(app)/_layout').default;
  render(<AppLayout />);
};

const layar = (nama: string) => mockLayar.filter((props) => props.name === nama).at(-1);

describe('layout aplikasi — route presurvei', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(RUTE_PRESURVEI_TERSEMBUNYI)('mendaftarkan %s tanpa tab', (nama) => {
    renderLayout(TEKNISI);

    expect(layar(nama)).toBeDefined();
    expect(layar(nama)?.options?.href).toBeNull();
  });

  it('teknisi karyawan tetap melihat tab yang sama seperti sebelumnya', () => {
    renderLayout(TEKNISI);

    const terlihat = mockLayar
      .filter((props) => props.options?.href !== null)
      .map((props) => props.name);

    expect(terlihat).toEqual(['dashboard', 'work-order', 'barang', 'absensi', 'profile']);
    expect(mockPropsTabs.tabBar).toBeUndefined();
  });
});
```

- [ ] **Step 2: Tulis test layar yang gagal**

```tsx
// __tests__/app/presurvei-catat-kegiatan.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

type KeadaanLokasiUji = {
  status: 'belum' | 'mencari' | 'siap' | 'gagal';
  titik: { latitude: number; longitude: number; akurasiMeter: number | null } | null;
  alamatTerdeteksi: string;
};

const mockBack = jest.fn();
const mockParam = jest.fn<() => Record<string, string | undefined>>();
const mockCari = jest.fn();
const mockMutate = jest.fn();
let mockLokasi: KeadaanLokasiUji = { status: 'gagal', titik: null, alamatTerdeteksi: '' };
let mockKameraProps: { onAmbil: (uri: string) => void; onTutup: () => void } | null = null;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ back: mockBack, push: jest.fn() }),
    useLocalSearchParams: () => mockParam(),
    useFocusEffect: (efek: () => void) => React.useEffect(() => efek(), [efek]),
  };
});
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/hooks/presurvei/useLokasiKegiatan', () => ({
  useLokasiKegiatan: () => ({ ...mockLokasi, cari: mockCari }),
}));
jest.mock('@/hooks/presurvei/useCatatKegiatan', () => ({
  useCatatKegiatan: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock('@/components/organisms/presurvei/KameraBukti', () => ({
  KameraBukti: (props: { onAmbil: (uri: string) => void; onTutup: () => void }) => {
    mockKameraProps = props;
    return null;
  },
}));
jest.mock('@/components/organisms/presurvei/PetaTitik', () => ({ PetaTitik: () => null }));
jest.mock('@/components/organisms/presurvei/PilihProspekModal', () => ({ PilihProspekModal: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/kegiatan/catat').default;
  return render(<Layar />);
};

describe('Catat Kegiatan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam.mockReturnValue({});
    mockLokasi = { status: 'gagal', titik: null, alamatTerdeteksi: '' };
    mockKameraProps = null;
  });

  it('mencari GPS saat layar dibuka dan tidak menawarkan jenis Iklan', () => {
    const { getByText, queryByText } = renderLayar();

    expect(mockCari).toHaveBeenCalledTimes(1);
    for (const jenis of ['Kunjungan', 'Survei Lokasi', 'Telepon', 'Chat']) {
      expect(getByText(jenis)).toBeTruthy();
    }
    expect(queryByText('Iklan')).toBeNull();
  });

  it('menolak menyimpan kunjungan tanpa lokasi GPS dan menawarkan coba lagi', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    fireEvent.press(getByText('Tertarik'));
    fireEvent.press(getByText('Simpan Kegiatan'));
    fireEvent.press(getByText('Coba lagi'));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(getByText('Lokasi GPS belum didapat')).toBeTruthy();
    expect(mockCari).toHaveBeenCalledTimes(2);
  });

  it('menolak kunjungan tanpa foto bukti walau GPS siap', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: '' };
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    fireEvent.press(getByText('Tertarik'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(getByText('Ambil minimal 1 foto bukti')).toBeTruthy();
  });

  it('kolom teknis hanya tampil untuk survei lokasi', () => {
    const { getByText, queryByLabelText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    expect(queryByLabelText('ODP terdekat')).toBeNull();

    fireEvent.press(getByText('Survei Lokasi'));
    expect(queryByLabelText('ODP terdekat')).toBeTruthy();
    expect(queryByLabelText('Estimasi kabel (meter)')).toBeTruthy();
  });

  it('telepon tersimpan tanpa koordinat dan tanpa foto', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: 'Jl. Melati 9' };
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const variabel = mockMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(variabel.jenis).toBe('TELEPON');
    expect('latitude' in variabel).toBe(false);
    expect('meta' in variabel).toBe(false);
  });

  it('kunjungan lengkap mengirim titik GPS, alamat terdeteksi, dan foto lewat meta', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: 'Jl. Melati 9' };
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    fireEvent.press(getByText('Ambil Foto'));
    act(() => mockKameraProps?.onAmbil('file:///cache/a.jpg'));
    fireEvent.press(getByText('Tertarik'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        latitude: -6.2,
        longitude: 106.8,
        alamatDikunjungi: 'Jl. Melati 9',
        meta: { photos: ['file:///cache/a.jpg'], targetField: 'fotoUrls', photoType: 'presurvei' },
      }),
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it('tidak mengirim dua kali saat Simpan ditekan beruntun', () => {
    const { getByText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));

    fireEvent.press(getByText('Simpan Kegiatan'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('prospek dari parameter Catat Follow-up ikut terkirim', () => {
    mockParam.mockReturnValue({ prospekId: 'p-7', prospekNama: 'Budi Santoso' });
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Perlu follow-up'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ prospekId: 'p-7' }),
      expect.anything(),
    );
  });
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `npx jest __tests__/app/app-layout-presurvei.test.tsx __tests__/app/presurvei-catat-kegiatan.test.tsx`
Expected: FAIL — `mendaftarkan presurvei/kegiatan/catat tanpa tab` (layar tidak ada), layar catat belum ada. Test "teknisi karyawan tetap melihat tab yang sama" PASS sejak awal (baseline regresi).

- [ ] **Step 4: Implementasi komponen form**

Tambahkan di akhir `src/constants/presurvei.ts`:

```ts
/** Jeda debounce pencarian prospek. */
export const JEDA_CARI_PROSPEK_MS = 400;
```

```tsx
// src/components/organisms/presurvei/IsianDataTeknis.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { IsianTeks } from '@/components/molecules/IsianTeks';
import type { KesalahanFormKegiatan, NilaiFormKegiatan } from '@/utils/presurvei/formKegiatan';

interface IsianDataTeknisProps {
  nilai: Pick<NilaiFormKegiatan, 'odpTerdekat' | 'estimasiKabel' | 'catatanTeknis'>;
  kesalahan: KesalahanFormKegiatan;
  onUbah: (perubahan: Partial<NilaiFormKegiatan>) => void;
}

/** Data teknis yang hanya berlaku untuk survei lokasi. */
export function IsianDataTeknis({ nilai, kesalahan, onUbah }: IsianDataTeknisProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Data teknis survei</Text>
      <IsianTeks label="ODP terdekat" nilai={nilai.odpTerdekat} kesalahan={kesalahan.odpTerdekat} onUbah={(isian) => onUbah({ odpTerdekat: isian })} />
      <IsianTeks label="Estimasi kabel (meter)" nilai={nilai.estimasiKabel} kesalahan={kesalahan.estimasiKabel} keyboardType="number-pad" onUbah={(isian) => onUbah({ estimasiKabel: isian })} />
      <IsianTeks label="Catatan teknis" nilai={nilai.catatanTeknis} kesalahan={kesalahan.catatanTeknis} multiline onUbah={(isian) => onUbah({ catatanTeknis: isian })} />
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/BlokProspekKegiatan.tsx
import React from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { IsianTeks } from '@/components/molecules/IsianTeks';
import { isBolehProspekBaru } from '@/utils/presurvei/aturanPresurvei';
import type {
  IsianProspekBaru,
  KesalahanFormKegiatan,
  NilaiFormKegiatan,
} from '@/utils/presurvei/formKegiatan';

interface BlokProspekKegiatanProps {
  nilai: NilaiFormKegiatan;
  namaProspek: string | null;
  kesalahan: KesalahanFormKegiatan;
  onBukaPilih: () => void;
  onLepas: () => void;
  onUbah: (perubahan: Partial<NilaiFormKegiatan>) => void;
  onUbahProspekBaru: (perubahan: Partial<IsianProspekBaru>) => void;
}

/** Tautan prospek: follow-up prospek yang ada, atau buat prospek baru bila diizinkan server. */
export function BlokProspekKegiatan(props: BlokProspekKegiatanProps) {
  const { nilai, namaProspek, kesalahan, onBukaPilih, onLepas, onUbah, onUbahProspekBaru } = props;
  const baru = nilai.prospekBaru;
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Prospek</Text>
      {nilai.prospekId !== null ? (
        <View style={tw`flex-row items-center`}>
          <Text style={tw`flex-1 text-gray-900`}>{namaProspek ?? 'Prospek terpilih'}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={onLepas}>
            <Text style={tw`text-red-600 font-semibold`}>Lepas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity accessibilityRole="button" onPress={onBukaPilih} style={tw`border border-gray-300 rounded-xl py-3 items-center`}>
          <Text style={tw`text-gray-700`}>Pilih prospek (follow-up)</Text>
        </TouchableOpacity>
      )}
      {isBolehProspekBaru(nilai) ? (
        <View style={tw`mt-3`}>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text style={tw`text-gray-900`}>Buat prospek baru</Text>
            <Switch accessibilityLabel="Buat prospek baru" value={nilai.isBuatProspekBaru} onValueChange={(isBuat) => onUbah({ isBuatProspekBaru: isBuat })} />
          </View>
          {nilai.isBuatProspekBaru ? (
            <View>
              <IsianTeks label="Nama calon pelanggan" nilai={baru.nama} kesalahan={kesalahan.prospekBaruNama} onUbah={(isian) => onUbahProspekBaru({ nama: isian })} />
              <IsianTeks label="No. HP" nilai={baru.noTelp} kesalahan={kesalahan.prospekBaruNoTelp} keyboardType="phone-pad" onUbah={(isian) => onUbahProspekBaru({ noTelp: isian })} />
              <IsianTeks label="Alamat pemasangan" nilai={baru.alamat} kesalahan={kesalahan.prospekBaruAlamat} onUbah={(isian) => onUbahProspekBaru({ alamat: isian })} />
              <IsianTeks label="Paket diminati" nilai={baru.paketDiminati} onUbah={(isian) => onUbahProspekBaru({ paketDiminati: isian })} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/PilihProspekModal.tsx
import React, { useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { JEDA_CARI_PROSPEK_MS, LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import { useDaftarProspek } from '@/hooks/queries/usePresurveiProspek';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ProspekListItem } from '@/types/presurvei';

interface PilihProspekModalProps {
  onTutup: () => void;
  onPilih: (prospek: ProspekListItem) => void;
}

/** Pemilih prospek milik sendiri untuk kegiatan follow-up. Dirender hanya saat dibuka. */
export function PilihProspekModal({ onTutup, onPilih }: PilihProspekModalProps) {
  const [cari, setCari] = useState('');
  const cariTertunda = useDebouncedValue(cari.trim(), JEDA_CARI_PROSPEK_MS);
  const daftar = useDaftarProspek(cariTertunda === '' ? {} : { search: cariTertunda });
  const prospek = daftar.data?.pages.flatMap((halaman) => halaman.data) ?? [];

  return (
    <Modal visible animationType="slide" onRequestClose={onTutup}>
      <View style={tw`flex-1 bg-gray-50 p-4`}>
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <Text style={tw`text-lg font-bold text-gray-900`}>Pilih Prospek</Text>
          <TouchableOpacity accessibilityRole="button" onPress={onTutup}>
            <Text style={tw`text-blue-600 font-semibold`}>Tutup</Text>
          </TouchableOpacity>
        </View>
        <TextInput accessibilityLabel="Cari prospek" value={cari} onChangeText={setCari} placeholder="Nama atau nomor HP" style={tw`bg-white border border-gray-300 rounded-xl px-3 py-2 mb-3`} />
        <FlatList
          data={prospek}
          keyExtractor={(item) => item.id}
          onEndReached={() => { if (daftar.hasNextPage && !daftar.isFetchingNextPage) void daftar.fetchNextPage(); }}
          ListEmptyComponent={<Text style={tw`text-center text-gray-500 mt-6`}>{daftar.isPending ? 'Memuat…' : 'Prospek tidak ditemukan.'}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity accessibilityRole="button" onPress={() => onPilih(item)} style={tw`bg-white rounded-xl p-3 mb-2 border border-gray-100`}>
              <Text style={tw`font-semibold text-gray-900`}>{item.nama}</Text>
              <Text style={tw`text-xs text-gray-500`}>{`${item.noTelp} · ${LABEL_STATUS_PROSPEK[item.status]}`}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}
```

```tsx
// src/components/organisms/presurvei/FormCatatKegiatan.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { IsianTeks } from '@/components/molecules/IsianTeks';
import { PilihanChip } from '@/components/molecules/PilihanChip';
import { KEGIATAN_HASIL, LABEL_HASIL_KEGIATAN, LABEL_JENIS_KEGIATAN } from '@/constants/presurvei';
import type { FormKegiatan } from '@/hooks/presurvei/useFormKegiatan';
import type { LokasiKegiatan } from '@/hooks/presurvei/useLokasiKegiatan';
import { daftarJenisDitawarkan, isButuhDataTeknis, isButuhLokasi } from '@/utils/presurvei/aturanPresurvei';
import { BlokFotoBukti } from './BlokFotoBukti';
import { BlokLokasiGps } from './BlokLokasiGps';
import { BlokProspekKegiatan } from './BlokProspekKegiatan';
import { IsianDataTeknis } from './IsianDataTeknis';

const OPSI_JENIS = daftarJenisDitawarkan().map((jenis) => ({ nilai: jenis, label: LABEL_JENIS_KEGIATAN[jenis] }));
const OPSI_HASIL = KEGIATAN_HASIL.map((hasil) => ({ nilai: hasil, label: LABEL_HASIL_KEGIATAN[hasil] }));

interface FormCatatKegiatanProps {
  form: FormKegiatan;
  lokasi: LokasiKegiatan;
  namaProspek: string | null;
  onBukaKamera: () => void;
  onBukaPilihProspek: () => void;
  onLepasProspek: () => void;
}

/** Isi form catat kegiatan; blok GPS/foto hanya untuk kegiatan lapangan. */
export function FormCatatKegiatan(props: FormCatatKegiatanProps) {
  const { form, lokasi, namaProspek, onBukaKamera, onBukaPilihProspek, onLepasProspek } = props;
  const { nilai, kesalahan, ubah } = form;
  const isLapangan = nilai.jenis !== null && isButuhLokasi(nilai.jenis);
  const isSurvei = nilai.jenis !== null && isButuhDataTeknis(nilai.jenis);
  return (
    <View>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Jenis kegiatan</Text>
      <PilihanChip opsi={OPSI_JENIS} terpilih={nilai.jenis} onPilih={(jenis) => ubah({ jenis })} />
      {kesalahan.jenis ? <Text style={tw`text-red-600 text-xs mt-1`}>{kesalahan.jenis}</Text> : null}
      <View style={tw`h-4`} />
      {isLapangan ? (
        <View>
          <BlokLokasiGps status={lokasi.status} titik={lokasi.titik} kesalahan={kesalahan.lokasi} onCobaLagi={lokasi.cari} />
          <BlokFotoBukti fotoLokal={form.fotoLokal} kesalahan={kesalahan.foto} onTambah={onBukaKamera} onHapus={form.hapusFoto} />
        </View>
      ) : null}
      <Text style={tw`font-bold text-gray-900 mb-2`}>Hasil</Text>
      <PilihanChip opsi={OPSI_HASIL} terpilih={nilai.hasil} onPilih={(hasil) => ubah({ hasil })} />
      {kesalahan.hasil ? <Text style={tw`text-red-600 text-xs mt-1`}>{kesalahan.hasil}</Text> : null}
      <View style={tw`h-4`} />
      <IsianTeks label={isLapangan ? 'Yang ditemui' : 'Yang dihubungi'} nilai={nilai.ditemuiNama} kesalahan={kesalahan.ditemuiNama} onUbah={(isian) => ubah({ ditemuiNama: isian })} />
      {isLapangan ? <IsianTeks label="Alamat" nilai={nilai.alamat} kesalahan={kesalahan.alamat} onUbah={(isian) => ubah({ alamat: isian })} /> : null}
      <IsianTeks label="Catatan" nilai={nilai.catatan} kesalahan={kesalahan.catatan} multiline onUbah={(isian) => ubah({ catatan: isian })} />
      {isSurvei ? <IsianDataTeknis nilai={nilai} kesalahan={kesalahan} onUbah={ubah} /> : null}
      <BlokProspekKegiatan nilai={nilai} namaProspek={namaProspek} kesalahan={kesalahan} onBukaPilih={onBukaPilihProspek} onLepas={onLepasProspek} onUbah={ubah} onUbahProspekBaru={form.ubahProspekBaru} />
    </View>
  );
}
```

- [ ] **Step 5: Implementasi hook layar dan layar**

```ts
// src/hooks/presurvei/useLayarCatatKegiatan.ts
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ProspekListItem } from '@/types/presurvei';
import { keMuatanKegiatan } from '@/utils/presurvei/formKegiatan';
import type { TitikGps } from '@/utils/presurvei/lokasiGps';
import { bangunVariabelCatat } from '@/utils/presurvei/variabelCatat';
import { useCatatKegiatan } from './useCatatKegiatan';
import { useFormKegiatan, type FormKegiatan } from './useFormKegiatan';
import { useLokasiKegiatan } from './useLokasiKegiatan';

/** Param route layar catat (dari "Catat Follow-up"). */
export interface ParamCatatKegiatan {
  prospekId?: string;
  prospekNama?: string;
}

function useProspekTertaut(ubah: FormKegiatan['ubah']) {
  const [nama, setNama] = useState<string | null>(null);
  const pilih = useCallback((prospek: Pick<ProspekListItem, 'id' | 'nama'>) => {
    ubah({ prospekId: prospek.id, isBuatProspekBaru: false });
    setNama(prospek.nama);
  }, [ubah]);
  const lepas = useCallback(() => {
    ubah({ prospekId: null });
    setNama(null);
  }, [ubah]);
  return { nama, setNama, pilih, lepas };
}

/**
 * Kirim sekali: ref menahan tekan beruntun sebelum `isPending` sempat
 * dirender ulang, dan dilepas di `onSettled` apa pun hasilnya.
 */
function usePengirimKegiatan(form: FormKegiatan, titik: TitikGps | null, onSelesai: () => void) {
  const catat = useCatatKegiatan(() => onSelesai());
  const isMengirim = useRef(false);
  const simpan = useCallback(() => {
    if (isMengirim.current || !form.periksa(titik)) return;
    isMengirim.current = true;
    const muatan = keMuatanKegiatan(form.nilai, { titik, waktuMulai: new Date() });
    catat.mutate(bangunVariabelCatat(muatan, form.fotoLokal), {
      onSettled: () => {
        isMengirim.current = false;
      },
    });
  }, [catat, form, titik]);
  return { simpan, isMenyimpan: catat.isPending };
}

/**
 * Isi alamat dari reverse geocode sekali per pencarian, tanpa menimpa ketikan.
 * Pencarian baru mengosongkan `alamatTerdeteksi`; saat itu penanda direset
 * supaya alamat yang sama di kunjungan berikutnya tetap terisi.
 */
function useIsiAlamatOtomatis(alamatTerdeteksi: string, alamat: string, ubah: FormKegiatan['ubah']) {
  const alamatTerakhir = useRef('');
  useEffect(() => {
    if (alamatTerdeteksi === '') {
      alamatTerakhir.current = '';
      return;
    }
    if (alamatTerdeteksi === alamatTerakhir.current) return;
    alamatTerakhir.current = alamatTerdeteksi;
    if (alamat === '') ubah({ alamat: alamatTerdeteksi });
  }, [alamatTerdeteksi, alamat, ubah]);
}

/**
 * Logika layar catat kegiatan. Setiap kali layar difokuskan, form di-reset
 * (Tabs mempertahankan instance layar) dan GPS dicari ulang.
 */
export function useLayarCatatKegiatan(param: ParamCatatKegiatan, onSelesai: () => void) {
  const form = useFormKegiatan();
  const lokasi = useLokasiKegiatan();
  const prospek = useProspekTertaut(form.ubah);
  const pengirim = usePengirimKegiatan(form, lokasi.titik, onSelesai);
  const { reset } = form;
  const { cari } = lokasi;
  const { setNama } = prospek;

  useFocusEffect(useCallback(() => {
    reset({ prospekId: param.prospekId ?? null });
    setNama(param.prospekNama ?? null);
    cari();
  }, [reset, setNama, cari, param.prospekId, param.prospekNama]));
  useIsiAlamatOtomatis(lokasi.alamatTerdeteksi, form.nilai.alamat, form.ubah);

  return {
    form,
    lokasi,
    namaProspek: prospek.nama,
    pilihProspek: prospek.pilih,
    lepasProspek: prospek.lepas,
    ...pengirim,
  };
}
```

```tsx
// app/(app)/presurvei/kegiatan/catat.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { FormCatatKegiatan } from '@/components/organisms/presurvei/FormCatatKegiatan';
import { KameraBukti } from '@/components/organisms/presurvei/KameraBukti';
import { PilihProspekModal } from '@/components/organisms/presurvei/PilihProspekModal';
import { AppFeature } from '@/constants/features';
import { useLayarCatatKegiatan, type ParamCatatKegiatan } from '@/hooks/presurvei/useLayarCatatKegiatan';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

/** Layar catat kegiatan presurvei. */
export default function CatatKegiatanScreen() {
  useFeatureGuard(AppFeature.PRESURVEI);
  const router = useRouter();
  const param = useLocalSearchParams<ParamCatatKegiatan>();
  const layar = useLayarCatatKegiatan(param, () => router.back());
  const [isKameraTerbuka, setIsKameraTerbuka] = useState(false);
  const [isPilihProspekTerbuka, setIsPilihProspekTerbuka] = useState(false);

  if (isKameraTerbuka) {
    return (
      <KameraBukti
        onAmbil={(uri) => { layar.form.tambahFoto(uri); setIsKameraTerbuka(false); }}
        onTutup={() => setIsKameraTerbuka(false)}
      />
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={tw`ml-2 text-lg font-bold text-gray-900`}>Catat Kegiatan</Text>
      </View>
      <ScrollView contentContainerStyle={tw`p-4 pb-32`} keyboardShouldPersistTaps="handled">
        <FormCatatKegiatan
          form={layar.form}
          lokasi={layar.lokasi}
          namaProspek={layar.namaProspek}
          onBukaKamera={() => setIsKameraTerbuka(true)}
          onBukaPilihProspek={() => setIsPilihProspekTerbuka(true)}
          onLepasProspek={layar.lepasProspek}
        />
      </ScrollView>
      <View style={tw`absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100`}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: layar.isMenyimpan }}
          disabled={layar.isMenyimpan}
          onPress={layar.simpan}
          style={tw`rounded-xl py-3 items-center ${layar.isMenyimpan ? 'bg-gray-400' : 'bg-blue-600'}`}
        >
          <Text style={tw`text-white font-bold`}>{layar.isMenyimpan ? 'Menyimpan…' : 'Simpan Kegiatan'}</Text>
        </TouchableOpacity>
      </View>
      {isPilihProspekTerbuka ? (
        <PilihProspekModal
          onTutup={() => setIsPilihProspekTerbuka(false)}
          onPilih={(prospek) => { layar.pilihProspek(prospek); setIsPilihProspekTerbuka(false); }}
        />
      ) : null}
    </SafeAreaView>
  );
}
```

Di `app/(app)/_layout.tsx`, tambahkan setelah blok `marketing/canvasing/[id]/claim` (baris 388-394):

```tsx
        {/* Presurvei - layar di luar tab bar */}
        <Tabs.Screen
          name="presurvei/kegiatan/catat"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
```

- [ ] **Step 6: Jalankan test, test layout lama, dan typecheck**

Run: `npx jest __tests__/app/app-layout-presurvei.test.tsx __tests__/app/presurvei-catat-kegiatan.test.tsx __tests__/app/app-layout-logging.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit && npx expo lint`
Expected: exit 0, tanpa error lint.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Hapus `Tabs.Screen` `presurvei/kegiatan/catat` | "mendaftarkan presurvei/kegiatan/catat tanpa tab" |
| Hapus `cari();` dari efek fokus | "mencari GPS saat layar dibuka…" |
| `OPSI_JENIS` dari `KEGIATAN_JENIS` (termasuk Iklan) | "mencari GPS saat layar dibuka dan tidak menawarkan jenis Iklan" |
| `simpan` tidak memanggil `form.periksa` | "menolak menyimpan kunjungan tanpa lokasi GPS…" |
| `isSurvei` memakai `isButuhLokasi` | "kolom teknis hanya tampil untuk survei lokasi" |
| Hapus `isMengirim.current = true;` | "tidak mengirim dua kali saat Simpan ditekan beruntun" |
| `bangunVariabelCatat(muatan, [])` | "kunjungan lengkap mengirim titik GPS, alamat terdeteksi, dan foto lewat meta" |
| `reset({ prospekId: null })` di efek fokus | "prospek dari parameter Catat Follow-up ikut terkirim" |
| `useIsiAlamatOtomatis` dihapus | "kunjungan lengkap mengirim … alamat terdeteksi …" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add src/constants/presurvei.ts src/components/organisms/presurvei/IsianDataTeknis.tsx src/components/organisms/presurvei/BlokProspekKegiatan.tsx src/components/organisms/presurvei/PilihProspekModal.tsx src/components/organisms/presurvei/FormCatatKegiatan.tsx src/hooks/presurvei/useLayarCatatKegiatan.ts "app/(app)/presurvei/kegiatan/catat.tsx" "app/(app)/_layout.tsx" __tests__/app/presurvei-catat-kegiatan.test.tsx __tests__/app/app-layout-presurvei.test.tsx
git commit -m "$(cat <<'EOF'
feat(presurvei): layar catat kegiatan dengan GPS wajib, foto bukti, dan antrean offline

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Tab Presurvei — daftar kegiatan dan prospek

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/constants/rutePresurvei.ts`
- Create: `src/utils/presurvei/daftarKegiatan.ts`
- Create: `src/utils/presurvei/filterProspek.ts`
- Create: `src/components/molecules/NavigasiTanggal.tsx`
- Create: `src/components/organisms/presurvei/KartuKegiatan.tsx`
- Create: `src/components/organisms/presurvei/TabKegiatan.tsx`
- Create: `src/components/organisms/presurvei/KartuProspek.tsx`
- Create: `src/components/organisms/presurvei/TabProspek.tsx`
- Create: `app/(app)/presurvei/index.tsx`
- Modify: `app/(app)/_layout.tsx:1-10` (ikon), `:151-162` (tab `presurvei/index` setelah `dashboard`)
- Modify: `__tests__/app/app-layout-presurvei.test.tsx`
- Test: `__tests__/utils/presurvei/daftarKegiatan.test.ts`, `__tests__/app/presurvei-index.test.tsx`

**Interfaces:**
- Consumes: Task 7 — `rentangHariLokal`, `geserHari`, `isDalamRentang`, `KegiatanMenunggu`; Task 8 — `useKegiatanHarian`, `useKegiatanMenungguKirim`, `useSegarkanPresurveiSetelahSinkron`, `useDaftarProspek`, `FilterDaftarProspek`; Task 12 — `PilihanChip`; Task 13 — `JEDA_CARI_PROSPEK_MS`; `isSameDay`, `formatDate` (`src/utils/date.ts:92,187`); `QueryErrorState` (`src/components/molecules/QueryErrorState.tsx`).
- Produces:
  - `RUTE_CATAT_KEGIATAN = '/(app)/presurvei/kegiatan/catat'`
  - `ruteRincianProspek(id: string): Href` → `{ pathname: '/(app)/presurvei/prospek/[id]', params: { id } }`
  - `ruteCatatFollowUp(prospek: Pick<ProspekListItem, 'id' | 'nama'>): Href` → `{ pathname: RUTE_CATAT_KEGIATAN, params: { prospekId, prospekNama } }`
  - `ruteJadikanCanvasing(id: string): Href` → `{ pathname: '/(app)/presurvei/prospek/[id]/jadikan-canvasing', params: { id } }`
  - `interface BarisKegiatan { kunci: string; jenis: KegiatanJenis; hasil: KegiatanHasil; waktuMulai: string; tempat: string | null; ditemuiNama: string | null; jumlahFoto: number; isMenunggu: boolean }`
  - `keBarisKegiatan(item: KegiatanListItem): BarisKegiatan`
  - `gabungKegiatanHarian(server: readonly KegiatanListItem[], antrean: readonly KegiatanMenunggu[], rentang: RentangTanggalIso): BarisKegiatan[]`
  - `type FilterStatusProspek = ProspekStatus | 'SEMUA'`, `bangunFilterProspek(status: FilterStatusProspek, search: string): FilterDaftarProspek`
  - `KartuKegiatan(props: { baris: BarisKegiatan })` (dipakai Task 15)
  - Route tab `/(app)/presurvei` (`presurvei/index`), `href: null` untuk tab bar bawaan.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// __tests__/utils/presurvei/daftarKegiatan.test.ts
import { describe, expect, it } from '@jest/globals';

import type { KegiatanListItem } from '@/types/presurvei';
import type { KegiatanMenunggu } from '@/utils/presurvei/antreanKegiatan';
import { gabungKegiatanHarian, keBarisKegiatan } from '@/utils/presurvei/daftarKegiatan';
import { bangunFilterProspek } from '@/utils/presurvei/filterProspek';

const RENTANG = { dariTanggal: '2026-09-23T17:00:00.000Z', sampaiTanggal: '2026-09-24T16:59:59.999Z' };

const server = (id: string, waktuMulai: string): KegiatanListItem => ({
  id,
  jenis: 'KUNJUNGAN',
  userId: 'sales-a',
  namaSales: null,
  peranPelaku: null,
  departemenPelaku: null,
  prospekId: null,
  waktuMulai,
  alamatDikunjungi: `Alamat ${id}`,
  ditemuiNama: null,
  latitude: -6.2,
  longitude: 106.8,
  hasil: 'TERTARIK',
  jumlahFoto: 2,
});

const antrean = (idAntrean: number, waktuMulai: string): KegiatanMenunggu => ({
  idAntrean,
  jenis: 'TELEPON',
  hasil: 'TIDAK_MINAT',
  waktuMulai,
  alamatDikunjungi: null,
  ditemuiNama: 'Bu Sari',
  jumlahFoto: 0,
});

describe('gabungKegiatanHarian', () => {
  it('menggabungkan server dan antrean, terbaru lebih dulu, antrean ditandai', () => {
    const baris = gabungKegiatanHarian(
      [server('k-1', '2026-09-24T01:00:00.000Z'), server('k-2', '2026-09-24T05:00:00.000Z')],
      [antrean(9, '2026-09-24T03:00:00.000Z')],
      RENTANG,
    );

    expect(baris.map((b) => [b.kunci, b.isMenunggu])).toEqual([
      ['server-k-2', false],
      ['antrean-9', true],
      ['server-k-1', false],
    ]);
  });

  it('antrean di luar hari yang dilihat tidak ikut', () => {
    const baris = gabungKegiatanHarian([], [antrean(1, '2026-09-23T16:00:00.000Z')], RENTANG);

    expect(baris).toEqual([]);
  });

  it('memetakan item server ke baris daftar', () => {
    expect(keBarisKegiatan(server('k-3', '2026-09-24T02:00:00.000Z'))).toEqual({
      kunci: 'server-k-3',
      jenis: 'KUNJUNGAN',
      hasil: 'TERTARIK',
      waktuMulai: '2026-09-24T02:00:00.000Z',
      tempat: 'Alamat k-3',
      ditemuiNama: null,
      jumlahFoto: 2,
      isMenunggu: false,
    });
  });
});

describe('bangunFilterProspek', () => {
  it('SEMUA dan pencarian kosong tidak mengirim filter', () => {
    expect(bangunFilterProspek('SEMUA', '  ')).toEqual({});
  });

  it('status dan pencarian yang dirapikan', () => {
    expect(bangunFilterProspek('TERTARIK', ' budi ')).toEqual({ status: 'TERTARIK', search: 'budi' });
  });
});
```

```tsx
// __tests__/app/presurvei-index.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockUseKegiatanHarian = jest.fn();
const mockUseAntrean = jest.fn();
const mockUseDaftarProspek = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (nilai: unknown) => nilai }));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({
  useKegiatanHarian: (tanggal: Date) => mockUseKegiatanHarian(tanggal),
  useKegiatanMenungguKirim: () => mockUseAntrean(),
  useSegarkanPresurveiSetelahSinkron: jest.fn(),
}));
jest.mock('@/hooks/queries/usePresurveiProspek', () => ({
  useDaftarProspek: (filter: unknown) => mockUseDaftarProspek(filter),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const sekarangIso = () => new Date().toISOString();

describe('Tab Presurvei', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKegiatanHarian.mockReturnValue({
      data: {
        data: [{
          id: 'k-1', jenis: 'KUNJUNGAN', userId: 'sales-a', namaSales: null, peranPelaku: null,
          departemenPelaku: null, prospekId: null, waktuMulai: sekarangIso(), alamatDikunjungi: 'Jl. Melati 9',
          ditemuiNama: 'Pak Joko', latitude: -6.2, longitude: 106.8, hasil: 'TERTARIK', jumlahFoto: 1,
        }],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
      isError: false, isPending: false, isRefetching: false, refetch: jest.fn(),
    });
    mockUseAntrean.mockReturnValue({
      data: [{ idAntrean: 5, jenis: 'TELEPON', hasil: 'TIDAK_MINAT', waktuMulai: sekarangIso(), alamatDikunjungi: null, ditemuiNama: 'Bu Sari', jumlahFoto: 0 }],
      refetch: jest.fn(),
    });
    mockUseDaftarProspek.mockReturnValue({
      data: { pages: [{ data: [{ id: 'p-1', nama: 'Budi Santoso', noTelp: '081234567890', alamat: 'Jl. Kenanga', sumber: 'LAPANGAN', status: 'TERTARIK', pemilikId: 'sales-a', namaPemilik: null, paketDiminati: null, canvasingId: null, createdAt: sekarangIso() }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }] },
      hasNextPage: false, isFetchingNextPage: false, isPending: false, isError: false, isRefetching: false,
      fetchNextPage: jest.fn(), refetch: jest.fn(),
    });
  });

  const renderLayar = () => {
    const Layar = require('../../app/(app)/presurvei/index').default;
    return render(<Layar />);
  };

  it('menandai kegiatan yang masih di antrean sebagai Menunggu kirim', () => {
    const { getAllByText, getByText } = renderLayar();

    expect(getByText('Pak Joko')).toBeTruthy();
    expect(getByText('Bu Sari')).toBeTruthy();
    expect(getAllByText('Menunggu kirim')).toHaveLength(1);
  });

  it('Catat Kegiatan membuka form catat', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Catat Kegiatan'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/presurvei/kegiatan/catat');
  });

  it('menggeser tanggal meminta kegiatan hari sebelumnya', () => {
    const { getByLabelText } = renderLayar();
    const kemarin = new Date();
    kemarin.setDate(kemarin.getDate() - 1);

    fireEvent.press(getByLabelText('Hari sebelumnya'));

    const tanggalTerakhir = mockUseKegiatanHarian.mock.calls.at(-1)?.[0] as Date;
    expect(tanggalTerakhir.toDateString()).toBe(kemarin.toDateString());
  });

  it('tab Prospek menyaring status dan pencarian', () => {
    const { getByText, getByLabelText, getByRole } = renderLayar();

    fireEvent.press(getByText('Prospek'));
    // Chip dipilih lewat role: label "Tertarik" juga tampil di kartu prospek.
    fireEvent.press(getByRole('button', { name: 'Tertarik' }));
    fireEvent.changeText(getByLabelText('Cari prospek'), 'budi');

    expect(mockUseDaftarProspek).toHaveBeenLastCalledWith({ status: 'TERTARIK', search: 'budi' });
  });

  it('menekan prospek membuka rinciannya', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Prospek'));
    fireEvent.press(getByText('Budi Santoso'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/prospek/[id]',
      params: { id: 'p-1' },
    });
  });
});
```

Di `__tests__/app/app-layout-presurvei.test.tsx`, ubah konstanta menjadi:

```tsx
const RUTE_PRESURVEI_TERSEMBUNYI = ['presurvei/index', 'presurvei/kegiatan/catat'];
```

dan tambahkan test ini di dalam `describe`:

```tsx
  it('tab Presurvei memakai judul Presurvei dan terkunci tanpa m_presurvei', () => {
    const { Alert } = require('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const preventDefault = jest.fn();
    renderLayout({ ...TEKNISI, features: ['m_dashboard'] });

    layar('presurvei/index')?.listeners?.tabPress?.({ preventDefault });

    expect(layar('presurvei/index')?.options?.title).toBe('Presurvei');
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith('Akses Terbatas', expect.any(String), expect.any(Array));
    alert.mockRestore();
  });
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/presurvei/daftarKegiatan.test.ts __tests__/app/presurvei-index.test.tsx __tests__/app/app-layout-presurvei.test.tsx`
Expected: FAIL — modul belum ada; `mendaftarkan presurvei/index tanpa tab` gagal (`layar` undefined).

- [ ] **Step 3: Implementasi utilitas dan rute**

```ts
// src/constants/rutePresurvei.ts
import type { Href } from 'expo-router';

import type { ProspekListItem } from '@/types/presurvei';

/** Layar catat kegiatan (`app/(app)/presurvei/kegiatan/catat.tsx`). */
export const RUTE_CATAT_KEGIATAN = '/(app)/presurvei/kegiatan/catat';

/** Rincian satu prospek. */
export function ruteRincianProspek(id: string): Href {
  return { pathname: '/(app)/presurvei/prospek/[id]', params: { id } } as Href;
}

/** Form catat kegiatan dengan prospek terpilih ("Catat Follow-up"). */
export function ruteCatatFollowUp(prospek: Pick<ProspekListItem, 'id' | 'nama'>): Href {
  return {
    pathname: RUTE_CATAT_KEGIATAN,
    params: { prospekId: prospek.id, prospekNama: prospek.nama },
  } as Href;
}

/** Form Jadikan Canvasing untuk satu prospek. */
export function ruteJadikanCanvasing(id: string): Href {
  return { pathname: '/(app)/presurvei/prospek/[id]/jadikan-canvasing', params: { id } } as Href;
}
```

```ts
// src/utils/presurvei/daftarKegiatan.ts
import type { KegiatanHasil, KegiatanJenis } from '@/constants/presurvei';
import type { KegiatanListItem } from '@/types/presurvei';
import type { KegiatanMenunggu } from './antreanKegiatan';
import { isDalamRentang, type RentangTanggalIso } from './rentangHari';

/** Satu baris daftar kegiatan, dari server maupun dari antrean offline. */
export interface BarisKegiatan {
  kunci: string;
  jenis: KegiatanJenis;
  hasil: KegiatanHasil;
  waktuMulai: string;
  tempat: string | null;
  ditemuiNama: string | null;
  jumlahFoto: number;
  isMenunggu: boolean;
}

/** Baris daftar dari item kegiatan server. */
export function keBarisKegiatan(item: KegiatanListItem): BarisKegiatan {
  return {
    kunci: `server-${item.id}`,
    jenis: item.jenis,
    hasil: item.hasil,
    waktuMulai: item.waktuMulai,
    tempat: item.alamatDikunjungi,
    ditemuiNama: item.ditemuiNama,
    jumlahFoto: item.jumlahFoto,
    isMenunggu: false,
  };
}

function dariAntrean(kegiatan: KegiatanMenunggu): BarisKegiatan {
  return {
    kunci: `antrean-${kegiatan.idAntrean}`,
    jenis: kegiatan.jenis,
    hasil: kegiatan.hasil,
    waktuMulai: kegiatan.waktuMulai,
    tempat: kegiatan.alamatDikunjungi,
    ditemuiNama: kegiatan.ditemuiNama,
    jumlahFoto: kegiatan.jumlahFoto,
    isMenunggu: true,
  };
}

/** Kegiatan satu hari: server + antrean pada hari itu, terbaru lebih dulu. */
export function gabungKegiatanHarian(
  server: readonly KegiatanListItem[],
  antrean: readonly KegiatanMenunggu[],
  rentang: RentangTanggalIso,
): BarisKegiatan[] {
  const menunggu = antrean.filter((kegiatan) => isDalamRentang(kegiatan.waktuMulai, rentang)).map(dariAntrean);
  return [...menunggu, ...server.map(keBarisKegiatan)].sort(
    (a, b) => Date.parse(b.waktuMulai) - Date.parse(a.waktuMulai),
  );
}
```

```ts
// src/utils/presurvei/filterProspek.ts
import type { ProspekStatus } from '@/constants/presurvei';
import type { FilterDaftarProspek } from '@/hooks/queries/usePresurveiProspek';

/** Pilihan filter status di layar; SEMUA berarti tanpa filter. */
export type FilterStatusProspek = ProspekStatus | 'SEMUA';

/** Filter daftar prospek tanpa kunci kosong (query key dan query string bersih). */
export function bangunFilterProspek(status: FilterStatusProspek, search: string): FilterDaftarProspek {
  const cari = search.trim();
  return {
    ...(status === 'SEMUA' ? {} : { status }),
    ...(cari === '' ? {} : { search: cari }),
  };
}
```

- [ ] **Step 4: Implementasi komponen dan layar**

```tsx
// src/components/molecules/NavigasiTanggal.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { formatDate, isSameDay } from '@/utils/date';

interface NavigasiTanggalProps {
  tanggal: Date;
  onGeser: (jumlahHari: number) => void;
}

/** Navigasi per hari; tidak bisa maju melewati hari ini. */
export function NavigasiTanggal({ tanggal, onGeser }: NavigasiTanggalProps) {
  const isHariIni = isSameDay(tanggal, new Date());
  return (
    <View style={tw`flex-row items-center justify-between px-4 mb-3`}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Hari sebelumnya" onPress={() => onGeser(-1)} style={tw`p-2`}>
        <ChevronLeft size={20} color="#374151" />
      </TouchableOpacity>
      <Text style={tw`font-semibold text-gray-900`}>{isHariIni ? 'Hari ini' : formatDate(tanggal, 'dd MMM yyyy')}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Hari berikutnya"
        accessibilityState={{ disabled: isHariIni }}
        disabled={isHariIni}
        onPress={() => onGeser(1)}
        style={tw`p-2`}
      >
        <ChevronRight size={20} color={isHariIni ? '#d1d5db' : '#374151'} />
      </TouchableOpacity>
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/KartuKegiatan.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_HASIL_KEGIATAN, LABEL_JENIS_KEGIATAN } from '@/constants/presurvei';
import { formatDate } from '@/utils/date';
import type { BarisKegiatan } from '@/utils/presurvei/daftarKegiatan';

interface KartuKegiatanProps {
  baris: BarisKegiatan;
}

/** Satu kegiatan di daftar: jenis, jam, tempat/yang ditemui, hasil, status kirim. */
export function KartuKegiatan({ baris }: KartuKegiatanProps) {
  return (
    <View style={tw`bg-white rounded-xl p-3 mb-2 border border-gray-100`}>
      <View style={tw`flex-row justify-between`}>
        <Text style={tw`font-semibold text-gray-900`}>{LABEL_JENIS_KEGIATAN[baris.jenis]}</Text>
        <Text style={tw`text-xs text-gray-500`}>{formatDate(baris.waktuMulai, 'HH:mm')}</Text>
      </View>
      {baris.ditemuiNama !== null ? <Text style={tw`text-sm text-gray-700`}>{baris.ditemuiNama}</Text> : null}
      {baris.tempat !== null ? <Text style={tw`text-xs text-gray-500`} numberOfLines={1}>{baris.tempat}</Text> : null}
      <View style={tw`flex-row items-center justify-between mt-1`}>
        <Text style={tw`text-xs text-blue-700`}>{LABEL_HASIL_KEGIATAN[baris.hasil]}</Text>
        {baris.isMenunggu ? (
          <Text style={tw`text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5`}>Menunggu kirim</Text>
        ) : null}
      </View>
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/TabKegiatan.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { NavigasiTanggal } from '@/components/molecules/NavigasiTanggal';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { RUTE_CATAT_KEGIATAN } from '@/constants/rutePresurvei';
import { useKegiatanHarian, useKegiatanMenungguKirim } from '@/hooks/queries/usePresurveiKegiatan';
import { gabungKegiatanHarian } from '@/utils/presurvei/daftarKegiatan';
import { geserHari, rentangHariLokal } from '@/utils/presurvei/rentangHari';
import { KartuKegiatan } from './KartuKegiatan';

/** Sub-tab Kegiatan: daftar per tanggal, termasuk yang masih menunggu kirim. */
export function TabKegiatan() {
  const router = useRouter();
  const [tanggal, setTanggal] = useState(() => new Date());
  const kegiatan = useKegiatanHarian(tanggal);
  const antrean = useKegiatanMenungguKirim();
  const baris = gabungKegiatanHarian(kegiatan.data?.data ?? [], antrean.data ?? [], rentangHariLokal(tanggal));
  const segarkan = () => {
    void kegiatan.refetch();
    void antrean.refetch();
  };

  return (
    <View style={tw`flex-1`}>
      <NavigasiTanggal tanggal={tanggal} onGeser={(jumlah) => setTanggal((lama) => geserHari(lama, jumlah))} />
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push(RUTE_CATAT_KEGIATAN)} style={tw`mx-4 mb-3 bg-blue-600 rounded-xl py-3 items-center`}>
        <Text style={tw`text-white font-bold`}>Catat Kegiatan</Text>
      </TouchableOpacity>
      {kegiatan.isError ? (
        <QueryErrorState message="Kegiatan gagal dimuat." onRetry={segarkan} />
      ) : (
        <FlatList
          data={baris}
          keyExtractor={(item) => item.kunci}
          renderItem={({ item }) => <KartuKegiatan baris={item} />}
          contentContainerStyle={tw`px-4 pb-24`}
          refreshControl={<RefreshControl refreshing={kegiatan.isRefetching} onRefresh={segarkan} />}
          ListEmptyComponent={
            kegiatan.isPending ? <ActivityIndicator /> : <Text style={tw`text-center text-gray-500 mt-8`}>Belum ada kegiatan di tanggal ini.</Text>
          }
        />
      )}
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/KartuProspek.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekListItem } from '@/types/presurvei';

interface KartuProspekProps {
  prospek: ProspekListItem;
  onBuka: (id: string) => void;
}

/** Satu prospek di daftar. */
export function KartuProspek({ prospek, onBuka }: KartuProspekProps) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={() => onBuka(prospek.id)} style={tw`bg-white rounded-xl p-3 mb-2 border border-gray-100`}>
      <View style={tw`flex-row justify-between`}>
        <Text style={tw`font-semibold text-gray-900 flex-1`}>{prospek.nama}</Text>
        <Text style={tw`text-xs text-blue-700`}>{LABEL_STATUS_PROSPEK[prospek.status]}</Text>
      </View>
      <Text style={tw`text-xs text-gray-500`}>{prospek.noTelp}</Text>
      <Text style={tw`text-xs text-gray-500`} numberOfLines={1}>{prospek.alamat}</Text>
    </TouchableOpacity>
  );
}
```

```tsx
// src/components/organisms/presurvei/TabProspek.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import tw from 'twrnc';

import { PilihanChip } from '@/components/molecules/PilihanChip';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { JEDA_CARI_PROSPEK_MS, LABEL_STATUS_PROSPEK, PROSPEK_STATUSES } from '@/constants/presurvei';
import { ruteRincianProspek } from '@/constants/rutePresurvei';
import { useDaftarProspek } from '@/hooks/queries/usePresurveiProspek';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { bangunFilterProspek, type FilterStatusProspek } from '@/utils/presurvei/filterProspek';
import { KartuProspek } from './KartuProspek';

const OPSI_STATUS: { nilai: FilterStatusProspek; label: string }[] = [
  { nilai: 'SEMUA', label: 'Semua' },
  ...PROSPEK_STATUSES.map((status) => ({ nilai: status, label: LABEL_STATUS_PROSPEK[status] })),
];

/** Sub-tab Prospek: daftar prospek milik sendiri per status, dengan pencarian. */
export function TabProspek() {
  const router = useRouter();
  const [status, setStatus] = useState<FilterStatusProspek>('SEMUA');
  const [cari, setCari] = useState('');
  const cariTertunda = useDebouncedValue(cari, JEDA_CARI_PROSPEK_MS);
  const daftar = useDaftarProspek(bangunFilterProspek(status, cariTertunda));
  const prospek = daftar.data?.pages.flatMap((halaman) => halaman.data) ?? [];

  return (
    <View style={tw`flex-1 px-4`}>
      <TextInput accessibilityLabel="Cari prospek" value={cari} onChangeText={setCari} placeholder="Cari nama atau nomor HP" style={tw`bg-white border border-gray-300 rounded-xl px-3 py-2 mb-2`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-2 flex-grow-0`}>
        <PilihanChip opsi={OPSI_STATUS} terpilih={status} onPilih={setStatus} />
      </ScrollView>
      {daftar.isError ? (
        <QueryErrorState message="Prospek gagal dimuat." onRetry={() => void daftar.refetch()} />
      ) : (
        <FlatList
          data={prospek}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <KartuProspek prospek={item} onBuka={(id) => router.push(ruteRincianProspek(id))} />}
          onEndReached={() => { if (daftar.hasNextPage && !daftar.isFetchingNextPage) void daftar.fetchNextPage(); }}
          refreshControl={<RefreshControl refreshing={daftar.isRefetching} onRefresh={() => void daftar.refetch()} />}
          contentContainerStyle={tw`pb-24`}
          ListEmptyComponent={<Text style={tw`text-center text-gray-500 mt-8`}>{daftar.isPending ? 'Memuat…' : 'Belum ada prospek.'}</Text>}
        />
      )}
    </View>
  );
}
```

```tsx
// app/(app)/presurvei/index.tsx
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { PilihanChip } from '@/components/molecules/PilihanChip';
import { TabKegiatan } from '@/components/organisms/presurvei/TabKegiatan';
import { TabProspek } from '@/components/organisms/presurvei/TabProspek';
import { AppFeature } from '@/constants/features';
import { useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';

type SubTabPresurvei = 'kegiatan' | 'prospek';

const OPSI_SUB_TAB: { nilai: SubTabPresurvei; label: string }[] = [
  { nilai: 'kegiatan', label: 'Kegiatan' },
  { nilai: 'prospek', label: 'Prospek' },
];

/** Tab Presurvei: sub-tab Kegiatan dan Prospek milik sendiri. */
export default function PresurveiScreen() {
  useFeatureGuard(AppFeature.PRESURVEI);
  useSegarkanPresurveiSetelahSinkron();
  const [subTab, setSubTab] = useState<SubTabPresurvei>('kegiatan');

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <Text style={tw`text-xl font-bold text-gray-900 px-4 pt-4 pb-2`}>Presurvei</Text>
      <View style={tw`px-4 mb-3`}>
        <PilihanChip opsi={OPSI_SUB_TAB} terpilih={subTab} onPilih={setSubTab} />
      </View>
      {subTab === 'kegiatan' ? <TabKegiatan /> : <TabProspek />}
    </SafeAreaView>
  );
}
```

Di `app/(app)/_layout.tsx`: tambah `ClipboardCheck` ke impor `lucide-react-native` (baris 2-10), lalu sisipkan tepat setelah `Tabs.Screen` `dashboard` (setelah baris 162):

```tsx
        {/* Presurvei — tampil hanya di KaryawanSalesTabBar (Task 17); teknisi membukanya dari menu cepat. */}
        <Tabs.Screen
          name="presurvei/index"
          options={{
            title: "Presurvei",
            href: null,
            tabBarIcon: ({ color }) => (
              <ClipboardCheck size={24} color={getIconColor(color, AppFeature.PRESURVEI)} />
            ),
          }}
          listeners={{
            tabPress: (e) => handleTabPress(e, AppFeature.PRESURVEI),
          }}
        />
```

- [ ] **Step 5: Jalankan test dan typecheck**

Run: `npx jest __tests__/utils/presurvei/daftarKegiatan.test.ts __tests__/app/presurvei-index.test.tsx __tests__/app/app-layout-presurvei.test.tsx __tests__/app/app-layout-logging.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit && npx expo lint`
Expected: exit 0.

- [ ] **Step 6: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `sort` dengan `a − b` (terlama dulu) | "menggabungkan server dan antrean, terbaru lebih dulu…" |
| Hapus filter `isDalamRentang` pada antrean | "antrean di luar hari yang dilihat tidak ikut" |
| `tempat: item.ditemuiNama` | "memetakan item server ke baris daftar" |
| `bangunFilterProspek` tidak `trim` | "status dan pencarian yang dirapikan" |
| `isMenunggu: false` di `dariAntrean` | "menandai kegiatan yang masih di antrean sebagai Menunggu kirim" |
| `onGeser(-1)` jadi `onGeser(1)` di tombol sebelumnya | "menggeser tanggal meminta kegiatan hari sebelumnya" |
| `ruteRincianProspek` memakai `params: { prospekId: id }` | "menekan prospek membuka rinciannya" |
| Hapus `Tabs.Screen` `presurvei/index` | "mendaftarkan presurvei/index tanpa tab" |
| Listener `presurvei/index` memakai `AppFeature.DASHBOARD` | "tab Presurvei memakai judul Presurvei dan terkunci tanpa m_presurvei" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 7: Commit**

```bash
git add src/constants/rutePresurvei.ts src/utils/presurvei/daftarKegiatan.ts src/utils/presurvei/filterProspek.ts src/components/molecules/NavigasiTanggal.tsx src/components/organisms/presurvei/KartuKegiatan.tsx src/components/organisms/presurvei/TabKegiatan.tsx src/components/organisms/presurvei/KartuProspek.tsx src/components/organisms/presurvei/TabProspek.tsx "app/(app)/presurvei/index.tsx" "app/(app)/_layout.tsx" __tests__/utils/presurvei/daftarKegiatan.test.ts __tests__/app/presurvei-index.test.tsx __tests__/app/app-layout-presurvei.test.tsx
git commit -m "$(cat <<'EOF'
feat(presurvei): tab presurvei dengan daftar kegiatan dan prospek

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Rincian prospek dan Ubah Status

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/hooks/presurvei/useUbahStatusProspek.ts`
- Create: `src/components/molecules/TombolAksi.tsx`
- Create: `src/components/organisms/presurvei/KartuRincianProspek.tsx`
- Create: `src/components/organisms/presurvei/RiwayatKegiatanProspek.tsx`
- Create: `src/components/organisms/presurvei/PilihStatusProspekModal.tsx`
- Create: `src/components/organisms/presurvei/AksiProspek.tsx`
- Create: `app/(app)/presurvei/prospek/[id]/index.tsx`
- Modify: `app/(app)/_layout.tsx` (daftarkan route tersembunyi, setelah `presurvei/kegiatan/catat`)
- Modify: `__tests__/app/app-layout-presurvei.test.tsx`
- Test: `__tests__/hooks/useUbahStatusProspek.test.tsx`, `__tests__/app/presurvei-rincian-prospek.test.tsx`

**Interfaces:**
- Consumes: Task 6 — `daftarPilihanUbahStatus`, `isBolehJadikanCanvasing`, `AksiUbahStatus`, `PilihanUbahStatus`; Task 7 — `PresurveiService.ubahStatusProspek`; Task 8 — `useRincianProspek`, `useKegiatanProspek`, `useIsOnline`; Task 14 — `ruteCatatFollowUp`, `ruteJadikanCanvasing`, `keBarisKegiatan`, `KartuKegiatan`.
- Produces:
  - Route `/(app)/presurvei/prospek/[id]`.
  - `useUbahStatusProspek(prospekId: string)` → `UseMutationResult<ProspekDetail, unknown, ProspekStatus>`; sukses menyegarkan `['presurvei']`.
  - `TombolAksi(props: { label: string; onPress: () => void; isAktif: boolean; varian?: 'utama' | 'kedua' })`
  - `AksiProspek(props: { prospek: ProspekDetail; isOnline: boolean; isMenyimpan: boolean; onCatatFollowUp: () => void; onUbahStatus: () => void; onJadikanCanvasing: () => void })`
  - `PilihStatusProspekModal(props: { pilihan: PilihanUbahStatus[]; onPilih: (aksi: AksiUbahStatus) => void; onTutup: () => void })`
  - `TEKS_BUTUH_ONLINE = 'Ubah Status dan Jadikan Canvasing butuh koneksi internet.'`

- [ ] **Step 1: Tulis test yang gagal**

```tsx
// __tests__/hooks/useUbahStatusProspek.test.tsx
import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUbahStatus = jest.fn<(id: string, status: string) => Promise<unknown>>();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: { ubahStatusProspek: (id: string, status: string) => mockUbahStatus(id, status) },
}));
const mockSukses = jest.fn();
const mockGalat = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentSuccessMessage: (...a: unknown[]) => mockSukses(...a),
  presentAppError: (...a: unknown[]) => mockGalat(...a),
}));

import { useUbahStatusProspek } from '@/hooks/presurvei/useUbahStatusProspek';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useUbahStatusProspek', () => {
  it('mengirim status untuk prospek itu lalu menyegarkan data presurvei', async () => {
    mockUbahStatus.mockResolvedValue({ id: 'p-1', status: 'NEGOSIASI' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('NEGOSIASI');
    });

    expect(mockUbahStatus).toHaveBeenCalledWith('p-1', 'NEGOSIASI');
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(mockSukses).toHaveBeenCalledWith('Status prospek diperbarui');
    client.clear();
  });

  it('menampilkan galat server dan tidak menyegarkan apa pun', async () => {
    const galat = { isAxiosError: true, response: { status: 409 } };
    mockUbahStatus.mockRejectedValue(galat);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('DEAL').catch(() => undefined);
    });

    expect(mockGalat).toHaveBeenCalledWith(galat, expect.objectContaining({ screen: 'RincianProspek' }));
    expect(invalidasi).not.toHaveBeenCalled();
    client.clear();
  });
});
```

```tsx
// __tests__/app/presurvei-rincian-prospek.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { ProspekDetail } from '@/types/presurvei';

const mockPush = jest.fn();
const mockUbah = jest.fn();
let mockProspek: ProspekDetail;
let mockIsOnline = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'p-1' }),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/hooks/queries/usePresurveiProspek', () => ({
  useRincianProspek: () => ({ data: mockProspek, isPending: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => mockIsOnline }));
jest.mock('@/hooks/presurvei/useUbahStatusProspek', () => ({
  useUbahStatusProspek: () => ({ mutate: mockUbah, isPending: false }),
}));
jest.mock('@/components/organisms/presurvei/RiwayatKegiatanProspek', () => ({ RiwayatKegiatanProspek: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const prospek = (over: Partial<ProspekDetail>): ProspekDetail => ({
  id: 'p-1',
  nama: 'Budi Santoso',
  noTelp: '081234567890',
  alamat: 'Jl. Kenanga 1',
  sumber: 'LAPANGAN',
  status: 'TERTARIK',
  pemilikId: 'sales-a',
  namaPemilik: null,
  paketDiminati: null,
  canvasingId: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  email: null,
  latitude: null,
  longitude: null,
  shareloc: null,
  iklanId: null,
  registrationId: null,
  referralNama: null,
  catatan: null,
  konversiAt: null,
  isSiapDipromosikan: false,
  updatedAt: '2026-09-20T00:00:00.000Z',
  ...over,
});

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/prospek/[id]/index').default;
  return render(<Layar />);
};

describe('Rincian prospek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProspek = prospek({});
    mockIsOnline = true;
  });

  it('Ubah Status hanya menawarkan transisi sah', () => {
    const { getByText, queryByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));

    expect(getByText('Negosiasi')).toBeTruthy();
    expect(getByText('Tidak minat')).toBeTruthy();
    expect(getByText('Tidak layak')).toBeTruthy();
    expect(queryByText('Deal')).toBeNull();
    expect(queryByText('Baru')).toBeNull();
  });

  it('memilih Negosiasi mengirim status itu', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));
    fireEvent.press(getByText('Negosiasi'));

    expect(mockUbah).toHaveBeenCalledWith('NEGOSIASI');
  });

  it('memilih Deal membuka form Jadikan Canvasing, bukan menulis status', () => {
    mockProspek = prospek({ status: 'NEGOSIASI' });
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));
    fireEvent.press(getByText('Deal'));

    expect(mockUbah).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/prospek/[id]/jadikan-canvasing',
      params: { id: 'p-1' },
    });
  });

  it('offline menonaktifkan Ubah Status dan menampilkan alasannya', () => {
    mockIsOnline = false;
    const { getByText, getByRole, queryByText } = renderLayar();

    fireEvent.press(getByText('Ubah Status'));

    expect(queryByText('Negosiasi')).toBeNull();
    expect(getByRole('button', { name: 'Ubah Status' }).props.accessibilityState).toEqual({ disabled: true });
    expect(getByText('Ubah Status dan Jadikan Canvasing butuh koneksi internet.')).toBeTruthy();
  });

  it('Jadikan Canvasing hanya untuk Deal yang belum punya canvasing', () => {
    mockProspek = prospek({ status: 'DEAL' });
    const deal = renderLayar();
    expect(deal.getByText('Jadikan Canvasing')).toBeTruthy();
    deal.unmount();

    mockProspek = prospek({ status: 'DEAL', canvasingId: 'cv-1' });
    const sudah = renderLayar();
    expect(sudah.queryByText('Jadikan Canvasing')).toBeNull();
  });

  it('Catat Follow-up membawa prospek ke form catat', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Catat Follow-up'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/kegiatan/catat',
      params: { prospekId: 'p-1', prospekNama: 'Budi Santoso' },
    });
  });
});
```

Di `__tests__/app/app-layout-presurvei.test.tsx`, ubah konstanta menjadi:

```tsx
const RUTE_PRESURVEI_TERSEMBUNYI = [
  'presurvei/index',
  'presurvei/kegiatan/catat',
  'presurvei/prospek/[id]/index',
];
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/hooks/useUbahStatusProspek.test.tsx __tests__/app/presurvei-rincian-prospek.test.tsx __tests__/app/app-layout-presurvei.test.tsx`
Expected: FAIL — modul dan route belum ada.

- [ ] **Step 3: Implementasi hook dan molekul**

```ts
// src/hooks/presurvei/useUbahStatusProspek.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { presentAppError, presentSuccessMessage } from '@/utils/errorPresenter';

const PESAN_STATUS_DIUBAH = 'Status prospek diperbarui';

/**
 * Ubah status prospek. Sengaja TIDAK memakai antrean offline: transisi
 * bergantung pada status server terkini, dan transisi yang diantre bisa
 * sudah tidak sah saat terkirim (spec §4.3). Server menolak yang tak sah (409).
 */
export function useUbahStatusProspek(prospekId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ProspekStatus) => PresurveiService.ubahStatusProspek(prospekId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
      presentSuccessMessage(PESAN_STATUS_DIUBAH);
    },
    onError: (error) => {
      presentAppError(error, { screen: 'RincianProspek', source: 'mutation' });
    },
  });
}
```

```tsx
// src/components/molecules/TombolAksi.tsx
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

interface TombolAksiProps {
  label: string;
  onPress: () => void;
  isAktif: boolean;
  varian?: 'utama' | 'kedua';
}

/** Tombol aksi lebar penuh; nonaktif tampil abu-abu dan tidak bisa ditekan. */
export function TombolAksi({ label, onPress, isAktif, varian = 'utama' }: TombolAksiProps) {
  const warna = !isAktif ? 'bg-gray-300' : varian === 'utama' ? 'bg-blue-600' : 'bg-white border border-blue-600';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isAktif }}
      disabled={!isAktif}
      onPress={onPress}
      style={tw`rounded-xl py-3 items-center mb-2 ${warna}`}
    >
      <Text style={tw`font-bold ${varian === 'kedua' && isAktif ? 'text-blue-600' : 'text-white'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 4: Implementasi organisme dan layar**

```tsx
// src/components/organisms/presurvei/KartuRincianProspek.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekDetail } from '@/types/presurvei';

interface KartuRincianProspekProps {
  prospek: ProspekDetail;
}

/** Kontak dan status prospek. */
export function KartuRincianProspek({ prospek }: KartuRincianProspekProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 m-4 border border-gray-100`}>
      <Text style={tw`text-lg font-bold text-gray-900`}>{prospek.nama}</Text>
      <Text style={tw`text-sm text-blue-700 mb-2`}>{LABEL_STATUS_PROSPEK[prospek.status]}</Text>
      <Text style={tw`text-sm text-gray-700`}>{prospek.noTelp}</Text>
      <Text style={tw`text-sm text-gray-700`}>{prospek.alamat}</Text>
      {prospek.paketDiminati !== null ? <Text style={tw`text-sm text-gray-500 mt-1`}>{`Paket: ${prospek.paketDiminati}`}</Text> : null}
      {prospek.catatan !== null ? <Text style={tw`text-sm text-gray-500 mt-1`}>{prospek.catatan}</Text> : null}
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/RiwayatKegiatanProspek.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { useKegiatanProspek } from '@/hooks/queries/usePresurveiKegiatan';
import { keBarisKegiatan } from '@/utils/presurvei/daftarKegiatan';
import { KartuKegiatan } from './KartuKegiatan';

interface RiwayatKegiatanProspekProps {
  prospekId: string;
}

/** Riwayat kegiatan yang tertaut ke prospek, terbaru lebih dulu. */
export function RiwayatKegiatanProspek({ prospekId }: RiwayatKegiatanProspekProps) {
  const riwayat = useKegiatanProspek(prospekId);
  const baris = (riwayat.data?.data ?? []).map(keBarisKegiatan);
  return (
    <View style={tw`px-4 pb-24`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Riwayat kegiatan</Text>
      {riwayat.isError ? <Text style={tw`text-sm text-red-600`}>Riwayat gagal dimuat.</Text> : null}
      {baris.length === 0 && !riwayat.isPending ? <Text style={tw`text-sm text-gray-500`}>Belum ada kegiatan.</Text> : null}
      {baris.map((item) => <KartuKegiatan key={item.kunci} baris={item} />)}
    </View>
  );
}
```

```tsx
// src/components/organisms/presurvei/PilihStatusProspekModal.tsx
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { AksiUbahStatus, PilihanUbahStatus } from '@/utils/presurvei/aturanPresurvei';

interface PilihStatusProspekModalProps {
  pilihan: PilihanUbahStatus[];
  onPilih: (aksi: AksiUbahStatus) => void;
  onTutup: () => void;
}

/** Lembar Ubah Status: hanya transisi sah (`daftarPilihanUbahStatus`). Dirender saat dibuka. */
export function PilihStatusProspekModal({ pilihan, onPilih, onTutup }: PilihStatusProspekModalProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onTutup}>
      <View style={tw`flex-1 justify-end bg-black/40`}>
        <View style={tw`bg-white rounded-t-2xl p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Ubah Status</Text>
          {pilihan.map(({ tujuan, aksi }) => (
            <TouchableOpacity key={tujuan} accessibilityRole="button" onPress={() => onPilih(aksi)} style={tw`py-3 border-b border-gray-100`}>
              <Text style={tw`text-gray-900`}>{LABEL_STATUS_PROSPEK[tujuan]}</Text>
              {aksi.jenis === 'buka-konversi' ? <Text style={tw`text-xs text-gray-500`}>Lanjut ke form Jadikan Canvasing</Text> : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity accessibilityRole="button" onPress={onTutup} style={tw`py-3 items-center`}>
            <Text style={tw`text-gray-500`}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

```tsx
// src/components/organisms/presurvei/AksiProspek.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { TombolAksi } from '@/components/molecules/TombolAksi';
import type { ProspekDetail } from '@/types/presurvei';
import { daftarPilihanUbahStatus, isBolehJadikanCanvasing } from '@/utils/presurvei/aturanPresurvei';

/** Alasan aksi status dinonaktifkan saat offline. */
export const TEKS_BUTUH_ONLINE = 'Ubah Status dan Jadikan Canvasing butuh koneksi internet.';

interface AksiProspekProps {
  prospek: ProspekDetail;
  isOnline: boolean;
  isMenyimpan: boolean;
  onCatatFollowUp: () => void;
  onUbahStatus: () => void;
  onJadikanCanvasing: () => void;
}

/** Aksi rincian prospek. Catat Follow-up tetap bisa offline (antrean); dua aksi lain tidak. */
export function AksiProspek(props: AksiProspekProps) {
  const { prospek, isOnline, isMenyimpan, onCatatFollowUp, onUbahStatus, onJadikanCanvasing } = props;
  const isAdaPilihan = daftarPilihanUbahStatus(prospek.status).length > 0;
  return (
    <View style={tw`px-4 mb-4`}>
      <TombolAksi label="Catat Follow-up" onPress={onCatatFollowUp} isAktif />
      <TombolAksi label="Ubah Status" varian="kedua" onPress={onUbahStatus} isAktif={isOnline && isAdaPilihan && !isMenyimpan} />
      {isBolehJadikanCanvasing(prospek) ? (
        <TombolAksi label="Jadikan Canvasing" onPress={onJadikanCanvasing} isAktif={isOnline} />
      ) : null}
      {!isOnline ? <Text style={tw`text-xs text-amber-700`}>{TEKS_BUTUH_ONLINE}</Text> : null}
    </View>
  );
}
```

```tsx
// app/(app)/presurvei/prospek/[id]/index.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { AksiProspek } from '@/components/organisms/presurvei/AksiProspek';
import { KartuRincianProspek } from '@/components/organisms/presurvei/KartuRincianProspek';
import { PilihStatusProspekModal } from '@/components/organisms/presurvei/PilihStatusProspekModal';
import { RiwayatKegiatanProspek } from '@/components/organisms/presurvei/RiwayatKegiatanProspek';
import { AppFeature } from '@/constants/features';
import { ruteCatatFollowUp, ruteJadikanCanvasing } from '@/constants/rutePresurvei';
import { useUbahStatusProspek } from '@/hooks/presurvei/useUbahStatusProspek';
import { useRincianProspek } from '@/hooks/queries/usePresurveiProspek';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { useIsOnline } from '@/hooks/useIsOnline';
import { daftarPilihanUbahStatus, type AksiUbahStatus } from '@/utils/presurvei/aturanPresurvei';

/** Rincian prospek: kontak, status, riwayat kegiatan, dan aksinya. */
export default function RincianProspekScreen() {
  useFeatureGuard(AppFeature.PRESURVEI);
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const rincian = useRincianProspek(id);
  const isOnline = useIsOnline();
  const ubahStatus = useUbahStatusProspek(id);
  const [isPilihStatusTerbuka, setIsPilihStatusTerbuka] = useState(false);

  if (rincian.isPending) return <ActivityIndicator style={tw`mt-10`} />;
  if (rincian.isError || !rincian.data) {
    return <QueryErrorState message="Rincian prospek gagal dimuat." onRetry={() => void rincian.refetch()} />;
  }
  const prospek = rincian.data;
  const pilihAksi = (aksi: AksiUbahStatus) => {
    setIsPilihStatusTerbuka(false);
    if (aksi.jenis === 'buka-konversi') {
      router.push(ruteJadikanCanvasing(prospek.id));
      return;
    }
    ubahStatus.mutate(aksi.tujuan);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView>
        <KartuRincianProspek prospek={prospek} />
        <AksiProspek
          prospek={prospek}
          isOnline={isOnline}
          isMenyimpan={ubahStatus.isPending}
          onCatatFollowUp={() => router.push(ruteCatatFollowUp(prospek))}
          onUbahStatus={() => setIsPilihStatusTerbuka(true)}
          onJadikanCanvasing={() => router.push(ruteJadikanCanvasing(prospek.id))}
        />
        <RiwayatKegiatanProspek prospekId={prospek.id} />
      </ScrollView>
      {isPilihStatusTerbuka ? (
        <PilihStatusProspekModal
          pilihan={daftarPilihanUbahStatus(prospek.status)}
          onPilih={pilihAksi}
          onTutup={() => setIsPilihStatusTerbuka(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
```

Di `app/(app)/_layout.tsx`, tambahkan setelah blok `presurvei/kegiatan/catat`:

```tsx
        <Tabs.Screen
          name="presurvei/prospek/[id]/index"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
```

- [ ] **Step 5: Jalankan test dan typecheck**

Run: `npx jest __tests__/hooks/useUbahStatusProspek.test.tsx __tests__/app/presurvei-rincian-prospek.test.tsx __tests__/app/app-layout-presurvei.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit && npx expo lint`
Expected: exit 0.

- [ ] **Step 6: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Modal memakai `PROSPEK_STATUSES` (semua status) | "Ubah Status hanya menawarkan transisi sah" |
| `pilihAksi` selalu `ubahStatus.mutate(...)` untuk Deal | "memilih Deal membuka form Jadikan Canvasing, bukan menulis status" |
| `isAktif={isAdaPilihan && !isMenyimpan}` (tanpa `isOnline`) | "offline menonaktifkan Ubah Status dan menampilkan alasannya" |
| `isBolehJadikanCanvasing(prospek)` jadi `prospek.status === 'DEAL'` | "Jadikan Canvasing hanya untuk Deal yang belum punya canvasing" |
| `ruteCatatFollowUp` tanpa `prospekNama` | "Catat Follow-up membawa prospek ke form catat" |
| Hapus `invalidateQueries` di `onSuccess` | "mengirim status untuk prospek itu lalu menyegarkan data presurvei" |
| Tukar argumen `ubahStatusProspek(status, prospekId)` | "mengirim status untuk prospek itu…" |
| Hapus `Tabs.Screen` `presurvei/prospek/[id]/index` | "mendaftarkan presurvei/prospek/[id]/index tanpa tab" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/presurvei/useUbahStatusProspek.ts src/components/molecules/TombolAksi.tsx src/components/organisms/presurvei/KartuRincianProspek.tsx src/components/organisms/presurvei/RiwayatKegiatanProspek.tsx src/components/organisms/presurvei/PilihStatusProspekModal.tsx src/components/organisms/presurvei/AksiProspek.tsx "app/(app)/presurvei/prospek/[id]/index.tsx" "app/(app)/_layout.tsx" __tests__/hooks/useUbahStatusProspek.test.tsx __tests__/app/presurvei-rincian-prospek.test.tsx __tests__/app/app-layout-presurvei.test.tsx
git commit -m "$(cat <<'EOF'
feat(presurvei): rincian prospek dengan ubah status sesuai transisi sah

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Jadikan Canvasing

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/utils/presurvei/formKonversi.ts`
- Create: `src/hooks/presurvei/useFormKonversi.ts`
- Create: `src/hooks/presurvei/useJadikanCanvasing.ts`
- Create: `app/(app)/presurvei/prospek/[id]/jadikan-canvasing.tsx`
- Modify: `app/(app)/_layout.tsx` (daftarkan route tersembunyi)
- Modify: `__tests__/app/app-layout-presurvei.test.tsx`
- Test: `__tests__/utils/presurvei/formKonversi.test.ts`, `__tests__/hooks/useJadikanCanvasing.test.tsx`, `__tests__/app/presurvei-jadikan-canvasing.test.tsx`

**Interfaces:**
- Consumes: Task 6 — `MuatanJadikanCanvasing`, `HasilJadikanCanvasing`, `TIPE_UNGGAH_FOTO_KTP`, `KABEL_METER_MAKS`; Task 7 — `PresurveiService.ubahStatusProspek`, `PresurveiService.jadikanCanvasing`; Task 8 — `useRincianProspek`, `useIsOnline`; Task 12 — `KameraBukti`, `IsianTeks`, `TombolAksi` (Task 15); `uploadService.uploadFile`.
- Produces:
  - `interface NilaiFormKonversi { noKtp: string; paket: string; kabel: string }`, `NILAI_FORM_KONVERSI_KOSONG`
  - `type KesalahanFormKonversi = Partial<Record<keyof NilaiFormKonversi | 'fotoKtp', string>>`
  - `PESAN_FORM_KONVERSI`
  - `validasiFormKonversi(nilai: NilaiFormKonversi, fotoKtpLokal: string | null): KesalahanFormKonversi`
  - `keMuatanKonversi(nilai: NilaiFormKonversi, fotoKtpUrl: string): MuatanJadikanCanvasing`
  - `useFormKonversi()` → `{ nilai; ubah(p: Partial<NilaiFormKonversi>): void; fotoKtpLokal: string | null; setFotoKtpLokal(uri: string | null): void; kesalahan; periksa(): boolean }`
  - `interface MasukanKonversi { prospekId: string; statusAsal: ProspekStatus; nilai: NilaiFormKonversi; fotoKtpLokal: string }`
  - `interface DependensiKonversi { unggah(uri: string, tipe: string): Promise<string>; ubahStatus(id: string, status: ProspekStatus): Promise<unknown>; jadikan(id: string, muatan: MuatanJadikanCanvasing): Promise<HasilJadikanCanvasing> }`
  - `class KonversiSetengahJalanError extends Error`, `PESAN_SETENGAH_JALAN`
  - `jalankanKonversi(masukan: MasukanKonversi, deps?: DependensiKonversi): Promise<HasilJadikanCanvasing>`
  - `useJadikanCanvasing(onBerhasil: () => void)` → `UseMutationResult<HasilJadikanCanvasing, unknown, MasukanKonversi>`
  - Route `/(app)/presurvei/prospek/[id]/jadikan-canvasing` (param `id`); status asal dibaca dari rincian server, bukan dari param.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// __tests__/utils/presurvei/formKonversi.test.ts
import { describe, expect, it } from '@jest/globals';

import {
  keMuatanKonversi,
  NILAI_FORM_KONVERSI_KOSONG,
  PESAN_FORM_KONVERSI,
  validasiFormKonversi,
} from '@/utils/presurvei/formKonversi';

const SAH = { noKtp: '3201234567890001', paket: 'Home 20 Mbps', kabel: '' };

describe('validasiFormKonversi', () => {
  it('form kosong menuntut KTP, paket, dan foto KTP', () => {
    expect(validasiFormKonversi(NILAI_FORM_KONVERSI_KOSONG, null)).toEqual({
      noKtp: PESAN_FORM_KONVERSI.noKtp,
      paket: PESAN_FORM_KONVERSI.paket,
      fotoKtp: PESAN_FORM_KONVERSI.fotoKtp,
    });
  });

  it.each([
    ['320123456789000', PESAN_FORM_KONVERSI.noKtp],
    ['3201234567890001', undefined],
    ['32012345678900012345', undefined],
    ['320123456789000123456', PESAN_FORM_KONVERSI.noKtp],
  ])('nomor KTP "%s" → %s', (noKtp, harapan) => {
    expect(validasiFormKonversi({ ...SAH, noKtp }, 'file:///ktp.jpg').noKtp).toBe(harapan);
  });

  it.each([
    ['', undefined],
    ['1', undefined],
    ['5000', undefined],
    ['0', PESAN_FORM_KONVERSI.kabel],
    ['5001', PESAN_FORM_KONVERSI.kabel],
    ['2.5', PESAN_FORM_KONVERSI.kabel],
  ])('kabel "%s" → %s', (kabel, harapan) => {
    expect(validasiFormKonversi({ ...SAH, kabel }, 'file:///ktp.jpg').kabel).toBe(harapan);
  });
});

describe('keMuatanKonversi', () => {
  it('kabel kosong tidak dikirim supaya server memakai estimasi survei', () => {
    const muatan = keMuatanKonversi({ ...SAH, noKtp: ' 3201234567890001 ' }, 'https://cdn.test/ktp.webp');

    expect(muatan).toEqual({
      noKtp: '3201234567890001',
      paket: 'Home 20 Mbps',
      fotoKtp: 'https://cdn.test/ktp.webp',
    });
    expect('kabel' in muatan).toBe(false);
  });

  it('kabel terisi dikirim sebagai angka', () => {
    expect(keMuatanKonversi({ ...SAH, kabel: '35' }, 'https://cdn.test/ktp.webp').kabel).toBe(35);
  });
});
```

```tsx
// __tests__/hooks/useJadikanCanvasing.test.tsx
import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUpload = jest.fn<(uri: string, tipe: string) => Promise<string>>();
jest.mock('@/services/UploadService', () => ({ uploadService: { uploadFile: (u: string, t: string) => mockUpload(u, t) } }));
const mockUbahStatus = jest.fn<(id: string, status: string) => Promise<unknown>>();
const mockJadikan = jest.fn<(id: string, muatan: unknown) => Promise<unknown>>();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: {
    ubahStatusProspek: (id: string, s: string) => mockUbahStatus(id, s),
    jadikanCanvasing: (id: string, m: unknown) => mockJadikan(id, m),
  },
}));
const mockPesanGagal = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentErrorMessage: (...a: unknown[]) => mockPesanGagal(...a),
  presentSuccessMessage: jest.fn(),
}));

import {
  jalankanKonversi,
  KonversiSetengahJalanError,
  PESAN_SETENGAH_JALAN,
  useJadikanCanvasing,
  type DependensiKonversi,
} from '@/hooks/presurvei/useJadikanCanvasing';

const NILAI = { noKtp: '3201234567890001', paket: 'Home 20 Mbps', kabel: '35' };

const deps = () => ({
  unggah: jest.fn<DependensiKonversi['unggah']>(async () => 'https://cdn.test/ktp.webp'),
  ubahStatus: jest.fn<DependensiKonversi['ubahStatus']>(async () => ({})),
  jadikan: jest.fn<DependensiKonversi['jadikan']>(async () => ({ prospek: {} as never, canvasingId: 'cv-1' })),
});

describe('jalankanKonversi', () => {
  it('mengunggah foto KTP sebagai marketing lalu mengirim badan persis', async () => {
    const d = deps();

    await jalankanKonversi({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///cache/ktp.jpg' }, d);

    expect(d.unggah).toHaveBeenCalledWith('file:///cache/ktp.jpg', 'marketing');
    expect(d.jadikan).toHaveBeenCalledWith('p-1', {
      noKtp: '3201234567890001',
      paket: 'Home 20 Mbps',
      kabel: 35,
      fotoKtp: 'https://cdn.test/ktp.webp',
    });
    expect(d.ubahStatus).not.toHaveBeenCalled();
  });

  it('prospek non-Deal dipindah ke Deal sebelum konversi', async () => {
    const d = deps();

    await jalankanKonversi({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///cache/ktp.jpg' }, d);

    expect(d.ubahStatus).toHaveBeenCalledWith('p-1', 'DEAL');
    expect(d.ubahStatus.mock.invocationCallOrder[0]).toBeLessThan(d.jadikan.mock.invocationCallOrder[0]);
  });

  it('gagal setelah pindah ke Deal menjadi galat setengah jalan', async () => {
    const d = deps();
    d.jadikan.mockRejectedValue(new Error('409'));

    await expect(
      jalankanKonversi({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' }, d),
    ).rejects.toBeInstanceOf(KonversiSetengahJalanError);
  });

  it('gagal pada prospek yang sudah Deal diteruskan apa adanya', async () => {
    const d = deps();
    const galat = new Error('409');
    d.jadikan.mockRejectedValue(galat);

    await expect(
      jalankanKonversi({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' }, d),
    ).rejects.toBe(galat);
  });

  it('unggah KTP gagal tidak menyentuh status prospek', async () => {
    const d = deps();
    d.unggah.mockRejectedValue(new Error('Network request failed'));

    await expect(
      jalankanKonversi({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' }, d),
    ).rejects.toThrow('Network request failed');
    expect(d.ubahStatus).not.toHaveBeenCalled();
  });
});

describe('useJadikanCanvasing', () => {
  it('galat setengah jalan menyegarkan data presurvei dan menjelaskan langkah berikutnya', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockUbahStatus.mockResolvedValue({});
    mockJadikan.mockRejectedValue(new Error('500'));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const onBerhasil = jest.fn();
    const { result } = renderHook(() => useJadikanCanvasing(onBerhasil), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' })
        .catch(() => undefined);
    });

    expect(mockPesanGagal).toHaveBeenCalledWith(PESAN_SETENGAH_JALAN, 'Belum Selesai');
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(onBerhasil).not.toHaveBeenCalled();
    client.clear();
  });
});
```

```tsx
// __tests__/app/presurvei-jadikan-canvasing.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockJadikan = jest.fn();
let mockIsOnline = true;
let mockKameraProps: { onAmbil: (uri: string) => void } | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'p-1', statusAsal: 'DEAL' }),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/hooks/queries/usePresurveiProspek', () => ({
  useRincianProspek: () => ({
    data: { id: 'p-1', nama: 'Budi Santoso', status: 'NEGOSIASI', canvasingId: null },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => mockIsOnline }));
jest.mock('@/hooks/presurvei/useJadikanCanvasing', () => ({
  useJadikanCanvasing: () => ({ mutate: mockJadikan, isPending: false }),
}));
jest.mock('@/components/organisms/presurvei/KameraBukti', () => ({
  KameraBukti: (props: { onAmbil: (uri: string) => void }) => {
    mockKameraProps = props;
    return null;
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/prospek/[id]/jadikan-canvasing').default;
  return render(<Layar />);
};

const isiForm = (layar: ReturnType<typeof renderLayar>) => {
  fireEvent.changeText(layar.getByLabelText('Nomor KTP'), '3201234567890001');
  fireEvent.changeText(layar.getByLabelText('Paket'), 'Home 20 Mbps');
};

describe('Jadikan Canvasing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = true;
    mockKameraProps = null;
  });

  it('memberi tahu bahwa prospek akan dipindah ke Deal lebih dulu', () => {
    const { getByText } = renderLayar();

    expect(getByText('Prospek akan dipindah ke Deal lebih dulu.')).toBeTruthy();
  });

  it('offline menonaktifkan tombol dan tidak mengirim', () => {
    mockIsOnline = false;
    const layar = renderLayar();
    isiForm(layar);

    fireEvent.press(layar.getByText('Jadikan Canvasing'));

    expect(mockJadikan).not.toHaveBeenCalled();
    expect(layar.getByText('Butuh koneksi internet untuk menjadikan canvasing.')).toBeTruthy();
  });

  it('menolak tanpa foto KTP', () => {
    const layar = renderLayar();
    isiForm(layar);

    fireEvent.press(layar.getByText('Jadikan Canvasing'));

    expect(mockJadikan).not.toHaveBeenCalled();
    expect(layar.getByText('Ambil foto KTP')).toBeTruthy();
  });

  it('mengirim status asal dari server, bukan dari parameter route', () => {
    const layar = renderLayar();
    isiForm(layar);
    fireEvent.press(layar.getByText('Ambil Foto KTP'));
    act(() => mockKameraProps?.onAmbil('file:///cache/ktp.jpg'));

    fireEvent.press(layar.getByText('Jadikan Canvasing'));

    expect(mockJadikan).toHaveBeenCalledWith(
      {
        prospekId: 'p-1',
        statusAsal: 'NEGOSIASI',
        nilai: { noKtp: '3201234567890001', paket: 'Home 20 Mbps', kabel: '' },
        fotoKtpLokal: 'file:///cache/ktp.jpg',
      },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });
});
```

Di `__tests__/app/app-layout-presurvei.test.tsx`, tambahkan `'presurvei/prospek/[id]/jadikan-canvasing'` sebagai anggota terakhir `RUTE_PRESURVEI_TERSEMBUNYI`.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/presurvei/formKonversi.test.ts __tests__/hooks/useJadikanCanvasing.test.tsx __tests__/app/presurvei-jadikan-canvasing.test.tsx __tests__/app/app-layout-presurvei.test.tsx`
Expected: FAIL — modul dan route belum ada.

- [ ] **Step 3: Implementasi aturan dan hook**

```ts
// src/utils/presurvei/formKonversi.ts
import { KABEL_METER_MAKS } from '@/constants/presurvei';
import type { MuatanJadikanCanvasing } from '@/types/presurvei';

/**
 * Form Jadikan Canvasing, meniru `jadikanCanvasingSchema`
 * (netmanager `konversi.validator.ts:11-24`) dan batas kabel marketing
 * (`app/admin/presurvei/prospek/konversiFormState.ts:17-21`, minimal 1 meter).
 */

const PANJANG_KTP_MIN = 16;
const PANJANG_KTP_MAKS = 20;
const PANJANG_PAKET_MAKS = 120;
const KABEL_MINIMAL_METER = 1;
const POLA_BILANGAN_BULAT = /^\d+$/;

export interface NilaiFormKonversi {
  noKtp: string;
  paket: string;
  kabel: string;
}

export const NILAI_FORM_KONVERSI_KOSONG: NilaiFormKonversi = Object.freeze({ noKtp: '', paket: '', kabel: '' });

export type KesalahanFormKonversi = Partial<Record<keyof NilaiFormKonversi | 'fotoKtp', string>>;

export const PESAN_FORM_KONVERSI = {
  noKtp: `Nomor KTP harus ${PANJANG_KTP_MIN}–${PANJANG_KTP_MAKS} karakter`,
  paket: 'Paket wajib diisi',
  kabel: `Panjang kabel harus bilangan bulat ${KABEL_MINIMAL_METER}–${KABEL_METER_MAKS} meter`,
  fotoKtp: 'Ambil foto KTP',
} as const;

function isKabelSah(teks: string): boolean {
  const kabel = teks.trim();
  if (kabel === '') return true;
  if (!POLA_BILANGAN_BULAT.test(kabel)) return false;
  const meter = Number(kabel);
  return meter >= KABEL_MINIMAL_METER && meter <= KABEL_METER_MAKS;
}

/** Kesalahan form konversi; objek kosong berarti boleh dikirim. */
export function validasiFormKonversi(nilai: NilaiFormKonversi, fotoKtpLokal: string | null): KesalahanFormKonversi {
  const kesalahan: KesalahanFormKonversi = {};
  const panjangKtp = nilai.noKtp.trim().length;
  const panjangPaket = nilai.paket.trim().length;
  if (panjangKtp < PANJANG_KTP_MIN || panjangKtp > PANJANG_KTP_MAKS) kesalahan.noKtp = PESAN_FORM_KONVERSI.noKtp;
  if (panjangPaket === 0 || panjangPaket > PANJANG_PAKET_MAKS) kesalahan.paket = PESAN_FORM_KONVERSI.paket;
  if (!isKabelSah(nilai.kabel)) kesalahan.kabel = PESAN_FORM_KONVERSI.kabel;
  if (fotoKtpLokal === null) kesalahan.fotoKtp = PESAN_FORM_KONVERSI.fotoKtp;
  return kesalahan;
}

/**
 * Badan konversi. Kabel kosong TIDAK dikirim (bukan null): `kabel` di schema
 * hanya `.optional()`, dan server lalu memakai estimasi survei terakhir
 * (netmanager `ProspekKonversiService.ts`, `bangunMasukanCanvasing`).
 */
export function keMuatanKonversi(nilai: NilaiFormKonversi, fotoKtpUrl: string): MuatanJadikanCanvasing {
  const kabel = nilai.kabel.trim();
  return {
    noKtp: nilai.noKtp.trim(),
    paket: nilai.paket.trim(),
    ...(kabel === '' ? {} : { kabel: Number(kabel) }),
    fotoKtp: fotoKtpUrl,
  };
}
```

```ts
// src/hooks/presurvei/useFormKonversi.ts
import { useCallback, useState } from 'react';

import {
  NILAI_FORM_KONVERSI_KOSONG,
  validasiFormKonversi,
  type KesalahanFormKonversi,
  type NilaiFormKonversi,
} from '@/utils/presurvei/formKonversi';

/** State form Jadikan Canvasing. */
export function useFormKonversi() {
  const [nilai, setNilai] = useState<NilaiFormKonversi>(NILAI_FORM_KONVERSI_KOSONG);
  const [fotoKtpLokal, setFotoKtpLokal] = useState<string | null>(null);
  const [kesalahan, setKesalahan] = useState<KesalahanFormKonversi>({});
  const ubah = useCallback((perubahan: Partial<NilaiFormKonversi>) => {
    setNilai((lama) => ({ ...lama, ...perubahan }));
  }, []);
  const periksa = useCallback(() => {
    const hasil = validasiFormKonversi(nilai, fotoKtpLokal);
    setKesalahan(hasil);
    return Object.keys(hasil).length === 0;
  }, [nilai, fotoKtpLokal]);
  return { nilai, ubah, fotoKtpLokal, setFotoKtpLokal, kesalahan, periksa };
}
```

```ts
// src/hooks/presurvei/useJadikanCanvasing.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TIPE_UNGGAH_FOTO_KTP, type ProspekStatus } from '@/constants/presurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { uploadService, type UploadType } from '@/services/UploadService';
import type { HasilJadikanCanvasing, MuatanJadikanCanvasing } from '@/types/presurvei';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { keMuatanKonversi, type NilaiFormKonversi } from '@/utils/presurvei/formKonversi';

const STATUS_DEAL: ProspekStatus = 'DEAL';
const PESAN_BERHASIL = 'Prospek dijadikan canvasing';
const JUDUL_SETENGAH_JALAN = 'Belum Selesai';

/** Pesan bila status sudah Deal tapi canvasing gagal dibuat. */
export const PESAN_SETENGAH_JALAN =
  'Prospek sudah berstatus Deal, tetapi canvasing belum dibuat. Buka lagi rincian prospek lalu tekan Jadikan Canvasing.';

/** Status sudah dipindah ke Deal, tetapi langkah konversi gagal. */
export class KonversiSetengahJalanError extends Error {
  readonly penyebab: unknown;

  constructor(penyebab: unknown) {
    super(PESAN_SETENGAH_JALAN);
    this.name = 'KonversiSetengahJalanError';
    this.penyebab = penyebab;
  }
}

/** Masukan satu konversi. `statusAsal` berasal dari rincian server. */
export interface MasukanKonversi {
  prospekId: string;
  statusAsal: ProspekStatus;
  nilai: NilaiFormKonversi;
  fotoKtpLokal: string;
}

/** Dependensi yang bisa diganti saat test. */
export interface DependensiKonversi {
  unggah: (uri: string, tipe: string) => Promise<string>;
  ubahStatus: (id: string, status: ProspekStatus) => Promise<unknown>;
  jadikan: (id: string, muatan: MuatanJadikanCanvasing) => Promise<HasilJadikanCanvasing>;
}

const DEPENDENSI_BAWAAN: DependensiKonversi = {
  unggah: (uri, tipe) => uploadService.uploadFile(uri, tipe as UploadType),
  ubahStatus: (id, status) => PresurveiService.ubahStatusProspek(id, status),
  jadikan: (id, muatan) => PresurveiService.jadikanCanvasing(id, muatan),
};

async function kirimKonversi(masukan: MasukanKonversi, muatan: MuatanJadikanCanvasing, deps: DependensiKonversi) {
  try {
    return await deps.jadikan(masukan.prospekId, muatan);
  } catch (error) {
    if (masukan.statusAsal === STATUS_DEAL) throw error;
    throw new KonversiSetengahJalanError(error);
  }
}

/**
 * Konversi dua langkah seperti web (`useJadikanCanvasing.ts` netmanager):
 * unggah KTP → (bila belum Deal) PATCH Deal → POST jadikan-canvasing.
 * KTP diunggah lebih dulu supaya kegagalan jaringan tidak memindah status.
 */
export async function jalankanKonversi(
  masukan: MasukanKonversi,
  deps: DependensiKonversi = DEPENDENSI_BAWAAN,
): Promise<HasilJadikanCanvasing> {
  const fotoKtp = await deps.unggah(masukan.fotoKtpLokal, TIPE_UNGGAH_FOTO_KTP);
  const muatan = keMuatanKonversi(masukan.nilai, fotoKtp);
  if (masukan.statusAsal !== STATUS_DEAL) await deps.ubahStatus(masukan.prospekId, STATUS_DEAL);
  return kirimKonversi(masukan, muatan, deps);
}

/** Mutasi Jadikan Canvasing; butuh online, tidak pernah diantre. */
export function useJadikanCanvasing(onBerhasil: () => void) {
  const queryClient = useQueryClient();
  const segarkan = () => void queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all });
  return useMutation({
    mutationFn: (masukan: MasukanKonversi) => jalankanKonversi(masukan),
    onSuccess: () => {
      segarkan();
      presentSuccessMessage(PESAN_BERHASIL);
      onBerhasil();
    },
    onError: (error) => {
      if (error instanceof KonversiSetengahJalanError) {
        segarkan();
        presentErrorMessage(PESAN_SETENGAH_JALAN, JUDUL_SETENGAH_JALAN);
        return;
      }
      presentAppError(error, { screen: 'JadikanCanvasing', source: 'mutation' });
    },
  });
}
```

- [ ] **Step 4: Implementasi layar**

```tsx
// app/(app)/presurvei/prospek/[id]/jadikan-canvasing.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { IsianTeks } from '@/components/molecules/IsianTeks';
import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { TombolAksi } from '@/components/molecules/TombolAksi';
import { KameraBukti } from '@/components/organisms/presurvei/KameraBukti';
import { AppFeature } from '@/constants/features';
import { useFormKonversi } from '@/hooks/presurvei/useFormKonversi';
import { useJadikanCanvasing } from '@/hooks/presurvei/useJadikanCanvasing';
import { useRincianProspek } from '@/hooks/queries/usePresurveiProspek';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { useIsOnline } from '@/hooks/useIsOnline';

const PANJANG_KTP_MAKS = 20;
const TEKS_BUTUH_ONLINE_KONVERSI = 'Butuh koneksi internet untuk menjadikan canvasing.';

/** Form Jadikan Canvasing: No. KTP, paket, kabel opsional, foto KTP. */
export default function JadikanCanvasingScreen() {
  useFeatureGuard(AppFeature.PRESURVEI);
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const rincian = useRincianProspek(id);
  const form = useFormKonversi();
  const isOnline = useIsOnline();
  const konversi = useJadikanCanvasing(() => router.back());
  const isMengirim = useRef(false);
  const [isKameraTerbuka, setIsKameraTerbuka] = useState(false);

  if (isKameraTerbuka) {
    return <KameraBukti onAmbil={(uri) => { form.setFotoKtpLokal(uri); setIsKameraTerbuka(false); }} onTutup={() => setIsKameraTerbuka(false)} />;
  }
  if (rincian.isPending) return <ActivityIndicator style={tw`mt-10`} />;
  if (rincian.isError || !rincian.data) {
    return <QueryErrorState message="Rincian prospek gagal dimuat." onRetry={() => void rincian.refetch()} />;
  }
  const prospek = rincian.data;
  const kirim = () => {
    if (!isOnline || isMengirim.current || !form.periksa() || form.fotoKtpLokal === null) return;
    isMengirim.current = true;
    konversi.mutate(
      { prospekId: prospek.id, statusAsal: prospek.status, nilai: form.nilai, fotoKtpLokal: form.fotoKtpLokal },
      { onSettled: () => { isMengirim.current = false; } },
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView contentContainerStyle={tw`p-4 pb-24`} keyboardShouldPersistTaps="handled">
        <Text style={tw`text-lg font-bold text-gray-900`}>{`Jadikan Canvasing: ${prospek.nama}`}</Text>
        {prospek.status !== 'DEAL' ? <Text style={tw`text-sm text-indigo-700 my-2`}>Prospek akan dipindah ke Deal lebih dulu.</Text> : null}
        <IsianTeks label="Nomor KTP" nilai={form.nilai.noKtp} kesalahan={form.kesalahan.noKtp} keyboardType="number-pad" maxLength={PANJANG_KTP_MAKS} onUbah={(isian) => form.ubah({ noKtp: isian })} />
        <IsianTeks label="Paket" nilai={form.nilai.paket} kesalahan={form.kesalahan.paket} placeholder="Contoh: Home 20 Mbps" onUbah={(isian) => form.ubah({ paket: isian })} />
        <IsianTeks label="Panjang kabel (meter)" nilai={form.nilai.kabel} kesalahan={form.kesalahan.kabel} keyboardType="number-pad" placeholder="Kosongkan untuk memakai estimasi survei" onUbah={(isian) => form.ubah({ kabel: isian })} />
        <View style={tw`mb-4`}>
          {form.fotoKtpLokal !== null ? <Image source={{ uri: form.fotoKtpLokal }} style={tw`w-full h-40 rounded-xl mb-2`} /> : null}
          <TouchableOpacity accessibilityRole="button" onPress={() => setIsKameraTerbuka(true)} style={tw`border border-dashed border-blue-400 rounded-xl py-3 items-center`}>
            <Text style={tw`text-blue-600 font-semibold`}>{form.fotoKtpLokal === null ? 'Ambil Foto KTP' : 'Ulangi Foto KTP'}</Text>
          </TouchableOpacity>
          {form.kesalahan.fotoKtp ? <Text style={tw`text-red-600 text-xs mt-1`}>{form.kesalahan.fotoKtp}</Text> : null}
        </View>
        <TombolAksi label="Jadikan Canvasing" onPress={kirim} isAktif={isOnline && !konversi.isPending} />
        {!isOnline ? <Text style={tw`text-xs text-amber-700`}>{TEKS_BUTUH_ONLINE_KONVERSI}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
```

Di `app/(app)/_layout.tsx`, tambahkan setelah blok `presurvei/prospek/[id]/index`:

```tsx
        <Tabs.Screen
          name="presurvei/prospek/[id]/jadikan-canvasing"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
```

- [ ] **Step 5: Jalankan test dan typecheck**

Run: `npx jest __tests__/utils/presurvei/formKonversi.test.ts __tests__/hooks/useJadikanCanvasing.test.tsx __tests__/app/presurvei-jadikan-canvasing.test.tsx __tests__/app/app-layout-presurvei.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit && npx expo lint`
Expected: exit 0.

- [ ] **Step 6: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `panjangKtp > PANJANG_KTP_MAKS` dihapus | `nomor KTP "320123456789000123456"` |
| `meter >= KABEL_MINIMAL_METER` dihapus | `kabel "0"` |
| `...(kabel === '' ? {} : …)` jadi `kabel: kabel === '' ? undefined : Number(kabel)` | "kabel kosong tidak dikirim supaya server memakai estimasi survei" (`'kabel' in muatan`) |
| `TIPE_UNGGAH_FOTO_KTP` jadi `TIPE_UNGGAH_FOTO_KEGIATAN` | "mengunggah foto KTP sebagai marketing lalu mengirim badan persis" |
| Pindahkan PATCH Deal sebelum unggah KTP | "unggah KTP gagal tidak menyentuh status prospek" |
| Hapus `if (masukan.statusAsal !== STATUS_DEAL)` (selalu PATCH) | "mengunggah foto KTP sebagai marketing…" (`ubahStatus` terpanggil) |
| `kirimKonversi` selalu melempar galat asli | "gagal setelah pindah ke Deal menjadi galat setengah jalan" |
| Hapus `segarkan()` di cabang setengah jalan | "galat setengah jalan menyegarkan data presurvei…" |
| `statusAsal: 'DEAL'` dari param route | "mengirim status asal dari server, bukan dari parameter route" |
| `isAktif={!konversi.isPending}` dan hapus cek `!isOnline` di `kirim` | "offline menonaktifkan tombol dan tidak mengirim" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 7: Commit**

```bash
git add src/utils/presurvei/formKonversi.ts src/hooks/presurvei/useFormKonversi.ts src/hooks/presurvei/useJadikanCanvasing.ts "app/(app)/presurvei/prospek/[id]/jadikan-canvasing.tsx" "app/(app)/_layout.tsx" __tests__/utils/presurvei/formKonversi.test.ts __tests__/hooks/useJadikanCanvasing.test.tsx __tests__/app/presurvei-jadikan-canvasing.test.tsx __tests__/app/app-layout-presurvei.test.tsx
git commit -m "$(cat <<'EOF'
feat(presurvei): jadikan canvasing dari aplikasi dengan foto KTP

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Persona, `KaryawanSalesTabBar`, dan layout

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/utils/persona.ts`
- Create: `src/utils/tabKaryawanSales.ts`
- Create: `src/components/organisms/navigation/TombolTabSales.tsx`
- Create: `src/components/organisms/navigation/KaryawanSalesTabBar.tsx`
- Modify: `app/(app)/_layout.tsx:15-24` (impor), `:57-64` (persona, `hasFeature`), `:130-137` (`tabBar`)
- Modify: `__tests__/app/app-layout-logging.test.tsx:41-47` (mock tab bar baru)
- Modify: `__tests__/app/app-layout-presurvei.test.tsx`
- Test: `__tests__/utils/persona.test.ts`, `__tests__/utils/tabKaryawanSales.test.ts`, `__tests__/components/KaryawanSalesTabBar.test.tsx`

**Interfaces:**
- Consumes: `User` (`src/context/AuthContext.tsx:15-29`), `AppFeature` (Task 6), route `presurvei/index` (Task 14).
- Produces:
  - `type Persona = 'KARYAWAN_SALES' | 'KARYAWAN_TEKNISI' | 'MITRA_SALES' | 'MITRA_TEKNISI'`
  - `tentukanPersona(user: Pick<User, 'employeeType' | 'isSales'> | null | undefined): Persona`
  - `isPersonaMitra(persona: Persona): boolean`
  - `punyaFitur(user: Pick<User, 'role' | 'features'> | null | undefined, fitur: string): boolean`
  - `RUTE_TAB_KARYAWAN_SALES`, `type RuteTabSales`, `interface TabSales { rute: RuteTabSales; isTerkunci: boolean }`
  - `susunTabKaryawanSales(user: Pick<User, 'role' | 'features' | 'isSales'> | null): TabSales[]`
  - `KaryawanSalesTabBar(props: BottomTabBarProps)`, `TombolTabSales(props: { tab: TabSales } & Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigation'>)`
  - Layout memilih tab bar per persona; teknisi tetap tab bar bawaan.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// __tests__/utils/persona.test.ts
import { describe, expect, it } from '@jest/globals';

import { isPersonaMitra, punyaFitur, tentukanPersona } from '@/utils/persona';

describe('tentukanPersona', () => {
  it.each([
    ['KARYAWAN', true, 'KARYAWAN_SALES'],
    ['KARYAWAN', false, 'KARYAWAN_TEKNISI'],
    ['KARYAWAN', undefined, 'KARYAWAN_TEKNISI'],
    ['MITRA_SALES', true, 'MITRA_SALES'],
    ['MITRA_SALES', false, 'MITRA_SALES'],
    ['MITRA_SALES', undefined, 'MITRA_SALES'],
    ['MITRA_TEKNISI', true, 'MITRA_TEKNISI'],
    ['MITRA_TEKNISI', false, 'MITRA_TEKNISI'],
    ['MITRA_TEKNISI', undefined, 'MITRA_TEKNISI'],
    [undefined, true, 'KARYAWAN_SALES'],
    [undefined, false, 'KARYAWAN_TEKNISI'],
    [undefined, undefined, 'KARYAWAN_TEKNISI'],
  ] as const)('employeeType %s × isSales %s → %s', (employeeType, isSales, harapan) => {
    expect(tentukanPersona({ employeeType, isSales })).toBe(harapan);
  });

  it('pengguna belum dimuat diperlakukan seperti teknisi karyawan (perilaku lama)', () => {
    expect(tentukanPersona(null)).toBe('KARYAWAN_TEKNISI');
    expect(tentukanPersona(undefined)).toBe('KARYAWAN_TEKNISI');
  });

  it('hanya persona mitra yang dianggap mitra', () => {
    expect(isPersonaMitra('MITRA_SALES')).toBe(true);
    expect(isPersonaMitra('MITRA_TEKNISI')).toBe(true);
    expect(isPersonaMitra('KARYAWAN_SALES')).toBe(false);
    expect(isPersonaMitra('KARYAWAN_TEKNISI')).toBe(false);
  });
});

describe('punyaFitur', () => {
  it('membaca daftar fitur pengguna', () => {
    expect(punyaFitur({ role: 'SALES', features: ['m_presurvei'] }, 'm_presurvei')).toBe(true);
    expect(punyaFitur({ role: 'SALES', features: ['m_canvasing'] }, 'm_presurvei')).toBe(false);
  });

  it('SUPER_ADMIN selalu punya fitur; tanpa pengguna atau daftar fitur tidak', () => {
    expect(punyaFitur({ role: 'SUPER_ADMIN', features: [] }, 'm_presurvei')).toBe(true);
    expect(punyaFitur(null, 'm_presurvei')).toBe(false);
    expect(punyaFitur({ role: 'SALES' }, 'm_presurvei')).toBe(false);
  });
});
```

```ts
// __tests__/utils/tabKaryawanSales.test.ts
import { describe, expect, it } from '@jest/globals';

import { susunTabKaryawanSales } from '@/utils/tabKaryawanSales';

const SALES_LENGKAP = {
  role: 'SALES',
  isSales: true,
  features: ['m_dashboard', 'm_presurvei', 'm_canvasing', 'm_absensi', 'm_work_order', 'm_barang'],
};

describe('susunTabKaryawanSales', () => {
  it('urutan Beranda · Presurvei · Canvasing · Absensi · Profil tanpa Work Order dan Barang', () => {
    expect(susunTabKaryawanSales(SALES_LENGKAP)).toEqual([
      { rute: 'dashboard', isTerkunci: false },
      { rute: 'presurvei/index', isTerkunci: false },
      { rute: 'marketing/canvasing/index', isTerkunci: false },
      { rute: 'absensi', isTerkunci: false },
      { rute: 'profile', isTerkunci: false },
    ]);
  });

  it('menampilkan Presurvei terkunci bagi sales tanpa m_presurvei', () => {
    const tab = susunTabKaryawanSales({ ...SALES_LENGKAP, features: ['m_dashboard', 'm_canvasing', 'm_absensi'] });

    expect(tab.find((t) => t.rute === 'presurvei/index')).toEqual({ rute: 'presurvei/index', isTerkunci: true });
  });

  it('Canvasing dan Absensi mengikuti gerbang lama: disembunyikan, bukan dikunci', () => {
    const tanpaIzin = susunTabKaryawanSales({ ...SALES_LENGKAP, features: ['m_dashboard', 'm_presurvei'] });
    const bukanSales = susunTabKaryawanSales({ ...SALES_LENGKAP, isSales: false });

    expect(tanpaIzin.map((t) => t.rute)).toEqual(['dashboard', 'presurvei/index', 'profile']);
    expect(bukanSales.map((t) => t.rute)).not.toContain('marketing/canvasing/index');
  });

  it('mengembalikan array baru setiap kali', () => {
    const pertama = susunTabKaryawanSales(SALES_LENGKAP);
    pertama.pop();

    expect(susunTabKaryawanSales(SALES_LENGKAP)).toHaveLength(5);
  });
});
```

```tsx
// __tests__/components/KaryawanSalesTabBar.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('twrnc', () => () => ({}));

import { KaryawanSalesTabBar } from '@/components/organisms/navigation/KaryawanSalesTabBar';

const JUDUL: Record<string, string> = {
  dashboard: 'Beranda',
  'work-order': 'Work Order',
  'presurvei/index': 'Presurvei',
  'marketing/canvasing/index': 'Canvasing',
  barang: 'Barang',
  absensi: 'Absensi',
  profile: 'Profil',
};

const routes = Object.keys(JUDUL).map((name) => ({ key: `${name}-kunci`, name, params: undefined }));
const descriptors = Object.fromEntries(
  routes.map((route) => [route.key, { options: { title: JUDUL[route.name], tabBarIcon: () => null } }]),
);

const buatNavigasi = (isDicegah: boolean) => ({
  emit: jest.fn(() => ({ defaultPrevented: isDicegah })),
  navigate: jest.fn(),
});

const renderBar = (navigasi: ReturnType<typeof buatNavigasi>) =>
  render(
    <KaryawanSalesTabBar
      state={{ index: 0, routes } as never}
      descriptors={descriptors as never}
      navigation={navigasi as never}
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
    />,
  );

describe('KaryawanSalesTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { role: 'SALES', isSales: true, features: ['m_dashboard', 'm_presurvei', 'm_canvasing', 'm_absensi', 'm_work_order', 'm_barang'] },
    });
  });

  it('menampilkan tab sales dalam urutannya tanpa Work Order dan Barang', () => {
    const { getAllByRole } = renderBar(buatNavigasi(false));

    expect(getAllByRole('button').map((tombol) => tombol.props.accessibilityLabel)).toEqual([
      'Beranda',
      'Presurvei',
      'Canvasing',
      'Absensi',
      'Profil',
    ]);
  });

  it('pindah tab bila tabPress tidak dicegah', () => {
    const navigasi = buatNavigasi(false);
    const { getByLabelText } = renderBar(navigasi);

    fireEvent.press(getByLabelText('Presurvei'));

    expect(navigasi.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'presurvei/index-kunci', canPreventDefault: true });
    expect(navigasi.navigate).toHaveBeenCalledWith('presurvei/index', undefined);
  });

  it('tidak pindah bila listener layout mencegahnya (tab terkunci)', () => {
    const navigasi = buatNavigasi(true);
    const { getByLabelText } = renderBar(navigasi);

    fireEvent.press(getByLabelText('Presurvei'));

    expect(navigasi.navigate).not.toHaveBeenCalled();
  });
});
```

Di `__tests__/app/app-layout-presurvei.test.tsx`, tambahkan mock setelah mock `MitraTeknisiTabBar`:

```tsx
const mockKaryawanSalesTabBar = jest.fn(() => null);
jest.mock('@/components/organisms/navigation/KaryawanSalesTabBar', () => ({
  KaryawanSalesTabBar: (props: unknown) => mockKaryawanSalesTabBar(props),
}));
```

ganti mock `MitraSalesTabBar` menjadi:

```tsx
const mockMitraSalesTabBar = jest.fn(() => null);
jest.mock('@/components/organisms/navigation/MitraSalesTabBar', () => ({
  MitraSalesTabBar: (props: unknown) => mockMitraSalesTabBar(props),
}));
```

dan tambahkan test di dalam `describe`:

```tsx
  const renderTabBar = () => {
    const tabBar = mockPropsTabs.tabBar as ((props: unknown) => React.ReactElement) | undefined;
    if (tabBar) render(tabBar({ state: { routes: [] } }));
  };

  it('sales karyawan memakai KaryawanSalesTabBar', () => {
    renderLayout({ ...TEKNISI, isSales: true });

    renderTabBar();

    expect(mockKaryawanSalesTabBar).toHaveBeenCalledTimes(1);
    expect(mockMitraSalesTabBar).not.toHaveBeenCalled();
  });

  it('mitra sales tetap memakai MitraSalesTabBar', () => {
    renderLayout({ ...TEKNISI, employeeType: 'MITRA_SALES', isSales: true });

    renderTabBar();

    expect(mockMitraSalesTabBar).toHaveBeenCalledTimes(1);
    expect(mockKaryawanSalesTabBar).not.toHaveBeenCalled();
  });
```

Di `__tests__/app/app-layout-logging.test.tsx`, tambahkan setelah mock `MitraTeknisiTabBar` (baris 45-47):

```tsx
jest.mock('@/components/organisms/navigation/KaryawanSalesTabBar', () => ({
  KaryawanSalesTabBar: () => null,
}));
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/persona.test.ts __tests__/utils/tabKaryawanSales.test.ts __tests__/components/KaryawanSalesTabBar.test.tsx __tests__/app/app-layout-presurvei.test.tsx`
Expected: FAIL — modul belum ada; "sales karyawan memakai KaryawanSalesTabBar" gagal (`tabBar` undefined untuk KARYAWAN).

- [ ] **Step 3: Implementasi persona dan susunan tab**

```ts
// src/utils/persona.ts
import type { User } from '@/context/AuthContext';

/**
 * Persona menentukan tata letak (tab bar, Beranda, menu cepat); izin tetap
 * menentukan akses. Satu-satunya definisi persona di aplikasi.
 */
export type Persona = 'KARYAWAN_SALES' | 'KARYAWAN_TEKNISI' | 'MITRA_SALES' | 'MITRA_TEKNISI';

const PERSONA_MITRA: Record<Persona, boolean> = {
  KARYAWAN_SALES: false,
  KARYAWAN_TEKNISI: false,
  MITRA_SALES: true,
  MITRA_TEKNISI: true,
};

const PERAN_SUPER_ADMIN = 'SUPER_ADMIN';

/**
 * Persona dari data login. `employeeType` kosong diperlakukan sebagai
 * karyawan, dan pengguna yang belum dimuat sebagai teknisi karyawan — sama
 * dengan cabang bawaan lama (`dashboard.tsx:421-426`, `_layout.tsx:131-137`).
 */
export function tentukanPersona(user: Pick<User, 'employeeType' | 'isSales'> | null | undefined): Persona {
  if (user?.employeeType === 'MITRA_SALES') return 'MITRA_SALES';
  if (user?.employeeType === 'MITRA_TEKNISI') return 'MITRA_TEKNISI';
  return user?.isSales === true ? 'KARYAWAN_SALES' : 'KARYAWAN_TEKNISI';
}

/** Apakah persona adalah mitra eksternal. */
export function isPersonaMitra(persona: Persona): boolean {
  return PERSONA_MITRA[persona];
}

/** Apakah pengguna memegang fitur mobile (`m_*`); SUPER_ADMIN selalu. */
export function punyaFitur(user: Pick<User, 'role' | 'features'> | null | undefined, fitur: string): boolean {
  if (!user) return false;
  if (user.role === PERAN_SUPER_ADMIN) return true;
  return user.features?.includes(fitur) ?? false;
}
```

```ts
// src/utils/tabKaryawanSales.ts
import { AppFeature } from '@/constants/features';
import type { User } from '@/context/AuthContext';
import { punyaFitur } from './persona';

/** Urutan tab sales karyawan. Work Order dan Barang sengaja tidak ada. */
export const RUTE_TAB_KARYAWAN_SALES = [
  'dashboard',
  'presurvei/index',
  'marketing/canvasing/index',
  'absensi',
  'profile',
] as const;

export type RuteTabSales = (typeof RUTE_TAB_KARYAWAN_SALES)[number];

/** Satu tab yang tampil; terkunci berarti tampil abu-abu dan ditolak saat ditekan. */
export interface TabSales {
  rute: RuteTabSales;
  isTerkunci: boolean;
}

type PenggunaTab = Pick<User, 'role' | 'features' | 'isSales'>;

/**
 * Keterkuncian tiap tab, atau null bila tab disembunyikan. Presurvei tampil
 * terkunci sampai izin role SALES dipasang (spec §9.3); Canvasing dan Absensi
 * mempertahankan gerbang sembunyi lama (`_layout.tsx:180-183, 215`).
 */
const ATURAN_TAB: Record<RuteTabSales, (user: PenggunaTab | null) => boolean | null> = {
  dashboard: (user) => !punyaFitur(user, AppFeature.DASHBOARD),
  'presurvei/index': (user) => !punyaFitur(user, AppFeature.PRESURVEI),
  'marketing/canvasing/index': (user) =>
    punyaFitur(user, AppFeature.CANVASING) && user?.isSales === true ? false : null,
  absensi: (user) => (punyaFitur(user, AppFeature.ABSENSI) ? false : null),
  profile: () => false,
};

/** Tab sales karyawan dalam urutan tampil. Selalu array baru. */
export function susunTabKaryawanSales(user: PenggunaTab | null): TabSales[] {
  return RUTE_TAB_KARYAWAN_SALES.flatMap((rute) => {
    const isTerkunci = ATURAN_TAB[rute](user);
    return isTerkunci === null ? [] : [{ rute, isTerkunci }];
  });
}
```

- [ ] **Step 4: Implementasi tab bar**

```tsx
// src/components/organisms/navigation/TombolTabSales.tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

import type { TabSales } from '@/utils/tabKaryawanSales';

const WARNA_AKTIF = '#2563eb';
const WARNA_PASIF = '#9ca3af';
const UKURAN_IKON = 24;

type NavigasiTab = BottomTabBarProps['navigation'];

interface TombolTabSalesProps extends Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigation'> {
  tab: TabSales;
}

/**
 * Pancarkan `tabPress` agar listener layout (`handleTabPress`) bisa mencegah
 * tab terkunci atau mode cuti; pindah hanya bila tidak dicegah.
 */
function tekanTab(navigation: NavigasiTab, route: { key: string; name: string; params?: object }, isFokus: boolean) {
  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
  if (!isFokus && !event.defaultPrevented) navigation.navigate(route.name, route.params);
}

/** Satu tombol tab sales; ikon diambil dari opsi `Tabs.Screen` di layout. */
export function TombolTabSales({ tab, state, descriptors, navigation }: TombolTabSalesProps) {
  const indeks = state.routes.findIndex((route) => route.name === tab.rute);
  if (indeks < 0) return null;
  const route = state.routes[indeks];
  const { options } = descriptors[route.key];
  const isFokus = state.index === indeks;
  const isSorot = isFokus && !tab.isTerkunci;
  const label = typeof options.title === 'string' ? options.title : route.name;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFokus }}
      onPress={() => tekanTab(navigation, route, isFokus)}
      style={tw`flex-1 items-center`}
    >
      {options.tabBarIcon?.({ focused: isFokus, color: isSorot ? WARNA_AKTIF : WARNA_PASIF, size: UKURAN_IKON })}
      <Text style={tw`text-xs font-medium mt-1 ${isSorot ? 'text-blue-600' : 'text-gray-400'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
```

```tsx
// src/components/organisms/navigation/KaryawanSalesTabBar.tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { useAuth } from '@/context/AuthContext';
import { susunTabKaryawanSales } from '@/utils/tabKaryawanSales';
import { TombolTabSales } from './TombolTabSales';

const JARAK_BAWAH_MIN = 10;

/** Tab bar sales karyawan: whitelist rute dalam urutan `RUTE_TAB_KARYAWAN_SALES`. */
export function KaryawanSalesTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  return (
    <View style={[tw`flex-row bg-white border-t border-gray-200 pt-2`, { paddingBottom: Math.max(insets.bottom, JARAK_BAWAH_MIN) }]}>
      {susunTabKaryawanSales(user).map((tab) => (
        <TombolTabSales key={tab.rute} tab={tab} state={state} descriptors={descriptors} navigation={navigation} />
      ))}
    </View>
  );
}
```

- [ ] **Step 5: Ubah layout**

Di `app/(app)/_layout.tsx`:

1. Tambah impor (setelah impor `MitraTeknisiTabBar`):

```tsx
import { KaryawanSalesTabBar } from '@/components/organisms/navigation/KaryawanSalesTabBar';
import { isPersonaMitra, punyaFitur, tentukanPersona, type Persona } from '@/utils/persona';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
```

2. Tambah konstanta modul setelah `APP_DASHBOARD_ROUTE` (baris 26):

```tsx
/** Tab bar per persona; `undefined` = tab bar bawaan (teknisi karyawan, tidak berubah). */
const TAB_BAR_PER_PERSONA: Record<Persona, ((props: BottomTabBarProps) => React.ReactNode) | undefined> = {
  KARYAWAN_SALES: (props) => <KaryawanSalesTabBar {...props} />,
  KARYAWAN_TEKNISI: undefined,
  MITRA_SALES: (props) => <MitraSalesTabBar {...props} />,
  MITRA_TEKNISI: (props) => <MitraTeknisiTabBar {...props} />,
};
```

3. Ganti baris 57-64 (`const isMitra = …` sampai akhir `hasFeature`) dengan:

```tsx
  const persona = tentukanPersona(user);
  const isMitra = isPersonaMitra(persona);

  const hasFeature = (feature: AppFeature | string) => punyaFitur(user, feature);
```

4. Ganti prop `tabBar={ … }` (baris 131-137) dengan:

```tsx
        tabBar={TAB_BAR_PER_PERSONA[persona]}
```

Tambahkan `import React` bila `React.ReactNode` belum terjangkau: ubah baris impor `react` menjadi `import React, { Fragment, useEffect, useState } from "react";`.

- [ ] **Step 6: Jalankan test dan typecheck**

Run: `npx jest __tests__/utils/persona.test.ts __tests__/utils/tabKaryawanSales.test.ts __tests__/components/KaryawanSalesTabBar.test.tsx __tests__/app/app-layout-presurvei.test.tsx __tests__/app/app-layout-logging.test.tsx`
Expected: semua PASS — termasuk "teknisi karyawan tetap melihat tab yang sama seperti sebelumnya" dari Task 13.

Run: `npx tsc --noEmit && npx expo lint`
Expected: exit 0; tidak ada `StyleSheet.create` di berkas baru (`grep -n "StyleSheet" src/components/organisms/navigation/KaryawanSalesTabBar.tsx src/components/organisms/navigation/TombolTabSales.tsx` → kosong).

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `tentukanPersona` memeriksa `isSales` sebelum `employeeType` | "employeeType MITRA_SALES × isSales true → MITRA_SALES" dan "MITRA_TEKNISI × true" |
| `user?.isSales === true` jadi `Boolean(user?.employeeType)` | "employeeType KARYAWAN × isSales false → KARYAWAN_TEKNISI" |
| `MITRA_TEKNISI: false` di `PERSONA_MITRA` | "hanya persona mitra yang dianggap mitra" |
| Hapus cabang `SUPER_ADMIN` di `punyaFitur` | "SUPER_ADMIN selalu punya fitur…" |
| Tukar `'presurvei/index'` dan `'marketing/canvasing/index'` di `RUTE_TAB_KARYAWAN_SALES` | "urutan Beranda · Presurvei · Canvasing…" dan "menampilkan tab sales dalam urutannya…" |
| Tambah `'work-order'` ke `RUTE_TAB_KARYAWAN_SALES` (dengan aturan `() => false`) | "urutan … tanpa Work Order dan Barang" |
| Aturan Presurvei mengembalikan `null` bila tanpa izin | "menampilkan Presurvei terkunci bagi sales tanpa m_presurvei" |
| Aturan Canvasing mengembalikan `true` (terkunci) alih-alih `null` | "Canvasing dan Absensi mengikuti gerbang lama…" |
| `tekanTab` memanggil `navigate` tanpa memeriksa `defaultPrevented` | "tidak pindah bila listener layout mencegahnya" |
| `KARYAWAN_SALES: undefined` di `TAB_BAR_PER_PERSONA` | "sales karyawan memakai KaryawanSalesTabBar" |
| `KARYAWAN_TEKNISI: (props) => <KaryawanSalesTabBar {...props} />` | "teknisi karyawan tetap melihat tab yang sama seperti sebelumnya" (`tabBar` tidak lagi undefined) |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add src/utils/persona.ts src/utils/tabKaryawanSales.ts src/components/organisms/navigation/TombolTabSales.tsx src/components/organisms/navigation/KaryawanSalesTabBar.tsx "app/(app)/_layout.tsx" __tests__/utils/persona.test.ts __tests__/utils/tabKaryawanSales.test.ts __tests__/components/KaryawanSalesTabBar.test.tsx __tests__/app/app-layout-presurvei.test.tsx __tests__/app/app-layout-logging.test.tsx
git commit -m "$(cat <<'EOF'
feat(navigation): persona sales karyawan dengan tab bar presurvei

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: QuickMenu — `menuIds` dan tile Presurvei

**Repo:** `mobile-netmanager`

**Files:**
- Modify: `src/components/organisms/dashboard/QuickMenu.tsx:1-219`
- Test: `__tests__/components/QuickMenu.test.tsx` (tambah test)

**Interfaces:**
- Consumes: `AppFeature.PRESURVEI` (Task 6).
- Produces:
  - `type IdMenuCepat = 'request-wo' | 'topology' | 'barang-keluar' | 'izin' | 'lembur' | 'chat' | 'holidays' | 'canvasing' | 'isolir' | 'presurvei'`
  - Prop baru `menuIds?: readonly IdMenuCepat[]` — bila diisi, hanya menu itu yang tampil (tetap diperiksa izinnya).
  - Tile `Presurvei` → `/(app)/presurvei`, `internalOnly`, `hideWhenLocked`: hanya tampil bila berizin, tidak pernah untuk mitra.

- [ ] **Step 1: Tulis test yang gagal**

Tambahkan di dalam `describe('QuickMenu', ...)` di `__tests__/components/QuickMenu.test.tsx`:

```tsx
  it('tidak menampilkan Presurvei bagi teknisi tanpa m_presurvei', () => {
    const { queryByText } = renderMenu({ isMitra: false, features: [AppFeature.WORK_ORDER] });

    expect(queryByText('Presurvei')).toBeNull();
  });

  it('menampilkan Presurvei aktif bagi teknisi ber-izin dan membuka tab presurvei', () => {
    const { getByText } = renderMenu({ isMitra: false, features: [AppFeature.PRESURVEI] });

    fireEvent.press(getByText('Presurvei'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/presurvei');
  });

  it('mitra tidak pernah melihat Presurvei walau punya m_presurvei', () => {
    const { queryByText } = renderMenu({ isMitra: true, features: [AppFeature.PRESURVEI] });

    expect(queryByText('Presurvei')).toBeNull();
  });

  it('menuIds membatasi menu cepat pada id yang diminta', () => {
    const { getByText, queryByText } = renderMenu({
      isMitra: false,
      features: [AppFeature.CHAT, AppFeature.IZIN, AppFeature.WORK_ORDER, AppFeature.LEMBUR, AppFeature.PRESURVEI],
      menuIds: ['chat', 'izin'],
    });

    expect(getByText('Chat')).toBeTruthy();
    expect(getByText('Izin & Cuti')).toBeTruthy();
    expect(queryByText('Request WO')).toBeNull();
    expect(queryByText('Lembur')).toBeNull();
    expect(queryByText('Presurvei')).toBeNull();
  });

  it('mitra tetap tidak melihat Izin & Cuti dan Lembur', () => {
    // Dulu disaring lewat judul (QuickMenu.tsx:147); kini lewat id.
    const { queryByText } = renderMenu({ isMitra: true, features: [] });

    expect(queryByText('Izin & Cuti')).toBeNull();
    expect(queryByText('Lembur')).toBeNull();
  });

  it('menuIds tidak melewati pemeriksaan izin', () => {
    const { Alert } = require('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText } = renderMenu({ isMitra: false, features: [], menuIds: ['chat'] });

    fireEvent.press(getByText('Chat'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Akses Terbatas', expect.any(String), expect.any(Array));
    alert.mockRestore();
  });
```

Ubah baris impor `@testing-library/react-native` di berkas itu menjadi:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/components/QuickMenu.test.tsx`
Expected: FAIL — tile Presurvei tidak ada; `menuIds` diabaikan (Request WO tampil). Empat test lama PASS.

- [ ] **Step 3: Implementasi**

Di `src/components/organisms/dashboard/QuickMenu.tsx`:

1. Tambah `ClipboardCheck` ke impor `lucide-react-native`.

2. Ganti `interface QuickMenuProps` dan `interface MenuItem` dengan:

```tsx
/** Id stabil tiap menu cepat; dipakai `menuIds` dan sebagai `key`. */
export type IdMenuCepat =
  | 'request-wo'
  | 'topology'
  | 'barang-keluar'
  | 'izin'
  | 'lembur'
  | 'chat'
  | 'holidays'
  | 'canvasing'
  | 'isolir'
  | 'presurvei';

interface QuickMenuProps {
  features?: string[];
  isSales?: boolean;
  role?: string;
  isMitra?: boolean;
  /** Bila diisi, hanya menu ini yang tampil (izin tetap diperiksa). */
  menuIds?: readonly IdMenuCepat[];
}

interface MenuItem {
  id: IdMenuCepat;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  route: string;
  requiredFeatures: string[];
  requiresSales?: boolean;
  /** Menu khusus karyawan internal; tidak ditampilkan sama sekali ke mitra. */
  internalOnly?: boolean;
  /** Sembunyikan (bukan kunci) bila tidak berizin. */
  hideWhenLocked?: boolean;
}

/** Menu karyawan yang tidak berlaku bagi mitra (mitra tanpa absensi/cuti). */
const MENU_BUKAN_UNTUK_MITRA: readonly IdMenuCepat[] = ['izin', 'lembur'];
```

3. Tambahkan `id` ke setiap item `MENU_ITEMS`, berurutan: `'request-wo'`, `'topology'`, `'barang-keluar'`, `'izin'`, `'lembur'`, `'chat'`, `'holidays'`, `'canvasing'`, `'isolir'`. Setelah item Canvasing, sisipkan:

```tsx
  {
    id: 'presurvei',
    title: "Presurvei",
    subtitle: "Kunjungan & Prospek",
    icon: ClipboardCheck,
    color: "bg-emerald-50",
    iconColor: "#059669",
    route: "/(app)/presurvei",
    requiredFeatures: [AppFeature.PRESURVEI],
    // Presurvei untuk teknisi hanya lewat izin role; mitra tidak memakainya.
    internalOnly: true,
    hideWhenLocked: true,
  },
```

4. Tambah `menuIds` ke destrukturisasi props, lalu ganti `processedMenuItems` (baris 144-155) dengan:

```tsx
  const processedMenuItems = useMemo(
    () =>
      MENU_ITEMS
        .filter((item) => !isMitra || (!item.internalOnly && !MENU_BUKAN_UNTUK_MITRA.includes(item.id)))
        .filter((item) => menuIds === undefined || menuIds.includes(item.id))
        .map((item) => ({
          ...item,
          enabled: hasFeature(item.requiredFeatures) && (!item.requiresSales || isSales),
        }))
        .filter((item) => item.enabled || !item.hideWhenLocked),
    [hasFeature, isSales, isMitra, menuIds],
  );
```

5. Ganti `key={index}` pada `TouchableOpacity` menjadi `key={item.id}` dan hapus parameter `index` dari callback `map`.

- [ ] **Step 4: Jalankan test dan typecheck**

Run: `npx jest __tests__/components/QuickMenu.test.tsx`
Expected: 10 PASS.

Run: `npx tsc --noEmit && npx expo lint`
Expected: exit 0.

- [ ] **Step 5: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| Hapus `.filter((item) => item.enabled \|\| !item.hideWhenLocked)` | "tidak menampilkan Presurvei bagi teknisi tanpa m_presurvei" |
| Hapus `internalOnly: true` dari item Presurvei | "mitra tidak pernah melihat Presurvei walau punya m_presurvei" |
| Route Presurvei jadi `/(app)/presurvei/index` | "menampilkan Presurvei aktif … membuka tab presurvei" |
| Hapus filter `menuIds` | "menuIds membatasi menu cepat pada id yang diminta" |
| `enabled: true` bila `menuIds` diisi | "menuIds tidak melewati pemeriksaan izin" |
| `MENU_BUKAN_UNTUK_MITRA = []` | "mitra tetap tidak melihat Izin & Cuti dan Lembur" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/dashboard/QuickMenu.tsx __tests__/components/QuickMenu.test.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): menu cepat presurvei untuk teknisi ber-izin dan filter menuIds

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Beranda sales

**Repo:** `mobile-netmanager`

**Files:**
- Create: `src/utils/presurvei/berandaSales.ts`
- Create: `src/hooks/useStatusAbsenHariIni.ts`
- Create: `src/components/organisms/dashboard/KartuAbsenHariIni.tsx`
- Create: `src/components/organisms/dashboard/KartuKegiatanHariIni.tsx`
- Create: `src/components/organisms/dashboard/KartuTargetBulanIni.tsx`
- Create: `src/components/organisms/dashboard/DaftarPerluFollowUp.tsx`
- Create: `src/components/organisms/dashboard/BagianPresurveiBeranda.tsx`
- Create: `src/components/screens/KaryawanSalesDashboardScreen.tsx`
- Modify: `app/(app)/dashboard.tsx:1-23` (impor), `:409-427` (multiplexer per persona)
- Test: `__tests__/utils/presurvei/berandaSales.test.ts`, `__tests__/hooks/useStatusAbsenHariIni.test.ts`, `__tests__/components/BagianPresurveiBeranda.test.tsx`, `__tests__/components/KaryawanSalesDashboardScreen.test.tsx`, `__tests__/app/dashboard-persona.test.tsx`

**Interfaces:**
- Consumes: Task 8 — `useRingkasanPresurvei`, `useKegiatanMenungguKirim`, `useSegarkanPresurveiSetelahSinkron`, `isAksesDitolak`; Task 14 — `ruteRincianProspek`; Task 17 — `tentukanPersona`, `punyaFitur`, `Persona`; Task 18 — `QuickMenu` + `IdMenuCepat`; `useApiQuery` (`src/hooks/queries/useApiQuery.ts:50`); `queryKeys.attendance.status` (`src/lib/queryClient.ts:175`); `AttendanceUiStatus` (`src/utils/attendanceStatus.ts:3`); `DashboardHeader` (`src/components/organisms/dashboard/DashboardHeader.tsx:8-16`).
- Produces:
  - `interface RekapKegiatanHariIni { kunjungan: number; survei: number; teleponChat: number }`, `rekapKegiatanHariIni(hitungan: Record<KegiatanJenis, number>): RekapKegiatanHariIni`
  - `TEKS_TARGET_BELUM_DITETAPKAN`, `interface BarisTargetBeranda { label: string; teks: string; persen: number }`, `barisTargetBeranda(target: TargetBulanIni | null): BarisTargetBeranda[] | null`
  - `interface StatusAbsenRingkas { status: AttendanceUiStatus; checkInTime: string | null; checkOutTime: string | null }`, `teksStatusAbsen(status: StatusAbsenRingkas | null): string`
  - `type KeadaanRingkasan = 'belum-aktif' | 'memuat' | 'galat' | 'siap'`, `keadaanRingkasan(masukan: { isPresurveiAktif: boolean; hasData: boolean; error: unknown }): KeadaanRingkasan`
  - `ENDPOINT_STATUS_ABSEN`, `useStatusAbsenHariIni()`
  - `TEKS_PRESURVEI_BELUM_AKTIF`, `BagianPresurveiBeranda(props: { isPresurveiAktif: boolean })`
  - `KaryawanSalesDashboardScreen()`; `Dashboard` default export memilih layar lewat `tentukanPersona`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// __tests__/utils/presurvei/berandaSales.test.ts
import { describe, expect, it } from '@jest/globals';

import {
  barisTargetBeranda,
  keadaanRingkasan,
  rekapKegiatanHariIni,
  TEKS_TARGET_BELUM_DITETAPKAN,
  teksStatusAbsen,
} from '@/utils/presurvei/berandaSales';

describe('rekapKegiatanHariIni', () => {
  it('menjumlahkan telepon dan chat, tanpa iklan', () => {
    expect(
      rekapKegiatanHariIni({ KUNJUNGAN: 3, SURVEI_LOKASI: 1, TELEPON: 4, CHAT: 2, IKLAN: 9 }),
    ).toEqual({ kunjungan: 3, survei: 1, teleponChat: 6 });
  });
});

describe('barisTargetBeranda', () => {
  it('target belum ditetapkan tetap null, bukan baris nol', () => {
    expect(barisTargetBeranda(null)).toBeNull();
    expect(TEKS_TARGET_BELUM_DITETAPKAN).toBe('Target belum ditetapkan');
  });

  it('tiga baris berurutan dengan angka tercapai / target', () => {
    expect(
      barisTargetBeranda({
        periodeTahun: 2026,
        periodeBulan: 9,
        kunjungan: { target: 20, tercapai: 10, persen: 50 },
        prospek: { target: 10, tercapai: 3, persen: 30 },
        konversi: { target: 5, tercapai: 1, persen: 20 },
      }),
    ).toEqual([
      { label: 'Kunjungan', teks: '10 / 20', persen: 50 },
      { label: 'Prospek', teks: '3 / 10', persen: 30 },
      { label: 'Konversi', teks: '1 / 5', persen: 20 },
    ]);
  });
});

describe('teksStatusAbsen', () => {
  it.each([
    [null, 'Status absen belum dimuat'],
    [{ status: 'idle', checkInTime: null, checkOutTime: null }, 'Belum check-in'],
    [{ status: 'checked-in', checkInTime: '07:58', checkOutTime: null }, 'Check-in 07:58'],
    [{ status: 'checked-out', checkInTime: '07:58', checkOutTime: '17:02' }, 'Selesai 07:58–17:02'],
  ] as const)('%j → %s', (status, harapan) => {
    expect(teksStatusAbsen(status)).toBe(harapan);
  });
});

describe('keadaanRingkasan', () => {
  const galat403 = { isAxiosError: true, response: { status: 403 } };
  const galat500 = { isAxiosError: true, response: { status: 500 } };

  it.each([
    [{ isPresurveiAktif: false, hasData: false, error: null }, 'belum-aktif'],
    [{ isPresurveiAktif: true, hasData: false, error: galat403 }, 'belum-aktif'],
    [{ isPresurveiAktif: true, hasData: false, error: null }, 'memuat'],
    [{ isPresurveiAktif: true, hasData: false, error: galat500 }, 'galat'],
    [{ isPresurveiAktif: true, hasData: true, error: galat500 }, 'siap'],
  ] as const)('%j → %s', (masukan, harapan) => {
    expect(keadaanRingkasan(masukan)).toBe(harapan);
  });
});
```

```ts
// __tests__/hooks/useStatusAbsenHariIni.test.ts
import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockUseApiQuery = jest.fn();
jest.mock('@/hooks/queries/useApiQuery', () => ({ useApiQuery: (opsi: unknown) => mockUseApiQuery(opsi) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' }, token: 'tkn' }) }));

import { useStatusAbsenHariIni } from '@/hooks/useStatusAbsenHariIni';

describe('useStatusAbsenHariIni', () => {
  it('memakai query key dan endpoint yang sama dengan layar Absensi', () => {
    renderHook(() => useStatusAbsenHariIni());

    expect(mockUseApiQuery).toHaveBeenCalledWith({
      queryKey: ['attendance', 'status', 'u-1'],
      endpoint: '/api/mobile/attendance/status',
      enabled: true,
    });
  });
});
```

```tsx
// __tests__/components/BagianPresurveiBeranda.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockUseRingkasan = jest.fn();
const mockUseAntrean = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/queries/useRingkasanPresurvei', () => ({
  useRingkasanPresurvei: (isAktif: boolean) => mockUseRingkasan(isAktif),
}));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({ useKegiatanMenungguKirim: () => mockUseAntrean() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { BagianPresurveiBeranda, TEKS_PRESURVEI_BELUM_AKTIF } from '@/components/organisms/dashboard/BagianPresurveiBeranda';

const RINGKASAN = {
  tanggal: '2026-09-24',
  kegiatanHariIni: { KUNJUNGAN: 3, SURVEI_LOKASI: 1, TELEPON: 4, CHAT: 2, IKLAN: 0 },
  target: null,
  perluFollowUp: [
    { id: 'p-1', nama: 'Budi Santoso', noTelp: '081234567890', status: 'TERTARIK', sentuhanTerakhir: '2026-09-10T00:00:00.000Z' },
  ],
};

describe('BagianPresurveiBeranda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRingkasan.mockReturnValue({ data: RINGKASAN, error: null, refetch: jest.fn() });
    mockUseAntrean.mockReturnValue({ data: [{ idAntrean: 1 }, { idAntrean: 2 }] });
  });

  it('tanpa m_presurvei tidak memanggil ringkasan dan menampilkan pesan belum aktif', () => {
    mockUseRingkasan.mockReturnValue({ data: undefined, error: null, refetch: jest.fn() });
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif={false} />);

    expect(mockUseRingkasan).toHaveBeenCalledWith(false);
    expect(getByText(TEKS_PRESURVEI_BELUM_AKTIF)).toBeTruthy();
  });

  it('403 dari server ditampilkan sebagai belum aktif, bukan galat', () => {
    mockUseRingkasan.mockReturnValue({
      data: undefined,
      error: { isAxiosError: true, response: { status: 403 } },
      refetch: jest.fn(),
    });
    const { getByText, queryByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText(TEKS_PRESURVEI_BELUM_AKTIF)).toBeTruthy();
    expect(queryByText('Gagal Memuat Data')).toBeNull();
  });

  it('target belum ditetapkan tidak ditampilkan sebagai 0%', () => {
    const { getByText, queryByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('Target belum ditetapkan')).toBeTruthy();
    expect(queryByText(/0%/)).toBeNull();
  });

  it('menampilkan rekap hari ini dan jumlah menunggu kirim', () => {
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
    expect(getByText('Menunggu kirim: 2')).toBeTruthy();
  });

  it('prospek perlu follow-up membuka rinciannya', () => {
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    fireEvent.press(getByText('Budi Santoso'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/presurvei/prospek/[id]', params: { id: 'p-1' } });
  });
});
```

```tsx
// __tests__/components/KaryawanSalesDashboardScreen.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
let mockPropsMenu: Record<string, unknown> = {};
let mockPropsPresurvei: { isPresurveiAktif?: boolean } = {};

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({ useSegarkanPresurveiSetelahSinkron: jest.fn() }));
jest.mock('@/components/organisms/dashboard/QuickMenu', () => ({
  QuickMenu: (props: Record<string, unknown>) => {
    mockPropsMenu = props;
    return null;
  },
}));
jest.mock('@/components/organisms/dashboard/BagianPresurveiBeranda', () => ({
  BagianPresurveiBeranda: (props: { isPresurveiAktif: boolean }) => {
    mockPropsPresurvei = props;
    return null;
  },
}));
jest.mock('@/components/organisms/dashboard/KartuAbsenHariIni', () => ({ KartuAbsenHariIni: () => null }));
jest.mock('@/components/organisms/dashboard/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('twrnc', () => () => ({}));

import { KaryawanSalesDashboardScreen } from '@/components/screens/KaryawanSalesDashboardScreen';

const sales = (features: string[]) => ({
  user: { id: 'u-1', name: 'Sari', role: 'SALES', isSales: true, employeeType: 'KARYAWAN', features },
});

describe('KaryawanSalesDashboardScreen', () => {
  beforeEach(() => {
    mockPropsMenu = {};
    mockPropsPresurvei = {};
  });

  it('menu cepat sales hanya Chat dan Izin/Cuti', () => {
    mockUseAuth.mockReturnValue(sales(['m_chat', 'm_izin']));

    render(<KaryawanSalesDashboardScreen />);

    expect(mockPropsMenu.menuIds).toEqual(['chat', 'izin']);
    expect(mockPropsMenu.isMitra).toBe(false);
  });

  it('presurvei di Beranda aktif hanya bila berizin m_presurvei', () => {
    mockUseAuth.mockReturnValue(sales(['m_presurvei']));
    render(<KaryawanSalesDashboardScreen />);
    expect(mockPropsPresurvei.isPresurveiAktif).toBe(true);

    mockUseAuth.mockReturnValue(sales([]));
    render(<KaryawanSalesDashboardScreen />);
    expect(mockPropsPresurvei.isPresurveiAktif).toBe(false);
  });
});
```

```tsx
// __tests__/app/dashboard-persona.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Multiplexer Beranda. `ScreenErrorBoundary` untuk Beranda teknisi dimock
 * menjadi penanda tanpa merender anaknya, supaya `DashboardScreen` lama
 * (banyak query) tidak ikut berjalan.
 */

const mockUseAuth = jest.fn();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/components/screens/MitraSalesDashboardScreen', () => {
  const { Text } = require('react-native');
  return { MitraSalesDashboardScreen: () => <Text>layar-mitra-sales</Text> };
});
jest.mock('@/components/screens/MitraTeknisiDashboardScreen', () => {
  const { Text } = require('react-native');
  return { MitraTeknisiDashboardScreen: () => <Text>layar-mitra-teknisi</Text> };
});
jest.mock('@/components/screens/KaryawanSalesDashboardScreen', () => {
  const { Text } = require('react-native');
  return { KaryawanSalesDashboardScreen: () => <Text>layar-karyawan-sales</Text> };
});
jest.mock('@/components/atoms/ScreenErrorBoundary', () => {
  const { Text } = require('react-native');
  return {
    ScreenErrorBoundary: ({ screenName, children }: { screenName: string; children: React.ReactNode }) =>
      screenName === 'Dashboard' ? <Text>batas:Dashboard</Text> : <>{children}</>,
  };
});
jest.mock('@/components/molecules/DashboardSkeleton', () => ({ DashboardSkeleton: () => null }));
jest.mock('@/components/organisms/dashboard/CanvasingCard', () => ({ CanvasingCard: () => null }));
jest.mock('@/components/organisms/dashboard/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('@/components/organisms/dashboard/PerformanceStats', () => ({ PerformanceStats: () => null }));
jest.mock('@/components/organisms/dashboard/QuickMenu', () => ({ QuickMenu: () => null }));
jest.mock('@/components/organisms/dashboard/WorkOrderCard', () => ({ WorkOrderCard: () => null }));
jest.mock('@/hooks/queries', () => ({ useMutation: jest.fn(), useOfflineQuery: jest.fn() }));
jest.mock('@/hooks/useProfileSync', () => ({ useProfileSync: () => ({ profileData: null }) }));
jest.mock('@/lib/queryClient', () => ({ queryKeys: {} }));
jest.mock('@/services/TenantService', () => ({ TenantService: {} }));
jest.mock('@/services/api', () => ({ __esModule: true, default: {} }));
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));
jest.mock('@shopify/flash-list', () => ({ FlashList: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('twrnc', () => () => ({}));

const renderBeranda = (user: Record<string, unknown>) => {
  mockUseAuth.mockReturnValue({ user });
  const Dashboard = require('../../app/(app)/dashboard').default;
  return render(<Dashboard />);
};

describe('Beranda per persona', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [{ employeeType: 'KARYAWAN', isSales: true }, 'layar-karyawan-sales'],
    [{ employeeType: 'KARYAWAN', isSales: false }, 'batas:Dashboard'],
    [{ employeeType: 'MITRA_SALES', isSales: true }, 'layar-mitra-sales'],
    [{ employeeType: 'MITRA_TEKNISI', isSales: false }, 'layar-mitra-teknisi'],
  ])('%j → %s', (user, penanda) => {
    const { getByText } = renderBeranda(user);

    expect(getByText(penanda)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx jest __tests__/utils/presurvei/berandaSales.test.ts __tests__/hooks/useStatusAbsenHariIni.test.ts __tests__/components/BagianPresurveiBeranda.test.tsx __tests__/components/KaryawanSalesDashboardScreen.test.tsx __tests__/app/dashboard-persona.test.tsx`
Expected: FAIL — modul belum ada; `dashboard-persona` untuk sales karyawan menampilkan `batas:Dashboard`.

- [ ] **Step 3: Implementasi utilitas dan hook**

```ts
// src/utils/presurvei/berandaSales.ts
import type { KegiatanJenis } from '@/constants/presurvei';
import type { BarisPencapaian, TargetBulanIni } from '@/types/presurvei';
import type { AttendanceUiStatus } from '@/utils/attendanceStatus';
import { isAksesDitolak } from '@/utils/httpStatus';

/** Rekap kegiatan hari ini untuk Beranda; Iklan bukan pekerjaan sales. */
export interface RekapKegiatanHariIni {
  kunjungan: number;
  survei: number;
  teleponChat: number;
}

/** Rekap dari hitungan per jenis ringkasan server. */
export function rekapKegiatanHariIni(hitungan: Record<KegiatanJenis, number>): RekapKegiatanHariIni {
  return {
    kunjungan: hitungan.KUNJUNGAN,
    survei: hitungan.SURVEI_LOKASI,
    teleponChat: hitungan.TELEPON + hitungan.CHAT,
  };
}

/** Teks bila target bulan ini belum ada — bukan 0% (spec §5.3). */
export const TEKS_TARGET_BELUM_DITETAPKAN = 'Target belum ditetapkan';

/** Satu baris target di Beranda. */
export interface BarisTargetBeranda {
  label: string;
  teks: string;
  persen: number;
}

const baris = (label: string, pencapaian: BarisPencapaian): BarisTargetBeranda => ({
  label,
  teks: `${pencapaian.tercapai} / ${pencapaian.target}`,
  persen: pencapaian.persen,
});

/** Baris target, atau null bila target belum ditetapkan. */
export function barisTargetBeranda(target: TargetBulanIni | null): BarisTargetBeranda[] | null {
  if (target === null) return null;
  return [
    baris('Kunjungan', target.kunjungan),
    baris('Prospek', target.prospek),
    baris('Konversi', target.konversi),
  ];
}

/** Bagian respons `/api/mobile/attendance/status` yang dibaca Beranda. */
export interface StatusAbsenRingkas {
  status: AttendanceUiStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
}

/** Teks kartu absen hari ini. */
export function teksStatusAbsen(status: StatusAbsenRingkas | null): string {
  if (status === null) return 'Status absen belum dimuat';
  if (status.status === 'checked-in') return status.checkInTime ? `Check-in ${status.checkInTime}` : 'Sudah check-in';
  if (status.status === 'checked-out') return `Selesai ${status.checkInTime ?? '-'}–${status.checkOutTime ?? '-'}`;
  return 'Belum check-in';
}

export type KeadaanRingkasan = 'belum-aktif' | 'memuat' | 'galat' | 'siap';

/**
 * Keadaan bagian presurvei Beranda. 403 diperlakukan sama dengan belum
 * berizin: sebelum migration izin SALES (Task 20), server menolak dengan 403
 * dan itu bukan galat yang perlu dicoba ulang oleh sales.
 */
export function keadaanRingkasan(masukan: {
  isPresurveiAktif: boolean;
  hasData: boolean;
  error: unknown;
}): KeadaanRingkasan {
  if (!masukan.isPresurveiAktif || isAksesDitolak(masukan.error)) return 'belum-aktif';
  if (masukan.hasData) return 'siap';
  if (masukan.error) return 'galat';
  return 'memuat';
}
```

```ts
// src/hooks/useStatusAbsenHariIni.ts
import { useAuth } from '@/context/AuthContext';
import { useApiQuery } from '@/hooks/queries/useApiQuery';
import { queryKeys } from '@/lib/queryClient';
import type { StatusAbsenRingkas } from '@/utils/presurvei/berandaSales';

/** Endpoint status absen; sama dengan layar Absensi (`absensi.tsx:581-607`). */
export const ENDPOINT_STATUS_ABSEN = '/api/mobile/attendance/status';

interface ResponsStatusAbsen {
  success: boolean;
  data: StatusAbsenRingkas;
}

/** Status absen hari ini; query key sama dengan layar Absensi sehingga cache dipakai bersama. */
export function useStatusAbsenHariIni() {
  const { user, token } = useAuth();
  return useApiQuery<ResponsStatusAbsen>({
    queryKey: queryKeys.attendance.status(user?.id),
    endpoint: ENDPOINT_STATUS_ABSEN,
    enabled: !!token,
  });
}
```

- [ ] **Step 4: Implementasi komponen**

```tsx
// src/components/organisms/dashboard/KartuAbsenHariIni.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

import { useStatusAbsenHariIni } from '@/hooks/useStatusAbsenHariIni';
import { teksStatusAbsen } from '@/utils/presurvei/berandaSales';

/** Kartu absen baca-saja; check-in/out tetap di layar Absensi (selfie, geofence). */
export function KartuAbsenHariIni() {
  const router = useRouter();
  const status = useStatusAbsenHariIni();
  return (
    <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(app)/absensi')} style={tw`bg-white rounded-2xl p-4 mx-4 mb-4 border border-gray-100`}>
      <Text style={tw`text-xs text-gray-500`}>Absen hari ini</Text>
      <Text style={tw`text-base font-bold text-gray-900 mt-1`}>{teksStatusAbsen(status.data?.data ?? null)}</Text>
      <Text style={tw`text-xs text-blue-600 mt-2`}>Buka Absensi</Text>
    </TouchableOpacity>
  );
}
```

```tsx
// src/components/organisms/dashboard/KartuKegiatanHariIni.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { RekapKegiatanHariIni } from '@/utils/presurvei/berandaSales';

interface KartuKegiatanHariIniProps {
  rekap: RekapKegiatanHariIni;
  jumlahMenunggu: number;
}

/** Jumlah kegiatan hari ini dan yang masih menunggu kirim. */
export function KartuKegiatanHariIni({ rekap, jumlahMenunggu }: KartuKegiatanHariIniProps) {
  const statistik = [
    { label: 'Kunjungan', nilai: rekap.kunjungan },
    { label: 'Survei', nilai: rekap.survei },
    { label: 'Telepon/Chat', nilai: rekap.teleponChat },
  ];
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Hari ini</Text>
      <View style={tw`flex-row`}>
        {statistik.map((item) => (
          <View key={item.label} style={tw`flex-1 items-center`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>{String(item.nilai)}</Text>
            <Text style={tw`text-xs text-gray-500`}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={tw`text-xs text-amber-700 mt-3`}>{`Menunggu kirim: ${jumlahMenunggu}`}</Text>
    </View>
  );
}
```

```tsx
// src/components/organisms/dashboard/KartuTargetBulanIni.tsx
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import type { TargetBulanIni } from '@/types/presurvei';
import { barisTargetBeranda, TEKS_TARGET_BELUM_DITETAPKAN } from '@/utils/presurvei/berandaSales';

interface KartuTargetBulanIniProps {
  target: TargetBulanIni | null;
}

/** Target bulan ini vs realisasi; target kosong ditulis apa adanya, bukan 0%. */
export function KartuTargetBulanIni({ target }: KartuTargetBulanIniProps) {
  const daftar = barisTargetBeranda(target);
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Target bulan ini</Text>
      {daftar === null ? (
        <Text style={tw`text-sm text-gray-500`}>{TEKS_TARGET_BELUM_DITETAPKAN}</Text>
      ) : (
        daftar.map((baris) => (
          <View key={baris.label} style={tw`mb-2`}>
            <View style={tw`flex-row justify-between`}>
              <Text style={tw`text-sm text-gray-700`}>{baris.label}</Text>
              <Text style={tw`text-sm text-gray-900`}>{baris.teks}</Text>
            </View>
            <View style={tw`h-2 bg-gray-100 rounded-full mt-1`}>
              <View style={[tw`h-2 bg-blue-600 rounded-full`, { width: `${baris.persen}%` }]} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}
```

```tsx
// src/components/organisms/dashboard/DaftarPerluFollowUp.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LABEL_STATUS_PROSPEK } from '@/constants/presurvei';
import type { ProspekPerluFollowUp } from '@/types/presurvei';
import { formatDate } from '@/utils/date';

interface DaftarPerluFollowUpProps {
  prospek: ProspekPerluFollowUp[];
  onBuka: (id: string) => void;
}

/** Prospek aktif yang paling lama tidak disentuh (maks. 5, dari server). */
export function DaftarPerluFollowUp({ prospek, onBuka }: DaftarPerluFollowUpProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 border border-gray-100`}>
      <Text style={tw`font-bold text-gray-900 mb-2`}>Perlu di-follow-up</Text>
      {prospek.length === 0 ? <Text style={tw`text-sm text-gray-500`}>Tidak ada prospek yang menunggu.</Text> : null}
      {prospek.map((item) => (
        <TouchableOpacity key={item.id} accessibilityRole="button" onPress={() => onBuka(item.id)} style={tw`py-2 border-b border-gray-100`}>
          <Text style={tw`text-sm font-semibold text-gray-900`}>{item.nama}</Text>
          <Text style={tw`text-xs text-gray-500`}>
            {`${LABEL_STATUS_PROSPEK[item.status]} · terakhir ${formatDate(item.sentuhanTerakhir, 'dd MMM')}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

```tsx
// src/components/organisms/dashboard/BagianPresurveiBeranda.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import tw from 'twrnc';

import { QueryErrorState } from '@/components/molecules/QueryErrorState';
import { ruteRincianProspek } from '@/constants/rutePresurvei';
import { useKegiatanMenungguKirim } from '@/hooks/queries/usePresurveiKegiatan';
import { useRingkasanPresurvei } from '@/hooks/queries/useRingkasanPresurvei';
import { keadaanRingkasan, rekapKegiatanHariIni } from '@/utils/presurvei/berandaSales';
import { DaftarPerluFollowUp } from './DaftarPerluFollowUp';
import { KartuKegiatanHariIni } from './KartuKegiatanHariIni';
import { KartuTargetBulanIni } from './KartuTargetBulanIni';

/** Pesan saat presurvei belum aktif (tanpa izin, atau server menolak 403). */
export const TEKS_PRESURVEI_BELUM_AKTIF = 'Presurvei belum diaktifkan untuk akun Anda. Hubungi admin.';

interface BagianPresurveiBerandaProps {
  isPresurveiAktif: boolean;
}

/** Ringkasan presurvei di Beranda sales: hari ini, target, perlu follow-up. */
export function BagianPresurveiBeranda({ isPresurveiAktif }: BagianPresurveiBerandaProps) {
  const router = useRouter();
  const ringkasan = useRingkasanPresurvei(isPresurveiAktif);
  const antrean = useKegiatanMenungguKirim();
  const keadaan = keadaanRingkasan({ isPresurveiAktif, hasData: ringkasan.data !== undefined, error: ringkasan.error });

  if (keadaan === 'belum-aktif') return <Text style={tw`text-sm text-gray-500 mb-4`}>{TEKS_PRESURVEI_BELUM_AKTIF}</Text>;
  if (keadaan === 'memuat') return <ActivityIndicator style={tw`my-4`} />;
  if (keadaan === 'galat' || ringkasan.data === undefined) {
    return <QueryErrorState message="Ringkasan presurvei gagal dimuat." onRetry={() => void ringkasan.refetch()} />;
  }
  return (
    <View>
      <KartuKegiatanHariIni rekap={rekapKegiatanHariIni(ringkasan.data.kegiatanHariIni)} jumlahMenunggu={antrean.data?.length ?? 0} />
      <KartuTargetBulanIni target={ringkasan.data.target} />
      <DaftarPerluFollowUp prospek={ringkasan.data.perluFollowUp} onBuka={(id) => router.push(ruteRincianProspek(id))} />
    </View>
  );
}
```

```tsx
// src/components/screens/KaryawanSalesDashboardScreen.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { BagianPresurveiBeranda } from '@/components/organisms/dashboard/BagianPresurveiBeranda';
import { DashboardHeader } from '@/components/organisms/dashboard/DashboardHeader';
import { KartuAbsenHariIni } from '@/components/organisms/dashboard/KartuAbsenHariIni';
import { QuickMenu, type IdMenuCepat } from '@/components/organisms/dashboard/QuickMenu';
import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';
import { queryKeys } from '@/lib/queryClient';
import { punyaFitur } from '@/utils/persona';

/** Menu cepat Beranda sales (spec §3): Presurvei & Canvasing sudah jadi tab. */
const MENU_CEPAT_SALES: readonly IdMenuCepat[] = ['chat', 'izin'];

/** Beranda sales karyawan: absen, ringkasan presurvei, menu cepat. */
export function KaryawanSalesDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMenyegarkan, setIsMenyegarkan] = useState(false);
  useSegarkanPresurveiSetelahSinkron();

  const segarkan = async () => {
    setIsMenyegarkan(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.presurvei.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
    ]);
    setIsMenyegarkan(false);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <ScrollView contentContainerStyle={tw`pb-24`} refreshControl={<RefreshControl refreshing={isMenyegarkan} onRefresh={() => void segarkan()} />}>
        <DashboardHeader userName={user?.name ?? ''} userImage={user?.image} onProfilePress={() => router.push('/(app)/profile')} />
        <KartuAbsenHariIni />
        <View style={tw`px-4`}>
          <BagianPresurveiBeranda isPresurveiAktif={punyaFitur(user, AppFeature.PRESURVEI)} />
        </View>
        <QuickMenu features={user?.features ?? []} isSales role={user?.role} isMitra={false} menuIds={MENU_CEPAT_SALES} />
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Ubah multiplexer Beranda**

Di `app/(app)/dashboard.tsx`, tambah impor:

```tsx
import { KaryawanSalesDashboardScreen } from '@/components/screens/KaryawanSalesDashboardScreen';
import { tentukanPersona, type Persona } from '@/utils/persona';
```

lalu ganti fungsi `Dashboard` (baris 409-427) dengan:

```tsx
/** Beranda per persona; `Record` memaksa persona baru dijawab saat kompilasi. */
const LAYAR_BERANDA: Record<Persona, () => React.JSX.Element> = {
  MITRA_SALES: () => <MitraSalesDashboardScreen />,
  MITRA_TEKNISI: () => <MitraTeknisiDashboardScreen />,
  KARYAWAN_SALES: () => (
    <ScreenErrorBoundary screenName="DashboardSales">
      <KaryawanSalesDashboardScreen />
    </ScreenErrorBoundary>
  ),
  KARYAWAN_TEKNISI: () => (
    <ScreenErrorBoundary screenName="Dashboard">
      <DashboardScreen />
    </ScreenErrorBoundary>
  ),
};

export default function Dashboard() {
  const { user } = useAuth();
  const LayarBeranda = LAYAR_BERANDA[tentukanPersona(user)];
  return <LayarBeranda />;
}
```

- [ ] **Step 6: Jalankan test dan typecheck**

Run: `npx jest __tests__/utils/presurvei/berandaSales.test.ts __tests__/hooks/useStatusAbsenHariIni.test.ts __tests__/components/BagianPresurveiBeranda.test.tsx __tests__/components/KaryawanSalesDashboardScreen.test.tsx __tests__/app/dashboard-persona.test.tsx`
Expected: semua PASS.

Run: `npx tsc --noEmit && npx expo lint`
Expected: exit 0.

- [ ] **Step 7: Buktikan test bergigi**

| Mutasi | Harus merah |
|---|---|
| `teleponChat: hitungan.TELEPON` | "menjumlahkan telepon dan chat, tanpa iklan" dan "menampilkan rekap hari ini…" |
| `barisTargetBeranda(null)` mengembalikan baris nol | "target belum ditetapkan tetap null…" dan "target belum ditetapkan tidak ditampilkan sebagai 0%" |
| Tukar `baris('Prospek', …)` dan `baris('Konversi', …)` | "tiga baris berurutan…" |
| Hapus `\|\| isAksesDitolak(masukan.error)` | "403 dari server ditampilkan sebagai belum aktif, bukan galat" |
| Urutan cek `hasData` setelah `error` | `keadaanRingkasan` kasus `hasData: true, error: galat500 → siap` |
| `useRingkasanPresurvei(true)` di `BagianPresurveiBeranda` | "tanpa m_presurvei tidak memanggil ringkasan…" |
| `jumlahMenunggu={0}` | "menampilkan rekap hari ini dan jumlah menunggu kirim" |
| `queryKeys.attendance.today(user?.id)` di `useStatusAbsenHariIni` | "memakai query key dan endpoint yang sama dengan layar Absensi" |
| `MENU_CEPAT_SALES = ['chat', 'izin', 'lembur']` | "menu cepat sales hanya Chat dan Izin/Cuti" |
| `isPresurveiAktif={true}` | "presurvei di Beranda aktif hanya bila berizin m_presurvei" |
| `KARYAWAN_SALES: () => <DashboardScreen />` | "{employeeType KARYAWAN, isSales true} → layar-karyawan-sales" |

Kembalikan tiap mutasi; `git status --short` hanya berisi berkas task ini.

- [ ] **Step 8: Commit**

```bash
git add src/utils/presurvei/berandaSales.ts src/hooks/useStatusAbsenHariIni.ts src/components/organisms/dashboard/KartuAbsenHariIni.tsx src/components/organisms/dashboard/KartuKegiatanHariIni.tsx src/components/organisms/dashboard/KartuTargetBulanIni.tsx src/components/organisms/dashboard/DaftarPerluFollowUp.tsx src/components/organisms/dashboard/BagianPresurveiBeranda.tsx src/components/screens/KaryawanSalesDashboardScreen.tsx "app/(app)/dashboard.tsx" __tests__/utils/presurvei/berandaSales.test.ts __tests__/hooks/useStatusAbsenHariIni.test.ts __tests__/components/BagianPresurveiBeranda.test.tsx __tests__/components/KaryawanSalesDashboardScreen.test.tsx __tests__/app/dashboard-persona.test.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): beranda sales karyawan dengan ringkasan presurvei

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: Migration izin `m_presurvei` untuk role `SALES`

**Repo:** `netmanager`

**Files:**
- Create: `prisma/migrations/<timestamp>_grant_mobile_presurvei_permissions_to_sales_role/migration.sql`
- Tidak ada perubahan `prisma/schema.prisma`.

**Interfaces:**
- Consumes: tabel `roles` (`name`, `"tenantId"`), `"Permission"` (`id`, `name`, `action`, `resource`, `description`, `"createdAt"`, `"updatedAt"`, `"tenantId"`), `"_PermissionToRole"` (`"A"` = permission, `"B"` = role) — `prisma/schema.prisma:1184-1198, 1297-1322`.
- Produces: setiap role bernama `SALES` (setelah `trim`) yang bertenant memegang `m_presurvei:read`, `m_presurvei:create`, `m_presurvei:update`. Efek di aplikasi: `features` memuat `m_presurvei` (`modules/marketing/services/CanvasingAccessService.ts:10-21`) setelah profil tersinkron; izin server berlaku di request berikutnya (`lib/mobile-auth.ts:402-441` membaca izin dari DB per request).

> **Urutan rilis (spec §9):** commit task ini **jangan di-push** sebelum backend Task 1–5 ter-deploy **dan** OTA mobile terbit. Pipeline deploy menjalankan `prisma migrate deploy` saat push ke `main`. Sampai migration ini berlaku, tab Presurvei sales tampil terkunci dan Beranda menampilkan "Presurvei belum diaktifkan".

- [ ] **Step 1: Pemeriksaan produksi baca-saja (butuh akses user)**

Jalankan dengan akses produksi user (lihat memori `akses-db-produksi`), bukan oleh subagent tanpa izin:

```bash
cat <<'SQL' | ssh radpro 'sudo -n kubectl exec -i -n netmanager-production db-netmanager-0 -- psql -U netmgr -d netmanager -At -F"|"'
SELECT r."tenantId", '[' || r.name || ']' AS nama, count(u.id) AS pengguna
FROM roles r LEFT JOIN "User" u ON u."roleId" = r.id
WHERE r.name ILIKE '%sales%'
GROUP BY r."tenantId", r.name ORDER BY 1, 2;
SELECT "tenantId", resource, action FROM "Permission" WHERE resource = 'm_presurvei' ORDER BY 1, 3;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Permission' AND indexdef ILIKE '%UNIQUE%';
SQL
```

Keputusan dari hasilnya:
- Nama role sasaran bukan persis `SALES` setelah trim (mis. `Sales`) → **berhenti dan laporkan ke user**; jangan melebarkan pencocokan tanpa keputusan.
- Lebih dari satu tenant ber-role SALES **dan** unique `Permission_resource_action_key` global **dan** `m_presurvei` sudah ada di tenant lain → laporkan: tenant yang tidak memiliki baris permission-nya sendiri tidak akan mendapat grant (migration tidak gagal berkat `ON CONFLICT DO NOTHING`, tapi juga tidak memberi akses).
- Selain itu, lanjut.

- [ ] **Step 2: Buat migration kosong lewat Prisma**

Run: `npx prisma migrate dev --create-only --name grant_mobile_presurvei_permissions_to_sales_role`
Expected: folder `prisma/migrations/<timestamp>_grant_mobile_presurvei_permissions_to_sales_role/` dengan `migration.sql` kosong ("This is an empty migration."). Bila Prisma meminta reset karena drift, **berhenti** dan laporkan — jangan reset.

- [ ] **Step 3: Tulis SQL migration**

Ganti isi `migration.sql` dengan:

```sql
-- Migration data: beri izin presurvei mobile ke role SALES.
--
-- Latar: sales karyawan mendapat tab Presurvei di aplikasi mobile (mobile-netmanager,
-- spec 2026-09-24-tampilan-sales-karyawan-presurvei). Route presurvei menerima
-- m_presurvei:{read,create,update} (app/api/presurvei/**); role SALES produksi belum
-- memegangnya. Permission web presurvei:* sengaja TIDAK diberikan: pemegangnya melihat
-- data seluruh tenant (app/api/presurvei/akses-presurvei.ts).
--
-- Pola 20260923211611_grant_presurvei_permissions_to_admin_roles, dengan satu tambahan:
-- unique "Permission" produksi adalah (resource, action) GLOBAL
-- (Permission_resource_action_key, 20260313000000_init_squashed:2670), sedangkan lokal
-- (resource, action, "tenantId"). NOT EXISTS per tenant saja masih bisa melanggar unique
-- global bila tenant lain sudah punya pasangan itu, jadi insert juga diberi
-- ON CONFLICT DO NOTHING TANPA target — berlaku untuk constraint mana pun.
--
-- Aman dijalankan berulang dan di lingkungan mana pun:
--   * Role dicocokkan lewat trim(name) = 'SALES'. Tidak ada role itu = tidak ada yang ditulis.
--   * Permission dibuat hanya bila belum ada di tenant role; bentrok unique dilewati.
--   * Relasi role↔permission memakai ON CONFLICT pada primary key ("A","B").
-- Tidak menghapus apa pun; mencabut akses tetap lewat editor Role di admin.

WITH role_sales AS (
  SELECT DISTINCT "tenantId"
  FROM roles
  WHERE trim(name) = 'SALES'
    AND "tenantId" IS NOT NULL
),
izin(resource, action, name) AS (
  VALUES
    ('m_presurvei', 'read',   'Read M_presurvei'),
    ('m_presurvei', 'create', 'Create M_presurvei'),
    ('m_presurvei', 'update', 'Update M_presurvei')
)
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt", "updatedAt", "tenantId")
SELECT gen_random_uuid()::text,
       izin.name,
       izin.action,
       izin.resource,
       'Allow ' || izin.action || ' on ' || izin.resource,
       NOW(),
       NOW(),
       role_sales."tenantId"
FROM izin
CROSS JOIN role_sales
WHERE NOT EXISTS (
  SELECT 1
  FROM "Permission" p
  WHERE p.resource = izin.resource
    AND p.action = izin.action
    AND p."tenantId" = role_sales."tenantId"
)
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM roles r
JOIN "Permission" p ON p."tenantId" = r."tenantId"
WHERE trim(r.name) = 'SALES'
  AND r."tenantId" IS NOT NULL
  AND p.resource = 'm_presurvei'
  AND p.action IN ('read', 'create', 'update')
ON CONFLICT ("A", "B") DO NOTHING;
```

Nama dan deskripsi permission mengikuti `prisma/seed.ts:72-76` (`Read M_presurvei`, `Allow read on m_presurvei`).

- [ ] **Step 4: Uji dalam transaksi yang di-rollback — unique ala produksi, dua kali**

Buat berkas uji di direktori sementara (bukan di repo):

```bash
UJI="${TMPDIR:-/tmp}/uji-migrasi-sales"
MIGRASI=$(ls -d prisma/migrations/*_grant_mobile_presurvei_permissions_to_sales_role)/migration.sql
mkdir -p "$UJI"

cat > "$UJI/awal-produksi.sql" <<'SQL'
\set ON_ERROR_STOP 1
BEGIN;
DROP INDEX IF EXISTS "Permission_resource_action_tenantId_key";
CREATE UNIQUE INDEX "uji_permission_resource_action" ON "Permission"(resource, action);
SQL

cat > "$UJI/hitung.sql" <<'SQL'
SELECT 'grant_sales_m_presurvei=' || count(*)
FROM "_PermissionToRole" pr
JOIN roles r ON r.id = pr."B"
JOIN "Permission" p ON p.id = pr."A"
WHERE trim(r.name) = 'SALES' AND p.resource = 'm_presurvei';
SQL

echo 'ROLLBACK;' > "$UJI/akhir.sql"

cat "$UJI/awal-produksi.sql" "$UJI/hitung.sql" "$MIGRASI" "$UJI/hitung.sql" "$MIGRASI" "$UJI/hitung.sql" "$UJI/akhir.sql" \
  | docker exec -i netmanager-postgres-app psql -U netmgr -d netmanager -At
```

Expected (DB lokal hasil seed, role SALES di tenant utama tanpa `m_presurvei`):
```
BEGIN
DROP INDEX
CREATE INDEX
grant_sales_m_presurvei=0
INSERT 0 0        ← permission m_presurvei sudah dibuat seed untuk tenant utama
INSERT 0 3
grant_sales_m_presurvei=3
INSERT 0 0
INSERT 0 0        ← run kedua tidak menulis apa pun
grant_sales_m_presurvei=3
ROLLBACK
```

Bila `CREATE UNIQUE INDEX` gagal karena duplikat `(resource, action)` lintas tenant di DB lokal, catat hasilnya dan ulangi langkah ini dengan unique lokal saja (hapus dua baris index dari `awal-produksi.sql`); laporkan bahwa bentuk produksi hanya diuji di Step 5.

- [ ] **Step 5: Uji kasus bentrok unique global**

Simulasikan "pasangan (resource, action) sudah dimiliki tenant lain": kosongkan `tenantId` baris `m_presurvei` di dalam transaksi, lalu jalankan migration di bawah unique produksi. Migration harus lolos tanpa galat dan tidak memberi grant.

```bash
cat > "$UJI/bentrok.sql" <<'SQL'
UPDATE "Permission" SET "tenantId" = NULL WHERE resource = 'm_presurvei';
SQL

cat "$UJI/awal-produksi.sql" "$UJI/bentrok.sql" "$MIGRASI" "$UJI/hitung.sql" "$UJI/akhir.sql" \
  | docker exec -i netmanager-postgres-app psql -U netmgr -d netmanager -At
```

Expected: `UPDATE 3` (atau jumlah baris `m_presurvei` lokal), `INSERT 0 0`, `INSERT 0 0`, `grant_sales_m_presurvei=0`, `ROLLBACK` — **tanpa** `ERROR: duplicate key value`.

Terapkan mutasi berikut pada `migration.sql`, ulangi langkah yang disebut, pastikan merah, lalu **kembalikan**:

| Mutasi | Harus merah |
|---|---|
| Hapus `ON CONFLICT DO NOTHING` dari insert `"Permission"` | Step 5: `ERROR: duplicate key value violates unique constraint "uji_permission_resource_action"` |
| Hapus `ON CONFLICT ("A", "B") DO NOTHING` dari insert `"_PermissionToRole"` | Step 4: run kedua `ERROR: duplicate key value … "_PermissionToRole_AB_pkey"` |
| `trim(name) = 'SALES'` jadi `name = 'SALES '` | Step 4: `grant_sales_m_presurvei=0` setelah run pertama |
| `p.action IN ('read', 'create', 'update')` jadi `IN ('read')` | Step 4: `grant_sales_m_presurvei=1` |

Verifikasi rollback lewat koneksi terpisah (pelajaran `tasks/lessons.md`, "Transaksi psql bisa ter-ROLLBACK…"):

```bash
cat "$UJI/hitung.sql" | docker exec -i netmanager-postgres-app psql -U netmgr -d netmanager -At
docker exec netmanager-postgres-app psql -U netmgr -d netmanager -At -c "SELECT indexname FROM pg_indexes WHERE tablename = 'Permission' AND indexname IN ('Permission_resource_action_tenantId_key', 'uji_permission_resource_action')"
```
Expected: `grant_sales_m_presurvei=0` dan hanya `Permission_resource_action_tenantId_key` — DB lokal kembali utuh.

- [ ] **Step 6: Terapkan di DB lokal dan periksa status**

Run: `npx prisma migrate dev`
Expected: migration baru diterapkan; tidak ada migration lain yang dibuat.

Run: `npx prisma migrate status`
Expected: `Database schema is up to date!`

Run: `npm run prisma:generate && git status --short`
Expected: hanya folder migration baru yang tampil (schema tidak berubah).

- [ ] **Step 7: Commit (jangan push — lihat catatan urutan rilis)**

```bash
git add prisma/migrations/*_grant_mobile_presurvei_permissions_to_sales_role
git commit -m "$(cat <<'EOF'
chore(presurvei): migration izin m_presurvei untuk role SALES

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: Verifikasi menyeluruh, fingerprint, CHANGELOG, dokumentasi

**Repo:** keduanya

**Files:**
- Modify: `netmanager/docs/CHANGELOG.md` (bagian `[Unreleased]`)
- Modify: `netmanager/docs/architecture/presurvei-module-design.md` (§8 API, §10 Mobile)
- Modify: `mobile-netmanager/docs/REPO_MAP.md`

**Interfaces:**
- Consumes: seluruh task sebelumnya; baseline fingerprint dan commit awal dari Task 6 Step 1.
- Produces: dua repo hijau, bukti OTA-only, entri changelog.

- [ ] **Step 1: Verifikasi backend**

Run (di `netmanager`):
```bash
npx vitest run --maxWorkers=50% --reporter=dot
npx tsc -p tsconfig.typecheck.json --noEmit
npm run lint
```
Expected: seluruh test PASS, `tsc` exit 0, lint tanpa error.

- [ ] **Step 2: Verifikasi mobile**

Run (di `mobile-netmanager`):
```bash
npx jest
npx tsc --noEmit
npx expo lint
grep -rn "StyleSheet.create" src/components/organisms/presurvei src/components/organisms/navigation/KaryawanSalesTabBar.tsx src/components/organisms/navigation/TombolTabSales.tsx src/components/screens/KaryawanSalesDashboardScreen.tsx || echo "tanpa StyleSheet"
```
Expected: seluruh test PASS, `tsc` exit 0, lint tanpa error, `tanpa StyleSheet`.

- [ ] **Step 3: Buktikan perubahan hanya OTA**

Run (di `mobile-netmanager`):
```bash
npx @expo/fingerprint fingerprint:generate > "${TMPDIR:-/tmp}/fp-presurvei-sesudah.json"
node scripts/compute-fingerprint.js . android > "${TMPDIR:-/tmp}/fp-presurvei-sesudah.hash"
diff "${TMPDIR:-/tmp}/fp-presurvei-sebelum.hash" "${TMPDIR:-/tmp}/fp-presurvei-sesudah.hash" && echo "FINGERPRINT SAMA — OTA"
npx @expo/fingerprint fingerprint:diff "${TMPDIR:-/tmp}/fp-presurvei-sebelum.json" "${TMPDIR:-/tmp}/fp-presurvei-sesudah.json"
git diff --name-only "$(cat "${TMPDIR:-/tmp}/presurvei-mobile-awal.commit")"..HEAD \
  | grep -E '^(package(-lock)?\.json|app\.json|app\.config\.ts|plugins/|android/|ios/|patches/)' \
  && echo "BERKAS NATIVE TERSENTUH" || echo "tidak ada berkas native"
```
Expected: `FINGERPRINT SAMA — OTA`, diff fingerprint kosong (`[]`), `tidak ada berkas native`. Bila hash berbeda, **jangan** menyimpulkan OTA: periksa sumber mana yang berubah (`netmanager docs/standards/mobile-update-strategy.md:118-133`) dan laporkan bahwa jalur rilis berubah menjadi rebuild APK (spec §9.2).

Buktikan pemeriksaan ini bergigi (terapkan tanpa commit, lalu **kembalikan** dengan `git checkout -- <berkas>`):

| Mutasi | Harus merah |
|---|---|
| Tambah `"presurveiUji": true` ke objek `expo.extra` di `app.json` | hash `fp-presurvei-sesudah` berbeda dari baseline; `fingerprint:diff` menampilkan sumber `expoConfig` |
| Tambah baris kosong di akhir `package.json`, lalu jalankan `git diff --name-only HEAD \| grep -E '^(package(-lock)?\.json\|app\.json\|app\.config\.ts\|plugins/\|android/\|ios/\|patches/)' && echo "BERKAS NATIVE TERSENTUH"` | tercetak `BERKAS NATIVE TERSENTUH` (penjaring pola bekerja pada berkas yang benar) |

`git status --short` harus bersih setelah dikembalikan.

- [ ] **Step 4: Dokumentasi backend**

Di `netmanager/docs/architecture/presurvei-module-design.md` §8, tambahkan baris tabel setelah `/api/presurvei/prospek/[id]/jadikan-canvasing`:

```markdown
| `/api/mobile/presurvei/ringkasan` | GET | `m_presurvei:read` (milik sendiri; tenant dari sesi; hari/bulan UTC) |
```

Di §10, tambahkan paragraf:

```markdown
**Tampilan sales karyawan (2026-09-24).** Aplikasi memilih tata letak dari
`tentukanPersona(user)` (`mobile-netmanager src/utils/persona.ts`): sales karyawan
mendapat tab Beranda · Presurvei · Canvasing · Absensi · Profil; teknisi tidak berubah
dan membuka Presurvei dari menu cepat bila role-nya diberi `m_presurvei`. Beranda sales
membaca `GET /api/mobile/presurvei/ringkasan`. Foto kegiatan diunggah dengan tipe
`presurvei` (`uploads/presurvei/kegiatan`). Role `SALES` mendapat
`m_presurvei:{read,create,update}` lewat migration
`<timestamp>_grant_mobile_presurvei_permissions_to_sales_role`.
```

Ganti `<timestamp>` dengan nama folder migration sebenarnya dari Task 20.

- [ ] **Step 5: CHANGELOG backend**

Tambahkan di bawah `## [Unreleased]` di `netmanager/docs/CHANGELOG.md` (ganti `<timestamp>` dengan nama folder migration Task 20):

```markdown
### [2026-09-24] — Endpoint ringkasan Beranda sales presurvei mobile

- **Tipe**: [ADDED]
- **Scope**: `modules/presurvei` | `app/api/mobile/presurvei/ringkasan`
- **Author**: agent
- **Deskripsi**: `GET /api/mobile/presurvei/ringkasan` (izin `m_presurvei:read`) mengembalikan
  jumlah kegiatan hari ini per jenis, target vs realisasi bulan berjalan milik sendiri
  (`target: null` bila belum ditetapkan — bukan nol), dan hingga 5 prospek aktif yang paling
  lama tidak disentuh. "Disentuh" = yang lebih akhir antara perubahan prospek dan kegiatan
  terakhir yang tertaut, karena mencatat follow-up tidak mengubah `updatedAt` prospek.
  Pemilik dan tenant hanya dari sesi; sesi tanpa tenant ditolak 400. Logika di
  `RingkasanSalesService`; query di `RingkasanSalesRepository` dengan `tenantId` eksplisit
  dan fail-closed; `TargetService.pencapaianSendiri` ditambahkan. **Keterbatasan**: batas
  "hari ini"/"bulan ini" adalah UTC (sama dengan laporan), sehingga kegiatan 00:00–07:00 WIB
  terhitung ke hari sebelumnya; pemeriksaan follow-up dibatasi 200 prospek aktif terlama.
- **Files**: `modules/presurvei/domain/ringkasan-sales.ts`,
  `modules/presurvei/repositories/RingkasanSalesRepository.ts`,
  `modules/presurvei/services/RingkasanSalesService.ts`,
  `modules/presurvei/services/TargetService.ts`,
  `modules/presurvei/dto/ringkasan-sales.dto.ts`,
  `app/api/mobile/presurvei/ringkasan/route.ts`
- **Breaking**: ❌ Tidak

### [2026-09-24] — Jenis unggahan presurvei untuk foto kegiatan mobile

- **Tipe**: [ADDED]
- **Scope**: `app/api/mobile/upload` | `lib/`
- **Author**: agent
- **Deskripsi**: `POST /api/mobile/upload` dengan `type=presurvei` menyimpan ke
  `public/uploads/presurvei/kegiatan` (lokal) dan `uploads/presurvei/kegiatan/…` (R2).
  Sebelumnya tipe tak dikenal jatuh ke folder umum. `type` tetap tidak divalidasi di route
  (perilaku lama untuk klien lain).
- **Files**: `lib/utils/image-upload.ts`, `lib/utils/r2-client.ts`,
  `app/api/mobile/upload/route-handlers-impl.ts`
- **Breaking**: ❌ Tidak

### [2026-09-24] — Beri izin presurvei mobile ke role SALES

- **Tipe**: [MIGRATION]
- **Scope**: `prisma/` | `modules/presurvei`
- **Author**: agent
- **Deskripsi**: Migration data yang memasang `m_presurvei:{read,create,update}` ke setiap
  role bernama `SALES` (dicocokkan lewat `trim`). Permission dibuat per tenant bila belum
  ada, dengan `NOT EXISTS` **dan** `ON CONFLICT DO NOTHING` tanpa target, karena unique
  `Permission` produksi `(resource, action)` bersifat global. Diuji di DB lokal dalam
  transaksi yang di-rollback, dua kali, dengan unique ala produksi, termasuk kasus bentrok
  unique global (lolos tanpa galat, tanpa grant). Idempoten; tidak menghapus apa pun.
  Harus dideploy **setelah** backend dan OTA mobile terbit.
- **Files**: `prisma/migrations/<timestamp>_grant_mobile_presurvei_permissions_to_sales_role/migration.sql`
- **Migration**: `<timestamp>_grant_mobile_presurvei_permissions_to_sales_role`
- **Breaking**: ❌ Tidak

### [2026-09-24] — Tampilan sales karyawan dan tab Presurvei di aplikasi mobile

- **Tipe**: [ADDED]
- **Scope**: `mobile-netmanager` (repo terpisah)
- **Author**: agent
- **Deskripsi**: Sales karyawan mendapat tab Beranda · Presurvei · Canvasing · Absensi ·
  Profil (tanpa Work Order dan Barang); teknisi dan mitra tidak berubah. Kegiatan
  Kunjungan/Survei wajib titik GPS otomatis dan minimal satu foto kamera; tersimpan di
  antrean offline beserta foto dan titiknya. Prospek: daftar, rincian, Ubah Status (hanya
  transisi sah; butuh online), Jadikan Canvasing (butuh online). `useApiMutation` kini
  mengunggah `meta.photos` di jalur online dan menyalinnya ke penyimpanan tetap saat
  mengantre. Rilis lewat OTA (fingerprint tidak berubah).
- **Breaking**: ❌ Tidak
```

- [ ] **Step 6: Dokumentasi mobile**

Di `mobile-netmanager/docs/REPO_MAP.md`, tambahkan baris ke tabel "Di mana tiap concern berada":

```markdown
| Persona & tab bar per tipe user | `src/utils/persona.ts`, `src/utils/tabKaryawanSales.ts`, `src/components/organisms/navigation/` | Persona = tata letak; izin (`punyaFitur`) = akses |
| Presurvei (sales) | `app/(app)/presurvei/`, `src/utils/presurvei/`, `src/hooks/presurvei/`, `src/services/PresurveiService.ts` | Aturan murni di `utils/presurvei`; kontrak dijaga `__tests__/fixtures/presurvei/kontrak-mobile.json` |
```

dan ubah baris "Terakhir diperbarui" menjadi `2026-09-24`.

- [ ] **Step 7: Commit dokumentasi**

Backend:
```bash
git add docs/CHANGELOG.md docs/architecture/presurvei-module-design.md
git commit -m "$(cat <<'EOF'
docs(presurvei): catat ringkasan sales, unggahan presurvei, dan izin SALES

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

Mobile:
```bash
git add docs/REPO_MAP.md
git commit -m "$(cat <<'EOF'
docs(presurvei): peta repo untuk persona dan modul presurvei

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Laporan penutup ke user**

Laporkan: hasil Step 1–3 (angka test, hash fingerprint), bahwa tidak ada worktree dibuat, urutan rilis (push backend Task 1–5 dan 21 → deploy → `scripts/publish-update.sh` untuk OTA → baru push commit Task 20), dan hasil pemeriksaan produksi Task 20 Step 1. Jangan push atau menerbitkan OTA tanpa instruksi user.

---

## Lampiran — Catatan untuk reviewer

- **Temuan di luar cakupan, tidak diperbaiki:** (1) jalur offline canvasing (`app/(app)/marketing/canvasing/create.tsx:274-306`) mengirim `photoMap` saat offline, dan `useApiMutation` mengunggah `photoMap` **sebelum** cek online (`useApiMutation.ts:226-253`), sehingga percobaan unggah gagal lebih dulu dan galatnya bukan galat jaringan axios — kemungkinan besar canvasing offline gagal, bukan terantre. (2) `complete-work-order/[id].tsx:232-286` mengirim `photoMap` + `targetField` saat offline, tetapi `SyncService` jalur `photoMap` mengabaikan `targetField` (`SyncService.ts:356-381`), sehingga badan berisi `photo1…photoN`, bukan `photoUrls`. Keduanya layak diverifikasi dan dibuatkan tugas terpisah.
- **Mutasi yang sengaja tidak dikunci:** urutan penjaga tenant vs daftar kosong di `RingkasanSalesRepository.waktuKegiatanTerakhir` (Task 2).
