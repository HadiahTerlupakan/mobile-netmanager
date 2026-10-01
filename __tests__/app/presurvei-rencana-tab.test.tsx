import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { keTanggalKalender } from '@/utils/presurvei/rencana';

import { buatRencanaUji } from '../fixtures/presurvei/rencana';
import { ANGGOTA_TIM_BESAR, namaAnggota } from '../fixtures/presurvei/timBesar';

const mockPush = jest.fn();
const mockUseDaftarRencana = jest.fn();
const mockUseAntrean = jest.fn();
const mockUseSalesTersedia = jest.fn();
const mockUseRekap = jest.fn();
let mockParam: Record<string, string> = {};
let mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useLocalSearchParams: () => mockParam }));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({ useLingkupRencana: () => mockLingkup }));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({
  useKegiatanHarian: () => ({ data: undefined, isError: false, isPending: false, isRefetching: false, refetch: jest.fn() }),
  useKegiatanMenungguKirim: () => mockUseAntrean(),
  useSegarkanPresurveiSetelahSinkron: jest.fn(),
}));
jest.mock('@/hooks/queries/usePresurveiRencana', () => ({
  useDaftarRencana: (filter: unknown) => mockUseDaftarRencana(filter),
  useSalesTersediaRencana: (isAktif: boolean) => mockUseSalesTersedia(isAktif),
  useRekapRencana: (rentang: unknown, isAktif: boolean) => mockUseRekap(rentang, isAktif),
}));
jest.mock('@/hooks/queries/usePresurveiProspek', () => ({ useDaftarProspek: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const halaman = (data: unknown[]) => ({
  data: { data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } },
  isError: false, isPending: false, isRefetching: false, refetch: jest.fn(),
});

const HARIAN = [
  buatRencanaUji('r-1', { tujuan: 'Presentasi paket', namaProspek: 'Budi Santoso', alamat: 'Jl. Kenanga 3' }),
  buatRencanaUji('r-2', { tujuan: 'Survei tiang', sumber: 'PENUGASAN', namaPembuat: 'Bu Rina', jenis: 'SURVEI_LOKASI' }),
];
const TERLEWAT = [buatRencanaUji('r-9', { tujuan: 'Tagih jawaban', tanggal: '2026-09-20', statusTampil: 'TERLEWAT' })];
const SALES_TIM = [{ id: 'k-1', nama: 'Kepala Andi' }, { id: 's-2', nama: 'Sinta' }];

const bukaTabRencana = () => {
  const Layar = require('../../app/(app)/presurvei/index').default;
  const utilitas = render(<Layar />);
  fireEvent.press(utilitas.getByText('Rencana'));
  return utilitas;
};

describe('Sub-tab Rencana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };
    mockUseAntrean.mockReturnValue({ data: [], refetch: jest.fn() });
    mockUseSalesTersedia.mockReturnValue({ data: SALES_TIM });
    mockUseRekap.mockReturnValue({ data: undefined, refetch: jest.fn() });
    mockUseDaftarRencana.mockImplementation((filter) =>
      halaman((filter as { status?: string }).status === 'TERLEWAT' ? TERLEWAT : HARIAN),
    );
  });

  it('urutan sub-tab: Kegiatan (bawaan), Rencana, Prospek', () => {
    const Layar = require('../../app/(app)/presurvei/index').default;
    const { getByLabelText } = render(<Layar />);

    expect(getByLabelText('Kegiatan').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('Rencana')).toBeTruthy();
    expect(getByLabelText('Prospek')).toBeTruthy();
  });

  it('menampilkan rencana hari ini, bagian terlewat, dan pemberi tugas penugasan', () => {
    const { getByText } = bukaTabRencana();

    expect(getByText('Presentasi paket')).toBeTruthy();
    expect(getByText(/Budi Santoso/)).toBeTruthy();
    expect(getByText('Jl. Kenanga 3')).toBeTruthy();
    expect(getByText('Dari: Bu Rina')).toBeTruthy();
    expect(getByText('Terlewat (1)')).toBeTruthy();
    expect(getByText('Tagih jawaban')).toBeTruthy();
  });

  it('rencana yang laporannya masih di antrean tampil Menunggu kirim', () => {
    mockUseAntrean.mockReturnValue({
      data: [{ idAntrean: 1, rencanaId: 'r-1', status: 'PENDING' }, { idAntrean: 2, rencanaId: 'r-2', status: 'FAILED' }],
      refetch: jest.fn(),
    });
    const { getAllByText } = bukaTabRencana();

    expect(getAllByText('Menunggu kirim')).toHaveLength(1);
  });

  it('Buat Rencana dan ketuk kartu membuka layar yang sesuai', () => {
    const { getByText } = bukaTabRencana();

    fireEvent.press(getByText('Buat Rencana'));
    fireEvent.press(getByText('Presentasi paket'));

    // Tanggal awal form = tanggal agenda yang sedang dilihat (hari ini).
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/rencana/buat',
      params: { tanggal: keTanggalKalender(new Date()) },
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/presurvei/rencana/[id]', params: { id: 'r-1' } });
  });

  it('boleh maju ke hari berikutnya untuk melihat agenda', () => {
    const { getByLabelText } = bukaTabRencana();
    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    const teksBesok = `${besok.getFullYear()}-${String(besok.getMonth() + 1).padStart(2, '0')}-${String(besok.getDate()).padStart(2, '0')}`;

    fireEvent.press(getByLabelText('Hari berikutnya'));

    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT' });
    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ dari: teksBesok, sampai: teksBesok });
  });
});

