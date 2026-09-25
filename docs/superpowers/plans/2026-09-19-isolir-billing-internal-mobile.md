# Menu Isolir — Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghadirkan kembali menu Isolir dengan data billing sendiri, dan membuat mode Customer pada Ajukan WO memilih pelanggan terdaftar.

**Architecture:** Layar Expo Router → hook TanStack Query (`useInfiniteQuery`) → `PelangganService` (axios) → `GET /api/mobile/pelanggan`. Layar tidak memuat logika bisnis; pemetaan dan paginasi ada di service dan hook.

**Tech Stack:** Expo SDK 54, Expo Router 6, React 19, TanStack Query v5, twrnc, FlashList v2, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-19-menu-isolir-billing-internal-design.md`

**Repo kerja:** `/Users/rohadimraja/Documents/radpro/mobile-netmanager`

**Prasyarat:** Rencana backend (`2026-09-19-isolir-billing-internal-backend.md`) sudah selesai dan ter-deploy, serta permission `m_pelanggan` sudah diberikan ke role yang dituju. Tanpa itu, layar hanya akan menampilkan error.

## Global Constraints

- Server state hanya lewat TanStack Query; `useState` dilarang untuk data dari API.
- Styling hanya `twrnc`; `StyleSheet.create()` dilarang.
- Navigasi hanya Expo Router. Route baru wajib didaftarkan di `app/(app)/_layout.tsx`.
- Maksimal 20 baris per fungsi, 3 parameter (lebih dari itu pakai object), nesting maksimal 2 level, 300 baris per berkas, satu komponen per berkas, props interface eksplisit (bukan `any`).
- Query key mengikuti konvensi `[domain, action, params]`.
- FlashList v2: jangan memakai `estimatedItemSize` atau `inverted` (tidak dibaca v2).
- **Jangan menyentuh** `package.json`, `package-lock.json`, `app.config.ts`, `app.json`, `plugins/`, `.gitignore`, atau `.github/workflows/build-android.yml` (dulu `.gitea/…`) — memicu build native dan menggeser fingerprint OTA.
- Tes: Jest, lokasi `__tests__/`, pola `require()` untuk memuat layar setelah `jest.mock` (lihat `__tests__/app/topology-map-readonly-boundary.test.tsx`).
- Commit: `<type>(<scope>): <judul>` dan diakhiri `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Service, hook, dan feature flag

**Files:**
- Create: `src/services/PelangganService.ts`
- Create: `src/hooks/queries/usePelangganList.ts`
- Modify: `src/constants/features.ts` (tambah `PELANGGAN`)
- Test: `__tests__/services/PelangganService.test.ts`, `__tests__/hooks/usePelangganList.test.ts`

**Interfaces:**
- Consumes: `GET /api/mobile/pelanggan` dari rencana backend; respons `{ success, data, meta: { page, limit, total, totalPages } }`.
- Produces:
  - `interface MobilePelanggan { id, idPelanggan, nama, username, status, paket, alamat, noTelp, jatuhTempo, siteId, siteName, latitude, longitude }`
  - `interface PelangganPage { data: MobilePelanggan[]; meta: { page: number; limit: number; total: number; totalPages: number } }`
  - `PelangganService.list(params: { status?: string; search?: string; siteId?: string; page: number; limit: number }): Promise<PelangganPage>`
  - `getNextPelangganPage(lastPage: PelangganPage): number | undefined`
  - `usePelangganList(params: { status?: string; search?: string })`
  - `AppFeature.PELANGGAN = 'm_pelanggan'`

- [ ] **Step 1: Tulis tes service yang gagal**

