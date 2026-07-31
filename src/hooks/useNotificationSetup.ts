import { queryClient, queryKeys } from '@/lib/queryClient';
import {
  addNotificationListeners,
  getInitialNotificationData,
} from '@/services/PushNotificationService';
import { presentForegroundNotification } from '@/services/ForegroundNotificationService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import notifee, { EventType } from '@notifee/react-native';
import { Href, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
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
  const segments = useSegments();
  const pendingDeepLinkRef = useRef<{ url?: string } | null>(null);
  const handleNavRef = useRef<((data: { url?: string }) => void) | null>(null);
  // Cleanup function dari notification listener disimpan per-instance
  // di ref agar tidak share namespace global dengan hook lain. Sebelumnya
  // pakai `eventManager.addListener('root_notifications', ...)` yang
  // namespace string global — kalau hook re-mount, removeAllListeners
  // akan hapus juga listener module lain yang kebetulan pakai key sama.
  const notificationCleanupRef = useRef<(() => void) | null>(null);

  // Router-ready gate: jika ada pending deeplink dari killed-state, fire
  // saat segments sudah populated (bukan setTimeout 500ms — di Android Go
  // / device lambat, navigator bisa belum mount setelah 500ms → router.push
  // no-op dan user mendarat di dashboard alih-alih deep link target).
  useEffect(() => {
    if (segments.length > 0 && pendingDeepLinkRef.current && handleNavRef.current) {
      handleNavRef.current(pendingDeepLinkRef.current);
      pendingDeepLinkRef.current = null;
    }
  }, [segments]);

  useEffect(() => {
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
      '/marketing/canvasing',
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
    handleNavRef.current = handleNotificationNavigation;

    const setupNotifications = async () => {
      if (Platform.OS === 'web') return;

      try {
        const initialNotificationData = await getInitialNotificationData();
        if (initialNotificationData) {
          logger.info(
            'App opened from notification (killed state):',
            initialNotificationData
          );
          // Simpan ke ref; useEffect[segments] akan fire saat router siap.
          pendingDeepLinkRef.current = initialNotificationData;
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

        // Notifikasi foreground ditampilkan manual via notifee (bukan FCM
        // tray), sehingga tap-nya TIDAK memicu onNotificationOpenedApp.
        // Tanpa listener notifee ini, tap heads-up saat app terbuka = no-op.
        const unsubscribeNotifeeForeground = notifee.onForegroundEvent(
          ({ type, detail }) => {
            if (type !== EventType.PRESS) return;

            const url = detail.notification?.data?.url;
            logger.info('Notifee foreground notification tapped, url:', url);
            handleNotificationNavigation(
              typeof url === 'string' ? { url } : {}
            );
          }
        );

        notificationCleanupRef.current = () => {
          cleanup();
          unsubscribeNotifeeForeground();
        };
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
      // Cleanup listener per-instance via ref — tidak shared global
      // namespace yang berisiko menabrak listener module lain.
      try {
        notificationCleanupRef.current?.();
      } catch (cleanupError) {
        logger.warn('[useNotificationSetup] cleanup failed (non-fatal)', cleanupError);
      }
      notificationCleanupRef.current = null;
    };
  }, [router]);
}
