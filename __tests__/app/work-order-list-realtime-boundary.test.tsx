import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const authState = {
  token: null as string | null,
  user: { id: 'user-1', name: 'Admin' },
};

const mockSubscribeToUserStream = jest.fn();

jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    subscribeToUserStream: mockSubscribeToUserStream,
  },
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    WORK_ORDER: 'work_order',
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: authState.token,
    user: authState.user,
  }),
}));

jest.mock('@/hooks/queries', () => ({
  useAvailableWorkOrders: jest.fn(() => ({
    data: { data: [] },
    isPending: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
  useWorkOrders: jest.fn(() => ({
    data: { data: [] },
    isPending: false,
    refetch: jest.fn(),
    isRefetching: false,
  })),
  useClaimWorkOrder: jest.fn(() => ({
    mutate: jest.fn(),
  })),
  isOfflineMutationQueuedResult: jest.fn(() => false),
}));

jest.mock('@/services/SyncService', () => ({
  SyncService: {
    isOnline: jest.fn(),
  },
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentInfoMessage: jest.fn(),
  presentSuccessMessage: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    socket: jest.fn(),
  },
}));

jest.mock('@/components/atoms/ScreenErrorBoundary', () => ({
  ScreenErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/molecules/WorkOrderSkeleton', () => ({ WorkOrderSkeleton: () => null }));
jest.mock('@/components/organisms/dashboard/AvailableWorkOrderListItem', () => 'AvailableWorkOrderListItem');
jest.mock('@/components/organisms/dashboard/WorkOrderListItem', () => ({ WorkOrderListItem: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: 'FlashList' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('lucide-react-native', () => ({
  CheckCircle: 'CheckCircle',
  FileText: 'FileText',
  Inbox: 'Inbox',
}));
jest.mock('twrnc', () => () => ({}));

describe('mobile work order list realtime boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState.token = null;
    mockSubscribeToUserStream.mockReturnValue(jest.fn());
  });

  it('does not subscribe to the user realtime stream before auth token is available', () => {
    const WorkOrderScreen = require('../../app/(app)/work-order').default;

    render(<WorkOrderScreen />);

    expect(mockSubscribeToUserStream).not.toHaveBeenCalled();
  });

  it('subscribes through the user realtime stream when auth is ready', () => {
    authState.token = 'token-123';
    const WorkOrderScreen = require('../../app/(app)/work-order').default;

    render(<WorkOrderScreen />);

    expect(mockSubscribeToUserStream).toHaveBeenCalledWith('user-1', expect.any(Function));
  });
});
