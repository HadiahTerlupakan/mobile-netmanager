import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUbahStatus = jest.fn<(id: string, status: string) => Promise<unknown>>();
jest.mock('@/services/PresurveiService', () => ({
  PresurveiService: { ubahStatusProspek: (id: string, status: string) => mockUbahStatus(id, status) },
}));
const mockSukses = jest.fn();
const mockGalat = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  presentSuccessMessage: (...a: unknown[]) => mockSukses(...a),
  presentAppError: (...a: unknown[]) => mockGalat(...a),
}));

import { useUbahStatusProspek } from '@/hooks/presurvei/useUbahStatusProspek';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useUbahStatusProspek', () => {
  it('mengirim status untuk prospek itu lalu menyegarkan data presurvei', async () => {
    mockUbahStatus.mockResolvedValue({ id: 'p-1', status: 'NEGOSIASI' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('NEGOSIASI');
    });

    expect(mockUbahStatus).toHaveBeenCalledWith('p-1', 'NEGOSIASI');
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });
    expect(mockSukses).toHaveBeenCalledWith('Status prospek diperbarui');
    client.clear();
  });

  it('menampilkan galat server dan tidak menyegarkan apa pun', async () => {
    const galat = { isAxiosError: true, response: { status: 409 } };
    mockUbahStatus.mockRejectedValue(galat);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('DEAL').catch(() => undefined);
    });

    expect(mockGalat).toHaveBeenCalledWith(galat, expect.objectContaining({ screen: 'RincianProspek' }));
    expect(invalidasi).not.toHaveBeenCalled();
    client.clear();
  });

  it('tidak mengulang otomatis saat gagal (retry mati)', async () => {
    mockUbahStatus.mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
    // Client TANPA override retry: false — membuktikan hook sendiri yang mematikan retry,
    // bukan konfigurasi test. Produksi memakai `mutations.retry: 1` (queryClient.ts), yang
    // tanpa `retry: false` eksplisit akan mengirim ulang PATCH dan bisa menampilkan 409
    // "setengah jalan" untuk transisi yang sudah tidak sah (preflight P47).
    const client = new QueryClient();
    const { result } = renderHook(() => useUbahStatusProspek('p-1'), { wrapper: bungkus(client) });

    await act(async () => {
      await result.current.mutateAsync('DEAL').catch(() => undefined);
    });

    expect(mockUbahStatus).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