```ts
// __tests__/services/PelangganService.test.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn<(url: string, config?: unknown) => Promise<unknown>>();

jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (u: string, c?: unknown) => mockGet(u, c) } }));

import { PelangganService } from '@/services/PelangganService';

describe('PelangganService.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 'plg-1', nama: 'Budi' }],
        meta: { page: 2, limit: 20, total: 45, totalPages: 3 },
      },
    });
  });

  it('memanggil endpoint mobile dengan parameter query yang diminta', async () => {
    await PelangganService.list({ status: 'ISOLIR', search: 'budi', page: 2, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/mobile/pelanggan', {
      params: { status: 'ISOLIR', search: 'budi', page: 2, limit: 20 },
    });
  });

  it('mengembalikan data dan meta halaman', async () => {
    const page = await PelangganService.list({ page: 2, limit: 20 });

    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });

  it('tidak mengirim parameter kosong', async () => {
    await PelangganService.list({ search: '', page: 1, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/mobile/pelanggan', {
      params: { page: 1, limit: 20 },
    });
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npx jest __tests__/services/PelangganService.test.ts`
Expected: FAIL — `Cannot find module '@/services/PelangganService'`.

- [ ] **Step 3: Implementasi service**

```ts
// src/services/PelangganService.ts
import api from "./api";

/** Pelanggan versi ringkas yang dikirim endpoint mobile. */
export interface MobilePelanggan {
  id: string;
  idPelanggan: string;
  nama: string;
  username: string;
  status: string;
  paket: string | null;
  alamat: string | null;
  noTelp: string | null;
  jatuhTempo: string;
  siteId: string | null;
  siteName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PelangganPage {
  data: MobilePelanggan[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ListParams {
  status?: string;
  search?: string;
  siteId?: string;
  page: number;
  limit: number;
}

/** Buang parameter kosong supaya query string tetap bersih. */
const toQueryParams = (params: ListParams): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  ) as Record<string, string | number>;

export const PelangganService = {
  /** Ambil satu halaman daftar pelanggan milik site karyawan. */
  async list(params: ListParams): Promise<PelangganPage> {
    const response = await api.get("/api/mobile/pelanggan", {
      params: toQueryParams(params),
    });
    return { data: response.data.data, meta: response.data.meta };
  },
};
```

- [ ] **Step 4: Jalankan tes, pastikan lulus**

Run: `npx jest __tests__/services/PelangganService.test.ts`
Expected: PASS (3 tes).

- [ ] **Step 5: Tulis tes paginasi hook yang gagal**

```ts
// __tests__/hooks/usePelangganList.test.ts
import { describe, expect, it } from '@jest/globals';
import { getNextPelangganPage } from '@/hooks/queries/usePelangganList';

const page = (current: number, totalPages: number) => ({
  data: [],
  meta: { page: current, limit: 20, total: totalPages * 20, totalPages },
});

describe('getNextPelangganPage', () => {
  it('meminta halaman berikutnya selama masih ada sisa', () => {
    expect(getNextPelangganPage(page(1, 3))).toBe(2);
  });

  it('berhenti di halaman terakhir', () => {
    expect(getNextPelangganPage(page(3, 3))).toBeUndefined();
  });

  it('berhenti ketika hasil kosong', () => {
    expect(getNextPelangganPage(page(1, 0))).toBeUndefined();
  });
});
```

- [ ] **Step 6: Jalankan tes, pastikan gagal**

Run: `npx jest __tests__/hooks/usePelangganList.test.ts`
Expected: FAIL — modul hook belum ada.

- [ ] **Step 7: Implementasi hook dan feature flag**

```ts
// src/hooks/queries/usePelangganList.ts
import { useInfiniteQuery } from "@tanstack/react-query";

import { PelangganPage, PelangganService } from "@/services/PelangganService";

const PAGE_SIZE = 20;
const STALE_TIME_MS = 5 * 60 * 1000;

/** Halaman berikutnya, atau undefined bila sudah halaman terakhir. */
export const getNextPelangganPage = (lastPage: PelangganPage): number | undefined =>
  lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined;

/** Daftar pelanggan berpaginasi untuk layar Isolir dan picker Ajukan WO. */
export function usePelangganList(params: { status?: string; search?: string }) {
  return useInfiniteQuery<PelangganPage>({
    queryKey: ["pelanggan", "list", params],
    queryFn: ({ pageParam }) =>
      PelangganService.list({ ...params, page: pageParam as number, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: getNextPelangganPage,
    staleTime: STALE_TIME_MS,
  });
}
```

