# Menu Isolir — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan endpoint pelanggan untuk aplikasi mobile dan menautkan WO yang diajukan dari HP ke data pelanggan.

**Architecture:** Route tipis (`createHandler`) → service (`MobilePelangganService`) → repository Prisma yang sudah ada. Scoping site memakai `checkSiteRestriction` + `pelangganInputBuilderService.buildListFilter` yang sudah dipakai route admin. Scoping tenant TIDAK ditulis ulang: ekstensi Prisma `withTenantIsolation` sudah menanganinya (lihat Task 1).

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Vitest.

**Spec:** `mobile-netmanager/docs/superpowers/specs/2026-09-19-menu-isolir-billing-internal-design.md`

**Repo kerja:** `/Users/rohadimraja/Documents/radpro/netmanager` (bukan repo mobile).

## Global Constraints

- Route tidak boleh memuat logika bisnis atau query Prisma. Semua logika di `modules/pelanggan` dan `modules/work-order`.
- Authorization lewat `createHandler({ auth: true, permissions: [...] })`; service hanya melakukan scoping site/tenant.
- **Jangan menambah filter `tenantId` manual.** `lib/prisma.ts` sudah membungkus client dengan `withTenantIsolation` (`lib/prisma-extension.ts`), model `Pelanggan` tidak termasuk `ignoreModels`, dan `lib/tenant-context.ts` menyediakan konteks tenant untuk JWT mobile. Tanpa konteks, query gagal-tertutup. Untuk super admin ekstensi sengaja tidak memfilter, sehingga filter manual akan memutus akses lintas tenant yang disengaja.
- Permission mobile: resource `m_pelanggan`, dipakai sebagai `"m_pelanggan:read"`.
- Respons list memakai `apiPaginated(data, { page, limit, total })` dari `lib/api-response`.
- Test: Vitest, lokasi `tests/modules/<module>/<Nama>.test.ts`, pola `vi.hoisted` + `vi.mock` (lihat `tests/modules/work-order/WorkOrderReminderService.test.ts`).
- `limit` maksimal 50. Default `page=1`, `limit=20`.
- Jangan menyentuh berkas MixRadius mana pun — penghapusannya milik workstream lain.
- Commit: `<type>(<scope>): <judul>` dan diakhiri `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Isolasi tenant — DIBATALKAN (tanpa perubahan kode)

**Status:** ditutup sebelum implementasi, 2026-09-19, setelah verifikasi langsung di kode.

Rencana semula menambahkan `tenantId` ke `FilterOptions` dan `buildPelangganWhereClause`. Itu keliru:

- `lib/prisma.ts` membungkus client dengan `withTenantIsolation(ignoreModels)` dari `lib/prisma-extension.ts`.
- Model `Pelanggan` **tidak** ada di `ignoreModels`, jadi filter tenant sudah disuntik otomatis untuk setiap query pelanggan.
- `lib/tenant-context.ts` menurunkan konteks tenant dari beberapa sumber, termasuk **JWT mobile** (`verifyMobileToken`), sehingga route mobile ikut terlindungi.
- Bila konteks tenant tidak ada dan pemakainya bukan super admin, ekstensi melempar `TenantContextError` — gagal-tertutup.
- Untuk super admin ekstensi **sengaja tidak memfilter**, agar akses lintas tenant tetap bisa dilakukan.

Menambahkan filter manual berarti mubazir untuk pengguna biasa dan memutus akses super admin yang disengaja.

**Tidak ada langkah kerja untuk task ini.** Lanjut ke Task 2, yang tidak boleh mengirim `tenantId` ke repository.

---

### Task 2: MobilePelangganService

**Files:**
- Create: `modules/pelanggan/services/MobilePelangganService.ts`
- Modify: `modules/pelanggan/index.ts` (tambah export)
- Test: `tests/modules/pelanggan/MobilePelangganService.test.ts` (baru)

**Interfaces:**
- Consumes: `checkSiteRestriction` dari `@/modules/roles`; `pelangganInputBuilderService.buildListFilter`; `PelangganRepository.findAllPaginated(filter, page, limit)` yang mengembalikan `{ data, total }`.
- Produces:
  - `type MobilePelangganDTO = { id: string; idPelanggan: string; nama: string; username: string; status: Status; paket: string | null; alamat: string | null; noTelp: string | null; jatuhTempo: string; siteId: string | null; siteName: string | null; latitude: number | null; longitude: number | null }`
  - `class SiteAccessDeniedError extends Error`
  - `listMobilePelanggan(input: { session: Session; status?: Status | null; search?: string | null; siteId?: string | null; page: number; limit: number }): Promise<{ data: MobilePelangganDTO[]; total: number }>`

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// tests/modules/pelanggan/MobilePelangganService.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFns = vi.hoisted(() => ({
  findAllPaginated: vi.fn(),
  checkSiteRestriction: vi.fn(),
}));

vi.mock("@/modules/pelanggan/repositories/PelangganRepository", () => ({
  PelangganRepository: class MockPelangganRepository {
    findAllPaginated = mockFns.findAllPaginated;
  },
}));

// checkSiteRestriction asli menentukan isRestricted dari peran/permission sesi;
// di unit test ia di-mock supaya scoping site yang diuji, bukan resolusi peran.
vi.mock("@/modules/roles", () => ({
  checkSiteRestriction: mockFns.checkSiteRestriction,
}));

import {
  listMobilePelanggan,
  SiteAccessDeniedError,
} from "@/modules/pelanggan/services/MobilePelangganService";

const session = {
  user: {
    id: "user-1",
    tenantId: "tenant-1",
    siteIds: ["site-a", "site-b"],
    role: "TEKNISI",
  },
} as never;

const pelangganRow = {
  id: "plg-1",
  idPelanggan: "P-001",
  nama: "Budi",
  username: "budi",
  status: "ISOLIR",
  alamat: "Jl. Mawar 1",
  noTelp: "08123",
  jatuhTempo: new Date("2026-09-10T00:00:00.000Z"),
  siteId: "site-a",
  latitude: -6.2,
  longitude: 106.8,
  hargaPaket: { name: "Paket 20 Mbps" },
  site: { name: "Site A" },
};

describe("listMobilePelanggan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFns.findAllPaginated.mockResolvedValue({ data: [pelangganRow], total: 1 });
    mockFns.checkSiteRestriction.mockReturnValue({
      isRestricted: true,
      siteIds: ["site-a", "site-b"],
      siteId: undefined,
      userSiteId: "site-a",
      primarySiteId: "site-a",
    });
  });

  it("membatasi query pada site yang ditugaskan ke karyawan", async () => {
    await listMobilePelanggan({ session, status: "ISOLIR", page: 1, limit: 20 });

    expect(mockFns.findAllPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: { in: ["site-a", "site-b"] },
        status: "ISOLIR",
      }),
      1,
      20,
    );
  });

  it("tidak menambahkan filter tenant manual — isolasi tenant milik ekstensi Prisma", async () => {
    await listMobilePelanggan({ session, status: "ISOLIR", page: 1, limit: 20 });

    const filter = mockFns.findAllPaginated.mock.calls[0][0];
    expect("tenantId" in filter).toBe(false);
  });

  it("menolak karyawan yang tidak punya site sama sekali", async () => {
    mockFns.checkSiteRestriction.mockReturnValue({
      isRestricted: true,
      siteIds: [],
      siteId: undefined,
      userSiteId: null,
      primarySiteId: null,
    });

    await expect(
      listMobilePelanggan({ session, page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(SiteAccessDeniedError);
    expect(mockFns.findAllPaginated).not.toHaveBeenCalled();
  });

  it("mengecualikan pelanggan DISMANTLE ketika status tidak diminta", async () => {
    await listMobilePelanggan({ session, page: 1, limit: 20 });

    const filter = mockFns.findAllPaginated.mock.calls[0][0];
    expect(filter.status).toEqual({ not: "DISMANTLE" });
  });

  it("mempersempit ke satu site ketika siteId diminta dan diizinkan", async () => {
    await listMobilePelanggan({ session, siteId: "site-b", page: 1, limit: 20 });

    const filter = mockFns.findAllPaginated.mock.calls[0][0];
    expect(filter.siteId).toBe("site-b");
  });

  it("menolak siteId di luar site karyawan", async () => {
    await expect(
      listMobilePelanggan({ session, siteId: "site-z", page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(SiteAccessDeniedError);
    expect(mockFns.findAllPaginated).not.toHaveBeenCalled();
  });

  it("memetakan baris pelanggan ke DTO mobile tanpa kolom sensitif", async () => {
    const result = await listMobilePelanggan({ session, page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.data[0]).toEqual({
      id: "plg-1",
      idPelanggan: "P-001",
      nama: "Budi",
      username: "budi",
      status: "ISOLIR",
      paket: "Paket 20 Mbps",
      alamat: "Jl. Mawar 1",
      noTelp: "08123",
      jatuhTempo: "2026-09-10T00:00:00.000Z",
      siteId: "site-a",
      siteName: "Site A",
      latitude: -6.2,
      longitude: 106.8,
    });
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npx vitest run tests/modules/pelanggan/MobilePelangganService.test.ts`
Expected: FAIL — modul `MobilePelangganService` belum ada.

