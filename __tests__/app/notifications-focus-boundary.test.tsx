import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseIsFocused = jest.fn(() => false);
const mockRefetch = jest.fn();
let latestFocusEffect: (() => void) | undefined;

const createInfiniteQueryResult = () => ({
  data: {
    pages: [
      {
        notifications: [],
        unreadCount: 0,
        nextCursor: null,
      },
    ],
  },
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isPending: false,
  refetch: mockRefetch,
  isRefetching: false,
  isError: false,
  error: null,
});

const mockUseInfiniteQuery = jest.fn<(options: unknown) => ReturnType<typeof createInfiniteQueryResult>>(
  (_options: unknown) => createInfiniteQueryResult(),
);

const mockUseFocusEffect = jest.fn((effect: () => void | (() => void)) => {
  latestFocusEffect = () => {
    effect();
  };

  if (mockUseIsFocused()) {
    effect();
  }
});

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: 'token-123',
  }),
}));

jest.mock('@/hooks/queries', () => ({
  useApiMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    notifications: {
      list: () => ['notifications'],
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: jest.fn(),
  }),
  useInfiniteQuery: (options: unknown) => mockUseInfiniteQuery(options),
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useFocusEffect: (effect: () => void | (() => void)) => mockUseFocusEffect(effect),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockUseIsFocused(),
}));

jest.mock('@/components/molecules/NotificationSkeleton', () => ({
  NotificationSkeleton: () => null,
}));
jest.mock('@shopify/flash-list', () => ({ FlashList: 'FlashList' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  ArrowLeft: 'ArrowLeft',
  Bell: 'Bell',
  Briefcase: 'Briefcase',
  Calendar: 'Calendar',
  Clock: 'Clock',
  Megaphone: 'Megaphone',
  Package: 'Package',
}));
jest.mock('twrnc', () => () => ({}));

describe('mobile notifications focus boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestFocusEffect = undefined;
    mockRefetch.mockReset();
    mockUseIsFocused.mockReturnValue(false);
    mockUseInfiniteQuery.mockImplementation((_options: unknown) => createInfiniteQueryResult());
  });

  it('does not mount notifications query while the screen is not focused', () => {
    const NotificationsScreen = require('../../app/(app)/notifications').default;

    render(<NotificationsScreen />);

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('mounts notifications query when the screen is focused', () => {
    mockUseIsFocused.mockReturnValue(true);
    const NotificationsScreen = require('../../app/(app)/notifications').default;

    render(<NotificationsScreen />);

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('does not refetch again on the initial focused mount', () => {
    mockUseIsFocused.mockReturnValue(true);
    const NotificationsScreen = require('../../app/(app)/notifications').default;

    render(<NotificationsScreen />);

    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('refetches when the screen gains focus again after the initial mount', () => {
    mockUseIsFocused.mockReturnValue(true);
    const NotificationsScreen = require('../../app/(app)/notifications').default;

    render(<NotificationsScreen />);

    latestFocusEffect?.();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
