# TODO — Rapikan Codebase Mobile (behavior-preserving)

> Prinsip: codebase LIVE. Tidak ada perubahan behavior. Verifikasi `npx tsc --noEmit` (baseline: 0 error) di tiap langkah.

## Fase 1 — Zero risk: samakan dokumentasi ↔ realita ✅ SELESAI
- [x] Perbaiki section arsitektur mobile di CLAUDE.md agar cocok realita (src/, atomic design)
- [x] Perbaiki Review Checklist mobile CLAUDE.md (ekstraksi ke src/hooks|services)
- [x] Pindahkan 4 doc nyasar dari root ke docs/guides/ + perbaiki path stale
- [x] Buat docs/REPO_MAP.md — peta tunggal untuk agent

## Fase 2 — Low risk: dead code + clutter root ✅ SELESAI
- [x] Hapus 12 file dead code terverifikasi 0-ref (typecheck tetap 0 error)
- [x] Untrack junk: fix_icon.py (deleted), .remember/tmp/*.pid, IconKitchen-Output/ (untracked, lokal aman)
- [x] Tambah .gitignore entries
- [~] logo/ & plans/ DIBIARKAN (rekomendasi saja — mungkin source/riwayat yang mau disimpan)

## Fase 3 — Medium risk: konsolidasi duplikasi ✅ SEBAGIAN
- [x] Haversine 3× → 1 util (src/utils/geo.ts) — geofenceUtils & LocationTrackingService kini import dari geo
- [~] Storage 3 sumber → **DITUNDA (data-safety)**: wrapper pakai prefix `netmanager_`, call-site mentah tanpa prefix → beda namespace. Migrasi butuh langkah baca-lama→tulis-baru per key + test device. JANGAN ganti buta.
- [~] Auth-token 3 file → **DITUNDA (risiko logout massal)**: authority terdokumentasi di docs/REPO_MAP.md. Konsolidasi butuh test auth end-to-end di device.

## Fase 4 — Higher risk: pecah god files ✅ BERJALAN
- [x] topology-map.tsx (2042→1953) → helper murni (topologyHelpers.tsx)
- [x] topology-map (1953→1548, −24% total) → GeoJSON builder jadi fungsi murni + tipe ke topologyTypes.ts. Divalidasi test topology-readonly.
- [~] topology-map: sisa (KMZ loader + handlers) menutup state → diminishing return, tunda.
- [~] absensi.tsx (927) → **SUDAH cukup rapi** (pakai useAttendanceSubmission, attendanceGeofencePolicy, attendanceCaptureState, geo). Ekstraksi lanjut low-gain/high-risk.
- [x] LocationTrackingService (592→527) → getLocationConfig ke locationTrackingConfig.ts + named constants. Divalidasi test (11 pass).
- [x] SyncService (631→560) → ekstrak helper murni (prioritas, konkurensi, photo-uri, permanent-failure) ke syncQueueHelpers.ts + **10 test baru** (tutup gap no-test) + named constants.
- [x] SyncService processQueue → **6 test integrasi orkestrasi** (jaring pengaman: guard, prioritas, token, DB-fail). Sekarang aman dipecah nanti.
- [~] SyncService sisa: processQueueItem (god method item-level, stateful + retry/upload) → jaring pengaman processQueue sudah ada; pemecahan lanjut butuh mock upload/api lebih dalam. Tunda.

## Fase 6 — Jaring pengaman untuk god method ✅ SELESAI
- [x] Test integrasi processQueue (6 test) — prasyarat pemecahan aman
- **Full suite: 300 pass, 0 fail. tsc 0 error.**

## Catatan
- Ada 1 suite pre-existing yang intermittently flaky (timing) — di luar scope, bukan dari perubahan sesi ini.

## Fase 5 — Fix 5 test pre-existing yang gagal ✅ SELESAI
- [x] root-layout-privacy: tambah __mocks__/expo-linking.js (8 pass)
- [x] mixradius-isolir: mock useInfiniteQuery (list pindah dari useApiQuery) (4 pass)
- [x] topology-readonly: tambah mock lucide List/LocateFixed + maplibre Circle/Symbol/UserLocation (2 pass)
- [x] Config: test basi → produksi kini ENABLE update check (kode sengaja diubah a8a4eb3) (7 pass)
- [x] RefreshTokenService: mock appVersion kurang getOtaUpdateId (ditambah 89c12dc) (5 pass)
- **Hasil: full suite 284 pass, 0 fail (dari 14 fail). tsc 0 error.**

---

# TODO — Perbaikan Warning Codebase (2026-09-17)

> Batas aman: JANGAN sentuh `package.json`, `package-lock.json`, `app.config.ts`, `app.json`, `plugins/`, `.gitignore`,
> `.gitea/workflows/build-android.yml` — memicu build native (NATIVE_PATHS) dan/atau menggeser fingerprint OTA.
> Baseline fingerprint Android: `53b6043015f8f441208f09a2d4084a24e06dc95c` → harus identik di akhir.

- [x] 1. topology-map: watcher GPS terikat fokus + guard pembatalan → `src/hooks/useUserLocationWatcher.ts` (TDD)
  - [x] 1b. `<MapLibreGL.UserLocation>` menyalakan GPS native MapLibre selama ter-mount → dirender hanya saat layar fokus (`useIsFocused`) (TDD)
- [x] 2. isolir: buka modal site saat error → refetch groups (TDD; mutation check deps ListHeader tertangkap)
  - ⚠️ BATAL (2026-09-17, workstream penghapusan MixRadius): screen Isolir MixRadius DIHAPUS total — `app/(app)/mixradius/isolir.tsx`, `src/services/MixRadiusService.ts`, `IsolirSkeleton`, dan tesnya (`__tests__/app/mixradius-isolir-work-order-request.test.tsx`, `__tests__/services/MixRadiusService.test.ts`). Endpoint backend-nya sudah 503 dan akan 404. Jangan dilanjutkan & jangan pulihkan file-file tersebut.
- [x] 3. ESLint: globals Node (manual, tanpa paket `globals`) untuk `scripts/` & `plugins/` + CI `expo lint .` (ci.yml saja)
- [x] 4. index.js: urutan import (import/first) — output Babel identik
- [x] 5. edit-profile: `MediaTypeOptions` → `mediaTypes: ['images']`
- [x] 6. topology-map: hapus kode mati (`counts`, `handleToggleVisibility`, `FilterPanel.tsx`), `visibility` jadi konstanta, rapikan import
- [x] 7. FlashList v2: hapus `estimatedItemSize` (ternyata 18 tempat, bukan 8) + `src/types/flash-list.d.ts` → membuka 2 error tipe tersembunyi (chat `inverted` diabaikan v2 → empty state terbalik; dashboard `ListRenderItem` salah impor), keduanya diperbaiki
- [x] 8. Tes chat yang di-skip: SENGAJA (chat realtime dimatikan, TODO(chat-realtime)) → tetap skip + alasan eksplisit
- [x] 9. api.ts `axios.create`: suppress false positive dengan alasan
- [~] DITUNDA ke build native berikutnya: upgrade patch expo-doctor, hapus `jest-expo`, fallback plist iOS di `app.config.ts`
- [x] Verifikasi (salinan terisolasi HEAD + patch ini): tsc 0 · `eslint .` 255 file 0 warning · jest 421 pass/2 skip, 0 warning act · bundle Android OK · fingerprint Android identik `53b6043…`. Tree gabungan (dengan workstream MixRadius): tsc 0 · lint 0 · jest 416 pass.

---

# TODO — Hapus MixRadius dari mobile (2026-09-17)

> Panel billing MixRadius permanen tidak bisa dipakai (CAPTCHA); endpoint backend 503 → akan 404. JS/TS saja (tanpa native) → cukup OTA nanti.

- [x] Hapus fitur Isolir: screen `mixradius/isolir`, `MixRadiusService`, `IsolirSkeleton`, route di `(app)/_layout.tsx`, tile QuickMenu, `AppFeature.MIXRADIUS` + tesnya
- [x] Request WO mode Customer: pencarian pelanggan MixRadius → input kontak manual (`CustomerContactFields`) + Zod `RequestWorkOrderContactSchema`; hapus `requestWorkOrderSearch` + tesnya
- [x] Tes baru: `__tests__/utils/validation.test.ts` (9) + `__tests__/app/request-work-order-customer-contact.test.tsx` (8)
- [x] Verifikasi: tsc 0 error, eslint file yang diubah 0 error, jest penuh 413 pass / 0 fail / 2 skip, sweep `mixradius|isolir` kosong
