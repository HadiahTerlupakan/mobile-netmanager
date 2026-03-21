import React, { PropsWithChildren } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: jest.fn(),
  presentError: jest.fn(),
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

const mockRequest = jest.fn();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    request: mockRequest,
  },
}));

const mockIsOnline = jest.fn();
jest.mock('@/services/SyncService', () => ({
  SyncService: {
    isOnline: mockIsOnline,
  },
}));

const mockAddToQueue = jest.fn();
const mockGetPendingQueue = jest.fn();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    addToQueue: mockAddToQueue,
    getPendingQueue: mockGetPendingQueue,
  },
}));

jest.mock('@/services/AttendanceTelemetryService', () => ({
  AttendanceTelemetryService: {
    track: jest.fn(),
  },
}));

jest.mock('@/services/UploadService', () => ({
  uploadService: {
    uploadFile: jest.fn(),
  },
  UploadType: {},
}));

jest.mock('@/utils/attendanceIdempotency', () => ({
  buildAttendanceIdempotencyHeaders: jest.fn(() => ({})),
  ensureAttendanceRequestId: jest.fn((payload) => payload),
  isAttendanceEndpoint: jest.fn(() => false),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 'balanced',
  },
}));

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: {
    alert: mockAlert,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useApiMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline.mockResolvedValue(false);
    mockAddToQueue.mockResolvedValue(undefined);
    mockGetPendingQueue.mockResolvedValue([]);
    const { Alert } = require('react-native');
    Alert.alert = mockAlert;
  });

  const createWrapper = (queryClient: QueryClient) => {
    return function Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  };

  it('returns an explicit queued result and skips cache invalidation when request is queued offline', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { useApiMutation, isOfflineMutationQueuedResult } = require('@/hooks/queries/useApiMutation');

    const { result, unmount } = renderHook(
      () =>
        useApiMutation({
          endpoint: '/api/mobile/work-order',
          method: 'POST',
          invalidateKeys: [['workOrders']],
          successMessage: 'Saved',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    let mutationResult: unknown;
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ title: 'WO-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isOfflineMutationQueuedResult(mutationResult)).toBe(true);
    expect(mutationResult).toEqual(
      expect.objectContaining({
        __offline_queued__: true,
        kind: 'offline-queued',
        endpoint: '/api/mobile/work-order',
        method: 'POST',
      })
    );
    expect(mockAddToQueue).toHaveBeenCalledWith(
      '/api/mobile/work-order',
      'POST',
      expect.objectContaining({ title: 'WO-1' }),
      expect.any(Object)
    );
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    expect(presentInfoMessage).toHaveBeenCalledWith(
      expect.stringContaining('disimpan'),
      'Offline',
    );

    unmount();
    queryClient.clear();
  });
});
