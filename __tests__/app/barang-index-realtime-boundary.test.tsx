import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockSubscribeToUserStream = jest.fn();
const mockSetQueryData = jest.fn();

jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    subscribeToUserStream: mockSubscribeToUserStream,
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: 'token-123',
    user: { id: 'user-1', role: 'USER' },
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: mockSetQueryData,
  }),
}));

jest.mock('@/hooks/queries', () => ({
  useApiQuery: jest.fn(() => ({
    data: { barangMasukToday: 2, barangKeluarToday: 1 },
    isPending: false,
    refetch: jest.fn(),
  })),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    BARANG: 'barang',
  },
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    dashboard: {
      stats: () => ['dashboard', 'stats'],
    },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    socket: jest.fn(),
  },
}));

jest.mock('@/components/molecules/BarangIndexSkeleton', () => ({
  BarangIndexSkeleton: () => null,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('twrnc', () => () => ({}));

describe('barang index realtime boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToUserStream.mockReturnValue(jest.fn());
  });

  it('subscribes through the user realtime stream instead of SocketContext helpers', () => {
    const BarangIndexScreen = require('../../app/(app)/barang/index').default;

    render(<BarangIndexScreen />);

    expect(mockSubscribeToUserStream).toHaveBeenCalledWith('user-1', expect.any(Function));
  });
});
