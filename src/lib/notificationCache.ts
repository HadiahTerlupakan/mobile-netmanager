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

type NotificationMatch = {
  isUnread: boolean;
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

function findNotificationMatch(
  cachedNotifications?: NotificationListCache,
  notificationId?: string,
): NotificationMatch {
  if (!cachedNotifications?.pages || !notificationId) {
    return { isUnread: false };
  }

  for (const page of cachedNotifications.pages) {
    const notification = page.notifications?.find((item) => item.id === notificationId);
    if (notification) {
      return { isUnread: !notification.isRead };
    }
  }

  return { isUnread: false };
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
      const notificationMatch = page.notifications?.find(
        (notification) => notification.id === notificationId,
      );

      return {
        ...page,
        notifications: page.notifications?.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
        unreadCount: notificationMatch?.isRead === false
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
    const cachedNotifications = queryClient.getQueryData<NotificationListCache | undefined>(
      queryKeys.notifications.list(),
    );
    const notificationMatch = findNotificationMatch(
      cachedNotifications,
      update.notificationId,
    );

    queryClient.setQueryData<NotificationListCache | undefined>(
      queryKeys.notifications.list(),
      (nextCachedNotifications) =>
        updateListCacheForMarkRead(nextCachedNotifications, update.notificationId),
    );

    if (notificationMatch.isUnread) {
      queryClient.setQueryData<NotificationUnreadCache | undefined>(
        queryKeys.notifications.unread(),
        updateUnreadCacheForMarkRead,
      );
    }
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