- [ ] **Step 3: Implementasi minimal**

```ts
// modules/pelanggan/services/MobilePelangganService.ts
import type { Session } from "next-auth";
import type { Prisma, Status } from "@prisma/client";
import { checkSiteRestriction } from "@/modules/roles";
import { PelangganRepository } from "../repositories/PelangganRepository";

export class SiteAccessDeniedError extends Error {}

export interface MobilePelangganDTO {
  id: string;
  idPelanggan: string;
  nama: string;
  username: string;
  status: Status;
  paket: string | null;
  alamat: string | null;
  noTelp: string | null;
  jatuhTempo: string;
  siteId: string | null;
  siteName: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ListInput {
  session: Session;
  status?: Status | null;
  search?: string | null;
  siteId?: string | null;
  page: number;
  limit: number;
}

const repository = new PelangganRepository();

/** Pelanggan yang sudah dibongkar tidak relevan untuk layar mobile. */
const EXCLUDE_DISMANTLE = { not: "DISMANTLE" } as Prisma.EnumStatusFilter;

/** Filter site untuk sesi mobile; melempar bila site yang diminta di luar hak akses. */
function resolveSiteFilter(
  session: Session,
  requestedSiteId?: string | null,
): Prisma.StringNullableFilter | string | undefined {
  const restriction = checkSiteRestriction(session as never, "pelanggan");

  if (!restriction.isRestricted) {
    return requestedSiteId ?? undefined;
  }
  if (restriction.siteIds.length === 0) {
    throw new SiteAccessDeniedError("User tidak memiliki akses site");
  }
  if (!requestedSiteId) {
    return { in: restriction.siteIds };
  }
  if (!restriction.siteIds.includes(requestedSiteId)) {
    throw new SiteAccessDeniedError("Site tidak diizinkan untuk user ini");
  }
  return requestedSiteId;
}

function toDTO(row: Awaited<ReturnType<PelangganRepository["findAllPaginated"]>>["data"][number]): MobilePelangganDTO {
  return {
    id: row.id,
    idPelanggan: row.idPelanggan,
    nama: row.nama,
    username: row.username,
    status: row.status,
    paket: row.hargaPaket?.name ?? null,
    alamat: row.alamat ?? null,
    noTelp: row.noTelp ?? null,
    jatuhTempo: new Date(row.jatuhTempo).toISOString(),
    siteId: row.siteId ?? null,
    siteName: row.site?.name ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
}

/** Daftar pelanggan untuk aplikasi mobile, dibatasi tenant dan site karyawan. */
export async function listMobilePelanggan(
  input: ListInput,
): Promise<{ data: MobilePelangganDTO[]; total: number }> {
  const siteId = resolveSiteFilter(input.session, input.siteId);
  const { data, total } = await repository.findAllPaginated(
    {
      ...(siteId ? { siteId } : {}),
      ...(input.search ? { search: input.search } : {}),
      status: (input.status ?? EXCLUDE_DISMANTLE) as Status,
    },
    input.page,
    input.limit,
  );

  return { data: data.map(toDTO), total };
}
```

