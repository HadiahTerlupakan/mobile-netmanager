import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockUseRingkasan = jest.fn();
const mockUseAntrean = jest.fn();
const mockRefetch = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/queries/useRingkasanPresurvei', () => ({
  useRingkasanPresurvei: (isAktif: boolean) => mockUseRingkasan(isAktif),
}));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({ useKegiatanMenungguKirim: () => mockUseAntrean() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { BagianPresurveiBeranda, TEKS_PRESURVEI_BELUM_AKTIF } from '@/components/organisms/dashboard/BagianPresurveiBeranda';

const RINGKASAN = {
  tanggal: '2026-09-24',
  kegiatanHariIni: { KUNJUNGAN: 3, SURVEI_LOKASI: 1, TELEPON: 4, CHAT: 2, IKLAN: 0 },
  target: null,
  perluFollowUp: [
    { id: 'p-1', nama: 'Budi Santoso', noTelp: '081234567890', status: 'TERTARIK', sentuhanTerakhir: '2026-09-10T00:00:00.000Z' },
  ],
};

const TARGET = {
  periodeTahun: 2026,
  periodeBulan: 9,
  kunjungan: { target: 20, tercapai: 10, persen: 50 },
  prospek: { target: 10, tercapai: 3, persen: 30 },
  konversi: { target: 5, tercapai: 1, persen: 20 },
};

describe('BagianPresurveiBeranda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRingkasan.mockReturnValue({ data: RINGKASAN, error: null, refetch: mockRefetch });
    mockUseAntrean.mockReturnValue({ data: [{ idAntrean: 1 }, { idAntrean: 2 }] });
  });

  it('tanpa m_presurvei tidak memanggil ringkasan dan menampilkan pesan belum aktif', () => {
    mockUseRingkasan.mockReturnValue({ data: undefined, error: null, refetch: mockRefetch });
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif={false} />);

    expect(mockUseRingkasan).toHaveBeenCalledWith(false);
    expect(getByText(TEKS_PRESURVEI_BELUM_AKTIF)).toBeTruthy();
  });

  it('403 dari server ditampilkan sebagai belum aktif, bukan galat', () => {
    mockUseRingkasan.mockReturnValue({
      data: undefined,
      error: { isAxiosError: true, response: { status: 403 } },
      refetch: mockRefetch,
    });
    const { getByText, queryByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(mockUseRingkasan).toHaveBeenCalledWith(true);
    expect(getByText(TEKS_PRESURVEI_BELUM_AKTIF)).toBeTruthy();
    expect(queryByText('Ringkasan presurvei gagal dimuat.')).toBeNull();
    expect(queryByText('Gagal Memuat Data')).toBeNull();
  });

  it('galat lain: pesan gagal dengan tombol coba lagi', () => {
    mockUseRingkasan.mockReturnValue({
      data: undefined,
      error: { isAxiosError: true, response: { status: 500 } },
      refetch: mockRefetch,
    });
    const { getByText, queryByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('Ringkasan presurvei gagal dimuat.')).toBeTruthy();
    expect(queryByText(TEKS_PRESURVEI_BELUM_AKTIF)).toBeNull();
    fireEvent.press(getByText('Coba Lagi'));
    expect(mockRefetch).toHaveBeenCalledWith();
  });

  it('target belum ditetapkan: teks apa adanya dan tanpa bilah progres', () => {
    const { getByText, queryAllByTestId } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('Target belum ditetapkan')).toBeTruthy();
    expect(queryAllByTestId('baris-target')).toHaveLength(0);
  });

  it('target ada: tiga baris dengan angka dan lebar bilah dari persen server', () => {
    mockUseRingkasan.mockReturnValue({ data: { ...RINGKASAN, target: TARGET }, error: null, refetch: mockRefetch });
    const { getAllByTestId, getByText, queryByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getAllByTestId('baris-target')).toHaveLength(3);
    expect(getByText('10 / 20')).toBeTruthy();
    expect(getByText('3 / 10')).toBeTruthy();
    expect(getByText('1 / 5')).toBeTruthy();
    expect(queryByText('Target belum ditetapkan')).toBeNull();
    const lebar = getAllByTestId('bilah-target').map((bilah) => StyleSheet.flatten(bilah.props.style).width);
    expect(lebar).toEqual(['50%', '30%', '20%']);
  });

  it('menampilkan rekap hari ini per label dan jumlah menunggu kirim', () => {
    const { getByLabelText, getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByLabelText('Kunjungan: 3')).toBeTruthy();
    expect(getByLabelText('Survei: 1')).toBeTruthy();
    expect(getByLabelText('Telepon/Chat: 6')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
    expect(getByText('Menunggu kirim: 2')).toBeTruthy();
  });

  it('antrean belum termuat dihitung nol', () => {
    mockUseAntrean.mockReturnValue({ data: undefined });
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('Menunggu kirim: 0')).toBeTruthy();
  });

  it('prospek perlu follow-up membuka rinciannya', () => {
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    fireEvent.press(getByText('Budi Santoso'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/presurvei/prospek/[id]', params: { id: 'p-1' } });
  });

  it('tidak ada prospek menunggu: pesan kosong', () => {
    mockUseRingkasan.mockReturnValue({ data: { ...RINGKASAN, perluFollowUp: [] }, error: null, refetch: mockRefetch });
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('Tidak ada prospek yang menunggu.')).toBeTruthy();
  });
});
