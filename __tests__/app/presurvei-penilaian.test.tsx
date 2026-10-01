import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';

const mockUsePenilaian = jest.fn();
let mockLingkup = { isPemberiTugas: true, penggunaId: 'k-1' };
let mockParam: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParam,
}));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({ useLingkupRencana: () => mockLingkup }));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: () => true }));
jest.mock('@/hooks/queries/usePenilaianKinerja', () => ({
  usePenilaianKinerja: (periode: unknown, isAktif: boolean) => mockUsePenilaian(periode, isAktif),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { buatHasilUji, buatKepalaUji, buatSalesUji } from '../fixtures/presurvei/penilaian';
import PenilaianKinerjaScreen from '../../app/(app)/presurvei/penilaian';

const PENCAPAIAN = {
  kunjungan: { target: 20, tercapai: 10, persen: 50 },
  prospek: { target: 10, tercapai: 3, persen: 30 },
  konversi: { target: 5, tercapai: 1, persen: 20 },
};

const sales = (salesId: string, nama: string, skor: number | null, kepalaSalesId = 'k-1') =>
  buatSalesUji(salesId, skor, { nama, kepalaSalesId, pencapaian: PENCAPAIAN, rencana: { tepatWaktu: 4, terlambat: 1, terlewat: 2 } });

const HASIL_KEPALA = buatHasilUji(
  [buatKepalaUji('k-1', 71, { nama: 'Kepala', jumlahAnggota: 3 })],
  [sales('s-1', 'Andi', 90), sales('k-1', 'Kepala', 65, ''), sales('s-2', 'Budi', 50), sales('s-3', 'Citra', null)],
);

const HASIL_SEMUA = buatHasilUji(
  [buatKepalaUji('k-1', 71, { nama: 'Rudi', jumlahAnggota: 2 }), buatKepalaUji('k-2', 58, { nama: 'Tono', jumlahAnggota: 1 })],
  [sales('s-1', 'Andi', 90, 'k-1'), sales('s-2', 'Budi', 50, 'k-1'), sales('s-3', 'Citra', 72, 'k-2')],
);

const pakaiHasil = (hasil: unknown) => mockUsePenilaian.mockReturnValue({ data: hasil, error: null, refetch: jest.fn() });

/** Label aksesibilitas baris daftar sales yang tampil, sesuai urutan. */
const barisSales = (hasilRender: ReturnType<typeof render>) =>
  hasilRender.queryAllByLabelText(/^Penilaian (?!kepala)/).map((baris) => baris.props.accessibilityLabel);

describe('layar penilaian kinerja — kepala sales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockLingkup = { isPemberiTugas: true, penggunaId: 'k-1' };
    pakaiHasil(HASIL_KEPALA);
  });

  it('tab Saya (bawaan): lima indikator kepala lalu penilaian pribadinya sebagai sales', () => {
    const layar = render(<PenilaianKinerjaScreen />);

    expect(layar.getByLabelText('Saya').props.accessibilityState).toEqual({ selected: true });
    expect(layar.getByText('Tim (3)')).toBeTruthy();
    expect(layar.getByText('Penilaian saya sebagai kepala sales')).toBeTruthy();
    expect(layar.getByText('Cakupan pembinaan · bobot 10%')).toBeTruthy();
    expect(layar.getByText('Penilaian saya sebagai sales')).toBeTruthy();
    expect(layar.getByText('Dihitung sampai 26 September 2026')).toBeTruthy();
    expect(barisSales(layar)).toEqual([]);
  });

  it('tab Tim: anggota urut skor tanpa dirinya, chip menyaring, ketuk membuka rincian', () => {
    const layar = render(<PenilaianKinerjaScreen />);
    fireEvent.press(layar.getByText('Tim (3)'));

    expect(barisSales(layar)).toEqual(['Penilaian Andi, skor 90', 'Penilaian Budi, skor 50', 'Penilaian Citra, skor –']);
    fireEvent.press(layar.getByText('Perlu pembinaan (1)'));
    expect(barisSales(layar)).toEqual(['Penilaian Budi, skor 50']);
    fireEvent.press(layar.getByLabelText('Penilaian Budi, skor 50'));
    expect(layar.getByText('Skor & indikator')).toBeTruthy();
    expect(layar.getByText('10 / 20 · 50%')).toBeTruthy();
  });

  it('ganti bulan: tab tetap; maju terkunci di bulan berjalan', () => {
    const layar = render(<PenilaianKinerjaScreen />);
    fireEvent.press(layar.getByText('Tim (3)'));

    expect(layar.getByLabelText('Bulan berikutnya').props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(layar.getByLabelText('Bulan sebelumnya'));
    const sekarang = new Date();
    const sebelumnya = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1);
    expect(mockUsePenilaian.mock.calls.at(-1)?.[0]).toEqual({ tahun: sebelumnya.getFullYear(), bulan: sebelumnya.getMonth() + 1 });
    expect(layar.getByLabelText('Tim (3)').props.accessibilityState).toEqual({ selected: true });
  });
});

