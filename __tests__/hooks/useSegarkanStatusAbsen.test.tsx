import React, { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockSaatLayarFokus: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    mockSaatLayarFokus = callback;
  },
}));

import {
  aturUlangJedaSegarStatusAbsen,
  useSegarkanStatusAbsen,
} from '@/hooks/useSegarkanStatusAbsen';

const bungkus = (client: QueryClient) =>
  function Pembungkus({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useSegarkanStatusAbsen', () => {
  beforeEach(() => aturUlangJedaSegarStatusAbsen());

  it('memuat ulang status absensi setiap layar Absensi dibuka', () => {
    const client = new QueryClient();
    const invalidasi = jest.spyOn(client, 'invalidateQueries');
    renderHook(() => useSegarkanStatusAbsen(), { wrapper: bungkus(client) });

    mockSaatLayarFokus?.();

    expect(invalidasi).toHaveBeenCalledWith({ queryKey: ['attendance'] });
    client.clear();
  });
});
