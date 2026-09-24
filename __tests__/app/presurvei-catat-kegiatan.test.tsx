import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

type KeadaanLokasiUji = {
  status: 'belum' | 'mencari' | 'siap' | 'gagal' | 'izin_ditolak';
  titik: { latitude: number; longitude: number; akurasiMeter: number | null } | null;
  alamatTerdeteksi: string;
};
type OpsiMutasiUji = {
  onSuccess?: () => void;
  onError?: (galat: unknown) => void;
  onSettled?: () => void;
};
type VariabelUji = Record<string, unknown>;
type PropsPilihProspekUji = {
  onTutup: () => void;
  onPilih: (prospek: { id: string; nama: string }) => void;
};

const mockBack = jest.fn();
const mockParam = jest.fn<() => Record<string, string | undefined>>();
const mockCari = jest.fn();
const mockMutate = jest.fn<(variabel: VariabelUji, opsi: OpsiMutasiUji) => void>();
const mockUseFeatureGuard = jest.fn<(...args: unknown[]) => boolean>();
const mockPresentInfo = jest.fn();
const mockPresentAppError = jest.fn();
let mockEfekFokus: (() => void) | null = null;
let mockOnTersimpan: ((hasil: { isAntre: boolean }) => void) | null = null;
let mockLokasi: KeadaanLokasiUji = { status: 'gagal', titik: null, alamatTerdeteksi: '' };
let mockKameraProps: { onAmbil: (uri: string) => void; onTutup: () => void } | null = null;
let mockPilihProps: PropsPilihProspekUji | null = null;
let mockIsPending = false;