describe('Sub-tab Rencana — pemberi tugas (kepala sales)', () => {
  const hariIni = () => {
    const sekarang = new Date();
    return `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}-${String(sekarang.getDate()).padStart(2, '0')}`;
  };
  const RENCANA_TIM = [
    buatRencanaUji('r-5', { tujuan: 'Demo paket', salesId: 's-2', namaSales: 'Sinta', sumber: 'PENUGASAN', namaPembuat: 'Kepala Andi' }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockLingkup = { isPemberiTugas: true, penggunaId: 'k-1' };
    mockUseAntrean.mockReturnValue({ data: [], refetch: jest.fn() });
    mockUseSalesTersedia.mockReturnValue({ data: SALES_TIM });
    mockUseRekap.mockReturnValue({ data: undefined, refetch: jest.fn() });
    mockUseDaftarRencana.mockImplementation((filter) => {
      const { status, salesId } = filter as { status?: string; salesId?: string };
      if (status === 'TERLEWAT') return halaman([]);
      return halaman(salesId === 'k-1' ? HARIAN : RENCANA_TIM);
    });
  });

  it('sales biasa tidak melihat segmen Saya | Tim dan tidak memuat daftar sales', () => {
    mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };
    const { queryByLabelText } = bukaTabRencana();

    expect(queryByLabelText('Tim')).toBeNull();
    expect(queryByLabelText('Saya')).toBeNull();
    expect(mockUseSalesTersedia).not.toHaveBeenCalledWith(true);
  });

  it('bawaan Saya: hanya rencana sendiri (salesId diri) dengan tombol Buat Rencana', () => {
    const { getByLabelText, getByText, queryByText } = bukaTabRencana();

    expect(getByLabelText('Saya').props.accessibilityState).toEqual({ selected: true });
    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ dari: hariIni(), sampai: hariIni(), salesId: 'k-1' });
    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ status: 'TERLEWAT', salesId: 'k-1' });
    expect(getByText('Presentasi paket')).toBeTruthy();
    expect(getByText('Buat Rencana')).toBeTruthy();
    expect(queryByText('Tugaskan')).toBeNull();
  });

  it('Tim: agenda seluruh tim dengan nama sales, lalu Tugaskan membuka form penugasan', () => {
    const { getByLabelText, getByText, queryByText, getAllByText } = bukaTabRencana();

    fireEvent.press(getByLabelText('Tim'));

    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ dari: hariIni(), sampai: hariIni() });
    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT' });
    expect(getAllByText('Sinta').length).toBeGreaterThan(0);
    expect(getByLabelText('Agenda Sinta')).toBeTruthy();
    expect(getByText('Demo paket')).toBeTruthy();
    expect(queryByText('Buat Rencana')).toBeNull();

    fireEvent.press(getByLabelText('Tugaskan rencana'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/rencana/tugaskan',
      params: { tanggal: keTanggalKalender(new Date()) },
    });
  });

  it('Tim: pemilih anggota memusatkan agenda ke satu anggota dan Tugaskan memilihnya langsung', () => {
    const { getByLabelText, getByText, queryByLabelText } = bukaTabRencana();
    fireEvent.press(getByLabelText('Tim'));

    fireEvent.press(getByLabelText('Anggota: Semua'));
    fireEvent.press(getByLabelText('Sinta'));

    expect(getByLabelText('Anggota: Sinta')).toBeTruthy();
    // Dipusatkan ke satu anggota: daftar biasa, tanpa kepala bagian per anggota.
    expect(queryByLabelText('Agenda Sinta')).toBeNull();

    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ dari: hariIni(), sampai: hariIni(), salesId: 's-2' });
    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT', salesId: 's-2' });
    fireEvent.press(getByLabelText('Tugaskan rencana'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/rencana/tugaskan',
      params: { salesId: 's-2', tanggal: keTanggalKalender(new Date()) },
    });

    fireEvent.press(getByLabelText('Tampilkan semua anggota'));
    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT' });
    expect(getByLabelText('Anggota: Semua')).toBeTruthy();
  });

  it('dibuka dari kartu Tim hari ini: langsung sub-tab Rencana tampilan Tim anggota itu', () => {
    mockParam = { subTab: 'rencana', salesId: 's-2', diminta: '1' };
    const Layar = require('../../app/(app)/presurvei/index').default;
    const { getByLabelText } = render(<Layar />);

    expect(getByLabelText('Rencana').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('Tim').props.accessibilityState).toEqual({ selected: true });
    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT', salesId: 's-2' });
  });
});