```ts
// src/constants/features.ts — tambahkan ke enum AppFeature
  PELANGGAN = 'm_pelanggan',
```

- [ ] **Step 8: Jalankan tes, pastikan lulus**

Run: `npx jest __tests__/hooks/usePelangganList.test.ts __tests__/services/PelangganService.test.ts && npx tsc --noEmit`
Expected: PASS (6 tes), 0 error tipe.

- [ ] **Step 9: Commit**

```bash
git add src/services/PelangganService.ts src/hooks/queries/usePelangganList.ts src/constants/features.ts __tests__/services/PelangganService.test.ts __tests__/hooks/usePelangganList.test.ts
git commit -m "feat(pelanggan): service dan hook daftar pelanggan mobile"
```

---

### Task 2: Layar Isolir

**Files:**
- Create: `app/(app)/pelanggan/isolir.tsx`
- Create: `src/components/molecules/PelangganCard.tsx`
- Test: `__tests__/app/pelanggan-isolir-boundary.test.tsx`

**Interfaces:**
- Consumes: `usePelangganList` dan `MobilePelanggan` (Task 1); `useFeatureGuard(AppFeature.PELANGGAN)`; `useDebouncedValue` dari `@/hooks/useDebouncedValue`.
- Produces: default export `PelangganIsolirScreen`; `PelangganCard` dengan props `{ pelanggan: MobilePelanggan; onRequestWorkOrder: (pelanggan: MobilePelanggan) => void }`.

- [ ] **Step 1: Tulis tes batas yang gagal**

```tsx
// __tests__/app/pelanggan-isolir-boundary.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockUsePelangganList = jest.fn();
const mockUseFeatureGuard = jest.fn();
const mockPush = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('@/hooks/queries/usePelangganList', () => ({
  usePelangganList: (...args: any[]) => mockUsePelangganList(...args),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: (...args: any[]) => mockUseFeatureGuard(...args),
}));
jest.mock('@/constants/features', () => ({ AppFeature: { PELANGGAN: 'm_pelanggan' } }));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: mockApiGet, post: mockApiPost },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@shopify/flash-list', () => {
  const MockReact = require('react');
  return {
    FlashList: ({ data = [], renderItem, ListEmptyComponent }: any) => (
      <>
        {data.map((item: any, index: number) => (
          <MockReact.Fragment key={item.id ?? index}>{renderItem({ item, index })}</MockReact.Fragment>
        ))}
        {data.length === 0 ? ListEmptyComponent : null}
      </>
    ),
  };
});
jest.mock('lucide-react-native', () => ({
  AlertTriangle: () => null, CloudOff: () => null, MapPin: () => null,
  Phone: () => null, Search: () => null, X: () => null, Wrench: () => null,
}));
jest.mock('twrnc', () => () => ({}));

const pelanggan = {
  id: 'plg-1',
  idPelanggan: 'P-001',
  nama: 'Budi Santoso',
  username: 'budi',
  status: 'ISOLIR',
  paket: 'Paket 20 Mbps',
  alamat: 'Jl. Mawar 1',
  noTelp: '08123',
  jatuhTempo: '2026-09-10T00:00:00.000Z',
  siteId: 'site-a',
  siteName: 'Site A',
  latitude: -6.2,
  longitude: 106.8,
};

const queryResult = (overrides: Record<string, unknown> = {}) => ({
  data: { pages: [{ data: [pelanggan], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }] },
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetching: false,
  isRefetching: false,
  refetch: jest.fn(),
  isError: false,
  error: null,
  ...overrides,
});

describe('layar isolir pelanggan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePelangganList.mockReturnValue(queryResult());
  });

  it('meminta pelanggan berstatus ISOLIR dan dijaga feature guard', () => {
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;

    render(<PelangganIsolirScreen />);

    expect(mockUseFeatureGuard).toHaveBeenCalledWith('m_pelanggan');
    expect(mockUsePelangganList).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ISOLIR' }),
    );
  });

  it('tidak memanggil endpoint tulis apa pun dari layar ini', () => {
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;

    render(<PelangganIsolirScreen />);

    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('membuka Ajukan WO dengan membawa pelanggan terpilih', () => {
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;
    const { getByText } = render(<PelangganIsolirScreen />);

    fireEvent.press(getByText('Ajukan WO'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/request-work-order',
      params: { pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' },
    });
  });

  it('menjelaskan ketika karyawan belum punya site', () => {
    mockUsePelangganList.mockReturnValue(
      queryResult({
        data: undefined,
        isError: true,
        error: { response: { status: 403 } },
      }),
    );
    const PelangganIsolirScreen = require('../../app/(app)/pelanggan/isolir').default;

    const { getByText } = render(<PelangganIsolirScreen />);

    expect(getByText(/belum ada site/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npx jest __tests__/app/pelanggan-isolir-boundary.test.tsx`
