import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRefetchProfil = jest.fn<() => Promise<unknown>>();
jest.mock('@/hooks/useProfileSync', () => ({
  useProfileSync: () => ({ refetch: mockRefetchProfil }),
}));

import { useSegarkanBeranda } from '@/hooks/useSegarkanBeranda';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useSegarkanBeranda', () => {
  it('membatalkan cache tiap kunci Beranda dan memuat ulang profil', async () => {
    mockRefetchProfil.mockResolvedValueOnce({});
    const client = new QueryClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useSegarkanBeranda([['dashboard'], ['attendance']]), {
      wrapper: bungkus(client),
    });

    await act(() => result.current.segarkan());

    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['attendance'] });
    expect(mockRefetchProfil).toHaveBeenCalledTimes(1);
    expect(result.current.isMenyegarkan).toBe(false);
    client.clear();
  });

  it('indikator segarkan berhenti walau muat ulang profil gagal', async () => {
    mockRefetchProfil.mockRejectedValueOnce(new Error('jaringan putus'));
    const client = new QueryClient();
    const { result } = renderHook(() => useSegarkanBeranda([['dashboard']]), { wrapper: bungkus(client) });

    await act(async () => {
      await expect(result.current.segarkan()).rejects.toThrow('jaringan putus');
    });

    expect(result.current.isMenyegarkan).toBe(false);
    client.clear();
  });
});
