import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import type { BarisPengajuanBarang, PengajuanBarang } from '@/types/pengajuanBarang';

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

function buatBaris(overrides: Partial<BarisPengajuanBarang> = {}): BarisPengajuanBarang {
  return {
    id: 'item-1',
    nama: 'Kabel Fiber',
    satuan: 'roll',
    diminta: 10,
    satuanDiminta: 'roll',
    disetujui: null,
    dimasukkan: null,
    isDitolak: false,
    catatanAtasan: null,
    ...overrides,
  };
}

/** Pengajuan yang sudah disetujui atasan: satu barang dikurangi, satu ditolak. */
function buatPengajuan(overrides: Partial<PengajuanBarang> = {}): PengajuanBarang {
  return {
    id: 'pr-1',
    nomor: 'PR-001',
    tanggal: '2026-11-01T03:00:00.000Z',
    gudang: 'Gudang Site A',
    pemohon: 'Budi',
    status: {
      kode: 'APPROVED',
      label: 'Sudah Diajukan',
      kalimat: 'Sudah disetujui. Menunggu admin memasukkan barangnya ke gudang.',
    },
    barang: [
      buatBaris({ disetujui: 8, catatanAtasan: 'Stok gudang masih 2 roll' }),
      buatBaris({
        id: 'item-2',
        nama: 'Patch Cord',
        satuan: 'pcs',
        diminta: 5,
        satuanDiminta: 'pcs',
        isDitolak: true,
        catatanAtasan: 'Stok masih ada',
      }),
    ],
    jumlahJasa: 0,
    ...overrides,
  };
}

/**
 * Respons server lama yang masih tersimpan di cache kueri: ada `tahap`, kode
 * status lama, angka pembelian, dan tanpa `dimasukkan`.
 */
function buatPengajuanDariCacheLama(): PengajuanBarang {
  const pengajuanLama = {
    id: 'pr-lama',
    nomor: 'PR-LAMA',
    tanggal: '2026-10-01T03:00:00.000Z',
    gudang: 'Gudang Site A',
    pemohon: 'Budi',
    status: { kode: 'PURCHASING', label: 'Dibeli Sebagian', kalimat: 'Kabel Fiber dibeli 3 dari 10 roll.' },
    tahap: {
      sekarang: 3,
      berhentiDi: null,
      total: 4,
      judul: ['Pengajuan', 'Persetujuan', 'Pembelian', 'Verifikasi barang sampai'],
    },
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
        catatanAtasan: 'Ambil yang 1 km',
      },
    ],
    jumlahJasa: 0,
  };
  return pengajuanLama as unknown as PengajuanBarang;
}

/** Hasil kueri berisi satu halaman dengan pengajuan yang diberikan. */
const denganPengajuan = (...daftar: PengajuanBarang[]) => ({
  data: { pages: [{ data: daftar, nextCursor: null }] },
});

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

  it('menampilkan nomor, gudang, status, dan kalimat, tanpa garis tahap', () => {
    const layar = renderLayar();

    expect(layar.getByText('PR-001')).toBeTruthy();
    expect(layar.getByText(/Gudang Site A/)).toBeTruthy();
    expect(layar.getByText('Sudah Diajukan')).toBeTruthy();
    expect(layar.getByText('Sudah disetujui. Menunggu admin memasukkan barangnya ke gudang.')).toBeTruthy();
    expect(layar.queryByLabelText(/Tahap/)).toBeNull();
  });

  it('rincian barang tersembunyi sampai diketuk; jumlah disetujui, barang ditolak, dan catatan atasan tampil', () => {
    const layar = renderLayar();
    expect(layar.queryByText(/Disetujui 8 roll/)).toBeNull();

    fireEvent.press(layar.getByText('Lihat barang (2)'));

    expect(layar.getByText('Diminta 10 roll · Disetujui 8 roll')).toBeTruthy();
    expect(layar.getByText('Catatan atasan: Stok gudang masih 2 roll')).toBeTruthy();
    expect(layar.getByText('Diminta 5 pcs · Ditolak')).toBeTruthy();
    expect(layar.getByText('Catatan atasan: Stok masih ada')).toBeTruthy();
    expect(layar.queryByText(/Dibeli/)).toBeNull();
  });

  it('menunggu persetujuan: label sama, kalimat berbeda, belum ada jumlah disetujui', () => {
    const pengajuanMenunggu = buatPengajuan({
      status: { kode: 'AWAITING_APPROVAL', label: 'Sudah Diajukan', kalimat: 'Menunggu persetujuan atasan.' },
      barang: [buatBaris()],
    });
    mockUsePengajuanBarang.mockReturnValue(hasilKueri(denganPengajuan(pengajuanMenunggu)));

    const layar = renderLayar();
    expect(layar.getByText('Sudah Diajukan')).toBeTruthy();
    expect(layar.getByText('Menunggu persetujuan atasan.')).toBeTruthy();
    fireEvent.press(layar.getByText('Lihat barang (1)'));

    expect(layar.getByText('Diminta 10 roll')).toBeTruthy();
  });

  it('sudah dimasukkan: jumlah yang masuk tampil per barang', () => {
    const pengajuanMasuk = buatPengajuan({
      status: { kode: 'RECEIVED', label: 'Sudah Dimasukkan', kalimat: 'Barangnya sudah dimasukkan admin ke gudang.' },
      barang: [buatBaris({ disetujui: 10, dimasukkan: 8 })],
    });
    mockUsePengajuanBarang.mockReturnValue(hasilKueri(denganPengajuan(pengajuanMasuk)));

    const layar = renderLayar();
    expect(layar.getByText('Sudah Dimasukkan')).toBeTruthy();
    fireEvent.press(layar.getByText('Lihat barang (1)'));

    expect(layar.getByText('Diminta 10 roll · Disetujui 10 roll · Dimasukkan 8 roll')).toBeTruthy();
  });

  it('data lama dari cache tetap tampil tanpa garis tahap maupun angka pembelian', () => {
    mockUsePengajuanBarang.mockReturnValue(hasilKueri(denganPengajuan(buatPengajuanDariCacheLama())));

    const layar = renderLayar();
    expect(layar.getByText('PR-LAMA')).toBeTruthy();
    expect(layar.queryByLabelText(/Tahap/)).toBeNull();
    expect(layar.queryByText(/Pembelian|Verifikasi/)).toBeNull();
    fireEvent.press(layar.getByText('Lihat barang (1)'));

    expect(layar.getByText('Diminta 10 roll · Disetujui 10 roll')).toBeTruthy();
    expect(layar.getByText('Catatan atasan: Ambil yang 1 km')).toBeTruthy();
    expect(layar.queryByText(/· Dibeli|· Datang/)).toBeNull();
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
