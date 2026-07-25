# Arsitektur & Pattern — Status Penerapan

> Peta jujur arsitektur mobile-netmanager: apa yang didesain, pattern apa yang
> dipakai, dan **seberapa konsisten diterapkan**. Untuk manusia & AI agent.
> Snapshot: 2026-07-25. Angka (jumlah screen dst) bisa berubah — verifikasi ulang
> dengan grep bila ragu. Peta struktur folder: [../REPO_MAP.md](../REPO_MAP.md).

## 1. Arsitektur (intended)

**Layered + Feature-oriented + Offline-first.**

```
app/ (Expo Router — presentation)
  ↓ hanya render + panggil hook
src/hooks/ (TanStack Query — data/server-state layer)
  ↓
src/services/ (business logic + data access)
  ↓
src/services/api.ts (Axios client + interceptor)
  ↓
Backend REST API
```

Pelengkap:
- **Atomic Design** untuk komponen: `src/components/{atoms,molecules,organisms,templates}`.
- **Offline-first**: `DatabaseService` (antrean persisten) → `SyncService` (proses saat online) → `useApiMutation` (auto-queue saat offline).

## 2. Design pattern yang BENAR-BENAR dipakai

| Pattern | Lokasi / bukti |
|---|---|
| Singleton Service | `src/services/*` (DatabaseService, TokenService, UploadService, dll — 10+) |
| Interceptor | `src/services/api.ts` (attach token, handle 401→logout) |
| Observer / Event Bus | `src/utils/EventManager.ts` + `DeviceEventEmitter` |
| Retry + Exponential Backoff | `RefreshTokenService`, `SyncService` |
| Priority Queue | `src/services/syncQueueHelpers.ts` (`prioritizeQueue`) |
| Facade / Wrapper | `src/utils/storage.ts` (`Storage`/`SecureStorage`) |
| Provider (Context) | `src/context/` (AuthContext, TenantContext, RealtimeProvider) |
| Repository-ish | Services sebagai pintu akses data (belum dipisah eksplisit) |
| Stale-while-revalidate | TanStack Query (`useApiQuery`) |

## 3. Status penerapan — di mana masih bolong

Arsitektur **ada dan sadar**, tapi penerapan **~60-70%**, belum ditegakkan:

1. **Dependency rule — SUDAH ditegakkan (2026-07-25).**
   Sebelumnya ~separuh screen memanggil `api.*` langsung untuk server-state /
   mutation. Kini semua screen memakai hook: GET via `useApiQuery`/`useQuery`/
   `useInfiniteQuery`, write via `useMutation`/`useApiMutation`. `api.*` hanya
   dipanggil DI DALAM `queryFn`/`mutationFn` (layer client yang benar).
   **Satu pengecualian sadar:** `app/(auth)/login.tsx` tetap memakai
   `performLogin` (useCallback + `skipGlobalAuthHandler` + `signIn`) — auth
   kritis, migrasi berisiko lockout, manfaat rendah.
   Catatan pemilihan hook mutation: operasi **finansial/sensitif** (withdraw,
   payment, cashout, ganti password) pakai **plain `useMutation`** (BUKAN
   `useApiMutation`) supaya tidak diam-diam di-antre offline.

2. **Belum ada pemisahan Repository / Domain / DTO eksplisit.**
   Folder `repositories/`, `domain/`, `dto/` tidak ada. Service mencampur akses
   data + logika bisnis + side-effect → sumber "god service".

3. **Business logic bocor ke screen** (god screens, mis. topology-map, absensi) —
   melanggar prinsip "no logic di component". Sedang dirapikan bertahap
   (lihat `tasks/todo.md`).

4. **Adopsi validasi tipis**: Zod & React Hook Form baru dipakai di sedikit file;
   belum jadi standar untuk semua form/boundary.

## 4. Roadmap merapikan (semua incremental & behavior-safe)

Urutan disarankan (dari aman → berdampak):

1. ~~**Tegakkan dependency rule**~~ ✅ SELESAI (2026-07-25) — semua screen kini
   lewat hook; `api.*` hanya di dalam queryFn/mutationFn. Kecuali login (sadar).
2. **Perjelas layer service** — pisahkan pure/domain dari side-effect secara
   bertahap (lanjutan dari ekstraksi Sync/Location yang sudah dimulai).
3. **Standarkan validasi** — Zod + React Hook Form untuk semua form.
4. **(Opsional, hati-hati)** konsolidasi storage/token — butuh migrasi key +
   test device (lihat catatan risiko di `tasks/todo.md` & REPO_MAP).

## 5. Prinsip untuk kontributor/agent

- Kerja di area lama? **Jangan tiru pola bypass** — pakai hook + service sesuai layer.
- Ekstrak logic dari screen → `src/hooks/` (stateful/query) atau `src/services/`/`src/utils/` (pure/domain).
- Behavior-preserving + verifikasi `npx tsc --noEmit` (0 error) + test di tiap langkah.