Catatan: `status` pada `FilterOptions` bertipe `Status`; pengecualian `DISMANTLE` memakai filter Prisma, jadi tipe di `FilterOptions` diperlebar menjadi `Status | Prisma.EnumStatusFilter` pada langkah ini bila `tsc` mengeluhkannya.

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npx vitest run tests/modules/pelanggan/MobilePelangganService.test.ts`
Expected: PASS (7 tes).

- [ ] **Step 5: Ekspor lewat public API module**

```ts
// modules/pelanggan/index.ts — tambahkan
export {
  listMobilePelanggan,
  SiteAccessDeniedError,
  type MobilePelangganDTO,
} from "./services/MobilePelangganService";
```

Run: `npx tsc --noEmit`
Expected: 0 error.

- [ ] **Step 6: Commit**

```bash
git add modules/pelanggan/services/MobilePelangganService.ts modules/pelanggan/index.ts tests/modules/pelanggan/MobilePelangganService.test.ts
git commit -m "feat(pelanggan): service daftar pelanggan untuk aplikasi mobile"
```

---

### Task 3: Endpoint dan permission mobile

**Files:**
- Create: `app/api/mobile/pelanggan/route.ts`
- Modify: `lib/permission-config.ts:116-123` (`PERMISSION_GROUPS_MOBILE`)
- Test: `tests/modules/pelanggan/mobile-pelanggan-query.test.ts` (baru)

**Interfaces:**
- Consumes: `listMobilePelanggan`, `SiteAccessDeniedError` (Task 2).
- Produces: `GET /api/mobile/pelanggan` dan fungsi `parseListQuery(searchParams: URLSearchParams): { status: Status | null; search: string | null; siteId: string | null; page: number; limit: number }` yang diekspor dari route untuk diuji.

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// tests/modules/pelanggan/mobile-pelanggan-query.test.ts
import { describe, expect, it } from "vitest";
import { parseListQuery } from "@/app/api/mobile/pelanggan/route";

describe("parseListQuery", () => {
  it("memakai halaman 1 dan limit 20 ketika query kosong", () => {
    expect(parseListQuery(new URLSearchParams())).toEqual({
      status: null,
      search: null,
      siteId: null,
      page: 1,
      limit: 20,
    });
  });

  it("membatasi limit maksimal 50", () => {
    expect(parseListQuery(new URLSearchParams("limit=500")).limit).toBe(50);
  });

  it("menolak page dan limit tidak masuk akal", () => {
    const parsed = parseListQuery(new URLSearchParams("page=0&limit=-3"));
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  it("meneruskan status, pencarian, dan siteId apa adanya", () => {
    const parsed = parseListQuery(
      new URLSearchParams("status=ISOLIR&search=budi&siteId=site-a"),
    );
    expect(parsed).toMatchObject({ status: "ISOLIR", search: "budi", siteId: "site-a" });
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npx vitest run tests/modules/pelanggan/mobile-pelanggan-query.test.ts`
Expected: FAIL — route belum ada.

