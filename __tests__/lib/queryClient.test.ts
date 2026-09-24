import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockShowToast = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

const mockCaptureException = jest.fn();
jest.mock('@/services/ErrorReportingService', () => ({
  errorReportingService: { captureException: (...args: unknown[]) => mockCaptureException(...args) },
}));

// `onError` mencatat tiap query gagal lewat logger.error — dibisukan di sini
// karena kegagalan itu sengaja dipicu oleh test, bukan noise yang perlu dilihat.
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { queryClient, queryKeys } from '@/lib/queryClient';

describe('queryKeys.attendance.status', () => {
  it('scopes attendance status queries per user', () => {
    expect(queryKeys.attendance.status('user-1')).toEqual([
      'attendance',
      'status',
      'user-1',
    ]);
    expect(queryKeys.attendance.status('user-2')).toEqual([
      'attendance',
      'status',
      'user-2',
    ]);
    expect(queryKeys.attendance.status('user-1')).not.toEqual(
      queryKeys.attendance.status('user-2')
    );
  });

  it('keeps anonymous attendance status distinct from authenticated users', () => {
    expect(queryKeys.attendance.status()).toEqual([
      'attendance',
      'status',
      'anonymous',
    ]);
    expect(queryKeys.attendance.status()).not.toEqual(
      queryKeys.attendance.status('user-1')
    );
  });
});

describe('queryKeys.notifications', () => {
  it('uses a dedicated unread key separate from the notifications list', () => {
    expect(queryKeys.notifications.list()).toEqual([
      'notifications',
      'list',
    ]);
    expect(queryKeys.notifications.unread()).toEqual([
      'notifications',
      'unread',
    ]);
    expect(queryKeys.notifications.unread()).not.toEqual(
      queryKeys.notifications.list()
    );
  });
});

describe('queryKeys.attendance other scopes', () => {
  it('scopes attendance geofence per user', () => {
    expect(queryKeys.attendance.geofence('user-1')).toEqual([
      'attendance',
      'geofence',
      'user-1',
    ]);
    expect(queryKeys.attendance.geofence('user-2')).toEqual([
      'attendance',
      'geofence',
      'user-2',
    ]);
    expect(queryKeys.attendance.geofence('user-1')).not.toEqual(
      queryKeys.attendance.geofence('user-2')
    );
  });

  it('scopes attendance today and history per user', () => {
    expect(queryKeys.attendance.today('user-1')).toEqual([
      'attendance',
      'today',
      'user-1',
    ]);
    expect(queryKeys.attendance.history('user-1')).toEqual([
      'attendance',
      'history',
      'user-1',
    ]);
    expect(queryKeys.attendance.today('user-1')).not.toEqual(
      queryKeys.attendance.today('user-2')
    );
    expect(queryKeys.attendance.history('user-1')).not.toEqual(
      queryKeys.attendance.history('user-2')
    );
  });

  it('keeps anonymous geofence distinct from authenticated users', () => {
    expect(queryKeys.attendance.geofence()).toEqual([
      'attendance',
      'geofence',
      'anonymous',
    ]);
    expect(queryKeys.attendance.today()).toEqual([
      'attendance',
      'today',
      'anonymous',
    ]);
    expect(queryKeys.attendance.history()).toEqual([
      'attendance',
      'history',
      'anonymous',
    ]);
  });
});