Expected: FAIL — layar belum ada.

- [ ] **Step 3: Implementasi kartu pelanggan**

```tsx
// src/components/molecules/PelangganCard.tsx
import { MapPin, Phone, Wrench } from "lucide-react-native";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

import { MobilePelanggan } from "@/services/PelangganService";
import { formatDate } from "@/utils/date";

interface PelangganCardProps {
  pelanggan: MobilePelanggan;
  onRequestWorkOrder: (pelanggan: MobilePelanggan) => void;
}

/** Kartu ringkas satu pelanggan pada daftar isolir. */
export const PelangganCard = memo(({ pelanggan, onRequestWorkOrder }: PelangganCardProps) => (
  <View style={tw`bg-white mx-4 mb-3 p-4 rounded-xl border border-gray-100`}>
    <Text style={tw`text-gray-900 font-bold`}>{pelanggan.nama}</Text>
    <Text style={tw`text-gray-500 text-xs mt-1`}>
      {pelanggan.idPelanggan} · {pelanggan.username}
      {pelanggan.siteName ? ` · ${pelanggan.siteName}` : ""}
    </Text>
    <Text style={tw`text-gray-600 text-xs mt-2`}>{pelanggan.paket ?? "Paket tidak diketahui"}</Text>
    <Text style={tw`text-red-600 text-xs mt-1`}>
      Jatuh tempo {formatDate(pelanggan.jatuhTempo)}
    </Text>
    {pelanggan.alamat ? (
      <View style={tw`flex-row items-center mt-2`}>
        <MapPin size={12} color="#9ca3af" />
        <Text style={tw`text-gray-500 text-xs ml-1 flex-1`}>{pelanggan.alamat}</Text>
      </View>
    ) : null}
    {pelanggan.noTelp ? (
      <View style={tw`flex-row items-center mt-1`}>
        <Phone size={12} color="#9ca3af" />
        <Text style={tw`text-gray-500 text-xs ml-1`}>{pelanggan.noTelp}</Text>
      </View>
    ) : null}
    <TouchableOpacity
      onPress={() => onRequestWorkOrder(pelanggan)}
      style={tw`mt-3 flex-row items-center justify-center bg-blue-600 py-2 rounded-lg`}
    >
      <Wrench size={14} color="#ffffff" />
      <Text style={tw`text-white font-bold text-xs ml-2`}>Ajukan WO</Text>
    </TouchableOpacity>
  </View>
));
PelangganCard.displayName = "PelangganCard";
```

- [ ] **Step 4: Implementasi layar**