- [ ] **Step 3: Implementasi route**

```ts
// app/api/mobile/pelanggan/route.ts
import type { Status } from "@prisma/client";
import { createHandler } from "@/lib/api";
import { ApiErrors, apiPaginated } from "@/lib/api-response";
import { listMobilePelanggan, SiteAccessDeniedError } from "@/modules/pelanggan";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Baca query daftar pelanggan; nilai tidak masuk akal dikembalikan ke default. */
export function parseListQuery(searchParams: URLSearchParams) {
  const page = Number.parseInt(searchParams.get("page") ?? "", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "", 10);

  return {
    status: searchParams.get("status") as Status | null,
    search: searchParams.get("search"),
    siteId: searchParams.get("siteId"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT,
  };
}

export const GET = createHandler(
  { auth: true, permissions: ["m_pelanggan:read"] },
  async (req, ctx) => {
    const query = parseListQuery(req.nextUrl.searchParams);

    try {
      const { data, total } = await listMobilePelanggan({
        session: ctx.session!,
        ...query,
      });
      return apiPaginated(data, { page: query.page, limit: query.limit, total });
    } catch (error) {
      if (error instanceof SiteAccessDeniedError) {
        return ApiErrors.forbidden(error.message);
      }
      throw error;
    }
  },
);
```

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npx vitest run tests/modules/pelanggan/mobile-pelanggan-query.test.ts`
Expected: PASS (4 tes).

- [ ] **Step 5: Daftarkan permission mobile (tanpa menjalankan seed)**

```ts
// lib/permission-config.ts — di dalam PERMISSION_GROUPS_MOBILE
  PELANGGAN: ["m_pelanggan"],
