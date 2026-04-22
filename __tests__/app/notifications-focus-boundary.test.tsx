import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockUseIsFocused = jest.fn(() => false);
const mockRefetch = jest.fn();
const mockMutate = jest.fn();
const mockSetQueryData = jest.fn();
const mockGetQueryData = jest.fn();
let latestFocusEffect: (() => void) | undefined;

const createInfiniteQueryResult = (
  pageOverrides: Partial<{ notifications: unknown[]; unreadCount: number; nextCursor: string | null }> = {},
) => ({
  data: {
    pages: [
      {
        notifications: [],
        unreadCount: 0,
        nextCursor: null,
        ...pageOverrides,
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
    mutate: mockMutate,
    isPending: false,
  }),
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    notifications: {
      all: ['notifications'],
      list: () => ['notifications', 'list'],
      unread: () => ['notifications', 'unread'],
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
    setQueryData: mockSetQueryData,
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
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    FlashList: ({ data, renderItem, ListEmptyComponent, ListFooterComponent }: any) => (
      <View>
        {data?.length
          ? data.map((item: unknown, index: number) => (
              <React.Fragment key={String((item as { id?: string })?.id ?? index)}>
                {renderItem?.({ item, index })}
              </React.Fragment>
            ))
          : ListEmptyComponent}
        {ListFooterComponent}
      </View>
    ),
  };
});
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
    mockMutate.mockReset();
    mockSetQueryData.mockReset();
    mockGetQueryData.mockReset();
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

  it('updates unread cache alongside list cache when marking a notification as read', () => {
    mockUseIsFocused.mockReturnValue(true);
    mockUseInfiniteQuery.mockImplementation((_options: unknown) =>
      createInfiniteQueryResult({
        notifications: [
          {
            id: 'notif-1',
            type: 'ANNOUNCEMENT',
            title: 'Notif 1',
            message: 'Pesan',
            link: null,
            isRead: false,
            sourceType: null,
            sourceId: null,
            createdAt: '2026-04-16T00:00:00.000Z',
          },
        ],
        unreadCount: 1,
      }),
    );
    mockGetQueryData.mockImplementation((key: unknown) => {
      if (Array.isArray(key) && key[0] === 'notifications' && key[1] === 'list') {
        return {
          pages: [
            {
              notifications: [{ id: 'notif-1', isRead: false }],
              unreadCount: 1,
              nextCursor: null,
            },
          ],
          pageParams: [null],
        };
      }

      return undefined;
    });

    const NotificationsScreen = require('../../app/(app)/notifications').default;
    const screen = render(<NotificationsScreen />);

    fireEvent.press(screen.getByText('Notif 1'));

    expect(mockSetQueryData).toHaveBeenNthCalledWith(
      1,
      ['notifications', 'list'],
      expect.any(Function),
    );
    expect(mockSetQueryData).toHaveBeenNthCalledWith(
      2,
      ['notifications', 'unread'],
      expect.any(Function),
    );
    expect(mockMutate).toHaveBeenCalledWith({ action: 'markRead', notificationId: 'notif-1' });
  });
});