describe('layar penilaian kinerja — sales biasa & keadaan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };
  });

  it('sales biasa: tanpa tab, rincian dirinya', () => {
    pakaiHasil(buatHasilUji([], [sales('s-1', 'Andi', 90)]));
    const layar = render(<PenilaianKinerjaScreen />);

    expect(layar.getByText('Penilaian saya')).toBeTruthy();
    expect(layar.getByText('Realisasi rencana kunjungan')).toBeTruthy();
    expect(layar.queryByLabelText('Saya')).toBeNull();
    expect(layar.queryByText(/^Tim \(/)).toBeNull();
  });

  it('403: pesan belum aktif', () => {
    mockUsePenilaian.mockReturnValue({ data: undefined, error: { isAxiosError: true, response: { status: 403 } }, refetch: jest.fn() });
    const layar = render(<PenilaianKinerjaScreen />);

    expect(layar.getByText('Penilaian kinerja belum diaktifkan untuk akun Anda. Hubungi admin.')).toBeTruthy();
  });
});

describe('layar penilaian kinerja — lingkup SEMUA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam = {};
    mockLingkup = { isPemberiTugas: true, penggunaId: 'admin' };
    pakaiHasil(HASIL_SEMUA);
  });

  it('tab Kepala sales (bawaan): daftar kepala urut skor dengan jumlah anggota & indikator terlemah', () => {
    const layar = render(<PenilaianKinerjaScreen />);

    expect(layar.getByText('Kepala sales (2)')).toBeTruthy();
    expect(layar.getByText('Semua sales (3)')).toBeTruthy();
    expect(layar.getAllByLabelText(/^Penilaian kepala /).map((baris) => baris.props.accessibilityLabel)).toEqual([
      'Penilaian kepala Rudi, skor 71',
      'Penilaian kepala Tono, skor 58',
    ]);
    expect(layar.getByText('2 anggota · lemah: Konversi tim (48)')).toBeTruthy();
  });

  it('rincian kepala: indikator + anggota timnya; ketuk anggota lalu kembali ke tim', () => {
    const layar = render(<PenilaianKinerjaScreen />);
    fireEvent.press(layar.getByLabelText('Penilaian kepala Rudi, skor 71'));

    expect(layar.getByText('Penilaian kepala sales')).toBeTruthy();
    expect(barisSales(layar)).toEqual(['Penilaian Andi, skor 90', 'Penilaian Budi, skor 50']);
    fireEvent.press(layar.getByLabelText('Penilaian Budi, skor 50'));
    expect(layar.getByText('Skor & indikator')).toBeTruthy();
    fireEvent.press(layar.getByLabelText('Kembali ke tim'));
    expect(layar.getByText('Penilaian kepala sales')).toBeTruthy();
  });

  it('tab Semua sales: seluruh sales dengan nama kepalanya', () => {
    const layar = render(<PenilaianKinerjaScreen />);
    fireEvent.press(layar.getByText('Semua sales (3)'));

    expect(barisSales(layar)).toEqual(['Penilaian Andi, skor 90', 'Penilaian Citra, skor 72', 'Penilaian Budi, skor 50']);
    const barisCitra = layar.getByLabelText('Penilaian Citra, skor 72');
    expect(within(barisCitra).getByText('Kepala: Tono')).toBeTruthy();
  });

  it('param rute tab=SALES membuka tab Semua sales', () => {
    mockParam = { tab: 'SALES', diminta: '1' };
    const layar = render(<PenilaianKinerjaScreen />);

    expect(layar.getByLabelText('Semua sales (3)').props.accessibilityState).toEqual({ selected: true });
  });
});