```

**JANGAN menjalankan `npm run prisma:seed` di task ini.** Seed menulis baris Permission ke database yang sedang ditunjuk `DATABASE_URL`, dan pipeline tidak pernah menjalankannya. Salah sasaran berarti menulis ke produksi — sesi lain baru saja membersihkan 211 baris permission usang di sana. Ekstensi Prisma juga menolak `IS_SEEDING=true` saat `NODE_ENV=production`.

Run: `npx vitest run tests/architecture tests/ci` lalu `npx tsc --noEmit`
Expected: hijau. Verifikasi perubahan config cukup dengan membaca kembali `lib/permission-config.ts` dan memastikan grup `PELANGGAN` ada.

Penerapan seed ke database dilakukan pemilik sistem secara sadar, dicatat di bagian verifikasi akhir.

- [ ] **Step 6: Uji manual endpoint**

```bash
curl -s -H "Authorization: Bearer <token-karyawan>" \
  "http://localhost:3000/api/mobile/pelanggan?status=ISOLIR&limit=5" | head -40
```
Expected: `success: true`, `data` berisi maksimal 5 pelanggan dari site karyawan, `meta.total` terisi. Token karyawan tanpa permission → `403`.

- [ ] **Step 7: Commit**

```bash
git add app/api/mobile/pelanggan/route.ts lib/permission-config.ts tests/modules/pelanggan/mobile-pelanggan-query.test.ts
git commit -m "feat(pelanggan): endpoint mobile daftar pelanggan"
```

---

### Task 4: Tautkan WO mobile ke pelanggan

**Files:**
- Modify: `modules/work-order/services/MobileWorkOrderRequestService.ts:8-20` (body) dan bagian pembuatan WO (sekitar baris 55-75)
- Test: `tests/modules/work-order/MobileWorkOrderRequestPelanggan.test.ts` (baru)

**Interfaces:**
- Consumes: kolom `Pelanggan.siteId` (skema Prisma yang sudah ada; tenant sudah difilter otomatis oleh ekstensi Prisma, lihat Task 1); `MobileWorkOrderRequestSessionUser` diperluas dengan `siteIds?: string[]`.
- Produces: `MobileWorkOrderRequestBody.pelangganId?: string`; WO tersimpan dengan `pelangganId` dan kontak terisi dari data pelanggan. Pelanggan di luar tenant/site ditolak dengan `Error("Pelanggan tidak ditemukan atau di luar site Anda")` yang dipetakan route menjadi `403`.

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// tests/modules/work-order/MobileWorkOrderRequestPelanggan.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFns = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { pelanggan: { findFirst: mockFns.findFirst } },
}));

vi.mock("@/modules/work-order/repositories/WorkOrderRepository", () => ({
  WorkOrderRepository: class MockWorkOrderRepository {
    create = mockFns.create;
  },
}));

import { MobileWorkOrderRequestService } from "@/modules/work-order/services/MobileWorkOrderRequestService";

const sessionUser = {
  id: "user-1",
  name: "Teknisi",
  tenantId: "tenant-1",
  siteId: "site-a",
  siteIds: ["site-a"],
};

const body = {
  type: "TROUBLE" as const,
  title: "Gangguan",
  description: "Tidak bisa browsing",
  pelangganId: "plg-1",
};

describe("MobileWorkOrderRequestService dengan pelangganId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFns.create.mockResolvedValue({ id: "wo-1", workOrderNumber: "WO-1" });
    mockFns.findFirst.mockResolvedValue({
      id: "plg-1",
      nama: "Budi",
      noTelp: "08123",
      alamat: "Jl. Mawar 1",
      latitude: -6.2,
      longitude: 106.8,
      siteId: "site-a",
      tenantId: "tenant-1",
    });
  });

  it("menyimpan pelangganId dan mengisi kontak dari data pelanggan", async () => {
    await new MobileWorkOrderRequestService().create(body, sessionUser);

    expect(mockFns.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pelangganId: "plg-1",
        contactName: "Budi",
        contactPhone: "08123",
        locationAddress: "Jl. Mawar 1",
      }),
    );
  });

  it("tidak menimpa kontak yang diisi manual oleh karyawan", async () => {
    await new MobileWorkOrderRequestService().create(
      { ...body, contactName: "Ibu Budi", contactPhone: "08999" },
      sessionUser,
    );

    expect(mockFns.create).toHaveBeenCalledWith(
      expect.objectContaining({ contactName: "Ibu Budi", contactPhone: "08999" }),
    );
  });

  it("menolak pelanggan dari site lain", async () => {
    mockFns.findFirst.mockResolvedValue(null);

    await expect(
      new MobileWorkOrderRequestService().create(body, sessionUser),
    ).rejects.toThrow(/pelanggan/i);
    expect(mockFns.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npx vitest run tests/modules/work-order/MobileWorkOrderRequestPelanggan.test.ts`
