# Menu Isolir & Ajukan WO di Atas Billing Internal — Design

**Tanggal:** 2026-09-19
**Author:** Claude (Opus 5)
**Status:** Pending Review
**Repo terdampak:** `mobile-netmanager` (mobile) dan `netmanager` (backend)

## Overview

Mengembalikan menu **Isolir** dan memperbaiki mode Customer pada **Ajukan WO**, dengan sumber data billing/PPPoE milik RADPRO sendiri, menggantikan integrasi MixRadius yang sudah dihapus.

## Context

Fitur MixRadius dihapus dari aplikasi mobile pada commit `65bf53c` karena panelnya memakai CAPTCHA dan backend menghapus seluruh endpoint `/api/mobile/mixradius/*` serta `/api/integrations/mixradius/*`. Dampaknya:

1. Menu **Isolir** hilang seluruhnya.
2. Mode Customer pada **Ajukan WO** turun kualitasnya: pemasangan nama, nomor HP, dan alamat pelanggan kini diketik manual, sehingga WO tidak tertaut ke data pelanggan mana pun.

Hasil penelusuran backend (`/radpro/netmanager`) menunjukkan seluruh data yang dibutuhkan sudah ada:

| Kebutuhan | Kondisi di backend |
|---|---|
| Status isolir | `enum Status { AKTIF, NONAKTIF, MAINTENANCE, ISOLIR, DISMANTLE }` pada model `Pelanggan` |
| Isolir otomatis dari tagihan | `modules/finance/services/AutomaticIsolationSchedulerService.ts` + cron `app/api/cron/process-overdue` |
| Isolir/buka isolir manual | `app/api/pelanggan-ppp/[id]/suspend`, `/activate`, `/suspension-history` |
| Daftar & pencarian pelanggan | `GET /api/pelanggan-ppp` sudah mendukung `status`, `search`, `siteId`, `page`, `limit` (khusus web admin) |
| Penautan WO ke pelanggan | Kolom `WorkOrders.pelangganId` beserta relasi `pelanggan` sudah ada |
| Scoping multi-site | `lib/mobile-auth.ts` sudah mengisi `session.user.siteIds` dari tabel `userSites`; `lib/authorization/site-restriction.ts` menyediakan `checkSiteRestriction` |

Yang belum ada hanya jembatannya:

1. Tidak ada satu pun endpoint pelanggan untuk aplikasi mobile (`/api/mobile/pelanggan*`).
2. `MobileWorkOrderRequestBody` belum menerima `pelangganId`, sehingga WO dari HP tidak pernah tertaut pelanggan.
3. Belum ada permission mobile untuk data pelanggan.

Catatan penting: bug multi-site pada menu Isolir lama (`docs/guides/BACKEND-FIX-MULTI-SITE-ISOLIR-2026-06-25.md`) terjadi karena endpoint membaca `user.siteId` tunggal. Desain ini memakai `session.user.siteIds`, jadi bug tersebut tidak terulang.

## Goals

1. Karyawan dapat melihat daftar pelanggan berstatus `ISOLIR` pada site yang ditugaskan kepadanya.
2. Karyawan dapat mengajukan WO dari daftar tersebut, dengan WO tertaut ke pelanggan (`WorkOrders.pelangganId`).
3. Mode Customer pada Ajukan WO memakai pencarian pelanggan terdaftar, dengan input manual tetap tersedia untuk calon pelanggan.
4. Akses dikontrol permission dan dibatasi site karyawan.

## Non-Goals

1. **Aksi isolir dan buka isolir dari HP.** Keputusan pemilik produk: mobile hanya membaca dan mengajukan WO. Isolir/aktivasi tetap lewat web admin.
2. Menampilkan rincian tagihan dan riwayat suspensi (lihat Fase 2).
3. Mengubah logika billing, penjadwal isolir otomatis, atau integrasi MikroTik/RADIUS.

## Arsitektur & Alur Data

```
Mobile: layar Isolir / picker Ajukan WO
   └─ src/hooks/queries/usePelanggan.ts (TanStack useInfiniteQuery)
        └─ src/services/PelangganService.ts (axios)
             └─ GET /api/mobile/pelanggan?status=ISOLIR&search=&siteId=&page=&limit=
                  └─ createHandler({ auth, permissions: ["m_pelanggan:read"] })
                       └─ MobilePelangganService  (scoping siteIds + filter + paging)
                            └─ PelangganRepository (Prisma)

Ajukan WO:
   POST /api/mobile/work-orders/request  { ..., pelangganId? }
        └─ MobileWorkOrderRequestService (validasi pelanggan → isi kontak → simpan pelangganId)
```

## Perubahan Backend (`netmanager`)

### 1. Endpoint daftar pelanggan mobile

`app/api/mobile/pelanggan/route.ts` — controller tipis mengikuti pola `app/api/mobile/topology/route.ts`:

