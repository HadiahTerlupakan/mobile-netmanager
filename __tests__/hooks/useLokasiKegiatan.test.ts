import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

type Hasil = { latitude: string; longitude: string; locationName: string; accuracy: number | null };
const mockAmbil = jest.fn<(cache: unknown, batas: number, akurasi: number) => Promise<Hasil>>();
const mockIzinSaatIni = jest.fn<() => Promise<{ status: string }>>();

jest.mock('@/hooks/useLocationWithTimeout', () => ({
  useLocationWithTimeout: () => ({ getLocationWithTimeout: mockAmbil }),
}));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  getForegroundPermissionsAsync: () => mockIzinSaatIni(),
}));

import { useLokasiKegiatan } from '@/hooks/presurvei/useLokasiKegiatan';

const SIAP: Hasil = { latitude: '-6.2', longitude: '106.8', locationName: 'Jl. Melati', accuracy: 12 };

describe('useLokasiKegiatan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: izin granted, supaya kegagalan "GPS biasa" di test yang sudah
    // ada tidak diam-diam berubah jadi 'izin_ditolak'.
    mockIzinSaatIni.mockResolvedValue({ status: 'granted' });
  });

  it('meminta GPS akurasi tinggi dengan batas 20 detik lalu siap', async () => {
    mockAmbil.mockResolvedValue(SIAP);
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());

    expect(result.current.status).toBe('mencari');
    await waitFor(() => expect(result.current.status).toBe('siap'));
    expect(mockAmbil).toHaveBeenCalledWith(null, 20_000, 4);
    expect(result.current.titik).toEqual({ latitude: -6.2, longitude: 106.8, akurasiMeter: 12 });
    expect(result.current.alamatTerdeteksi).toBe('Jl. Melati');
  });

  it('gagal bila GPS tidak memberi koordinat', async () => {
    mockAmbil.mockResolvedValue({ ...SIAP, latitude: '', longitude: '' });
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());

    await waitFor(() => expect(result.current.status).toBe('gagal'));
    expect(result.current.titik).toBeNull();
  });

  it('mencari ulang membuang titik lama sampai titik baru didapat', async () => {
    mockAmbil.mockResolvedValueOnce(SIAP).mockReturnValueOnce(new Promise<Hasil>(() => undefined));
    const { result } = renderHook(() => useLokasiKegiatan());
    act(() => result.current.cari());
    await waitFor(() => expect(result.current.status).toBe('siap'));

    act(() => result.current.cari());

    expect(result.current.status).toBe('mencari');
    expect(result.current.titik).toBeNull();
  });

  it('hasil pencarian lama yang datang terlambat diabaikan', async () => {
    let selesaikanLama: (hasil: Hasil) => void = () => undefined;
    mockAmbil
      .mockReturnValueOnce(new Promise<Hasil>((resolve) => { selesaikanLama = resolve; }))
      .mockResolvedValueOnce({ ...SIAP, latitude: '-7.1' });
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());
    act(() => result.current.cari());
    await waitFor(() => expect(result.current.titik?.latitude).toBe(-7.1));
    await act(async () => selesaikanLama(SIAP));

    expect(result.current.titik?.latitude).toBe(-7.1);
  });

  it('fungsi cari stabil antar render', () => {
    const { result, rerender } = renderHook(() => useLokasiKegiatan());
    const cariAwal = result.current.cari;

    rerender({});

    expect(result.current.cari).toBe(cariAwal);
  });

  // Amandemen preflight (task-10, S16): izin lokasi ditolak wajib tampil
  // sebagai status/teks khusus, bukan "GPS gagal" generik, supaya sales
  // tahu harus membuka pengaturan izin, bukan mengaktifkan GPS.
  it('izin lokasi ditolak menampilkan status khusus, bukan galat GPS generik', async () => {
    mockAmbil.mockResolvedValue({ ...SIAP, latitude: '', longitude: '' });
    mockIzinSaatIni.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());

    await waitFor(() => expect(result.current.status).toBe('izin_ditolak'));
    expect(result.current.titik).toBeNull();
  });

  // Amandemen preflight (task-10, tak tertangkap): hasil yang baru datang
  // setelah layar dilepas wajib diabaikan sepenuhnya. React 19 tidak lagi
  // memperingatkan setState pada komponen ter-unmount, jadi buktinya BUKAN
  // "tidak ada console.error" (itu selalu hijau) melainkan: pekerjaan lanjutan
  // (cek status izin) tidak pernah dijalankan untuk hasil basi tersebut.
  it('hasil gagal yang datang setelah unmount tidak memicu pekerjaan lanjutan (cek izin)', async () => {
    let selesaikan: (hasil: Hasil) => void = () => undefined;
    mockAmbil.mockReturnValueOnce(new Promise<Hasil>((resolve) => { selesaikan = resolve; }));
    const { result, unmount } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());
    unmount();
    await act(async () => selesaikan({ ...SIAP, latitude: '', longitude: '' }));

    // Andai hasil basi ini diproses, statusnya 'gagal' akan memicu cek izin.
    expect(mockIzinSaatIni).not.toHaveBeenCalled();
  });

  it('pemeriksaan izin yang telat tidak menimpa status pencarian baru yang sudah berjalan', async () => {
    let selesaikanIzin: (izin: { status: string }) => void = () => undefined;
    mockAmbil
      .mockResolvedValueOnce({ ...SIAP, latitude: '', longitude: '' })
      .mockReturnValueOnce(new Promise<Hasil>(() => undefined));
    mockIzinSaatIni.mockReturnValueOnce(
      new Promise((resolve) => { selesaikanIzin = resolve; }),
    );
    const { result } = renderHook(() => useLokasiKegiatan());

    act(() => result.current.cari());
    await waitFor(() => expect(mockIzinSaatIni).toHaveBeenCalledTimes(1));

    act(() => result.current.cari());
    expect(result.current.status).toBe('mencari');

    await act(async () => selesaikanIzin({ status: 'denied' }));

    expect(result.current.status).toBe('mencari');
  });
});
