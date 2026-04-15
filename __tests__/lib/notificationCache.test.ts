import { describe, expect, it } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import { applyNotificationsOptimisticUpdate } from '@/lib/notificationCache';
import { queryKeys } from '@/lib/queryClient';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Number.POSITIVE_INFINITY,
      },
    },
  });
}

describe('applyNotificationsOptimisticUpdate', () => {
  it('marks a single notification as read in list and unread caches', () => {
    const queryClient = createQueryClient();

    queryClient.setQueryData(queryKeys.notifications.list(), {
      pages: [
        {
          notifications: [
            { id: 'notif-1', isRead: false },
            { id: 'notif-2', isRead: false },
          ],
          unreadCount: 2,
          nextCursor: null,
        },
      ],
      pageParams: [null],
    });
    queryClient.setQueryData(queryKeys.notifications.unread(), {
      data: {
        unreadCount: 2,
      },
    });

    applyNotificationsOptimisticUpdate(queryClient, {
      type: 'markRead',
      notificationId: 'notif-1',
    });

    expect(queryClient.getQueryData(queryKeys.notifications.list())).toEqual({
      pages: [
        {
          notifications: [
            { id: 'notif-1', isRead: true },
            { id: 'notif-2', isRead: false },
          ],
          unreadCount: 1,
          nextCursor: null,
        },
      ],
      pageParams: [null],
    });
    expect(queryClient.getQueryData(queryKeys.notifications.unread())).toEqual({
      data: {
        unreadCount: 1,
      },
    });
  });

  it('marks all notifications as read in list and unread caches', () => {
    const queryClient = createQueryClient();

    queryClient.setQueryData(queryKeys.notifications.list(), {
      pages: [
        {
          notifications: [
            { id: 'notif-1', isRead: false },
            { id: 'notif-2', isRead: false },
          ],
          unreadCount: 2,
          nextCursor: null,
        },
      ],
      pageParams: [null],
    });
    queryClient.setQueryData(queryKeys.notifications.unread(), {
      data: {
        unreadCount: 2,
      },
    });

    applyNotificationsOptimisticUpdate(queryClient, {
      type: 'markAllRead',
    });

    expect(queryClient.getQueryData(queryKeys.notifications.list())).toEqual({
      pages: [
        {
          notifications: [
            { id: 'notif-1', isRead: true },
            { id: 'notif-2', isRead: true },
          ],
          unreadCount: 0,
          nextCursor: null,
        },
      ],
      pageParams: [null],
    });
    expect(queryClient.getQueryData(queryKeys.notifications.unread())).toEqual({
      data: {
        unreadCount: 0,
      },
    });
  });

  it('decrements unread count only on the page containing the marked notification', () => {
    const queryClient = createQueryClient();

    queryClient.setQueryData(queryKeys.notifications.list(), {
      pages: [
        {
          notifications: [
            { id: 'notif-1', isRead: false },
            { id: 'notif-2', isRead: false },
          ],
          unreadCount: 2,
          nextCursor: 'cursor-2',
        },
        {
          notifications: [
            { id: 'notif-3', isRead: false },
          ],
          unreadCount: 1,
          nextCursor: null,
        },
      ],
      pageParams: [null, 'cursor-2'],
    });
    queryClient.setQueryData(queryKeys.notifications.unread(), {
      data: {
        unreadCount: 3,
      },
    });

    applyNotificationsOptimisticUpdate(queryClient, {
      type: 'markRead',
      notificationId: 'notif-3',
    });

    expect(queryClient.getQueryData(queryKeys.notifications.list())).toEqual({
      pages: [
        {
          notifications: [
            { id: 'notif-1', isRead: false },
            { id: 'notif-2', isRead: false },
          ],
          unreadCount: 2,
          nextCursor: 'cursor-2',
        },
        {
          notifications: [
            { id: 'notif-3', isRead: true },
          ],
          unreadCount: 0,
          nextCursor: null,
        },
      ],
      pageParams: [null, 'cursor-2'],
    });
    expect(queryClient.getQueryData(queryKeys.notifications.unread())).toEqual({
      data: {
        unreadCount: 2,
      },
    });
  });
});