```ts
export const GET = createHandler(
  { auth: true, permissions: ["m_pelanggan:read"] },
  async (req, ctx) => { /* parse query → service → apiPaginated */ },
);
```

Query parameter:

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `status` | `Status` | kosong | Layar Isolir mengirim `ISOLIR`. Bila kosong (dipakai picker Ajukan WO), service mengembalikan semua status **kecuali `DISMANTLE`**, karena pelanggan yang sudah dibongkar tidak relevan untuk WO baru |
| `search` | string | kosong | Cocokkan `nama`, `username`, `idPelanggan`. **Bukan** `noTelp`: helper pencarian dipakai bersama route admin, menambah kolom di sana mengubah perilaku web — ditunda |
| `siteId` | string | kosong (semua site milik user) | Harus salah satu dari site user, kalau tidak → `403` |
| `page`, `limit` | number | `1`, `20` | `limit` maksimal `50` |

### 2. `MobilePelangganService` (`modules/pelanggan`)

- **Tidak memakai `checkSiteRestriction`.** Helper itu menentukan pembatasan dari permission `pelanggan:site_only`, sedangkan sesi `createHandler` tidak membawa `permissions` dan token mobile hanya berisi permission `m_*` — jadi pembatasan tidak akan pernah aktif dan daftar pelanggan tidak akan pernah dibatasi per site.
- Sebagai gantinya, helper bersama `lib/authorization/allowed-site-ids.ts` (`resolveAllowedSiteIds`) dipakai service daftar pelanggan maupun service WO, supaya satu konsep tidak punya dua jawaban: `siteIds` dipakai bila terisi, kalau kosong jatuh ke `siteId` legacy. Bentuk `siteIds: []` adalah keluaran nyata `verifyMobileToken` untuk karyawan yang belum bermigrasi ke tabel `userSites`.
- Super admin tidak dibatasi. Selain itu selalu dibatasi; daftar site kosong → `403`; `siteId` yang diminta di luar daftar → `403`.
- **Tenant tidak difilter manual.** `lib/prisma.ts` membungkus client dengan `withTenantIsolation` (`lib/prisma-extension.ts`): model `Pelanggan` tidak termasuk `ignoreModels`, `lib/tenant-context.ts` sudah menangani JWT mobile, dan query tanpa konteks tenant gagal-tertutup. Untuk super admin ekstensi sengaja tidak memfilter, jadi menambahkan filter tenant manual justru memutus akses lintas tenant yang disengaja.
- Urutan: `createdAt` menurun dengan `id` menaik sebagai tiebreaker. Rancangan awal (`jatuhTempo` lalu `nama`) tidak diterapkan karena helper repository dipakai bersama route admin; tiebreaker `id` ditambahkan supaya paginasi infinite scroll tidak mengulang atau melewati baris.
- Kembalikan lewat `apiPaginated` dari `lib/api-response`.

### 3. DTO (`MobilePelangganDTO`)

Hanya field yang dipakai layar, jangan kirim kolom biaya/dokumen:

```ts
{
  id: string;
  idPelanggan: string;
  nama: string;
  username: string;
  status: Status;
  paket: string | null;        // hargaPaket.name
  alamat: string | null;
  noTelp: string | null;
  jatuhTempo: string;          // ISO
  siteId: string | null;
  siteName: string | null;
  latitude: number | null;
  longitude: number | null;
}
```

### 4. Permission

`lib/permission-config.ts`: tambahkan grup pada `PERMISSION_GROUPS_MOBILE`:

```ts
PELANGGAN: ["m_pelanggan"],
```

Lalu seed permission `m_pelanggan:read` dan berikan ke role yang relevan. Tanpa permission, endpoint menolak dan menu tidak muncul di aplikasi.

### 5. Penautan WO ke pelanggan

`modules/work-order/services/MobileWorkOrderRequestService.ts`:

- Tambah `pelangganId?: string` pada `MobileWorkOrderRequestBody`.
- Validasi: `pelangganId` wajib berupa string non-kosong (nilai lain seperti `{"not":"x"}` adalah filter Prisma yang sah dan akan membocorkan data pelanggan lain), pelanggan ada, dan site-nya termasuk site karyawan. Kalau tidak → `403` (jangan diam-diam mengabaikan). Tenant tidak difilter manual, sesuai catatan di atas.
- Isi otomatis ketika kosong: `contactName` ← `nama`, `contactPhone` ← `noTelp`, `locationAddress` ← `alamat`, `locationLat/Lng` ← koordinat pelanggan.
- Simpan `pelangganId` ke `WorkOrders.pelangganId`.
- Tanpa `pelangganId`, perilaku sekarang (input manual) tetap berlaku.

## Perubahan Mobile (`mobile-netmanager`)

