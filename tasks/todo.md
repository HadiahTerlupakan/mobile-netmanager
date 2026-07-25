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

## Fase 3 — Medium risk: konsolidasi duplikasi
- [ ] Haversine 3× → 1 util (src/utils/geo.ts)
- [ ] Storage 3 sumber → 1 wrapper (src/utils/storage.ts)
- [ ] Auth-token 3 file → 1 authority

## Fase 4 — Higher risk: pecah god files (satu per satu + verifikasi)
- [ ] topology-map.tsx (2042) → ekstrak geo/geojson util + query hook
- [ ] absensi.tsx (927) → ekstrak geofence/capture hooks
- [ ] SyncService/LocationTrackingService → pisah tanggung jawab
