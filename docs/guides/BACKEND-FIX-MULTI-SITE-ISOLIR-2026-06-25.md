# Bug Report: Multi-Site Support pada Menu Isolir Mobile

**Tanggal**: 2026-06-25
**Severity**: Medium — Fitur tidak berfungsi untuk karyawan multi-site
**Scope**: API Mobile MixRadius (Groups + Customers)
**Dampak**: Karyawan yang ditugaskan di lebih dari 1 site hanya bisa melihat pelanggan dari 1 site saja

---

## 1. Deskripsi Masalah

Sistem saat ini sudah punya tabel `UserSite` (many-to-many) untuk assign karyawan ke banyak site:

```prisma
model UserSite {
  id        String   @id @default(cuid())
  userId    String
  siteId    String
  isPrimary Boolean  @default(false)
  tenantId  String?
  @@unique([userId, siteId])
}
```

Tetapi **endpoint mobile MixRadius hanya membaca `user.siteId` (single field)**, bukan query dari tabel `UserSite`.

### Dampak:

| Kondisi | Yang Terjadi |
|---------|-------------|
| Karyawan di-assign ke Site A & B via `UserSite` | Hanya Site A (primary) yang terlihat |
| `user.siteId` kosong/null | Groups return `[]` → tidak bisa akses isolir |
| Karyawan butuh lihat pelanggan dari 2+ site | Harus minta admin ganti `siteId` manual |

---

## 2. Endpoint yang Terdampak

### 2.1 `GET /api/mobile/mixradius/groups`

**File**: `app/api/mobile/mixradius/groups/route.ts`

**Alur saat ini**:
```
User login → ambil session.user.siteId → filter groups where group.siteId === siteId → return
```

**Masalah**: Hanya 1 site yang dipakai.

**Code yang bermasalah** (`modules/integrations/services/MixRadiusGroupRouteService.ts`):

```typescript
// ❌ SAAT INI — hanya pakai single siteId
async getMobileGroups(siteId?: string | null, tenantId: string): Promise<MobileMixRadiusGroupDTO[]> {
  if (!siteId) {
    return []; // ← User tanpa siteId = data kosong
  }
  const groups = await this.mixRadiusService.getOwnerGroups(tenantId);
  const scopedGroups = groups.filter((group) => group.siteId === siteId);
  return scopedGroups.map(group => ({ id, name, owners, isActive, siteId }));
}
```

---

### 2.2 `GET /api/mobile/mixradius/customers`

**File**: `app/api/mobile/mixradius/customers/route.ts`

**Alur saat ini**:
```
User login → ambil session.user.siteId → set params.siteId → filter customer by site owners
```

**Code yang bermasalah** (`modules/integrations/services/mixradius-customer-filters.ts`):

```typescript
// ❌ SAAT INI — filterBySite hanya handle single siteId
function filterBySite(customers, siteId, groups) {
  if (!siteId) return customers;
  const allowedOwners = groups
    .filter(g => g.siteId === siteId)
    .flatMap(g => g.owners);
  return customers.filter(c => allowedOwners.includes(c.owner_name));
}
```

---

## 3. Solusi yang Diharapkan

### 3.1 Buat helper untuk ambil semua site milik user

```typescript
// modules/users/services/UserSiteService.ts (atau tempat yang sesuai)
async function getUserSiteIds(userId: string, tenantId?: string): Promise<string[]> {
  // 1. Query tabel UserSite
  const userSites = await prisma.userSite.findMany({
    where: { userId, tenantId },
    select: { siteId: true },
  });

  // 2. Fallback ke user.siteId jika UserSite kosong (backward compatible)
  if (userSites.length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { siteId: true },
    });
    return user?.siteId ? [user.siteId] : [];
  }

  return userSites.map(us => us.siteId);
}
```

---

### 3.2 Fix `getMobileGroups` — support multiple siteIds

