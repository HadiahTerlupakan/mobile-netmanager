import { queryClient, queryKeys } from '@/lib/queryClient';
import {
  addNotificationListeners,
  getInitialNotificationData,
} from '@/services/PushNotificationService';
import { presentForegroundNotification } from '@/services/ForegroundNotificationService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { eventManager } from '@/utils/EventManager';
import { presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Setup push notification handling
 * - Initial notification (app opened from killed state)
 * - Foreground notification presentation
 * - Notification tap navigation
 * - Query invalidation on new notifications
 */
export function useNotificationSetup() {
  const router = useRouter();

  useEffect(() => {
    let notificationNavigationTimer: ReturnType<typeof setTimeout> | undefined;

    const validRoutes = [
      '/dashboard',
      '/work-order',
      '/barang',
      '/absensi',
      '/profile',
      '/notifications',
      '/lembur',
      '/izin',
      '/chat',
      '/holidays',
    ];

    const handleNotificationNavigation = (data: { url?: string }) => {
      if (!data?.url) return;

      try {
        const url = data.url;
        const isValidRoute =
          validRoutes.some(
            (r) =>
              url === r ||
              url.startsWith(r + '/') ||
              url.startsWith('/(app)' + r)
          ) ||
          url.startsWith('/work-order-detail/') ||
          url.startsWith('/chat/');

        if (isValidRoute) {
          router.push(url as Href);
        } else {
          logger.warn(
            'Invalid notification route, redirecting to dashboard:',
            url
          );
          router.replace('/(app)/dashboard');
        }
      } catch (e) {
        logger.error('Navigation failed:', e);
        errorReportingService.captureException(
          e instanceof Error ? e : new Error('Notification navigation failed'),
          {
            source: 'root.notificationNavigation',
            route: data.url,
          }
        );
        router.replace('/(app)/dashboard');
      }
    };

    const setupNotifications = async () => {
      if (Platform.OS === 'web') return;

      try {
        const initialNotificationData = await getInitialNotificationData();
        if (initialNotificationData) {
          logger.info(
            'App opened from notification (killed state):',
            initialNotificationData
          );
          notificationNavigationTimer = setTimeout(
            () => handleNotificationNavigation(initialNotificationData),
            500
          );
        }

        const cleanup = addNotificationListeners(
          async (notification) => {
            logger.info('Foreground notification:', notification.title);

            try {
              if (notification.title || notification.body) {
                await presentForegroundNotification(notification);
                presentInfoMessage(
                  notification.body ?? 'Anda menerima notifikasi baru.',
                  notification.title ?? 'Notifikasi Baru'
                );
              }
            } catch (error) {
              logger.error('Failed to render foreground notification:', error);
              errorReportingService.captureException(
                error instanceof Error
                  ? error
                  : new Error('Failed to render foreground notification'),
                {
                  source: 'root.foregroundNotification',
                }
              );
            } finally {
              queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.list(),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.notifications.unread(),
              });
            }
          },
          (response) => {
            logger.info('Notification tapped, data:', response.data);
            handleNotificationNavigation(response.data ?? {});
          }
        );

        eventManager.addListener('root_notifications', null, cleanup);
      } catch (error) {
        logger.error('Failed to setup notifications:', error);
        errorReportingService.captureException(
          error instanceof Error
            ? error
            : new Error('Failed to setup notifications'),
          {
            source: 'root.setupNotifications',
          }
        );
      }
    };

    void setupNotifications();

    return () => {
      if (notificationNavigationTimer) {
        clearTimeout(notificationNavigationTimer);
      }

      // Cleanup using EventManager
      eventManager.removeAllListeners('root_notifications');
    };
  }, [router]);
}