describe('Sub-tab Rencana — tampilan Tim untuk tim besar (9 anggota)', () => {
  const rencanaAnggota = (id: string, salesId: string, over: Parameters<typeof buatRencanaUji>[1] = {}) =>
    buatRencanaUji(id, { salesId, namaSales: namaAnggota(salesId), tujuan: `Tujuan ${id}`, ...over });
  // Rudi punya terlewat; Tono 2 rencana terbuka; Sinta sudah selesai semua.
  const HARIAN_TIM = [
    rencanaAnggota('r-a1', 's-2', { statusTampil: 'SELESAI' }),
    rencanaAnggota('r-a2', 's-3'),
    rencanaAnggota('r-a3', 's-3'),
    rencanaAnggota('r-a4', 's-6'),
  ];
  const TERLEWAT_TIM = [
    ...['t-1', 't-2', 't-3', 't-4'].map((id) => rencanaAnggota(id, 's-6', { statusTampil: 'TERLEWAT', tanggal: '2026-09-20' })),
    ...['t-5', 't-6'].map((id) => rencanaAnggota(id, 's-4', { statusTampil: 'TERLEWAT', tanggal: '2026-09-21' })),
    rencanaAnggota('t-7', 's-7', { statusTampil: 'TERLEWAT', tanggal: '2026-09-22' }),
  ];

  const bukaTampilanTim = () => {
    const utilitas = bukaTabRencana();
    fireEvent.press(utilitas.getByLabelText('Tim'));
    return utilitas;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockLingkup = { isPemberiTugas: true, penggunaId: 'k-1' };
    mockUseAntrean.mockReturnValue({ data: [], refetch: jest.fn() });
    mockUseSalesTersedia.mockReturnValue({ data: ANGGOTA_TIM_BESAR });
    mockUseRekap.mockReturnValue({
      data: { baris: [{ salesId: 's-3', namaSales: 'Tono', total: 2, selesai: 0, batal: 0 }] },
      refetch: jest.fn(),
    });
    mockUseDaftarRencana.mockImplementation((filter) => {
      const { status, salesId } = filter as { status?: string; salesId?: string };
      const daftar = status === 'TERLEWAT' ? TERLEWAT_TIM : HARIAN_TIM;
      return halaman(salesId ? daftar.filter((rencana) => rencana.salesId === salesId) : daftar);
    });
  });

  it('agenda dikelompokkan per anggota: terlewat dulu, lalu rencana terbuka terbanyak', () => {
    const { getAllByLabelText, getByText } = bukaTampilanTim();

    const kepala = getAllByLabelText(/^Agenda /).map((el) => el.props.accessibilityLabel);
    expect(kepala).toEqual(['Agenda Rudi', 'Agenda Tono', 'Agenda Sinta']);
    expect(getByText('0/2 selesai')).toBeTruthy();
    expect(getByText('1/1 selesai')).toBeTruthy();
    expect(getByText('4 terlewat')).toBeTruthy();
    expect(getByText('Tujuan r-a2')).toBeTruthy();
  });

  it('ketuk kepala bagian memusatkan tampilan ke anggota itu', () => {
    const { getByLabelText } = bukaTampilanTim();

    fireEvent.press(getByLabelText('Agenda Tono'));

    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT', salesId: 's-3' });
    expect(getByLabelText('Anggota: Tono')).toBeTruthy();
  });

  it('terlewat ringkas: jumlah per anggota, butir tertutup sampai diminta', () => {
    const { getByText, getByLabelText, queryByText } = bukaTampilanTim();

    expect(getByText('Terlewat (7)')).toBeTruthy();
    expect(getByLabelText('Terlewat Rudi: 4')).toBeTruthy();
    expect(getByLabelText('Terlewat Budi: 2')).toBeTruthy();
    expect(getByLabelText('Terlewat Dewi: 1')).toBeTruthy();
    expect(queryByText('Tujuan t-1')).toBeNull();

    fireEvent.press(getByText('Lihat 7 rencana terlewat'));
    expect(getByText('Tujuan t-1')).toBeTruthy();
    expect(getByText('Tujuan t-7')).toBeTruthy();

    fireEvent.press(getByLabelText('Terlewat Budi: 2'));
    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT', salesId: 's-4' });
  });

  it('"Belum ada rencana": anggota tanpa rencana, Tugaskan memilih anggota & tanggal yang dilihat', () => {
    const { getByText, getByLabelText, queryByLabelText } = bukaTampilanTim();

    expect(getByText('Belum ada rencana (6)')).toBeTruthy();
    expect(queryByLabelText('Tugaskan Sinta')).toBeNull();
    expect(getByLabelText('Tugaskan Kepala Andi')).toBeTruthy();
    // Lebih dari 5: Wati (urutan terakhir) baru muncul setelah Lihat semua.
    expect(queryByLabelText('Tugaskan Wati')).toBeNull();
    fireEvent.press(getByText('Lihat semua (6)'));

    fireEvent.press(getByLabelText('Tugaskan Wati'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/rencana/tugaskan',
      params: { salesId: 's-5', tanggal: keTanggalKalender(new Date()) },
    });
  });

  it('pemilih anggota bercari menampilkan progres hari itu', () => {
    const { getByLabelText, queryByLabelText, getByText } = bukaTampilanTim();

    fireEvent.press(getByLabelText('Anggota: Semua'));
    expect(getByText('0/2')).toBeTruthy();
    fireEvent.changeText(getByLabelText('Cari anggota'), 'to');
    expect(queryByLabelText('Sinta')).toBeNull();
    fireEvent.press(getByLabelText('Tono'));

    expect(mockUseDaftarRencana).toHaveBeenLastCalledWith({ status: 'TERLEWAT', salesId: 's-3' });
    expect(mockUseRekap).toHaveBeenCalledWith(expect.objectContaining({ dari: keTanggalKalender(new Date()) }), true);
  });

  it('agenda belum termuat: daftar "Belum ada rencana" tidak ditampilkan', () => {
    mockUseDaftarRencana.mockReturnValue({
      data: undefined, isError: false, isPending: true, isRefetching: false, refetch: jest.fn(),
    });
    const { queryByText } = bukaTampilanTim();

    expect(queryByText(/^Belum ada rencana \(/)).toBeNull();
  });
});
