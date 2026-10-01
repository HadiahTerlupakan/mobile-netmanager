import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { buatRencanaUji } from '../fixtures/presurvei/rencana';

const mockPush = jest.fn();
const mockUseRincian = jest.fn();
const mockUseAntrean = jest.fn();
const mockMutateBatal = jest.fn();
let mockIsOnline = true;
let mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'r-1' }),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: () => true }));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => mockIsOnline }));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({ useLingkupRencana: () => mockLingkup }));
jest.mock('@/hooks/queries/usePresurveiRencana', () => ({
  useRincianRencana: (id: string, isAktif: boolean) => mockUseRincian(id, isAktif),
}));
jest.mock('@/hooks/queries/usePresurveiKegiatan', () => ({ useKegiatanMenungguKirim: () => mockUseAntrean() }));
jest.mock('@/hooks/presurvei/useMutasiRencana', () => ({
  useBatalkanRencana: () => ({ mutate: mockMutateBatal, isPending: false }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

const LAPORAN = {
  id: 'k-1', jenis: 'KUNJUNGAN', userId: 's-1', namaSales: null, peranPelaku: null, departemenPelaku: null,
  prospekId: 'p-1', waktuMulai: '2026-09-26T03:00:00.000Z', alamatDikunjungi: null, ditemuiNama: 'Pak Budi',
  latitude: -6.2, longitude: 106.8, hasil: 'TERTARIK', jumlahFoto: 2, iklanId: null, waktuSelesai: null,
  catatan: 'Minta brosur', fotoUrls: [], dataTeknis: null, createdAt: '2026-09-26T03:00:00.000Z',
};

const tampilkan = (over: Parameters<typeof buatRencanaUji>[1]) => {
  mockUseRincian.mockReturnValue({
    data: { ...buatRencanaUji('r-1', { tujuan: 'Presentasi paket', ...over }), laporan: null },
    isPending: false,
    refetch: jest.fn(),
  });
  const Layar = require('../../app/(app)/presurvei/rencana/[id]/index').default;
  return render(<Layar />);
};

describe('Rincian Rencana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = true;
    mockLingkup = { isPemberiTugas: false, penggunaId: 's-1' };
    mockUseAntrean.mockReturnValue({ data: [] });
  });

  it('Laporkan Kunjungan membuka form catat dengan rencana, jenis, dan prospek terisi', () => {
    const { getByText } = tampilkan({ jenis: 'SURVEI_LOKASI', prospekId: 'p-1', namaProspek: 'Budi Santoso' });

    fireEvent.press(getByText('Laporkan Kunjungan'));

    expect(mockUseRincian).toHaveBeenCalledWith('r-1', true);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/kegiatan/catat',
      params: { rencanaId: 'r-1', jenis: 'SURVEI_LOKASI', prospekId: 'p-1', prospekNama: 'Budi Santoso' },
    });
  });

  it('rencana terlewat tetap bisa dilaporkan; tanpa prospek param prospek tidak dikirim', () => {
    const { getByText } = tampilkan({ statusTampil: 'TERLEWAT' });

    fireEvent.press(getByText('Laporkan Kunjungan'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)/presurvei/kegiatan/catat',
      params: { rencanaId: 'r-1', jenis: 'KUNJUNGAN' },
    });
  });

  it('penugasan: menampilkan pemberi tugas tanpa Ubah dan Batalkan', () => {
    const { getByText, queryByText } = tampilkan({ sumber: 'PENUGASAN', namaPembuat: 'Bu Rina', namaSales: 'Sari' });

    expect(queryByText('Sales: Sari')).toBeNull();

    expect(getByText('Ditugaskan oleh Bu Rina')).toBeTruthy();
    expect(getByText('Laporkan Kunjungan')).toBeTruthy();
    expect(queryByText('Ubah')).toBeNull();
    expect(queryByText('Batalkan')).toBeNull();
  });

  it('mandiri: Ubah membuka form ubah; Batalkan butuh alasan minimal 3 karakter', () => {
    const { getByText, getByLabelText } = tampilkan({});

    fireEvent.press(getByText('Ubah'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/presurvei/rencana/[id]/ubah', params: { id: 'r-1' } });

    fireEvent.press(getByText('Batalkan'));
    fireEvent.changeText(getByLabelText('Alasan pembatalan'), 'ab');
    fireEvent.press(getByLabelText('Batalkan Rencana'));
    expect(getByText('Alasan minimal 3 karakter')).toBeTruthy();
    expect(mockMutateBatal).not.toHaveBeenCalled();

    fireEvent.changeText(getByLabelText('Alasan pembatalan'), '  Pelanggan pindah ');
    fireEvent.press(getByLabelText('Batalkan Rencana'));
    expect(mockMutateBatal).toHaveBeenCalledWith('Pelanggan pindah');
  });

  it('offline: Ubah/Batalkan nonaktif, Laporkan tetap aktif (antrean)', () => {
    mockIsOnline = false;
    const { getByLabelText, getByText } = tampilkan({});

    expect(getByLabelText('Ubah').props.accessibilityState).toEqual({ disabled: true });
    expect(getByLabelText('Batalkan').props.accessibilityState).toEqual({ disabled: true });
    expect(getByLabelText('Laporkan Kunjungan').props.accessibilityState).toEqual({ disabled: false });
    expect(getByText('Ubah dan Batalkan rencana butuh koneksi internet.')).toBeTruthy();
  });

  it('laporan masih di antrean: tidak menawarkan laporan kedua', () => {
    mockUseAntrean.mockReturnValue({ data: [{ idAntrean: 1, rencanaId: 'r-1', status: 'PENDING' }] });
    const { getByText, queryByText } = tampilkan({});

    expect(getByText('Menunggu kirim')).toBeTruthy();
    expect(getByText('Laporan kunjungan tersimpan dan menunggu dikirim.')).toBeTruthy();
    expect(queryByText('Laporkan Kunjungan')).toBeNull();
  });

  it('selesai: ringkasan laporan dengan tanda terlambat, tanpa aksi', () => {
    mockUseRincian.mockReturnValue({
      data: {
        ...buatRencanaUji('r-1', { status: 'SELESAI', statusTampil: 'SELESAI', isTerlambat: true }),
        laporan: LAPORAN,
      },
      isPending: false,
      refetch: jest.fn(),
    });
    const Layar = require('../../app/(app)/presurvei/rencana/[id]/index').default;
    const { getByText, queryByText } = render(<Layar />);

    expect(getByText('Laporan kunjungan')).toBeTruthy();
    expect(getByText('Tertarik')).toBeTruthy();
    expect(getByText('Minta brosur')).toBeTruthy();
    expect(getByText('2 foto')).toBeTruthy();
    expect(getByText('Terlambat')).toBeTruthy();
    expect(queryByText('Laporkan Kunjungan')).toBeNull();
  });
});