```typescript
// ✅ FIX — query UserSite, support banyak site
async getMobileGroups(userId: string, tenantId: string): Promise<MobileMixRadiusGroupDTO[]> {
  const siteIds = await getUserSiteIds(userId, tenantId);

  if (siteIds.length === 0) {
    return [];
  }

  const groups = await this.mixRadiusService.getOwnerGroups(tenantId);

  // Filter groups yang siteId-nya termasuk dalam site milik user
  const scopedGroups = groups.filter(
    (group) => group.siteId && siteIds.includes(group.siteId)
  );

  return scopedGroups.map(group => ({
    id: group.id,
    name: group.name,
    owners: group.owners,
    isActive: group.isActive,
    siteId: group.siteId,
  }));
}
```

**Update route handler** (`app/api/mobile/mixradius/groups/route.ts`):

```typescript
// ❌ SEBELUM
const siteId = ctx.session!.user.siteId;
const groups = await routeService.getMobileGroups(siteId, tenantId);

// ✅ SESUDAH
const userId = ctx.session!.user.id;
const groups = await routeService.getMobileGroups(userId, tenantId);
```

---

### 3.3 Fix `filterBySite` — support multiple siteIds

```typescript
// ✅ FIX — filter by multiple siteIds
function filterBySite(
  customers: MixRadiusCustomer[],
  siteIds: string[],
  groups: MixRadiusOwnerGroup[]
): MixRadiusCustomer[] {
  if (siteIds.length === 0) return customers;

  const allowedOwners = groups
    .filter(g => g.siteId && siteIds.includes(g.siteId))
    .flatMap(g => g.owners);

  if (allowedOwners.length === 0) return customers;

  return customers.filter(c => allowedOwners.includes(c.owner_name));
}
```

**Update route handler** (`app/api/mobile/mixradius/customers/route.ts`):

```typescript
// ❌ SEBELUM
const userSiteId = ctx.session!.user.siteId;
if (userSiteId) {
  params.siteId = userSiteId;
}

// ✅ SESUDAH
const userId = ctx.session!.user.id;
const userSiteIds = await getUserSiteIds(userId, tenantId);
if (userSiteIds.length > 0) {
  params.siteIds = userSiteIds; // kirim array, bukan single value
}
```

---

## 4. Checklist Implementasi

- [ ] Buat helper `getUserSiteIds(userId, tenantId)` — query `UserSite` + fallback ke `user.siteId`
- [ ] Update `MixRadiusGroupRouteService.getMobileGroups()` — terima `userId` bukan `siteId`
- [ ] Update `filterBySite()` — support array `siteIds`
- [ ] Update route handler `/api/mobile/mixradius/groups` — pass `userId`
- [ ] Update route handler `/api/mobile/mixradius/customers` — pass `siteIds[]`
- [ ] Pastikan backward compatible: user tanpa data `UserSite` tetap bisa akses (fallback ke `user.siteId`)
- [ ] Testing: karyawan dengan 1 site, 2+ site, dan tanpa site

---

## 5. Tidak Perlu Ubah Mobile

Mobile app (`isolir.tsx`) sudah fleksibel — data groups di-render dari response backend. Selama backend mengembalikan semua groups yang relevan, mobile otomatis menampilkan semuanya.

---

## 6. Contoh Data Test

```
User: "Teknisi A"
├─ UserSite: [{ siteId: "site-jakarta", isPrimary: true }, { siteId: "site-bandung" }]
│
├─ MixRadiusOwnerGroup:
│   ├─ { id: "g1", name: "Jakarta Selatan", siteId: "site-jakarta", owners: ["owner-js1"] }
│   ├─ { id: "g2", name: "Bandung Kota", siteId: "site-bandung", owners: ["owner-bdg"] }
│   └─ { id: "g3", name: "Surabaya", siteId: "site-surabaya", owners: ["owner-sby"] }
│
├─ EXPECTED (setelah fix):
│   ├─ Groups: [g1, g2] ← keduanya terlihat
│   └─ Customers: pelanggan dari owner-js1 + owner-bdg
│
└─ ACTUAL (saat ini):
    ├─ Groups: [g1] ← hanya primary site
    └─ Customers: pelanggan dari owner-js1 saja
```

---

**Contact**: Mobile Team
**Priority**: Harus selesai sebelum rollout fitur multi-site assignment ke karyawan lapangan.