Expected: FAIL — `pelangganId` diabaikan, `create` dipanggil tanpa field tersebut.

- [ ] **Step 3: Implementasi minimal**

```ts
// modules/work-order/services/MobileWorkOrderRequestService.ts
// 1) Tambahkan field pada MobileWorkOrderRequestBody:
  pelangganId?: string;

// 2) Tambahkan helper di dalam class:
  /** Pastikan pelanggan ada, satu tenant, dan berada di site karyawan. */
  private async resolvePelanggan(
    pelangganId: string,
    user: MobileWorkOrderRequestSessionUser,
  ) {
    const pelanggan = await prisma.pelanggan.findFirst({
      where: {
        id: pelangganId,
        // tenant tidak difilter manual — ekstensi Prisma sudah menanganinya (Task 1)
        ...(user.siteIds?.length ? { siteId: { in: user.siteIds } } : {}),
      },
      select: {
        id: true, nama: true, noTelp: true, alamat: true,
        latitude: true, longitude: true, siteId: true,
      },
    });

    if (!pelanggan) {
      throw new Error("Pelanggan tidak ditemukan atau di luar site Anda");
    }
    return pelanggan;
  }

// 3) Sebelum memanggil workOrderRepo.create, ganti penyusunan kontak menjadi:
  const pelanggan = body.pelangganId
    ? await this.resolvePelanggan(body.pelangganId, userSession)
    : null;

  // ...lalu pada objek data WO:
      ...(pelanggan && { pelangganId: pelanggan.id, siteId: pelanggan.siteId ?? undefined }),
      contactName: body.contactName || pelanggan?.nama || userName,
      contactPhone: body.contactPhone ?? pelanggan?.noTelp ?? undefined,
      locationAddress: body.locationAddress ?? pelanggan?.alamat ?? undefined,
      ...(body.latitude
        ? { locationLat: parseFloat(String(body.latitude)) }
        : pelanggan?.latitude != null && { locationLat: pelanggan.latitude }),
      ...(body.longitude
        ? { locationLng: parseFloat(String(body.longitude)) }
        : pelanggan?.longitude != null && { locationLng: pelanggan.longitude }),
```

Tambahkan `siteIds?: string[]` pada `MobileWorkOrderRequestSessionUser` dan teruskan dari route pemanggil.

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npx vitest run tests/modules/work-order/MobileWorkOrderRequestPelanggan.test.ts`
Expected: PASS (3 tes).

- [ ] **Step 5: Pastikan alur lama tetap utuh**

Run: `npx vitest run tests/modules/work-order && npx tsc --noEmit`
Expected: seluruh tes work-order lulus (permintaan tanpa `pelangganId` tetap memakai kontak manual), 0 error tipe.

- [ ] **Step 6: Commit**

```bash
git add modules/work-order/services/MobileWorkOrderRequestService.ts tests/modules/work-order/MobileWorkOrderRequestPelanggan.test.ts
git commit -m "feat(work-order): tautkan WO mobile ke data pelanggan"
```

---

## Verifikasi akhir backend

- [ ] `npx vitest run` — seluruh suite hijau
- [ ] `npx tsc --noEmit` — 0 error
- [ ] `npm run lint` — bersih
- [ ] Endpoint diuji manual dengan token karyawan ber-permission dan tanpa permission
- [ ] **Seed permission dijalankan sadar oleh pemilik sistem**: pastikan `DATABASE_URL` menunjuk database yang dituju (lokal dulu), lalu `IS_SEEDING=true npm run prisma:seed`. Jangan pernah dijalankan dengan `NODE_ENV=production`
- [ ] Berikan resource `m_pelanggan` ke role yang dituju lewat matriks permission
- [ ] Deploy backend sebelum rilis mobile (aplikasi memanggil endpoint ini)