| Berkas | Perubahan |
|---|---|
| `src/constants/features.ts` | Tambah `PELANGGAN = 'm_pelanggan'` |
| `src/services/PelangganService.ts` | Baru: pemanggilan endpoint + tipe `MobilePelanggan` |
| `src/hooks/queries/usePelanggan.ts` | Baru: `useInfiniteQuery`, query key `['pelanggan', 'list', { status, search, siteId }]` |
| `app/(app)/pelanggan/isolir.tsx` | Layar baru: daftar status `ISOLIR` |
| `app/(app)/request-work-order.tsx` | Mode Customer: picker pelanggan + fallback manual |
| `app/(app)/_layout.tsx` | Daftarkan route sebagai `Tabs.Screen` dengan `href: null` |
| `src/components/organisms/dashboard/QuickMenu.tsx` | Entri menu dengan `requiredFeatures: [AppFeature.PELANGGAN]` |

Layar Isolir memakai pola UX yang sama dengan layar lama (lihat `git show 65bf53c^:app/(app)/mixradius/isolir.tsx` sebagai referensi): `FlashList`, pencarian dengan debounce 400 ms, pull-to-refresh, infinite scroll, serta state kosong/error. **Tanpa filter site pada v1**: sesi mobile belum membawa daftar site karyawan, dan menambahkannya berarti endpoint baru. Sebagai gantinya nama site ditampilkan di tiap baris, sedangkan parameter `siteId` pada endpoint tetap disediakan untuk dipakai Fase 2. Perbedaannya ada dua. Pertama, tanpa tab Isolir/Disabled: kedua tab itu berasal dari `auth_status` MixRadius, sedangkan di sistem sendiri kondisi isolir diwakili satu status tunggal `ISOLIR` (`NONAKTIF` dan `DISMANTLE` adalah kondisi berbeda dan di luar cakupan menu ini). Kedua, aksi per item adalah **Ajukan WO**, bukan dismantle langsung.

Aturan CLAUDE.md tetap berlaku: TanStack Query untuk server state, `twrnc` untuk styling, Expo Router untuk navigasi, fungsi maksimal 20 baris, berkas maksimal 300 baris, tanpa logika bisnis di layer komponen.

## Error Handling

| Kondisi | Backend | Tampilan mobile |
|---|---|---|
| Tanpa permission | `403` | Menu tidak muncul (feature guard) |
| `siteId` di luar site karyawan | `403` | Pesan "site tidak diizinkan" |
| Karyawan tanpa site | `403` ("User tidak memiliki akses site") | "Belum ada site yang ditugaskan ke Anda" |
| Pencarian tanpa hasil | `200`, data kosong | Empty state biasa |
| Jaringan mati | — | Pesan error + tombol Coba Lagi (pola `getUserFriendlyError`) |

## Testing

**Backend**
1. Service: hanya mengembalikan pelanggan pada `siteIds` karyawan.
2. Service: filter `status=ISOLIR` dan pencarian nama/username/idPelanggan.
3. Penolakan `siteId` di luar site karyawan diuji di level service (`403` di route hanya pemetaan error).
4. Gate permission TIDAK diuji terpisah — itu perilaku `createHandler`, bukan kode fitur ini.
5. WO request: `pelangganId` milik site lain → `403`; yang valid → tersimpan di `WorkOrders.pelangganId` dan kontak terisi otomatis.

**Mobile**
6. Hook: query key dan parameter paginasi benar; halaman berikutnya menyambung.
7. Layar Isolir: hanya memanggil endpoint baca; tidak ada pemanggilan tulis.
8. Layar Isolir: karyawan tanpa site melihat pesan yang benar.
9. Ajukan WO: pelanggan terpilih mengirim `pelangganId`; mode prospek tetap mengirim kontak manual.

Semua dikerjakan TDD: tes gagal dulu, lalu implementasi.

## Rollout

1. Backend lebih dulu: endpoint, permission, dan seed. Tanpa ini, aplikasi hanya melihat menu yang tidak berfungsi.
2. Berikan permission `m_pelanggan` ke role yang dituju. Selama belum diberikan, menu tersembunyi, sehingga rilis mobile aman dilakukan kapan saja.
3. Mobile menyusul. Seluruh perubahan mobile hanya JS/TS, tidak menyentuh NATIVE_PATHS, jadi **cukup OTA** tanpa build native baru. Wajib dipastikan dengan membandingkan fingerprint sebelum dan sesudah.

## Koordinasi

Bagian backend menyentuh area yang sedang dikerjakan sesi `netmanager-8c` (penghapusan endpoint MixRadius). Pekerjaan backend dimulai setelah penghapusan itu selesai, atau dikoordinasikan lebih dulu agar tidak bentrok.

## Fase 2 (di luar scope ini)

1. Filter site di layar Isolir, setelah sesi mobile atau endpoint profil membawa daftar site karyawan.
2. Tunggakan pelanggan dan tanggal mulai isolir pada kartu daftar (butuh agregasi `modules/finance`).
2. Riwayat suspensi per pelanggan (`suspension-history`).
3. Tombol buka isolir setelah pembayaran terverifikasi, lengkap dengan permission terpisah dan audit log.
