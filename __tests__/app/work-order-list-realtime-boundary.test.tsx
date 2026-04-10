import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

import { useSocket, useSocketEvent } from '@/context/SocketContext';

const authState = {
  token: null as string | null,
  user: { id: 'user-1', name: 'Admin' },
};

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

jest.mock('@/context/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    isConnected: false,
    socket: null,
    lastError: null,
    reconnect: jest.fn(),
  })),
  useSocketEvent: jest.fn(),
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

const mockUseSocketEvent = useSocketEvent as unknown as jest.MockedFunction<typeof useSocketEvent>;
const mockUseSocket = useSocket as unknown as jest.MockedFunction<typeof useSocket>;

describe('mobile work order list realtime boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState.token = null;
    mockUseSocket.mockReturnValue({
      isConnected: false,
      socket: null,
      lastError: null,
      reconnect: jest.fn(),
    });
  });

  it('does not enable work order realtime subscriptions before auth token is available', () => {
    const WorkOrderScreen = require('../../app/(app)/work-order').default;

    render(<WorkOrderScreen />);

    expect(mockUseSocketEvent).toHaveBeenCalledWith('workorder.new', expect.any(Function), { enabled: false });
    expect(mockUseSocketEvent).toHaveBeenCalledWith('workorder.update', expect.any(Function), { enabled: false });
    expect(mockUseSocketEvent).toHaveBeenCalledWith('workorder.assigned', expect.any(Function), { enabled: false });
  });
});
