import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockUseQuery = jest.fn();
const mockUseInfiniteQuery = jest.fn();

// Mock sebagian: `QueryClient` asli tetap ada karena `src/lib/queryClient.ts:73`
// membuatnya saat modul dimuat (sumber `queryKeys`). Yang diganti hanya hook
// yang opsinya diperiksa.
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useInfiniteQuery: (...args: unknown[]) => mockUseInfiniteQuery(...args),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  keepPreviousData: 'keepPreviousData-sentinel',
}));

const mockDaftarKegiatan = jest.fn();
const mockDaftarProspek = jest.fn();
const mockRincianProspek = jest.fn();
const mockRingkasan = jest.fn();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: {
    daftarKegiatan: (...a: unknown[]) => mockDaftarKegiatan(...a),
    daftarProspek: (...a: unknown[]) => mockDaftarProspek(...a),
    rincianProspek: (...a: unknown[]) => mockRincianProspek(...a),
    ringkasan: (...a: unknown[]) => mockRingkasan(...a),
  },
}));

const mockGetPendingQueue = jest.fn<() => Promise<unknown[]>>();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: { getPendingQueue: () => mockGetPendingQueue() },
}));

import { useKegiatanHarian, useKegiatanMenungguKirim, useKegiatanProspek } from '@/hooks/queries/usePresurveiKegiatan';
import { getHalamanProspekBerikutnya, useDaftarProspek, useRincianProspek } from '@/hooks/queries/usePresurveiProspek';
import { isBolehUlangRingkasan, useRingkasanPresurvei } from '@/hooks/queries/useRingkasanPresurvei';
import { STATUS_AKSES_DITOLAK } from '@/utils/httpStatus';

type OpsiQuery = {
  queryKey: unknown[];
  queryFn: (konteks?: { pageParam: number }) => unknown;
  enabled?: boolean;
  retry?: unknown;
  initialPageParam?: number;
  placeholderData?: unknown;
  meta?: unknown;
};
const opsiTerakhir = (mock: { mock: { calls: unknown[][] } }) =>
  mock.mock.calls[mock.mock.calls.length - 1][0] as OpsiQuery;

describe('hook kegiatan presurvei', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('kegiatan harian meminta hari lokal penuh dengan batas 100', () => {
    renderHook(() => useKegiatanHarian(new Date(2026, 8, 24, 10)));
    const opsi = opsiTerakhir(mockUseQuery);

    opsi.queryFn();

    const rentang = { dariTanggal: '2026-09-23T17:00:00.000Z', sampaiTanggal: '2026-09-24T16:59:59.999Z' };
    expect(opsi.queryKey).toEqual(['presurvei', 'kegiatan', rentang]);
    expect(mockDaftarKegiatan).toHaveBeenCalledWith({ ...rentang, page: 1, limit: 100 });
  });

  it('riwayat kegiatan prospek memakai prospekId dan nonaktif tanpa id', () => {
    renderHook(() => useKegiatanProspek('p-9'));
    opsiTerakhir(mockUseQuery).queryFn();
    expect(mockDaftarKegiatan).toHaveBeenCalledWith({ prospekId: 'p-9', page: 1, limit: 20 });

    renderHook(() => useKegiatanProspek(''));
    expect(opsiTerakhir(mockUseQuery).enabled).toBe(false);
  });

  it('antrean membaca kegiatan presurvei dari antrean offline', async () => {
    mockGetPendingQueue.mockResolvedValue([
      {
        id: 4,
        url: '/api/presurvei/kegiatan',
        method: 'POST',
        body: JSON.stringify({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', waktuMulai: '2026-09-24T01:00:00.000Z' }),
        status: 'PENDING',
        createdAt: '2026-09-24T01:00:01.000Z',
        meta: '{}',
      },
    ]);
    renderHook(() => useKegiatanMenungguKirim());
    const opsi = opsiTerakhir(mockUseQuery);

    const hasil = (await opsi.queryFn()) as { idAntrean: number }[];

    expect(opsi.queryKey).toEqual(['presurvei', 'antrean']);
    expect(hasil.map((kegiatan) => kegiatan.idAntrean)).toEqual([4]);
  });
});

describe('hook prospek presurvei', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('daftar prospek berhalaman dengan filter', () => {
    renderHook(() => useDaftarProspek({ status: 'BARU', search: 'budi' }));
    const opsi = opsiTerakhir(mockUseInfiniteQuery);

    opsi.queryFn({ pageParam: 3 });

    expect(opsi.queryKey).toEqual(['presurvei', 'prospek', 'list', { status: 'BARU', search: 'budi' }]);
    expect(opsi.initialPageParam).toBe(1);
    expect(opsi.placeholderData).toBe('keepPreviousData-sentinel');
    expect(mockDaftarProspek).toHaveBeenCalledWith({ status: 'BARU', search: 'budi', page: 3, limit: 20 });
  });

  it('halaman berikutnya berhenti di halaman terakhir', () => {
    const halaman = (page: number, totalPages: number) => ({ data: [], meta: { page, limit: 20, total: 0, totalPages } });
    expect(getHalamanProspekBerikutnya(halaman(1, 3))).toBe(2);
    expect(getHalamanProspekBerikutnya(halaman(3, 3))).toBeUndefined();
    expect(getHalamanProspekBerikutnya(halaman(1, 0))).toBeUndefined();
  });

  it('rincian prospek memakai id dan nonaktif tanpa id', () => {
    renderHook(() => useRincianProspek('p-2'));
    const opsi = opsiTerakhir(mockUseQuery);
    opsi.queryFn();
    expect(opsi.queryKey).toEqual(['presurvei', 'prospek', 'detail', 'p-2']);
    expect(mockRincianProspek).toHaveBeenCalledWith('p-2');

    renderHook(() => useRincianProspek(''));
    expect(opsiTerakhir(mockUseQuery).enabled).toBe(false);
  });
});

describe('hook ringkasan presurvei', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tidak memanggil server bila presurvei belum aktif', () => {
    renderHook(() => useRingkasanPresurvei(false));
    const opsi = opsiTerakhir(mockUseQuery);

    expect(opsi.queryKey).toEqual(['presurvei', 'ringkasan']);
    expect(opsi.enabled).toBe(false);
    expect(opsi.retry).toBe(isBolehUlangRingkasan);
    // Review Focus #4: 403 pada ringkasan tak boleh memicu toast global —
    // dibuktikan meredam lewat `meta`, lihat __tests__/lib/queryClient.test.ts
    // untuk pembuktian queryCache-nya benar-benar meredam status ini.
    expect(opsi.meta).toEqual({ silentToastStatuses: [STATUS_AKSES_DITOLAK] });
  });

  it('403 tidak diulang, galat lain diulang sampai dua kali', () => {
    const galat403 = { isAxiosError: true, response: { status: 403 } };
    const galat500 = { isAxiosError: true, response: { status: 500 } };
    expect(isBolehUlangRingkasan(0, galat403)).toBe(false);
    expect(isBolehUlangRingkasan(1, galat500)).toBe(true);
    expect(isBolehUlangRingkasan(2, galat500)).toBe(false);
  });
});
