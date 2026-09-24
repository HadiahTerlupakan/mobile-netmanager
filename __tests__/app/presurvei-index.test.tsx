import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockUseKegiatanHarian = jest.fn();
const mockUseAntrean = jest.fn();
const mockUseDaftarProspek = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (nilai: unknown) => nilai }));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({
  useKegiatanHarian: (tanggal: Date) => mockUseKegiatanHarian(tanggal),
  useKegiatanMenungguKirim: () => mockUseAntrean(),
  useSegarkanPresurveiSetelahSinkron: jest.fn(),
}));
jest.mock('@/hooks/queries/usePresurveiProspek', () => ({
  useDaftarProspek: (filter: unknown) => mockUseDaftarProspek(filter),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const sekarangIso = () => new Date().toISOString();

describe('Tab Presurvei', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKegiatanHarian.mockReturnValue({
      data: {
        data: [{
          id: 'k-1', jenis: 'KUNJUNGAN', userId: 'sales-a', namaSales: null, peranPelaku: null,
          departemenPelaku: null, prospekId: null, waktuMulai: sekarangIso(), alamatDikunjungi: 'Jl. Melati 9',
          ditemuiNama: 'Pak Joko', latitude: -6.2, longitude: 106.8, hasil: 'TERTARIK', jumlahFoto: 1,
        }],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
      isError: false, isPending: false, isRefetching: false, refetch: jest.fn(),
    });
    mockUseAntrean.mockReturnValue({
      data: [{
        idAntrean: 5, jenis: 'TELEPON', hasil: 'TIDAK_MINAT', waktuMulai: sekarangIso(),
        alamatDikunjungi: null, ditemuiNama: 'Bu Sari', jumlahFoto: 0, status: 'PENDING',
      }],
      refetch: jest.fn(),
    });
    mockUseDaftarProspek.mockReturnValue({
      data: { pages: [{ data: [{ id: 'p-1', nama: 'Budi Santoso', noTelp: '081234567890', alamat: 'Jl. Kenanga', sumber: 'LAPANGAN', status: 'TERTARIK', pemilikId: 'sales-a', namaPemilik: null, paketDiminati: null, canvasingId: null, createdAt: sekarangIso() }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }] },
      hasNextPage: false, isFetchingNextPage: false, isPending: false, isError: false, isRefetching: false,
      fetchNextPage: jest.fn(), refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderLayar = () => {
    const Layar = require('../../app/(app)/presurvei/index').default;
    return render(<Layar />);
  };

  it('menandai kegiatan yang masih di antrean sebagai Menunggu kirim', () => {
    const { getAllByText, getByText } = renderLayar();

    expect(getByText('Pak Joko')).toBeTruthy();
    expect(getByText('Bu Sari')).toBeTruthy();
    expect(getAllByText('Menunggu kirim')).toHaveLength(1);
  });

  // Ruling: kegiatan FAILED di antrean wajib tetap tampil, berlabel "Gagal
  // terkirim" — jangan hilang dari pandangan sales.
  it('menandai kegiatan yang gagal terkirim di antrean sebagai Gagal terkirim, bukan Menunggu kirim', () => {
    mockUseAntrean.mockReturnValue({
      data: [{
        idAntrean: 8, jenis: 'KUNJUNGAN', hasil: 'TIDAK_MINAT', waktuMulai: sekarangIso(),
        alamatDikunjungi: 'Jl. Anggrek', ditemuiNama: 'Pak Slamet', jumlahFoto: 0, status: 'FAILED',
      }],
      refetch: jest.fn(),
    });

    const { getByText, queryByText } = renderLayar();

    expect(getByText('Pak Slamet')).toBeTruthy();
    expect(getByText('Gagal terkirim')).toBeTruthy();
    expect(queryByText('Menunggu kirim')).toBeNull();
  });

  // Amandemen preflight (S3): galat server tidak boleh mengganti seluruh
  // daftar — kegiatan di antrean offline (yang datang dari SQLite lokal,
  // bukan server) harus tetap terlihat walau kegiatan server gagal dimuat.
  it('kegiatan dari antrean tetap terlihat walau kegiatan server gagal dimuat', () => {
    mockUseKegiatanHarian.mockReturnValue({
      data: undefined,
      isError: true, isPending: false, isRefetching: false, refetch: jest.fn(),
    });

    const { getByText, queryByText } = renderLayar();

    expect(getByText('Bu Sari')).toBeTruthy();
    expect(getByText(/gagal dimuat/i)).toBeTruthy();
    expect(queryByText('Pak Joko')).toBeNull();
  });

  // R16 (preflight): jumlahFoto dipetakan tapi sebelumnya tidak pernah dirender.
  it('menampilkan jumlah foto kegiatan', () => {
    const { getByText } = renderLayar();

    expect(getByText('1 foto')).toBeTruthy();
  });

  it('Catat Kegiatan membuka form catat', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Catat Kegiatan'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/presurvei/kegiatan/catat');
  });

  it('menggeser tanggal meminta kegiatan hari sebelumnya', () => {
    const { getByLabelText } = renderLayar();
    const kemarin = new Date();
    kemarin.setDate(kemarin.getDate() - 1);

    fireEvent.press(getByLabelText('Hari sebelumnya'));

    const tanggalTerakhir = mockUseKegiatanHarian.mock.calls.at(-1)?.[0] as Date;
    expect(tanggalTerakhir.toDateString()).toBe(kemarin.toDateString());
  });

  // Amandemen preflight: tombol "Hari berikutnya" nonaktif (tidak bisa
  // melewati hari ini) sebelumnya tidak diuji.
  it('menggeser ke hari berikutnya tidak berpengaruh saat sudah di hari ini', () => {
    const { getByLabelText } = renderLayar();
    const jumlahPanggilanAwal = mockUseKegiatanHarian.mock.calls.length;

    fireEvent.press(getByLabelText('Hari berikutnya'));

    expect(mockUseKegiatanHarian.mock.calls.length).toBe(jumlahPanggilanAwal);
    const tanggalTerakhir = mockUseKegiatanHarian.mock.calls.at(-1)?.[0] as Date;
    expect(tanggalTerakhir.toDateString()).toBe(new Date().toDateString());
  });

  it('tab Prospek menyaring status dan pencarian', () => {
    const { getByText, getByLabelText } = renderLayar();

    fireEvent.press(getByText('Prospek'));
    // Chip dipilih lewat accessibilityLabel eksplisit ("Tertarik"): getByRole
    // dengan name berbasis teks turunan akan ambigu karena label status yang
    // sama ("Tertarik") juga tampil di dalam kartu prospek.
    fireEvent.press(getByLabelText('Tertarik'));
    fireEvent.changeText(getByLabelText('Cari prospek'), 'budi');

    expect(mockUseDaftarProspek).toHaveBeenLastCalledWith({ status: 'TERTARIK', search: 'budi' });
  });

  it('menekan prospek membuka rinciannya', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Prospek'));
    fireEvent.press(getByText('Budi Santoso'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/prospek/[id]',
      params: { id: 'p-1' },
    });
  });
});
