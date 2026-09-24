import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

type KeadaanLokasiUji = {
  status: 'belum' | 'mencari' | 'siap' | 'gagal';
  titik: { latitude: number; longitude: number; akurasiMeter: number | null } | null;
  alamatTerdeteksi: string;
};
type OpsiMutasiUji = {
  onSuccess?: () => void;
  onError?: (galat: Error) => void;
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
const mockUseFeatureGuard = jest.fn();
let mockOnTersimpan: ((hasil: { isAntre: boolean }) => void) | null = null;
let mockLokasi: KeadaanLokasiUji = { status: 'gagal', titik: null, alamatTerdeteksi: '' };
let mockKameraProps: { onAmbil: (uri: string) => void; onTutup: () => void } | null = null;
let mockPilihProps: PropsPilihProspekUji | null = null;

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
    useFocusEffect: (efek: () => void) => React.useEffect(() => efek(), [efek]),
  };
});
jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: (...args: unknown[]) => mockUseFeatureGuard(...args),
}));
jest.mock('@/hooks/presurvei/useLokasiKegiatan', () => ({
  useLokasiKegiatan: () => ({ ...mockLokasi, cari: mockCari }),
}));
jest.mock('@/hooks/presurvei/useCatatKegiatan', () => ({
  useCatatKegiatan: (onTersimpan: (hasil: { isAntre: boolean }) => void) => {
    mockOnTersimpan = onTersimpan;
    return { mutate: mockMutate, isPending: false };
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
  return render(<Layar />);
};

/** Variabel dan opsi panggilan mutate ke-`indeks`. */
const panggilanMutate = (indeks: number) => {
  const panggilan = mockMutate.mock.calls[indeks];
  return { variabel: panggilan[0], opsi: panggilan[1] };
};

/** Tuntaskan panggilan mutate ke-`indeks` sebagai galat server (tidak diantre). */
const gagalkanMutate = (indeks: number) => {
  const { opsi } = panggilanMutate(indeks);
  act(() => {
    opsi.onError?.(new Error('Server galat 500'));
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
});
