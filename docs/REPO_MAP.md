# REPO MAP — mobile-netmanager

> Peta tunggal repo ini untuk manusia & AI agent. **Baca ini dulu sebelum menebak lokasi file.**
> Ini repo **mobile-only** (Expo/React Native), bukan monorepo. Backend ada di repo terpisah.
> Terakhir diperbarui: 2026-07-25.
>
> **Arsitektur & pattern + status penerapannya:** [architecture/patterns-and-status.md](architecture/patterns-and-status.md).

## TL;DR struktur

```
app/    → SEMUA screen (Expo Router, file-based routing)
src/    → semua kode pendukung (komponen, service, hook, util, dst)
```

Tidak ada `features/`, tidak ada `lib/api-client`, tidak ada route group `(teknisi)/`.
(CLAUDE.md versi lama menyebut folder-folder itu — sudah dikoreksi. Kalau masih lihat referensi `features/`, abaikan.)

## Di mana tiap "concern" berada

| Butuh... | Lokasi | Catatan |
|---|---|---|
| Tambah/ubah screen | `app/(app)`, `app/(auth)`, `app/(customer)` | Expo Router; nama file = route |
| Panggil API (client) | `src/services/api.ts` | Axios instance + interceptor auth/refresh |
| Data fetching (GET) | `src/hooks/queries/` (`useApiQuery`) | TanStack Query — WAJIB, bukan useState |
| Write/mutation | `src/hooks/queries/` (`useApiMutation`) | Offline-aware (auto-queue) |
| Business/domain logic | `src/services/` | Sync, Database, Location, Upload, Token, dst |
| Custom hook (stateful/lifecycle) | `src/hooks/` | |
| Komponen UI reusable | `src/components/{atoms,molecules,organisms,templates}` | Atomic Design |
| Screen komponen (dipakai router) | `src/components/screens/` | Dipanggil dari `app/` |
| Helper murni | `src/utils/` | date, phone, geo, crypto, logger |
| Context provider | `src/context/` | Auth, Socket |
| Konstanta/tema | `src/constants/` | |
| Type/DTO | `src/types/` | |
| Native bridge | `src/native/` | |

## Auth & token flow (baca sebelum menyentuh auth)

- `src/services/api.ts` — Axios interceptor: attach `Authorization`, deteksi 401 → refresh/retry → logout via `DeviceEventEmitter`.
- `src/services/TokenService.ts` — token in-memory + decode JWT.
- `src/services/RefreshTokenService.ts` — refresh token & session di `expo-secure-store`, proactive refresh.
- Token disimpan di `expo-secure-store`; format auth mobile = JWT Bearer.

> ⚠️ Logic token saat ini **tersebar di 3 file** (utang teknis, ada di backlog konsolidasi `tasks/todo.md`). Jangan tambah sumber ke-4.

## Offline-first (kritis untuk teknisi lapangan)

- `src/services/DatabaseService.ts` — antrean sync persisten (AsyncStorage).
- `src/hooks/queries/useApiMutation.ts` — online→langsung, offline/error→auto-queue.
- `src/services/SyncService.ts` — pantau NetInfo, proses antrean saat online (batch + p-limit).
- Detail lengkap: `ARCHITECTURE.md`.

## Aturan wajib (ringkas — detail di CLAUDE.md)

- Server state → **TanStack Query** (bukan `useState`).
- Styling → **twrnc** (`StyleSheet.create` dilarang).
- Navigasi → **Expo Router**.
- Business logic **tidak boleh** di dalam screen `app/` → ekstrak ke `src/hooks/` atau `src/services/`.

## Utang teknis yang diketahui (jangan diperparah)

Lihat `tasks/todo.md` untuk rencana rapikan bertahap. Ringkas:
- God files: `app/(app)/topology-map.tsx` (2042 baris), `absensi.tsx` (927), `SyncService.ts` (631), `LocationTrackingService.ts` (592).
- Duplikasi: haversine 3×, storage wrapper sering di-bypass, token logic 3 file.
- Sebagian screen masih panggil `api.*` langsung tanpa TanStack Query.

Kalau kerja di area ini: **jangan tiru pola lama**, ikuti aturan di atas.