```tsx
// app/(app)/pelanggan/isolir.tsx
import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { AlertTriangle, CloudOff, Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";

import { PelangganCard } from "@/components/molecules/PelangganCard";
import { AppFeature } from "@/constants/features";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePelangganList } from "@/hooks/queries/usePelangganList";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { MobilePelanggan } from "@/services/PelangganService";

const SEARCH_DEBOUNCE_MS = 400;
const FORBIDDEN_STATUS = 403;

export default function PelangganIsolirScreen() {
  useFeatureGuard(AppFeature.PELANGGAN);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage,
    isFetching, isRefetching, refetch, isError, error,
  } = usePelangganList({ status: "ISOLIR", search: debouncedSearch });

  const pelanggans = data?.pages.flatMap((page) => page.data) ?? [];
  const isForbidden =
    (error as { response?: { status?: number } } | null)?.response?.status === FORBIDDEN_STATUS;

  const handleRequestWorkOrder = useCallback(
    (pelanggan: MobilePelanggan) => {
      router.push({
        pathname: "/(app)/request-work-order",
        params: { pelangganId: pelanggan.id, pelangganNama: pelanggan.nama },
      });
    },
    [router],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`px-4 py-3`}>
        <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Pelanggan Isolir</Text>
        <View style={tw`flex-row items-center bg-white px-3 rounded-lg border border-gray-200`}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={tw`flex-1 h-10 ml-2 text-gray-900`}
            placeholder="Cari nama, username, atau ID pelanggan..."
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlashList
        data={pelanggans}
        keyExtractor={(item: MobilePelanggan) => item.id}
        renderItem={({ item }: { item: MobilePelanggan }) => (
          <PelangganCard pelanggan={item} onRequestWorkOrder={handleRequestWorkOrder} />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
        }
        ListEmptyComponent={
          isFetching ? null : (
            <View style={tw`items-center justify-center py-20 px-8`}>
              {isError ? <AlertTriangle size={40} color="#dc2626" /> : <CloudOff size={40} color="#d1d5db" />}
              <Text style={tw`text-gray-500 mt-4 text-center`}>
                {isForbidden
                  ? "Belum ada site yang ditugaskan ke Anda. Hubungi admin."
                  : isError
                    ? "Gagal memuat data pelanggan."
                    : "Tidak ada pelanggan terisolir."}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
```

- [ ] **Step 5: Jalankan tes, pastikan lulus**

Run: `npx jest __tests__/app/pelanggan-isolir-boundary.test.tsx && npx tsc --noEmit && npx eslint "app/(app)/pelanggan/isolir.tsx" src/components/molecules/PelangganCard.tsx`
Expected: PASS (4 tes), 0 error tipe, 0 masalah lint.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/pelanggan/isolir.tsx" src/components/molecules/PelangganCard.tsx __tests__/app/pelanggan-isolir-boundary.test.tsx
git commit -m "feat(pelanggan): layar daftar pelanggan isolir"
```

---

### Task 3: Daftarkan route dan menu

**Files:**
- Modify: `app/(app)/_layout.tsx` (tambah `Tabs.Screen`)
- Modify: `src/components/organisms/dashboard/QuickMenu.tsx` (tambah entri menu)
- Test: tidak ada tes baru. Perilaku layar sudah dicakup Task 2; pendaftaran route dan menu diverifikasi lewat suite penuh dan uji manual di langkah bawah.

**Interfaces:**
- Consumes: layar `app/(app)/pelanggan/isolir.tsx` (Task 2); `AppFeature.PELANGGAN` (Task 1).
- Produces: route `pelanggan/isolir` yang tersembunyi dari tab bar, entri QuickMenu berjudul "Isolir".

- [ ] **Step 1: Daftarkan route tersembunyi**

```tsx
// app/(app)/_layout.tsx — letakkan bersama Tabs.Screen lain yang href: null
        <Tabs.Screen
          name="pelanggan/isolir"
          options={{
            href: null,
          }}
        />
```

- [ ] **Step 2: Tambahkan entri QuickMenu**

```tsx
// src/components/organisms/dashboard/QuickMenu.tsx
// tambahkan WifiOff pada import lucide-react-native, lalu tambahkan item:
  {
    title: "Isolir",
    subtitle: "Pelanggan",
    icon: WifiOff,
    color: "bg-red-100",
    iconColor: "#dc2626",
    route: "/(app)/pelanggan/isolir",
    requiredFeatures: [AppFeature.PELANGGAN],
  },
