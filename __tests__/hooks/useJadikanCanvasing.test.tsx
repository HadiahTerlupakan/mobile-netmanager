import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUpload = jest.fn<(uri: string, tipe: string) => Promise<string>>();
jest.mock('@/services/UploadService', () => ({ uploadService: { uploadFile: (u: string, t: string) => mockUpload(u, t) } }));
const mockUbahStatus = jest.fn<(id: string, status: string) => Promise<unknown>>();
const mockJadikan = jest.fn<(id: string, muatan: unknown) => Promise<unknown>>();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: {
    ubahStatusProspek: (id: string, s: string) => mockUbahStatus(id, s),
    jadikanCanvasing: (id: string, m: unknown) => mockJadikan(id, m),
  },
}));
const mockPesanGagal = jest.fn();
const mockPesanSukses = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentErrorMessage: (...a: unknown[]) => mockPesanGagal(...a),
  presentSuccessMessage: (...a: unknown[]) => mockPesanSukses(...a),
}));

import {
  jadikanDenganPembersihCacheKtp,
  jalankanKonversi,
  KonversiSetengahJalanError,
  PESAN_SETENGAH_JALAN,
  PESAN_SUDAH_DIKONVERSI,
  unggahDenganCacheKtp,
  useJadikanCanvasing,
  type DependensiKonversi,
} from '@/hooks/presurvei/useJadikanCanvasing';

const NILAI = { noKtp: '3201234567890001', paket: 'Home 20 Mbps', kabel: '35' };

const deps = () => ({
  unggah: jest.fn<DependensiKonversi['unggah']>(async () => 'https://cdn.test/ktp.webp'),
  ubahStatus: jest.fn<DependensiKonversi['ubahStatus']>(async () => ({})),
  jadikan: jest.fn<DependensiKonversi['jadikan']>(async () => ({ prospek: {} as never, canvasingId: 'cv-1' })),
});

