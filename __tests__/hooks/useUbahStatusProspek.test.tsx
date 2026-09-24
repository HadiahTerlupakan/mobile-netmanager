import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Instrumentasi `useMutation` asli (bukan mock) untuk membuktikan hook ini
// SUNGGUH meneruskan `meta` ke opsinya — `jest.spyOn` tidak bisa dipakai
// karena export ESM paket ini tidak bisa didefinisikan ulang.
const mockPanggilanUseMutation: unknown[] = [];
jest.mock('@tanstack/react-query', () => {
  const asli = jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...asli,
    useMutation: (opsi: unknown) => {
      mockPanggilanUseMutation.push(opsi);
      return asli.useMutation(opsi as Parameters<typeof asli.useMutation>[0]);
    },
  };
});

const mockUbahStatus = jest.fn<(id: string, status: string) => Promise<unknown>>();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: { ubahStatusProspek: (id: string, status: string) => mockUbahStatus(id, status) },
}));
const mockSukses = jest.fn();
const mockGalat = jest.fn();
const mockPesanGalat = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentSuccessMessage: (...a: unknown[]) => mockSukses(...a),
  presentAppError: (...a: unknown[]) => mockGalat(...a),
  presentErrorMessage: (...a: unknown[]) => mockPesanGalat(...a),
}));

import { queryKeys } from '@/lib/queryClient';
import { useUbahStatusProspek } from '@/hooks/presurvei/useUbahStatusProspek';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

/**
 * TanStack menjadwalkan notifikasi batch lewat `setTimeout(fn, 0)`
 * (`notifyManager.ts`), BUKAN dalam rantai promise yang ditunggu
 * `mutateAsync`. Tanpa ini, `act(async () => { await mutateAsync(...) })`
 * keluar sebelum notifikasi itu sempat berjalan, membuat React memperbarui
 * state di luar `act(...)` (peringatan `act` + "Jest did not exit").
 */
const tungguNotifikasiBatch = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useUbahStatusProspek', () => {
  it('mengirim status untuk prospek itu lalu menyegarkan data presurvei', async () => {
    mockUbahStatus.mockResolvedValue({ id: 'p-1', status: 'NEGOSIASI' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('NEGOSIASI');
      await tungguNotifikasiBatch();
    });

    expect(mockUbahStatus).toHaveBeenCalledWith('p-1', 'NEGOSIASI');
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(mockSukses).toHaveBeenCalledWith('Status prospek diperbarui');
    client.clear();
  });

  // RULING fix round Task 15 (#1): 409 `INVALID_STATE` berarti status
  // sudah berubah di server (netmanager `ProspekService.ts:170`,
  // `AppError(..., 409, 'INVALID_STATE')`). Rincian (`prospekDetail`) HARUS
  // dimuat ulang secara tersasar — bukan seluruh `presurvei.all` — supaya
  // layar tidak terus menampilkan status basi (staleTime 5 menit) dan sales
  // tidak terus mencoba transisi yang sudah tidak sah.
  it('409 INVALID_STATE memuat ulang rincian prospek dan memberi tahu sales', async () => {
    const galat = { isAxiosError: true, response: { status: 409, data: { code: 'INVALID_STATE' } } };
    mockUbahStatus.mockRejectedValue(galat);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('DEAL').catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(invalidasi).toHaveBeenCalledWith({
      queryKey: queryKeys.presurvei.prospekDetail('p-1'),
      exact: true,
    });
    expect(mockPesanGalat).toHaveBeenCalledWith(expect.stringMatching(/berubah/i), expect.any(String));
    expect(mockGalat).not.toHaveBeenCalled();
    client.clear();
  });

  it('galat lain (bukan INVALID_STATE) menampilkan galat generik dan tidak memuat ulang apa pun', async () => {
    const galat = { isAxiosError: true, response: { status: 409 } };
    mockUbahStatus.mockRejectedValue(galat);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('DEAL').catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(mockGalat).toHaveBeenCalledWith(galat, expect.objectContaining({ screen: 'RincianProspek' }));
    expect(mockPesanGalat).not.toHaveBeenCalled();
    expect(invalidasi).not.toHaveBeenCalled();
    client.clear();
  });

  // RULING fix round Task 15 (#2): membuktikan hook SUNGGUH meneruskan
  // `meta.skipGlobalErrorToast` ke `useMutation` (bukan cuma mekanisme
  // `queryClient.ts` yang bekerja secara umum, dibuktikan terpisah di
  // `__tests__/lib/queryClient.test.ts`) — tanpa ini, MutationCache.onError
  // global tetap menggandakan toast di atas pesan spesifik hook ini.
  it('meneruskan meta.skipGlobalErrorToast ke useMutation', () => {
    mockPanggilanUseMutation.length = 0;
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    expect(mockPanggilanUseMutation).toContainEqual(
      expect.objectContaining({ meta: { skipGlobalErrorToast: true } }),
    );
    client.clear();
  });

  it('tidak mengulang otomatis saat gagal (retry mati)', async () => {
    mockUbahStatus.mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
    // Client MENIRU default produksi `mutations.retry: 1` (queryClient.ts) — tanpa
    // `retry: false` eksplisit di hook, PATCH dikirim ulang dan bisa menampilkan 409
    // "setengah jalan" untuk transisi yang sudah tidak sah (preflight P47). Client
    // tanpa `retry` memakai default TanStack `retry: 0` sehingga test tidak bergigi
    // (review akhir M3).
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 1, retryDelay: 0, gcTime: 0 } } });
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('DEAL').catch(() => undefined);
      await tungguNotifikasiBatch();
    });

    expect(mockUbahStatus).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
