import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockCobaLagi = jest.fn();
let mockKeadaan: unknown = { jenis: 'tersembunyi' };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/presurvei/useKinerjaBeranda', () => ({
  useKinerjaBeranda: () => ({ keadaan: mockKeadaan, cobaLagi: mockCobaLagi }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { BagianKinerjaBeranda } from '@/components/organisms/dashboard/BagianKinerjaBeranda';
import { RUTE_PENILAIAN_KINERJA } from '@/constants/rutePresurvei';
import { buatKepalaUji } from '../fixtures/presurvei/penilaian';

const SALES = {
  salesId: 's-1',
  nama: 'Sari',
  kepalaSalesId: null,
  skor: 86.4,
  predikat: 'SANGAT_BAIK',
  indikator: {
    aktivitas: { nilai: 90, bobot: 40 },
    konversi: { nilai: 80, bobot: 30 },
    realisasi: { nilai: null, bobot: 30 },
  },
  pencapaian: null,
  rencana: { tepatWaktu: 3, terlambat: 1, terlewat: 0 },
};

const KEPALA = {
  kepalaId: 'k-1',
  nama: 'Kepala',
  jumlahAnggota: 12,
  skor: null,
  predikat: null,
  indikator: {
    aktivitasTim: { nilai: 72, bobot: 30 },
    konversiTim: { nilai: 41, bobot: 30 },
    realisasiPenugasan: { nilai: null, bobot: 20 },
    cakupanPembinaan: { nilai: 90, bobot: 10 },
    kinerjaPribadi: { nilai: 65, bobot: 10 },
  },
};

describe('BagianKinerjaBeranda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tersembunyi (403/tanpa baris) tidak merender apa pun', () => {
    mockKeadaan = { jenis: 'tersembunyi' };
    const { toJSON } = render(<BagianKinerjaBeranda isPresurveiAktif />);
    expect(toJSON()).toBeNull();
  });

  it('sales: skor dibulatkan, predikat, tiga indikator; ketuk membuka layar penilaian', () => {
    mockKeadaan = { jenis: 'siap', tampilan: { jenis: 'SALES', sales: SALES } };
    const { getByText, getAllByTestId } = render(<BagianKinerjaBeranda isPresurveiAktif />);

    expect(getByText('Kinerja saya bulan ini')).toBeTruthy();
    expect(getByText('86')).toBeTruthy();
    expect(getByText('Sangat baik')).toBeTruthy();
    expect(getAllByTestId('bilah-indikator')).toHaveLength(3);
    expect(getByText('Belum terukur')).toBeTruthy();
    fireEvent.press(getByText('Kinerja saya bulan ini'));
    expect(mockPush).toHaveBeenCalledWith(RUTE_PENILAIAN_KINERJA);
  });

  it('kepala: skor belum terukur, jumlah anggota, dan indikator terlemah', () => {
    mockKeadaan = { jenis: 'siap', tampilan: { jenis: 'KEPALA', kepala: KEPALA, sales: null } };
    const { getByText } = render(<BagianKinerjaBeranda isPresurveiAktif />);

    expect(getByText('Kinerja tim bulan ini')).toBeTruthy();
    expect(getByText('Belum terukur')).toBeTruthy();
    expect(getByText('12 anggota tim')).toBeTruthy();
    expect(getByText(/Konversi tim \(41\)/)).toBeTruthy();
  });

  it('lingkup SEMUA: rata-rata kepala, sebaran predikat, kepala terendah; ketuk membuka tab Kepala sales', () => {
    const kepala = [
      buatKepalaUji('k-1', 90, { nama: 'Rudi' }),
      buatKepalaUji('k-2', 60, { nama: 'Tono' }),
      buatKepalaUji('k-3', null, { nama: 'Wati' }),
    ];
    mockKeadaan = { jenis: 'siap', tampilan: { jenis: 'SEMUA', kepala, sales: [] } };
    const { getByText } = render(<BagianKinerjaBeranda isPresurveiAktif />);

    expect(getByText('Kinerja tim sales bulan ini')).toBeTruthy();
    expect(getByText('75')).toBeTruthy();
    expect(getByText('Rata-rata 3 kepala sales')).toBeTruthy();
    expect(getByText('Sangat baik 1')).toBeTruthy();
    expect(getByText('Cukup 1')).toBeTruthy();
    expect(getByText('Belum terukur 1')).toBeTruthy();
    expect(getByText(/Tono \(60\)/)).toBeTruthy();
    fireEvent.press(getByText('Kinerja tim sales bulan ini'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: RUTE_PENILAIAN_KINERJA,
      params: { tab: 'KEPALA', diminta: expect.any(String) },
    });
  });

  it('galat: ketuk untuk coba lagi', () => {
    mockKeadaan = { jenis: 'galat' };
    const { getByText } = render(<BagianKinerjaBeranda isPresurveiAktif />);
    fireEvent.press(getByText('Penilaian kinerja gagal dimuat. Ketuk untuk coba lagi.'));
    expect(mockCobaLagi).toHaveBeenCalled();
  });
});
