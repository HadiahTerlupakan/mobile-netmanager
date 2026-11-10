import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import type { PengajuanBarang } from '@/types/pengajuanBarang';

const mockUsePengajuanBarang = jest.fn();
const mockUseFeatureGuard = jest.fn();

jest.mock('@/hooks/queries/usePengajuanBarang', () => ({
  usePengajuanBarang: () => mockUsePengajuanBarang(),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: (...args: unknown[]) => mockUseFeatureGuard(...args),
}));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

const JUDUL_TAHAP = ['Pengajuan', 'Persetujuan', 'Pembelian', 'Verifikasi barang sampai'];

function buatPengajuan(overrides: Partial<PengajuanBarang> = {}): PengajuanBarang {
  return {
    id: 'pr-1',
    nomor: 'PR-001',
    tanggal: '2026-11-01T03:00:00.000Z',
    gudang: 'Gudang Site A',
    pemohon: 'Budi',
    status: {
      kode: 'PURCHASING',
      label: 'Dibeli Sebagian',
      kalimat: 'Kabel Fiber dibeli 3 dari 10 roll.',
    },
    tahap: { sekarang: 3, berhentiDi: null, total: 4, judul: JUDUL_TAHAP },
    barang: [
      {
        id: 'item-1',
        nama: 'Kabel Fiber',
        satuan: 'roll',
        diminta: 10,
        satuanDiminta: 'roll',
        disetujui: 10,
        dibeli: 3,
        datang: 0,
        tidakDatang: 0,
        isDitolak: false,
        catatanAtasan: null,
      },
      {
        id: 'item-2',
        nama: 'Patch Cord',
        satuan: 'pcs',
        diminta: 5,
        satuanDiminta: 'pcs',
        disetujui: null,
        dibeli: 0,
        datang: 0,
        tidakDatang: 0,
        isDitolak: true,
        catatanAtasan: 'Stok masih ada',
      },
    ],
    jumlahJasa: 0,
    ...overrides,
  };
}

const hasilKueri = (overrides: Record<string, unknown> = {}) => ({
  data: { pages: [{ data: [buatPengajuan()], nextCursor: null }] },
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

function renderLayar() {
  const PengajuanBarangScreen = require('../../app/(app)/pengajuan-barang').default;
  return render(<PengajuanBarangScreen />);
}

describe('layar Pengajuan Barang', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePengajuanBarang.mockReturnValue(hasilKueri());
  });

  it('dijaga izin barang gudang (salah satu cukup)', () => {
    renderLayar();

    expect(mockUseFeatureGuard).toHaveBeenCalledWith(['m_barang', 'm_barang_masuk', 'm_barang_keluar']);
  });

  it('menampilkan nomor, gudang, status, kalimat, dan tahap yang sedang berjalan', () => {
    const layar = renderLayar();

    expect(layar.getByText('PR-001')).toBeTruthy();
    expect(layar.getByText(/Gudang Site A/)).toBeTruthy();
    expect(layar.getByText('Dibeli Sebagian')).toBeTruthy();
    expect(layar.getByText('Kabel Fiber dibeli 3 dari 10 roll.')).toBeTruthy();
    expect(layar.getByLabelText('Tahap 2, Persetujuan: selesai')).toBeTruthy();
    expect(layar.getByLabelText('Tahap 3, Pembelian: sedang berjalan')).toBeTruthy();
    expect(layar.getByLabelText('Tahap 4, Verifikasi barang sampai: belum')).toBeTruthy();
  });

  it('rincian barang tersembunyi sampai diketuk; barang ditolak ditandai', () => {
    const layar = renderLayar();
    expect(layar.queryByText(/Disetujui 10 roll/)).toBeNull();

    fireEvent.press(layar.getByText('Lihat barang (2)'));

    expect(layar.getByText('Diminta 10 roll · Disetujui 10 roll · Dibeli 3 · Datang 0')).toBeTruthy();
    expect(layar.getByText('Diminta 5 pcs · Ditolak')).toBeTruthy();
    expect(layar.getByText('Catatan atasan: Stok masih ada')).toBeTruthy();
  });

  it('pengajuan ditolak berhenti di tahap persetujuan', () => {
    mockUsePengajuanBarang.mockReturnValue(
      hasilKueri({
        data: {
          pages: [
            {
              data: [
                buatPengajuan({
                  status: { kode: 'REJECTED', label: 'Ditolak', kalimat: 'Pengajuan ini tidak disetujui.' },
                  tahap: { sekarang: 2, berhentiDi: 2, total: 4, judul: JUDUL_TAHAP },
                }),
              ],
              nextCursor: null,
            },
          ],
        },
      }),
    );

    const layar = renderLayar();

    expect(layar.getByLabelText('Tahap 2, Persetujuan: berhenti')).toBeTruthy();
    expect(layar.getByLabelText('Tahap 3, Pembelian: belum')).toBeTruthy();
  });

  it('menampilkan pesan server bila gagal (mis. akun belum punya site)', () => {
    const refetch = jest.fn();
    mockUsePengajuanBarang.mockReturnValue(
      hasilKueri({
        data: undefined,
        isError: true,
        refetch,
        error: { response: { status: 403, data: { error: 'Akun Anda belum diberi lokasi kerja (site).' } } },
      }),
    );

    const layar = renderLayar();

    expect(layar.getByText('Akun Anda belum diberi lokasi kerja (site).')).toBeTruthy();
    fireEvent.press(layar.getByText('Coba lagi'));
    expect(refetch).toHaveBeenCalled();
  });

  it('kosong: menjelaskan belum ada pengajuan', () => {
    mockUsePengajuanBarang.mockReturnValue(hasilKueri({ data: { pages: [{ data: [], nextCursor: null }] } }));

    expect(renderLayar().getByText('Belum ada pengajuan barang untuk gudang di site Anda.')).toBeTruthy();
  });
});
