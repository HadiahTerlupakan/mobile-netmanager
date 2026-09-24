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
  jalankanKonversi,
  KonversiSetengahJalanError,
  PESAN_SETENGAH_JALAN,
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
});