// Ruling (Review Focus #4, Task 8): 403 dari endpoint ringkasan presurvei
// tidak boleh memunculkan toast global "Gagal Memuat Data" — sales yang
// belum diberi izin harus melihat status "belum aktif" di layar, bukan
// galat. `useRingkasanPresurvei` (src/hooks/queries/useRingkasanPresurvei.ts)
// menandai ini lewat `meta: { silentToastStatuses: [403] }`; di sini
// dibuktikan langsung lewat `queryClient` sungguhan (bukan mock) bahwa
// `QueryCache.onError` benar-benar meredam status yang tercantum di meta,
// dan TETAP menampilkan toast untuk status yang tidak tercantum.
describe('queryClient toast peredam per query (meta.silentToastStatuses)', () => {
  beforeEach(() => {
    mockShowToast.mockClear();
  });

  afterAll(() => {
    queryClient.clear();
  });

  // Review akhir M1: mutan yang membisukan toast untuk SEMUA query tanpa
  // `meta` (WO, absensi, barang) sebelumnya lolos seluruh suite.
  it('regresi: query lama TANPA meta tetap menampilkan toast galat', async () => {
    const galat500 = { isAxiosError: true, response: { status: 500 } };

    await expect(
      queryClient.fetchQuery({
        queryKey: ['uji-toast', 'tanpa-meta'],
        queryFn: () => Promise.reject(galat500),
        retry: false,
      })
    ).rejects.toBe(galat500);

    expect(mockShowToast).toHaveBeenCalledWith('error', 'Gagal Memuat Data', 'Unknown query error');
  });

  it('regresi: galat jaringan (tanpa response) tetap bertoast walau meta meredam 403', async () => {
    const galatJaringan = { isAxiosError: true, message: 'Network Error', response: undefined };

    await expect(
      queryClient.fetchQuery({
        queryKey: ['uji-toast', 'jaringan-dengan-meta'],
        queryFn: () => Promise.reject(galatJaringan),
        retry: false,
        meta: { silentToastStatuses: [403] },
      })
    ).rejects.toBe(galatJaringan);

    expect(mockShowToast).toHaveBeenCalledWith('error', 'Gagal Memuat Data', expect.any(String));
  });

  it('meredam toast saat status galat tercantum di meta.silentToastStatuses', async () => {
    const galat403 = { isAxiosError: true, response: { status: 403 } };

    await expect(
      queryClient.fetchQuery({
        queryKey: ['uji-toast', 'diredam'],
        queryFn: () => Promise.reject(galat403),
        retry: false,
        meta: { silentToastStatuses: [403] },
      })
    ).rejects.toBe(galat403);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('tetap menampilkan toast untuk status yang tidak tercantum di meta', async () => {
    const galat500 = { isAxiosError: true, response: { status: 500 } };

    await expect(
      queryClient.fetchQuery({
        queryKey: ['uji-toast', 'tidak-diredam'],
        queryFn: () => Promise.reject(galat500),
        retry: false,
        // meta sama seperti useRingkasanPresurvei — hanya 403 yang diredam,
        // membuktikan ini bukan "matikan toast untuk seluruh query ringkasan".
        meta: { silentToastStatuses: [403] },
      })
    ).rejects.toBe(galat500);

    expect(mockShowToast).toHaveBeenCalledWith('error', 'Gagal Memuat Data', 'Unknown query error');
  });
});

// Ruling fix round Task 15 (#2): `MutationCache.onError` sebelumnya tidak
// membaca `meta` sama sekali, sehingga toast generik "Gagal Menyimpan
// Perubahan" SELALU tampil untuk setiap galat mutasi — bahkan untuk hook
// yang sudah menampilkan pesannya sendiri (mis. `useUbahStatusProspek`),
// menghasilkan toast ganda. `meta.skipGlobalErrorToast: true` meredam
// toast global itu untuk SATU mutasi tertentu; mutasi lain (absensi,
// canvasing, WO, dll.) yang tidak menyetel meta ini tetap menampilkan
// toast seperti sebelumnya. Dibuktikan lewat `MutationCache.build().execute()`
// langsung terhadap `queryClient` sungguhan, tanpa React, supaya tidak perlu
// `act(...)`.
describe('queryClient toast peredam per mutasi (meta.skipGlobalErrorToast)', () => {
  // Berkas ini tidak me-reset mock secara global; describe query di atas
  // sudah memanggil `mockShowToast` sebelum blok ini berjalan.
  beforeEach(() => {
    mockShowToast.mockClear();
  });

  afterAll(() => {
    queryClient.clear();
  });

  const jalankanMutasiGagal = (galat: unknown, meta?: Record<string, unknown>) => {
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: () => Promise.reject(galat),
      retry: false,
      // Ruling fix round Task 15 (#2, re-review): tanpa ini, tiap Mutation
      // menjadwalkan GC 5 menit (default TanStack) yang tidak dibatalkan
      // `queryClient.clear()` di `afterAll`, membuat proses Jest menggantung
      // saat berkas ini dijalankan sendirian.
      gcTime: 0,
      meta,
    });
    return mutation.execute(undefined);
  };

  it('meredam toast global saat meta.skipGlobalErrorToast true', async () => {
    const galat500 = { isAxiosError: true, response: { status: 500 } };

    await expect(
      jalankanMutasiGagal(galat500, { skipGlobalErrorToast: true }),
    ).rejects.toBe(galat500);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('tetap menampilkan toast global tanpa meta.skipGlobalErrorToast (mutasi lain tidak terpengaruh)', async () => {
    const galat500 = { isAxiosError: true, response: { status: 500 } };

    await expect(jalankanMutasiGagal(galat500)).rejects.toBe(galat500);

    // Status 500 tidak ada di TOAST_MESSAGE_BY_STATUS, dan `galat500` bukan
    // instance Error, jadi normalizeQueryError jatuh ke pesan generiknya
    // sendiri ("Unknown query error") — bukan fallbackMessage `queryClient.ts`.
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'Gagal Menyimpan Perubahan',
      'Unknown query error',
    );
  });

  it('regresi galat jaringan: diredam dengan meta, tetap tampil tanpa meta', async () => {
    const galatJaringan = Object.assign(new Error('Network Error'), {
      isAxiosError: true,
      response: undefined,
    });

    await expect(jalankanMutasiGagal(galatJaringan)).rejects.toBe(galatJaringan);
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'Gagal Menyimpan Perubahan',
      'Network Error',
    );
    mockShowToast.mockClear();

    await expect(
      jalankanMutasiGagal(galatJaringan, { skipGlobalErrorToast: true }),
    ).rejects.toBe(galatJaringan);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