```

- [ ] **Step 3: Jalankan seluruh tes dan pemeriksaan**

Run: `npx jest && npx tsc --noEmit && npx expo lint .`
Expected: seluruh tes lulus, 0 error tipe, 0 warning lint.

- [ ] **Step 4: Uji manual di perangkat/emulator**

Run: `npx expo start --android`
Expected: menu "Isolir" muncul untuk akun ber-permission `m_pelanggan`, daftar terisi, pencarian bekerja, scroll memuat halaman berikutnya, dan menu tidak muncul untuk akun tanpa permission.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/_layout.tsx" src/components/organisms/dashboard/QuickMenu.tsx
git commit -m "feat(pelanggan): daftarkan route dan menu isolir"
```

---

### Task 4: Pilih pelanggan pada Ajukan WO

**Files:**
- Create: `src/components/molecules/PelangganPicker.tsx`
- Create: `src/components/molecules/PelangganPickerRow.tsx`
- Modify: `app/(app)/request-work-order.tsx` (mode Customer)
- Test: `__tests__/app/request-work-order-pelanggan-link.test.tsx`

**Jangan sampai merusak tes yang sudah ada:** `__tests__/app/request-work-order-customer-contact.test.tsx` memakai `toStrictEqual` pada payload, jadi `pelangganId` hanya boleh muncul ketika pelanggan benar-benar tertaut. Tes itu juga memastikan placeholder lama `'Cari nama / username / ID pelanggan...'` tidak ada, jadi picker baru harus memakai teks placeholder yang berbeda dan modalnya tertutup secara bawaan.

**Interfaces:**
- Consumes: `usePelangganList` (Task 1); `useLocalSearchParams()` untuk `pelangganId`/`pelangganNama` yang dikirim layar Isolir (Task 2); payload `POST /api/mobile/work-orders/request` yang kini menerima `pelangganId` (rencana backend Task 4).
- Produces: `PelangganPicker` dengan props `{ visible: boolean; onClose: () => void; onSelect: (pelanggan: MobilePelanggan) => void }`; payload WO mode Customer menyertakan `pelangganId` ketika pelanggan dipilih.

- [ ] **Step 1: Tulis tes yang gagal**

```tsx
// __tests__/app/request-work-order-pelanggan-link.test.tsx
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

type MutateCallbacks = { onSuccess?: () => void; onError?: (error: unknown) => void };

const mockMutate = jest.fn<(payload: Record<string, unknown>, callbacks?: MutateCallbacks) => void>();
const mockUseApiQuery = jest.fn();
const mockSearchParams = jest.fn<() => Record<string, string | undefined>>();
const mockPelangganList = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => mockSearchParams(),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/constants/features', () => ({
  AppFeature: { WORK_ORDER: 'm_work_order', PELANGGAN: 'm_pelanggan' },
}));
jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
  useCreateWorkOrderRequest: () => ({ mutate: mockMutate }),
  isOfflineMutationQueuedResult: jest.fn(() => false),
}));
jest.mock('@/hooks/queries/usePelangganList', () => ({
  usePelangganList: (params: unknown) => mockPelangganList(params),
}));
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));
jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/components/molecules/LoadingModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/molecules/SelectionModal', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@shopify/flash-list', () => ({ FlashList: () => null }));
// Layar memakai banyak ikon; proxy ini mengembalikan komponen kosong untuk ikon apa pun.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const emptyPelangganList = {
  data: { pages: [{ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }] },
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetching: false,
};

describe('request work order — tautan pelanggan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate.mockReset();
    mockSearchParams.mockReturnValue({});
    mockPelangganList.mockReturnValue(emptyPelangganList);
    mockUseApiQuery.mockReturnValue({ data: [], isPending: false, isError: false, error: null });
  });

  const renderScreen = () => {
    const RequestWorkOrderScreen = require('../../app/(app)/request-work-order').default;
    return render(<RequestWorkOrderScreen />);
  };

  it('mengisi nama pelanggan dari parameter daftar isolir', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });

    const screen = renderScreen();

    expect(screen.getByLabelText('Nama Pelanggan').props.value).toBe('Budi Santoso');
  });

  it('mengirim pelangganId ketika WO diajukan dari daftar isolir', () => {
    mockSearchParams.mockReturnValue({ pelangganId: 'plg-1', pelangganNama: 'Budi Santoso' });

    const screen = renderScreen();
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));

    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({ pelangganId: 'plg-1', contactName: 'Budi Santoso' });
  });

  it('tidak menyertakan pelangganId untuk calon pelanggan yang diketik manual', () => {
    const screen = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Nama Pelanggan'), 'Calon Pelanggan');
    fireEvent.press(screen.getByText('FOC / UT'));
    fireEvent.press(screen.getByText('Kirim Request'));

    const [payload] = mockMutate.mock.calls[0];
    expect(payload.pelangganId).toBeUndefined();
    expect(payload.contactName).toBe('Calon Pelanggan');
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npx jest __tests__/app/request-work-order-pelanggan-link.test.tsx`
Expected: FAIL — payload belum memuat `pelangganId`.