// Menunggu satu giliran microtask ekstra supaya notifikasi batch TanStack
// (invalidateQueries, onSuccess/onError) selesai di dalam `act(...)` —
// pola sama dengan `useUbahStatusProspek.test.tsx` (Task 15).
const tungguNotifikasiBatch = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('jalankanKonversi', () => {
  it('mengunggah foto KTP sebagai marketing lalu mengirim badan persis', async () => {
    const d = deps();

    await jalankanKonversi({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///cache/ktp.jpg' }, d);

    expect(d.unggah).toHaveBeenCalledWith('file:///cache/ktp.jpg', 'marketing');
    expect(d.jadikan).toHaveBeenCalledWith('p-1', {
      noKtp: '3201234567890001',
      paket: 'Home 20 Mbps',
      kabel: 35,
      fotoKtp: 'https://cdn.test/ktp.webp',
    });
    expect(d.ubahStatus).not.toHaveBeenCalled();
  });

  it('prospek non-Deal dipindah ke Deal sebelum konversi', async () => {
    const d = deps();

    await jalankanKonversi({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///cache/ktp.jpg' }, d);

    expect(d.ubahStatus).toHaveBeenCalledWith('p-1', 'DEAL');
    expect(d.ubahStatus.mock.invocationCallOrder[0]).toBeLessThan(d.jadikan.mock.invocationCallOrder[0]);
  });

  it('gagal setelah pindah ke Deal menjadi galat setengah jalan', async () => {
    const d = deps();
    d.jadikan.mockRejectedValue(new Error('409'));

    await expect(
      jalankanKonversi({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' }, d),
    ).rejects.toBeInstanceOf(KonversiSetengahJalanError);
  });

  it('gagal pada prospek yang sudah Deal diteruskan apa adanya', async () => {
    const d = deps();
    const galat = new Error('409');
    d.jadikan.mockRejectedValue(galat);

    await expect(
      jalankanKonversi({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' }, d),
    ).rejects.toBe(galat);
  });

  it('unggah KTP gagal tidak menyentuh status prospek', async () => {
    const d = deps();
    d.unggah.mockRejectedValue(new Error('Network request failed'));

    await expect(
      jalankanKonversi({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' }, d),
    ).rejects.toThrow('Network request failed');
    expect(d.ubahStatus).not.toHaveBeenCalled();
  });
});

describe('unggahDenganCacheKtp', () => {
  it('URI lokal yang sama tidak diunggah ulang', async () => {
    const unggahAsli = jest.fn<DependensiKonversi['unggah']>(async () => 'https://cdn.test/ktp.webp');
    const cache: { current: { uri: string; url: string } | null } = { current: null };
    const unggah = unggahDenganCacheKtp(unggahAsli, cache);

    const pertama = await unggah('file:///ktp.jpg', 'marketing');
    const kedua = await unggah('file:///ktp.jpg', 'marketing');

    expect(pertama).toBe('https://cdn.test/ktp.webp');
    expect(kedua).toBe('https://cdn.test/ktp.webp');
    expect(unggahAsli).toHaveBeenCalledTimes(1);
  });

  it('URI lokal yang berbeda diunggah ulang', async () => {
    const unggahAsli = jest.fn<DependensiKonversi['unggah']>(
      async (uri) => `https://cdn.test/${uri.split('/').pop()}`,
    );
    const cache: { current: { uri: string; url: string } | null } = { current: null };
    const unggah = unggahDenganCacheKtp(unggahAsli, cache);

    await unggah('file:///ktp-1.jpg', 'marketing');
    await unggah('file:///ktp-2.jpg', 'marketing');

    expect(unggahAsli).toHaveBeenCalledTimes(2);
  });
});

describe('jadikanDenganPembersihCacheKtp', () => {
  const bangunCache = () => ({ current: { uri: 'file:///ktp.jpg', url: 'https://cdn.test/ktp.webp' } });

  it('400 (URL ditolak validasi) membersihkan cache', async () => {
    const jadikanAsli = jest.fn<DependensiKonversi['jadikan']>(async () => {
      throw { isAxiosError: true, response: { status: 400, data: { code: 'VALIDATION' } } };
    });
    const cache = bangunCache();
    const jadikan = jadikanDenganPembersihCacheKtp(jadikanAsli, cache);

    await expect(jadikan('p-1', {} as never)).rejects.toBeTruthy();

    expect(cache.current).toBeNull();
  });

  it('409 INVALID_STATE (sudah dikonversi) TIDAK membersihkan cache', async () => {
    const jadikanAsli = jest.fn<DependensiKonversi['jadikan']>(async () => {
      throw { isAxiosError: true, response: { status: 409, data: { code: 'INVALID_STATE' } } };
    });
    const cache = bangunCache();
    const jadikan = jadikanDenganPembersihCacheKtp(jadikanAsli, cache);

    await expect(jadikan('p-1', {} as never)).rejects.toBeTruthy();

    expect(cache.current).toEqual({ uri: 'file:///ktp.jpg', url: 'https://cdn.test/ktp.webp' });
  });

  it('500 TIDAK membersihkan cache (URL masih sah, server saja bermasalah)', async () => {
    const jadikanAsli = jest.fn<DependensiKonversi['jadikan']>(async () => {
      throw { isAxiosError: true, response: { status: 500 } };
    });
    const cache = bangunCache();
    const jadikan = jadikanDenganPembersihCacheKtp(jadikanAsli, cache);

    await expect(jadikan('p-1', {} as never)).rejects.toBeTruthy();

    expect(cache.current).toEqual({ uri: 'file:///ktp.jpg', url: 'https://cdn.test/ktp.webp' });
  });

  it('galat jaringan (tanpa response) TIDAK membersihkan cache', async () => {
    const jadikanAsli = jest.fn<DependensiKonversi['jadikan']>(async () => {
      throw new Error('Network request failed');
    });
    const cache = bangunCache();
    const jadikan = jadikanDenganPembersihCacheKtp(jadikanAsli, cache);

    await expect(jadikan('p-1', {} as never)).rejects.toThrow('Network request failed');

    expect(cache.current).toEqual({ uri: 'file:///ktp.jpg', url: 'https://cdn.test/ktp.webp' });
  });

  it('sukses tidak menyentuh cache', async () => {
    const jadikanAsli = jest.fn<DependensiKonversi['jadikan']>(async () => ({
      prospek: {} as never,
      canvasingId: 'cv-1',
    }));
    const cache = bangunCache();
    const jadikan = jadikanDenganPembersihCacheKtp(jadikanAsli, cache);

    await jadikan('p-1', {} as never);

    expect(cache.current).toEqual({ uri: 'file:///ktp.jpg', url: 'https://cdn.test/ktp.webp' });
  });
});

describe('useJadikanCanvasing', () => {
  it('berhasil menyegarkan presurvei dan daftar canvasing lalu memanggil onBerhasil', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockUbahStatus.mockResolvedValue({});
    mockJadikan.mockResolvedValue({ prospek: {} as never, canvasingId: 'cv-1' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const onBerhasil = jest.fn();
    const { result } = renderHook(() => useJadikanCanvasing(onBerhasil), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' });
      await tungguNotifikasiBatch();
    });

    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['canvasing'] });
    expect(mockPesanSukses).toHaveBeenCalledWith('Prospek dijadikan canvasing');
    expect(onBerhasil).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('galat setengah jalan menyegarkan data presurvei dan menjelaskan langkah berikutnya', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockUbahStatus.mockResolvedValue({});
    mockJadikan.mockRejectedValue(new Error('500'));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const onBerhasil = jest.fn();
    const { result } = renderHook(() => useJadikanCanvasing(onBerhasil), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ prospekId: 'p-1', statusAsal: 'NEGOSIASI', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' })
        .catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(mockPesanGagal).toHaveBeenCalledWith(PESAN_SETENGAH_JALAN, 'Belum Selesai');
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(onBerhasil).not.toHaveBeenCalled();
    client.clear();
  });

  it('tidak mengulang otomatis saat gagal (retry mati)', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockUbahStatus.mockResolvedValue({});
    mockJadikan.mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
    // Client MENIRU default produksi (`mutations.retry: 1`, `src/lib/queryClient.ts`)
    // supaya test membuktikan `retry: false` DI HOOK yang menang, bukan
    // sekadar default TanStack sendiri — default TanStack untuk mutasi bila
    // client tidak menyetel apa pun adalah `retry: 0` (`mutation.cjs`:
    // `retry: this.options.retry ?? 0`), jadi client "polos" tidak mewakili
    // produksi dan tidak bisa membuktikan override hook ini.
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: 1, retryDelay: 0, gcTime: 0 } },
    });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useJadikanCanvasing(jest.fn()), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' })
        .catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(mockJadikan).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('POST gagal lalu dicoba lagi dengan foto yang sama tidak mengunggah ulang', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockJadikan
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })
      .mockResolvedValueOnce({ prospek: {} as never, canvasingId: 'cv-1' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useJadikanCanvasing(jest.fn()), { wrapper });
    const masukan = { prospekId: 'p-1', statusAsal: 'DEAL' as const, nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' };

    await act(async () => {
      await result.current.mutateAsync(masukan).catch(() => undefined);
      await tungguNotifikasiBatch();
    });
    await act(async () => {
      await result.current.mutateAsync(masukan);
      await tungguNotifikasiBatch();
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockJadikan).toHaveBeenNthCalledWith(1, 'p-1', expect.objectContaining({ fotoKtp: 'https://cdn.test/ktp.webp' }));
    expect(mockJadikan).toHaveBeenNthCalledWith(2, 'p-1', expect.objectContaining({ fotoKtp: 'https://cdn.test/ktp.webp' }));
    client.clear();
  });

  it('foto diganti sebelum dicoba lagi tetap diunggah ulang', async () => {
    mockUpload
      .mockResolvedValueOnce('https://cdn.test/lama.webp')
      .mockResolvedValueOnce('https://cdn.test/baru.webp');
    mockJadikan
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })
      .mockResolvedValueOnce({ prospek: {} as never, canvasingId: 'cv-1' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useJadikanCanvasing(jest.fn()), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///lama.jpg' })
        .catch(() => undefined);
      await tungguNotifikasiBatch();
    });
    await act(async () => {
      await result.current.mutateAsync({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///baru.jpg' });
      await tungguNotifikasiBatch();
    });

    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockJadikan).toHaveBeenNthCalledWith(2, 'p-1', expect.objectContaining({ fotoKtp: 'https://cdn.test/baru.webp' }));
    client.clear();
  });

  it('409 INVALID_STATE saat statusAsal sudah Deal berarti sudah dikonversi: muat ulang rincian dan kembali', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockJadikan.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'INVALID_STATE' } } });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const kembaliKeRincian = jest.fn();
    const { result } = renderHook(() => useJadikanCanvasing(kembaliKeRincian), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' })
        .catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(invalidasi).toHaveBeenCalledWith({
      queryKey: ['presurvei', 'prospek', 'detail', 'p-1'],
      exact: true,
    });
    expect(mockPesanGagal).toHaveBeenCalledWith(PESAN_SUDAH_DIKONVERSI, 'Sudah Dikonversi');
    expect(kembaliKeRincian).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('409 lain (bukan INVALID_STATE) pada statusAsal Deal tetap galat umum, bukan "sudah dikonversi"', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockJadikan.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'LAIN' } } });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const kembaliKeRincian = jest.fn();
    const { result } = renderHook(() => useJadikanCanvasing(kembaliKeRincian), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ prospekId: 'p-1', statusAsal: 'DEAL', nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' })
        .catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(mockPesanGagal).not.toHaveBeenCalled();
    expect(invalidasi).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['presurvei', 'prospek', 'detail', 'p-1'] }),
    );
    expect(kembaliKeRincian).not.toHaveBeenCalled();
    client.clear();
  });

  // Fix round 2: cache unggah KTP (fix round 1) tidak pernah dibersihkan
  // saat `jadikan` menolak URL hasil unggah (mis. 400 validasi), jadi
  // simpan ulang dengan foto yang sama terus memakai URL buruk yang sama
  // dan gagal tanpa jalan keluar. Ruling pengontrol: bersihkan cache untuk
  // 4xx apa pun KECUALI 409 INVALID_STATE (jalur "sudah dikonversi" sendiri);
  // galat jaringan/5xx tetap mempertahankan cache karena URL-nya masih sah.
  it('POST ditolak 400, lalu simpan ulang dengan foto sama: unggah dipanggil lagi', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockJadikan
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'VALIDATION' } } })
      .mockResolvedValueOnce({ prospek: {} as never, canvasingId: 'cv-1' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useJadikanCanvasing(jest.fn()), { wrapper });
    const masukan = { prospekId: 'p-1', statusAsal: 'DEAL' as const, nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' };

    await act(async () => {
      await result.current.mutateAsync(masukan).catch(() => undefined);
      await tungguNotifikasiBatch();
    });
    await act(async () => {
      await result.current.mutateAsync(masukan);
      await tungguNotifikasiBatch();
    });

    expect(mockUpload).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('POST gagal karena jaringan, lalu simpan ulang: unggah tidak dipanggil lagi', async () => {
    mockUpload.mockResolvedValue('https://cdn.test/ktp.webp');
    mockJadikan
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({ prospek: {} as never, canvasingId: 'cv-1' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useJadikanCanvasing(jest.fn()), { wrapper });
    const masukan = { prospekId: 'p-1', statusAsal: 'DEAL' as const, nilai: NILAI, fotoKtpLokal: 'file:///k.jpg' };

    await act(async () => {
      await result.current.mutateAsync(masukan).catch(() => undefined);
      await tungguNotifikasiBatch();
    });
    await act(async () => {
      await result.current.mutateAsync(masukan);
      await tungguNotifikasiBatch();
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
