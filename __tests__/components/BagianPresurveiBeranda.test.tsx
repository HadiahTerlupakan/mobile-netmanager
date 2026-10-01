import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockUseRingkasan = jest.fn();
const mockUseAntrean = jest.fn();
const mockRefetch = jest.fn();
const mockUseDaftarRencana = jest.fn();
const mockUseTimHariIni = jest.fn();
let mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/queries/useRingkasanPresurvei', () => ({
  useRingkasanPresurvei: (isAktif: boolean) => mockUseRingkasan(isAktif),
}));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({ useKegiatanMenungguKirim: () => mockUseAntrean() }));
jest.mock('@/hooks/queries/usePresurveiRencana', () => ({
  useDaftarRencana: (filter: unknown, isAktif: boolean) => mockUseDaftarRencana(filter, isAktif),
}));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({ useLingkupRencana: () => mockLingkup }));
jest.mock('@/hooks/presurvei/useTimHariIni', () => ({ useTimHariIni: () => mockUseTimHariIni() }));
// Kartu kinerja diuji sendiri (`BagianKinerjaBeranda.test.tsx`); di sini cukup penandanya.
jest.mock('@/components/organisms/dashboard/BagianKinerjaBeranda', () => {
  const { Text } = require('react-native');
  return {
    BagianKinerjaBeranda: ({ isPresurveiAktif }: { isPresurveiAktif: boolean }) => (
      <Text>{`kartu-kinerja:${String(isPresurveiAktif)}`}</Text>
    ),
  };
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { buatRencanaUji } from '../fixtures/presurvei/rencana';
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
    mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };
    mockUseRingkasan.mockReturnValue({ data: RINGKASAN, error: null, refetch: mockRefetch });
    mockUseAntrean.mockReturnValue({ data: [{ idAntrean: 1 }, { idAntrean: 2 }] });
    mockUseDaftarRencana.mockReturnValue({ data: { data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } } });
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

  it('menyertakan kartu kinerja bulan ini saat presurvei aktif', () => {
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('kartu-kinerja:true')).toBeTruthy();
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

  // Review akhir M5: item "Gagal terkirim" tidak lagi menunggu kirim.
  it('menunggu kirim tidak menghitung item antrean FAILED', () => {
    mockUseAntrean.mockReturnValue({
      data: [
        { idAntrean: 1, status: 'PENDING' },
        { idAntrean: 2, status: 'RETRY' },
        { idAntrean: 3, status: 'FAILED' },
      ],
    });
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

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

describe('BagianPresurveiBeranda — rencana hari ini', () => {
  const rencana = (id: string, statusTampil: 'SELESAI' | 'DIRENCANAKAN', tujuan: string) =>
    buatRencanaUji(id, { statusTampil, status: statusTampil, tujuan });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRingkasan.mockReturnValue({ data: RINGKASAN, error: null, refetch: mockRefetch });
    mockUseAntrean.mockReturnValue({ data: [] });
    mockUseDaftarRencana.mockImplementation((filter) =>
      (filter as { status?: string }).status === 'TERLEWAT'
        ? { data: { data: [], meta: { page: 1, limit: 100, total: 4, totalPages: 1 } } }
        : {
            data: {
              data: [rencana('r-1', 'SELESAI', 'Tagih jawaban'), rencana('r-2', 'DIRENCANAKAN', 'Presentasi paket')],
              meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
            },
          },
    );
  });

  it('memuat rencana hari ini dan terlewat hanya bila presurvei aktif', () => {
    render(<BagianPresurveiBeranda isPresurveiAktif />);

    const hariIni = new Date();
    const tanggal = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;
    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ dari: tanggal, sampai: tanggal }, true);
    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ status: 'TERLEWAT' }, true);
  });

  it('menampilkan rekap, jumlah terlewat, dan membuka rencana tertunda', () => {
    const { getByText, queryByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(getByText('Rencana hari ini')).toBeTruthy();
    expect(getByText('1 dari 2 selesai · 1 belum dikunjungi')).toBeTruthy();
    expect(getByText('Terlewat: 4')).toBeTruthy();
    expect(queryByText('Tagih jawaban')).toBeNull();
    fireEvent.press(getByText('Presentasi paket'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/presurvei/rencana/[id]', params: { id: 'r-2' } });
  });
});

describe('BagianPresurveiBeranda — pemberi tugas (kepala sales)', () => {
  const tanggalHariIni = () => {
    const hariIni = new Date();
    return `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLingkup = { isPemberiTugas: true, penggunaId: 'k-1' };
    mockUseRingkasan.mockReturnValue({ data: RINGKASAN, error: null, refetch: mockRefetch });
    mockUseAntrean.mockReturnValue({ data: [] });
    mockUseDaftarRencana.mockReturnValue({ data: { data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } } });
    mockUseTimHariIni.mockReturnValue({
      baris: [{ salesId: 's-2', namaSales: 'Sinta', total: 3, selesai: 1, terlewat: 2 }],
      isGagal: false,
      cobaLagi: jest.fn(),
    });
  });

  afterEach(() => {
    mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };
  });

  it('Rencana hari ini tetap milik sendiri (salesId diri), kartu Tim hari ini ikut tampil', () => {
    const { getByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ dari: tanggalHariIni(), sampai: tanggalHariIni(), salesId: 'k-1' }, true);
    expect(mockUseDaftarRencana).toHaveBeenCalledWith({ status: 'TERLEWAT', salesId: 'k-1' }, true);
    expect(getByText('Rencana hari ini')).toBeTruthy();
    expect(getByText('Tim hari ini')).toBeTruthy();
    expect(getByText('1/3 selesai')).toBeTruthy();
  });

  it('ketuk anggota membuka tab Presurvei di tampilan Tim anggota itu', () => {
    const { getByLabelText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    fireEvent.press(getByLabelText('Rencana Sinta'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei',
      params: { subTab: 'rencana', salesId: 's-2', diminta: expect.any(String) },
    });
  });

  it('sales biasa tidak melihat kartu Tim hari ini', () => {
    mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };
    const { queryByText } = render(<BagianPresurveiBeranda isPresurveiAktif />);

    expect(queryByText('Tim hari ini')).toBeNull();
    expect(mockUseTimHariIni).not.toHaveBeenCalled();
  });
});