- [ ] **Step 3: Implementasi picker**

```tsx
// src/components/molecules/PelangganPickerRow.tsx
import React, { memo } from "react";
import { Text, TouchableOpacity } from "react-native";
import tw from "twrnc";

import { MobilePelanggan } from "@/services/PelangganService";

interface PelangganPickerRowProps {
  pelanggan: MobilePelanggan;
  onPress: (pelanggan: MobilePelanggan) => void;
}

/** Satu baris hasil pencarian pelanggan di dalam picker. */
export const PelangganPickerRow = memo(({ pelanggan, onPress }: PelangganPickerRowProps) => (
  <TouchableOpacity
    onPress={() => onPress(pelanggan)}
    style={tw`py-3 border-b border-gray-100`}
  >
    <Text style={tw`text-gray-900 font-medium`}>{pelanggan.nama}</Text>
    <Text style={tw`text-gray-500 text-xs mt-1`}>
      {pelanggan.idPelanggan} · {pelanggan.status}
      {pelanggan.siteName ? ` · ${pelanggan.siteName}` : ""}
    </Text>
  </TouchableOpacity>
));
PelangganPickerRow.displayName = "PelangganPickerRow";
```

```tsx
// src/components/molecules/PelangganPicker.tsx
import { FlashList } from "@shopify/flash-list";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

import { PelangganPickerRow } from "@/components/molecules/PelangganPickerRow";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePelangganList } from "@/hooks/queries/usePelangganList";
import { MobilePelanggan } from "@/services/PelangganService";

const SEARCH_DEBOUNCE_MS = 400;

interface PelangganPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (pelanggan: MobilePelanggan) => void;
}

/** Modal pencarian pelanggan terdaftar untuk ditautkan ke work order. */
export function PelangganPicker({ visible, onClose, onSelect }: PelangganPickerProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  // Tanpa filter status: pelanggan aktif maupun isolir boleh dipilih.
  // Backend sudah mengecualikan DISMANTLE.
  const { data, fetchNextPage, hasNextPage, isFetching } = usePelangganList({
    search: debouncedSearch,
  });
  const pelanggans = data?.pages.flatMap((page) => page.data) ?? [];

  const handleSelect = useCallback(
    (pelanggan: MobilePelanggan) => {
      onSelect(pelanggan);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-white pt-12 px-4`}>
        <View style={tw`flex-row items-center mb-4`}>
          <Text style={tw`flex-1 text-lg font-bold text-gray-900`}>Pilih Pelanggan</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={tw`flex-row items-center bg-gray-50 px-3 rounded-lg border border-gray-200 mb-3`}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={tw`flex-1 h-10 ml-2 text-gray-900`}
            placeholder="Cari pelanggan terdaftar..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FlashList
          data={pelanggans}
          keyExtractor={(item: MobilePelanggan) => item.id}
          renderItem={({ item }: { item: MobilePelanggan }) => (
            <PelangganPickerRow pelanggan={item} onPress={handleSelect} />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            isFetching ? null : (
              <Text style={tw`text-gray-400 text-center py-10`}>Pelanggan tidak ditemukan</Text>
            )
          }
        />
      </View>
    </Modal>
  );
}
```

- [ ] **Step 4: Sambungkan ke layar Ajukan WO**

```tsx
// app/(app)/request-work-order.tsx