let mockNomorUuid = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockNomorUuid += 1;
    return `uuid-uji-${mockNomorUuid}`;
  },
}));
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ back: mockBack, push: jest.fn() }),
    useLocalSearchParams: () => mockParam(),
    useFocusEffect: (efek: () => void) => {
      mockEfekFokus = efek;
      React.useEffect(() => efek(), [efek]);
    },
  };
});
jest.mock('@/utils/errorPresenter', () => ({
  presentInfoMessage: (...args: unknown[]) => mockPresentInfo(...args),
  presentAppError: (...args: unknown[]) => mockPresentAppError(...args),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: (...args: unknown[]) => mockUseFeatureGuard(...args),
}));
jest.mock('@/hooks/presurvei/useLokasiKegiatan', () => ({
  useLokasiKegiatan: () => ({ ...mockLokasi, cari: mockCari }),
}));
jest.mock('@/hooks/presurvei/useCatatKegiatan', () => ({
  useCatatKegiatan: (onTersimpan: (hasil: { isAntre: boolean }) => void) => {
    mockOnTersimpan = onTersimpan;
    return { mutate: mockMutate, isPending: mockIsPending };
  },
}));
jest.mock('@/components/organisms/presurvei/KameraBukti', () => ({
  KameraBukti: (props: { onAmbil: (uri: string) => void; onTutup: () => void }) => {
    mockKameraProps = props;
    return null;
  },
}));
jest.mock('@/components/organisms/presurvei/PetaTitik', () => ({ PetaTitik: () => null }));
jest.mock('@/components/organisms/presurvei/PilihProspekModal', () => ({
  PilihProspekModal: (props: PropsPilihProspekUji) => {
    const { Text } = require('react-native');
    mockPilihProps = props;
    return <Text>modal-pilih-prospek</Text>;
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };
const PROSPEK_DIPILIH = { id: 'p-9', nama: 'Sari Wulandari' };

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/kegiatan/catat').default;
  const utilitas = render(<Layar />);
  return { ...utilitas, renderUlang: () => utilitas.rerender(<Layar />) };
};

/** Simulasi layar difokuskan lagi (Tabs mempertahankan instance layar). */
const fokusUlang = () => {
  act(() => mockEfekFokus?.());
};

/** 409 dari server untuk kunci idempotensi yang dipakai dengan badan berbeda. */
const bangunGalatKunciDipakaiUlang = () => {
  const { AxiosError } = require('axios');
  return Object.assign(new AxiosError('Request failed with status code 409', 'ERR_BAD_REQUEST'), {
    response: {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {},
      data: { success: false, error: 'Idempotency key reused', code: 'IDEMPOTENCY_KEY_REUSED' },
    },
  });
};

/** Variabel dan opsi panggilan mutate ke-`indeks`. */
const panggilanMutate = (indeks: number) => {
  const panggilan = mockMutate.mock.calls[indeks];
  return { variabel: panggilan[0], opsi: panggilan[1] };
};

/** Tuntaskan panggilan mutate ke-`indeks` sebagai galat server (tidak diantre). */
const gagalkanMutate = (indeks: number, galat: unknown = new Error('Server galat 500')) => {
  const { opsi } = panggilanMutate(indeks);
  act(() => {
    opsi.onError?.(galat);
    opsi.onSettled?.();
  });
};

type KueriLayar = ReturnType<typeof renderLayar>;

/** Kunjungan dengan GPS siap, satu foto, dan hasil Tertarik. */
const isiKunjunganTertarik = ({ getByText }: KueriLayar) => {
  fireEvent.press(getByText('Kunjungan'));
  fireEvent.press(getByText('Ambil Foto'));
  act(() => mockKameraProps?.onAmbil('file:///cache/a.jpg'));
  fireEvent.press(getByText('Tertarik'));
};

describe('Catat Kegiatan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParam.mockReturnValue({});
    mockLokasi = { status: 'gagal', titik: null, alamatTerdeteksi: '' };
    mockKameraProps = null;
    mockPilihProps = null;
    mockOnTersimpan = null;
    mockEfekFokus = null;
    mockUseFeatureGuard.mockReturnValue(true);
    mockIsPending = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('mencari GPS saat layar dibuka, dijaga fitur presurvei, dan tidak menawarkan jenis Iklan', () => {
    const { getByText, queryByText } = renderLayar();

    expect(mockCari.mock.calls).toEqual([[]]);
    expect(mockUseFeatureGuard).toHaveBeenCalledWith('m_presurvei');
    for (const jenis of ['Kunjungan', 'Survei lokasi', 'Telepon', 'Chat']) {
      expect(getByText(jenis)).toBeTruthy();
    }
    expect(queryByText('Iklan')).toBeNull();
  });

  it('menolak menyimpan kunjungan tanpa lokasi GPS dan menawarkan coba lagi', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    fireEvent.press(getByText('Tertarik'));
    fireEvent.press(getByText('Simpan Kegiatan'));
    fireEvent.press(getByText('Coba lagi'));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(getByText('Lokasi GPS belum didapat')).toBeTruthy();
    expect(mockCari.mock.calls).toEqual([[], []]);
  });

  it('menolak kunjungan tanpa foto bukti walau GPS siap', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: '' };
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    fireEvent.press(getByText('Tertarik'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(getByText('Ambil minimal 1 foto bukti')).toBeTruthy();
  });

  it('kolom teknis hanya tampil untuk survei lokasi', () => {
    const { getByText, queryByLabelText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    expect(queryByLabelText('ODP terdekat')).toBeNull();

    fireEvent.press(getByText('Survei lokasi'));
    expect(queryByLabelText('ODP terdekat')).toBeTruthy();
    expect(queryByLabelText('Estimasi kabel (meter)')).toBeTruthy();
  });

  it('telepon tersimpan tanpa koordinat dan tanpa foto', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: 'Jl. Melati 9' };
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', prospekId: null }),
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
    const { variabel } = panggilanMutate(0);
    expect('latitude' in variabel).toBe(false);
    expect('meta' in variabel).toBe(false);
  });

  it('foto yang diambil saat Kunjungan tidak ikut terkirim bila jenis diganti ke Telepon', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: '' };
    const utilitas = renderLayar();
    isiKunjunganTertarik(utilitas);

    fireEvent.press(utilitas.getByText('Telepon'));
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'TELEPON', hasil: 'TERTARIK' }),
      expect.anything(),
    );
    expect('meta' in panggilanMutate(0).variabel).toBe(false);
  });

  it('kunjungan lengkap mengirim titik GPS, alamat terdeteksi, dan foto lewat meta', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: 'Jl. Melati 9' };
    const utilitas = renderLayar();

    isiKunjunganTertarik(utilitas);
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        latitude: -6.2,
        longitude: 106.8,
        alamatDikunjungi: 'Jl. Melati 9',
        meta: { photos: ['file:///cache/a.jpg'], targetField: 'fotoUrls', photoType: 'presurvei' },
      }),
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it('tidak mengirim dua kali saat Simpan ditekan beruntun di sinyal lemah', () => {
    const { getByText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));

    fireEvent.press(getByText('Simpan Kegiatan'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT' }),
      expect.anything(),
    );
  });

  it('simpan gagal: isian tetap ada, layar tidak ditutup, dan simpan ulang memakai requestId yang sama', () => {
    const { getByText, getByLabelText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.changeText(getByLabelText('Catatan'), 'Sudah pakai provider lain');

    fireEvent.press(getByText('Simpan Kegiatan'));
    gagalkanMutate(0);
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockBack).not.toHaveBeenCalled();
    expect(getByLabelText('Catatan').props.value).toBe('Sudah pakai provider lain');
    expect(mockMutate).toHaveBeenCalledTimes(2);
    const pertama = panggilanMutate(0).variabel;
    const kedua = panggilanMutate(1).variabel;
    expect(kedua.requestId).toBe(pertama.requestId);
    expect(kedua.waktuMulai).toBe(pertama.waktuMulai);
    expect(kedua).toEqual(expect.objectContaining({ catatan: 'Sudah pakai provider lain' }));
  });

  it('simpan gagal lalu isian diubah: simpan berikutnya niat baru dengan requestId baru', () => {
    const { getByText, getByLabelText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));

    fireEvent.press(getByText('Simpan Kegiatan'));
    gagalkanMutate(0);
    fireEvent.changeText(getByLabelText('Catatan'), 'Minta ditelepon bulan depan');
    fireEvent.press(getByText('Simpan Kegiatan'));

    const pertama = panggilanMutate(0).variabel;
    const kedua = panggilanMutate(1).variabel;
    expect(typeof kedua.requestId).toBe('string');
    expect(kedua.requestId).not.toBe(pertama.requestId);
    expect(kedua).toEqual(expect.objectContaining({ catatan: 'Minta ditelepon bulan depan' }));
  });

  it('kembali ke layar sebelumnya hanya setelah tersimpan (terkirim atau diantre)', () => {
    const { getByText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.press(getByText('Simpan Kegiatan'));
    expect(mockBack).not.toHaveBeenCalled();

    act(() => mockOnTersimpan?.({ isAntre: true }));

    expect(mockBack).toHaveBeenCalledWith();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('tombol Kembali di kepala layar menutup layar', () => {
    const { getByLabelText } = renderLayar();

    fireEvent.press(getByLabelText('Kembali'));

    expect(mockBack).toHaveBeenCalledWith();
  });

  it('prospek dari parameter Catat Follow-up ikut terkirim', () => {
    mockParam.mockReturnValue({ prospekId: 'p-7', prospekNama: 'Budi Santoso' });
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Perlu follow-up'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ prospekId: 'p-7' }),
      expect.anything(),
    );
  });

  it('opsi prospek baru hanya tampil untuk kegiatan lapangan berhasil minat tanpa prospek tertaut', () => {
    const { getByText, queryByLabelText } = renderLayar();

    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tertarik'));
    expect(queryByLabelText('Buat prospek baru')).toBeNull();

    fireEvent.press(getByText('Kunjungan'));
    fireEvent.press(getByText('Tidak minat'));
    expect(queryByLabelText('Buat prospek baru')).toBeNull();

    fireEvent.press(getByText('Tertarik'));
    expect(queryByLabelText('Buat prospek baru')).toBeTruthy();
  });

  it('prospek baru yang diisi ikut terkirim', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: '' };
    const utilitas = renderLayar();
    isiKunjunganTertarik(utilitas);

    fireEvent(utilitas.getByLabelText('Buat prospek baru'), 'valueChange', true);
    fireEvent.changeText(utilitas.getByLabelText('Nama calon pelanggan'), 'Rina Kartika');
    fireEvent.changeText(utilitas.getByLabelText('No. HP'), '081234567890');
    fireEvent.changeText(utilitas.getByLabelText('Alamat pemasangan'), 'Jl. Kenanga 12');
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        prospekId: null,
        prospekBaru: { nama: 'Rina Kartika', noTelp: '081234567890', alamat: 'Jl. Kenanga 12', paketDiminati: null },
      }),
      expect.anything(),
    );
  });

  it('memilih prospek menautkannya dan membatalkan prospek baru', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: '' };
    const utilitas = renderLayar();
    isiKunjunganTertarik(utilitas);
    fireEvent(utilitas.getByLabelText('Buat prospek baru'), 'valueChange', true);
    fireEvent.changeText(utilitas.getByLabelText('Nama calon pelanggan'), 'Rina Kartika');

    expect(utilitas.queryByText('modal-pilih-prospek')).toBeNull();
    fireEvent.press(utilitas.getByText('Pilih prospek (follow-up)'));
    expect(utilitas.getByText('modal-pilih-prospek')).toBeTruthy();
    act(() => mockPilihProps?.onPilih(PROSPEK_DIPILIH));
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));

    expect(utilitas.getByText('Sari Wulandari')).toBeTruthy();
    expect(utilitas.queryByLabelText('Buat prospek baru')).toBeNull();
    expect(utilitas.queryByText('modal-pilih-prospek')).toBeNull();
    const { variabel } = panggilanMutate(0);
    expect(variabel).toEqual(expect.objectContaining({ prospekId: 'p-9' }));
    expect('prospekBaru' in variabel).toBe(false);
  });

  it('memilih lalu melepas prospek tidak menghidupkan kembali prospek baru yang tadi diisi', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: '' };
    const utilitas = renderLayar();
    isiKunjunganTertarik(utilitas);
    fireEvent(utilitas.getByLabelText('Buat prospek baru'), 'valueChange', true);
    fireEvent.changeText(utilitas.getByLabelText('Nama calon pelanggan'), 'Rina Kartika');

    fireEvent.press(utilitas.getByText('Pilih prospek (follow-up)'));
    act(() => mockPilihProps?.onPilih(PROSPEK_DIPILIH));
    fireEvent.press(utilitas.getByText('Lepas'));

    expect(utilitas.getByLabelText('Buat prospek baru').props.value).toBe(false);
    expect(utilitas.queryByLabelText('Nama calon pelanggan')).toBeNull();
  });

  it('melepas prospek mengirim prospekId null, bukan string kosong', () => {
    mockParam.mockReturnValue({ prospekId: 'p-7', prospekNama: 'Budi Santoso' });
    const { getByText, queryByText } = renderLayar();

    fireEvent.press(getByText('Lepas'));
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Perlu follow-up'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(queryByText('Budi Santoso')).toBeNull();
    expect(getByText('Pilih prospek (follow-up)')).toBeTruthy();
    expect(panggilanMutate(0).variabel.prospekId).toBeNull();
  });

  it('izin lokasi ditolak: kunjungan tidak tersimpan dan sales diarahkan ke pengaturan', () => {
    mockLokasi = { status: 'izin_ditolak', titik: null, alamatTerdeteksi: '' };
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Kunjungan'));
    fireEvent.press(getByText('Tertarik'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(getByText('Lokasi GPS belum didapat')).toBeTruthy();
    expect(getByText('Buka Pengaturan')).toBeTruthy();
  });

  it('tanpa fitur presurvei: GPS tidak dicari (tanpa prompt izin) dan form tidak dirender', () => {
    mockUseFeatureGuard.mockReturnValue(false);
    mockParam.mockReturnValue({ prospekId: 'p-7', prospekNama: 'Budi Santoso' });
    const { queryByText } = renderLayar();

    expect(mockCari).not.toHaveBeenCalled();
    expect(queryByText('Simpan Kegiatan')).toBeNull();
    expect(queryByText('Budi Santoso')).toBeNull();
  });

  it('GPS baru dicari setelah guard fitur mengizinkan (auth selesai dimuat)', () => {
    mockUseFeatureGuard.mockReturnValue(false);
    const { renderUlang, getByText } = renderLayar();
    expect(mockCari).not.toHaveBeenCalled();

    mockUseFeatureGuard.mockReturnValue(true);
    renderUlang();

    expect(mockCari.mock.calls).toEqual([[]]);
    expect(getByText('Simpan Kegiatan')).toBeTruthy();
  });

  it('gagal lalu layar dibuka lagi dengan isian identik: niat baru, requestId dan waktuMulai baru', () => {
    jest.useFakeTimers({ now: new Date('2026-09-24T02:00:00.000Z') });
    const { getByText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.press(getByText('Simpan Kegiatan'));
    gagalkanMutate(0);

    jest.setSystemTime(new Date('2026-09-24T05:30:00.000Z'));
    fokusUlang();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.press(getByText('Simpan Kegiatan'));

    const pertama = panggilanMutate(0).variabel;
    const kedua = panggilanMutate(1).variabel;
    expect(pertama.waktuMulai).toBe('2026-09-24T02:00:00.000Z');
    expect(kedua.waktuMulai).toBe('2026-09-24T05:30:00.000Z');
    expect(typeof kedua.requestId).toBe('string');
    expect(kedua.requestId).not.toBe(pertama.requestId);
  });

  it('alamat hasil isi otomatis dan GPS yang diperbarui di antara dua simpan tetap satu niat', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: '' };
    const utilitas = renderLayar();
    isiKunjunganTertarik(utilitas);
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));
    gagalkanMutate(0);

    mockLokasi = { status: 'siap', titik: { latitude: -6.21, longitude: 106.81, akurasiMeter: 8 }, alamatTerdeteksi: 'Jl. Melati 9' };
    utilitas.renderUlang();
    expect(utilitas.getByLabelText('Alamat').props.value).toBe('Jl. Melati 9');
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));

    const pertama = panggilanMutate(0).variabel;
    const kedua = panggilanMutate(1).variabel;
    expect(kedua.requestId).toBe(pertama.requestId);
    expect(kedua).toEqual(expect.objectContaining({ latitude: -6.2, longitude: 106.8, alamatDikunjungi: null }));
  });

  it('alamat yang diketik sales di antara dua simpan adalah niat baru', () => {
    mockLokasi = { status: 'siap', titik: TITIK, alamatTerdeteksi: 'Jl. Melati 9' };
    const utilitas = renderLayar();
    isiKunjunganTertarik(utilitas);
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));
    gagalkanMutate(0);

    fireEvent.changeText(utilitas.getByLabelText('Alamat'), 'Jl. Melati 9 RT 02');
    fireEvent.press(utilitas.getByText('Simpan Kegiatan'));

    const pertama = panggilanMutate(0).variabel;
    const kedua = panggilanMutate(1).variabel;
    expect(pertama).toEqual(expect.objectContaining({ alamatDikunjungi: 'Jl. Melati 9' }));
    expect(kedua).toEqual(expect.objectContaining({ alamatDikunjungi: 'Jl. Melati 9 RT 02' }));
    expect(kedua.requestId).not.toBe(pertama.requestId);
  });

  it('simpan ulang ditolak KEY_REUSED: dianggap sudah tercatat, pesan jujur, layar ditutup', () => {
    const { getByText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.press(getByText('Simpan Kegiatan'));
    gagalkanMutate(0);
    fireEvent.press(getByText('Simpan Kegiatan'));
    expect(panggilanMutate(1).variabel.requestId).toBe(panggilanMutate(0).variabel.requestId);

    gagalkanMutate(1, bangunGalatKunciDipakaiUlang());

    expect(mockPresentInfo).toHaveBeenCalledWith('Kegiatan ini sudah tercatat sebelumnya.');
    expect(mockPresentAppError).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledWith();
  });

  it('KEY_REUSED pada upaya pertama (bukan pakai ulang) tetap galat, layar tetap terbuka, simpan berikutnya kunci baru', () => {
    const { getByText } = renderLayar();
    fireEvent.press(getByText('Telepon'));
    fireEvent.press(getByText('Tidak minat'));
    fireEvent.press(getByText('Simpan Kegiatan'));
    const galat = bangunGalatKunciDipakaiUlang();

    gagalkanMutate(0, galat);
    fireEvent.press(getByText('Simpan Kegiatan'));

    expect(mockPresentAppError).toHaveBeenCalledWith(galat, expect.objectContaining({ source: 'mutation' }));
    expect(mockPresentInfo).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(panggilanMutate(1).variabel.requestId).not.toBe(panggilanMutate(0).variabel.requestId);
  });
  describe('hasil simpan yang terlambat (review akhir M4)', () => {
    const simpanTelepon = ({ getByText }: KueriLayar) => {
      fireEvent.press(getByText('Telepon'));
      fireEvent.press(getByText('Tidak minat'));
      fireEvent.press(getByText('Simpan Kegiatan'));
    };

    it('sukses upaya lama setelah layar dibuka lagi tidak menutup form baru', () => {
      const utilitas = renderLayar();
      simpanTelepon(utilitas);

      fokusUlang();
      fireEvent.changeText(utilitas.getByLabelText('Catatan'), 'Isian kegiatan berikutnya');
      act(() => {
        mockOnTersimpan?.({ isAntre: false });
        panggilanMutate(0).opsi.onSuccess?.();
        panggilanMutate(0).opsi.onSettled?.();
      });

      expect(mockBack).not.toHaveBeenCalled();
      expect(utilitas.getByLabelText('Catatan').props.value).toBe('Isian kegiatan berikutnya');
    });

    it('KEY_REUSED upaya lama setelah layar dibuka lagi tidak menutup form baru', () => {
      const utilitas = renderLayar();
      simpanTelepon(utilitas);
      gagalkanMutate(0);
      fireEvent.press(utilitas.getByText('Simpan Kegiatan'));

      fokusUlang();
      gagalkanMutate(1, bangunGalatKunciDipakaiUlang());

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockPresentInfo).not.toHaveBeenCalled();
    });

    it('galat upaya lama setelah layar dibuka lagi tidak diingat untuk form baru', () => {
      const utilitas = renderLayar();
      simpanTelepon(utilitas);

      fokusUlang();
      gagalkanMutate(0);
      simpanTelepon(utilitas);

      const lama = panggilanMutate(0).variabel;
      const baru = panggilanMutate(1).variabel;
      expect(typeof baru.requestId).toBe('string');
      expect(baru.requestId).not.toBe(lama.requestId);
    });

    it('selama menyimpan tombol Kembali di kepala layar nonaktif', () => {
      mockIsPending = true;
      const { getByLabelText } = renderLayar();

      fireEvent.press(getByLabelText('Kembali'));

      expect(getByLabelText('Kembali').props.accessibilityState).toEqual({ disabled: true });
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
