import { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';

const MIN_UNREAD_COUNT = 0;
const SINGLE_UNREAD_DECREMENT = 1;

type NotificationListItem = {
  id: string;
  isRead: boolean;
};

type NotificationPage = {
  notifications?: NotificationListItem[];
  unreadCount?: number;
};

type NotificationListCache = InfiniteData<NotificationPage, unknown>;

type NotificationUnreadCache = {
  data?: {
    unreadCount?: number;
  };
};

type MarkReadUpdate = {
  type: 'markRead';
  notificationId: string;
};

type MarkAllReadUpdate = {
  type: 'markAllRead';
};

export type NotificationOptimisticUpdate = MarkReadUpdate | MarkAllReadUpdate;

function decrementUnreadCount(unreadCount?: number) {
  return Math.max(MIN_UNREAD_COUNT, (unreadCount ?? MIN_UNREAD_COUNT) - SINGLE_UNREAD_DECREMENT);
}

function updateListCacheForMarkRead(
  cachedNotifications?: NotificationListCache,
  notificationId?: string,
) {
  if (!cachedNotifications?.pages || !notificationId) {
    return cachedNotifications;
  }

  return {
    ...cachedNotifications,
    pages: cachedNotifications.pages.map((page) => {
      const hasTargetNotification = page.notifications?.some(
        (notification) => notification.id === notificationId,
      );

      return {
        ...page,
        notifications: page.notifications?.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
        unreadCount: hasTargetNotification
          ? decrementUnreadCount(page.unreadCount)
          : page.unreadCount,
      };
    }),
  };
}

function updateUnreadCacheForMarkRead(cachedUnread?: NotificationUnreadCache) {
  if (!cachedUnread?.data) {
    return cachedUnread;
  }

  return {
    ...cachedUnread,
    data: {
      ...cachedUnread.data,
      unreadCount: decrementUnreadCount(cachedUnread.data.unreadCount),
    },
  };
}

function updateListCacheForMarkAllRead(cachedNotifications?: NotificationListCache) {
  if (!cachedNotifications?.pages) {
    return cachedNotifications;
  }

  return {
    ...cachedNotifications,
    pages: cachedNotifications.pages.map((page) => ({
      ...page,
      notifications: page.notifications?.map((notification) => ({
        ...notification,
        isRead: true,
      })),
      unreadCount: MIN_UNREAD_COUNT,
    })),
  };
}

function updateUnreadCacheForMarkAllRead(cachedUnread?: NotificationUnreadCache) {
  if (!cachedUnread?.data) {
    return cachedUnread;
  }

  return {
    ...cachedUnread,
    data: {
      ...cachedUnread.data,
      unreadCount: MIN_UNREAD_COUNT,
    },
  };
}

/** Applies optimistic notification cache updates for mobile unread and list state. */
export function applyNotificationsOptimisticUpdate(
  queryClient: QueryClient,
  update: NotificationOptimisticUpdate,
) {
  if (update.type === 'markRead') {
    queryClient.setQueryData<NotificationListCache | undefined>(
      queryKeys.notifications.list(),
      (cachedNotifications) =>
        updateListCacheForMarkRead(cachedNotifications, update.notificationId),
    );
    queryClient.setQueryData<NotificationUnreadCache | undefined>(
      queryKeys.notifications.unread(),
      updateUnreadCacheForMarkRead,
    );
    return;
  }

  queryClient.setQueryData<NotificationListCache | undefined>(
    queryKeys.notifications.list(),
    updateListCacheForMarkAllRead,
  );
  queryClient.setQueryData<NotificationUnreadCache | undefined>(
    queryKeys.notifications.unread(),
    updateUnreadCacheForMarkAllRead,
  );
}