// 1) Import tambahan
import { useLocalSearchParams, useRouter } from "expo-router";
import { PelangganPicker } from "@/components/molecules/PelangganPicker";
import { MobilePelanggan } from "@/services/PelangganService";

// 2) State: pelanggan bawaan dari layar Isolir dipakai sebagai nilai awal kontak,
//    sehingga form langsung valid tanpa mengetik ulang.
const { pelangganId, pelangganNama } = useLocalSearchParams<{
  pelangganId?: string;
  pelangganNama?: string;
}>();
const [linkedPelangganId, setLinkedPelangganId] = useState<string | undefined>(pelangganId);
const [showPelangganPicker, setShowPelangganPicker] = useState(false);
const [customerContact, setCustomerContact] = useState<CustomerContactFormValues>(
  pelangganNama ? { ...EMPTY_CUSTOMER_CONTACT, contactName: pelangganNama } : EMPTY_CUSTOMER_CONTACT,
);

// 3) Handler pemilihan pelanggan dari picker
const handleSelectPelanggan = useCallback((pelanggan: MobilePelanggan) => {
  setLinkedPelangganId(pelanggan.id);
  setCustomerContact({
    contactName: pelanggan.nama,
    contactPhone: pelanggan.noTelp ?? "",
    locationAddress: pelanggan.alamat ?? "",
  });
}, []);

// 4) Di dalam handleModeChange yang sudah ada, ikut bersihkan tautan pelanggan:
  setLinkedPelangganId(undefined);

// 5) Tombol pembuka picker, diletakkan di atas CustomerContactFields pada mode Customer:
  {woMode === "CUSTOMER" ? (
    <TouchableOpacity
      onPress={() => setShowPelangganPicker(true)}
      style={tw`mb-3 py-2 px-3 rounded-lg border border-sky-200 bg-sky-50`}
    >
      <Text style={tw`text-sky-700 text-xs font-bold`}>
        {linkedPelangganId ? "Ganti Pelanggan Terdaftar" : "Pilih Pelanggan Terdaftar"}
      </Text>
    </TouchableOpacity>
  ) : null}

// 6) Modal picker, diletakkan bersama modal lain di bagian bawah layar:
  <PelangganPicker
    visible={showPelangganPicker}
    onClose={() => setShowPelangganPicker(false)}
    onSelect={handleSelectPelanggan}
  />

// 7) Saat menyusun payload mode Customer, sisipkan tautan hanya bila ada:
      ...(linkedPelangganId ? { pelangganId: linkedPelangganId } : {}),
```

- [ ] **Step 5: Jalankan tes, pastikan lulus**

Run: `npx jest __tests__/app/request-work-order-pelanggan-link.test.tsx __tests__/app/request-work-order-customer-contact.test.tsx`
Expected: PASS — tes baru lulus dan tes kontak manual yang sudah ada tetap hijau.

- [ ] **Step 6: Pemeriksaan penuh**

Run: `npx jest && npx tsc --noEmit && npx expo lint .`
Expected: seluruh tes lulus, 0 error, 0 warning.

- [ ] **Step 7: Commit**

```bash
git add src/components/molecules/PelangganPicker.tsx "app/(app)/request-work-order.tsx" __tests__/app/request-work-order-pelanggan-link.test.tsx
git commit -m "feat(work-order): pilih pelanggan terdaftar saat ajukan WO"
```

---

## Verifikasi akhir mobile

- [ ] `npx jest` — seluruh suite hijau, tanpa warning `act()`
- [ ] `npx tsc --noEmit` — 0 error
- [ ] `npx expo lint .` — 0 error, 0 warning
- [ ] `npx expo export --platform android` — bundle sukses
- [ ] `npx expo-updates fingerprint:generate --platform android` — fingerprint **sama** dengan sebelum perubahan (bukti cukup OTA, tanpa build native)
- [ ] Uji di perangkat: daftar isolir, pencarian, scroll halaman berikutnya, ajukan WO dari daftar, dan ajukan WO untuk calon pelanggan
