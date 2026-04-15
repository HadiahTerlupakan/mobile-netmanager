import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

import NotificationBell from '@/components/molecules/NotificationBell';
import { queryKeys } from '@/lib/queryClient';

const mockUseApiQuery = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/queries', () => ({
  useApiQuery: (options: unknown) => mockUseApiQuery(options),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('lucide-react-native', () => ({
  Bell: 'Bell',
}));

jest.mock('twrnc', () => () => ({}));

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiQuery.mockReturnValue({
      data: {
        data: {
          unreadCount: 3,
        },
      },
    });
  });

  it('uses the shared unread notification query key', () => {
    render(<NotificationBell color="#fff" />);

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.notifications.unread(),
        endpoint: '/api/mobile/notifications',
      }),
    );
  });
});
