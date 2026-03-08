import React, { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetOfflineData = jest.fn();
const mockSaveOfflineData = jest.fn();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    getOfflineData: mockGetOfflineData,
    saveOfflineData: mockSaveOfflineData,
  },
}));

const mockFetchNetInfo = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: mockFetchNetInfo,
  },
}));

const mockGet = jest.fn();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: mockGet,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useOfflineQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });

    return {
      queryClient,
      Wrapper({ children }: PropsWithChildren) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      },
    };
  };

  it('returns cached data when serving offline fallback data', async () => {
    const cachedPayload = [{ id: 1, title: 'cached' }];
    const { useOfflineQuery } = require('@/hooks/useOfflineQuery');

    mockFetchNetInfo.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    mockGetOfflineData.mockResolvedValue(cachedPayload);

    const { Wrapper, queryClient } = createWrapper();
    const { result, unmount } = renderHook(
      () =>
        useOfflineQuery({
          queryKey: ['tickets'],
          endpoint: '/api/mobile/tickets',
        }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(cachedPayload);
    expect(mockGet).not.toHaveBeenCalled();

    unmount();
    queryClient.clear();
  });
});