describe('Rincian Rencana — pemberi tugas (kepala sales)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = true;
    mockLingkup = { isPemberiTugas: true, penggunaId: 'k-1' };
    mockUseAntrean.mockReturnValue({ data: [] });
  });

  const PENUGASAN_TIM = {
    salesId: 's-2',
    namaSales: 'Sinta',
    sumber: 'PENUGASAN' as const,
    dibuatOlehId: 'k-1',
    namaPembuat: 'Kepala Andi',
  };

  it('penugasan anggota tim: tampil sales & pemberi tugas, boleh Ubah/Batalkan, tanpa Laporkan', () => {
    const { getByText, queryByText } = tampilkan(PENUGASAN_TIM);

    expect(getByText('Sales: Sinta')).toBeTruthy();
    expect(getByText('Ditugaskan oleh Kepala Andi')).toBeTruthy();
    expect(getByText('Ubah')).toBeTruthy();
    expect(getByText('Batalkan')).toBeTruthy();
    expect(queryByText('Laporkan Kunjungan')).toBeNull();

    fireEvent.press(getByText('Ubah'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/presurvei/rencana/[id]/ubah', params: { id: 'r-1' } });
  });

  it('rencana terlewat anggota tim tetap bisa diubah dan dibatalkan', () => {
    const { getByText } = tampilkan({ ...PENUGASAN_TIM, statusTampil: 'TERLEWAT' });

    expect(getByText('Ubah')).toBeTruthy();
    expect(getByText('Batalkan')).toBeTruthy();
  });

  it('rencananya sendiri: Laporkan Kunjungan tetap ada bersama Ubah/Batalkan', () => {
    const { getByText } = tampilkan({ salesId: 'k-1', namaSales: 'Kepala Andi' });

    expect(getByText('Laporkan Kunjungan')).toBeTruthy();
    expect(getByText('Ubah')).toBeTruthy();
  });

  it('rencana tim yang sudah selesai: ringkasan laporan tanpa aksi', () => {
    mockUseRincian.mockReturnValue({
      data: {
        ...buatRencanaUji('r-1', { ...PENUGASAN_TIM, status: 'SELESAI', statusTampil: 'SELESAI', isTerlambat: true }),
        laporan: LAPORAN,
      },
      isPending: false,
      refetch: jest.fn(),
    });
    const Layar = require('../../app/(app)/presurvei/rencana/[id]/index').default;
    const { getByText, queryByText } = render(<Layar />);

    expect(getByText('Laporan kunjungan')).toBeTruthy();
    expect(getByText('Terlambat')).toBeTruthy();
    expect(queryByText('Ubah')).toBeNull();
    expect(queryByText('Laporkan Kunjungan')).toBeNull();
  });
});
