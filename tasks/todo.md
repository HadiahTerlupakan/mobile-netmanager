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

## Fase 4 — Higher risk: pecah god files ✅ MULAI
- [x] topology-map.tsx (2042→1953) → helper murni diekstrak ke topologyHelpers.tsx
- [ ] topology-map: lanjut ekstrak GeoJSON builder (devicesGeoJson :~680, connectionLines :~810) → jadikan fungsi murni terima param, keluarkan ke topologyHelpers. **Butuh test device** (render peta).
- [~] absensi.tsx (927) → **SUDAH cukup rapi**: sudah pakai useAttendanceSubmission, attendanceGeofencePolicy, attendanceCaptureState, geo. Sisa = orkestrasi screen. Ekstraksi lanjut low-gain/high-risk.
- [ ] SyncService (631) → pisah: queue-processing vs photo-metadata/watermark vs toast. Incremental.
- [ ] LocationTrackingService (592) → pisah: battery-config vs permission-flow vs push/buffer.

## Catatan test (pre-existing, di luar scope sesi ini)
Suite gagal SEBELUM sesi & tidak terkait perubahan: Config, RefreshTokenService,
root-layout-privacy-route, mixradius-isolir, topology-map-readonly-boundary
(gagal identik di baseline — masalah mock komponen di test, bukan kode produksi).
