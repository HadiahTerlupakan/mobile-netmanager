import React, { PropsWithChildren } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceEventEmitter } from 'react-native';

jest.mock('@/services/PresurveiService', () => ({ PresurveiService: {} }));
jest.mock('@/services/DatabaseService', () => ({ DatabaseService: { getPendingQueue: jest.fn() } }));

import { isEndpointPresurvei, useSegarkanPresurveiSetelahSinkron } from '@/hooks/queries/usePresurveiKegiatan';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useSegarkanPresurveiSetelahSinkron', () => {
  it('menyegarkan data presurvei hanya setelah antrean presurvei terkirim', () => {
    const client = new QueryClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    const { unmount } = renderHook(() => useSegarkanPresurveiSetelahSinkron(), { wrapper: bungkus(client) });

    DeviceEventEmitter.emit('sync:succeeded', { endpoint: '/api/mobile/attendance/check-in' });
    expect(invalidasi).not.toHaveBeenCalled();

    DeviceEventEmitter.emit('sync:succeeded', { endpoint: '/api/presurvei/kegiatan', method: 'POST' });
    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['presurvei'] });

    unmount();
    invalidasi.mockClear();
    DeviceEventEmitter.emit('sync:succeeded', { endpoint: '/api/presurvei/kegiatan' });
    expect(invalidasi).not.toHaveBeenCalled();
    client.clear();
  });

  it('isEndpointPresurvei menolak nilai bukan string', () => {
    expect(isEndpointPresurvei(undefined)).toBe(false);
    expect(isEndpointPresurvei('/api/presurvei/prospek/p-1')).toBe(true);
    expect(isEndpointPresurvei('/api/marketing/canvasing')).toBe(false);
  });
});
