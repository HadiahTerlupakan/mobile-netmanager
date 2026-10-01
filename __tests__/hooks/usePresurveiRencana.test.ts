import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockUseQuery = jest.fn();

// Mock sebagian: `QueryClient` asli tetap ada karena `src/lib/queryClient.ts`
// membuatnya saat modul dimuat (sumber `queryKeys`).
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const mockDaftarRencana = jest.fn();
const mockRincianRencana = jest.fn();
const mockSalesTersedia = jest.fn();
const mockRekap = jest.fn();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: {
    daftarRencana: (...a: unknown[]) => mockDaftarRencana(...a),
    rincianRencana: (...a: unknown[]) => mockRincianRencana(...a),
    salesTersediaRencana: (...a: unknown[]) => mockSalesTersedia(...a),
    rekapRencana: (...a: unknown[]) => mockRekap(...a),
  },
}));

import {
  useDaftarRencana,
  useRekapRencana,
  useRincianRencana,
  useSalesTersediaRencana,
} from '@/hooks/queries/usePresurveiRencana';

type OpsiQuery = { queryKey: unknown[]; queryFn: () => unknown; enabled?: boolean };
const opsiTerakhir = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0] as OpsiQuery;

describe('hook rencana presurvei', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('daftar rencana satu hari memakai filter di query key dan batas 300', () => {
    renderHook(() => useDaftarRencana({ dari: '2026-09-26', sampai: '2026-09-26' }));
    const opsi = opsiTerakhir();

    opsi.queryFn();

    expect(opsi.queryKey).toEqual(['presurvei', 'rencana', 'list', { dari: '2026-09-26', sampai: '2026-09-26' }]);
    expect(opsi.enabled).toBe(true);
    expect(mockDaftarRencana).toHaveBeenCalledWith({ dari: '2026-09-26', sampai: '2026-09-26', page: 1, limit: 300 });
  });

  it('daftar rencana nonaktif selama presurvei belum aktif', () => {
    renderHook(() => useDaftarRencana({ status: 'TERLEWAT' }, false));
    expect(opsiTerakhir().enabled).toBe(false);
  });

  it('rincian rencana memakai id dan nonaktif tanpa id atau sebelum guard mengizinkan', () => {
    renderHook(() => useRincianRencana('r-3'));
    const opsi = opsiTerakhir();
    opsi.queryFn();
    expect(opsi.queryKey).toEqual(['presurvei', 'rencana', 'detail', 'r-3']);
    expect(mockRincianRencana).toHaveBeenCalledWith('r-3');

    renderHook(() => useRincianRencana(''));
    expect(opsiTerakhir().enabled).toBe(false);
    renderHook(() => useRincianRencana('r-3', false));
    expect(opsiTerakhir().enabled).toBe(false);
  });

  it('daftar rencana tim dengan salesId: salesId masuk query key sehingga cache per anggota', () => {
    renderHook(() => useDaftarRencana({ status: 'TERLEWAT', salesId: 's-2' }));
    const opsi = opsiTerakhir();
    opsi.queryFn();

    expect(opsi.queryKey).toEqual(['presurvei', 'rencana', 'list', { status: 'TERLEWAT', salesId: 's-2' }]);
    expect(mockDaftarRencana).toHaveBeenCalledWith({ status: 'TERLEWAT', salesId: 's-2', page: 1, limit: 300 });
  });

  it('sales tersedia di bawah presurvei.all dan hanya aktif untuk pemberi tugas', () => {
    renderHook(() => useSalesTersediaRencana(true));
    const opsi = opsiTerakhir();
    opsi.queryFn();

    expect(opsi.queryKey).toEqual(['presurvei', 'rencana', 'sales-tersedia']);
    expect(opsi.enabled).toBe(true);
    expect(mockSalesTersedia).toHaveBeenCalledWith();

    renderHook(() => useSalesTersediaRencana(false));
    expect(opsiTerakhir().enabled).toBe(false);
  });

  it('rekap rencana memakai rentang di query key (di bawah presurvei.all)', () => {
    const rentang = { dari: '2026-06-27', sampai: '2026-09-26' };
    renderHook(() => useRekapRencana(rentang, true));
    const opsi = opsiTerakhir();
    opsi.queryFn();

    expect(opsi.queryKey).toEqual(['presurvei', 'rencana', 'rekap', rentang]);
    expect(mockRekap).toHaveBeenCalledWith(rentang);
  });
});
