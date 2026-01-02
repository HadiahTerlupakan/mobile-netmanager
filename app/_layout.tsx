import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { DatabaseService } from '../services/DatabaseService';
import '../services/LocationTrackingService'; // Register background task
import { SyncService } from '../services/SyncService';
import logger from '../utils/logger';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize Offline Services
  useEffect(() => {
    const initServices = async () => {
      await DatabaseService.initDatabase();
      SyncService.startMonitoring();
    };
    initServices();
  }, []);

  // Handle Push Notifications
  useEffect(() => {
    // Import dynamically to avoid circular dependencies if any
    const setupNotifications = async () => {
      const { addNotificationListeners } = await import('../services/PushNotificationService');

      const cleanup = addNotificationListeners(
        (notification) => {
          // Handle foreground notification received
          logger.info('Foreground notification:', notification);
        },
        (response) => {
          // Handle notification tap
          const data = response.notification.request.content.data;
          logger.info('Notification tapped, data:', data);

          if (data?.url) {
            try {
              // Map known routes - skip invalid ones
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
                '/holidays'
              ];
              
              const url = data.url as string;
              
              // Check if it's a valid route or starts with a valid route prefix
              const isValidRoute = validRoutes.some(r => 
                url === r || 
                url.startsWith(r + '/') ||
                url.startsWith('/(app)' + r)
              ) || url.startsWith('/work-order-detail/') || url.startsWith('/chat/');
              
              if (isValidRoute) {
                router.push(url as any);
              } else {
                // Invalid route like /announcement - just go to dashboard
                logger.warn('Invalid notification route, redirecting to dashboard:', url);
                router.replace('/(app)/dashboard');
              }
            } catch (e) {
              logger.error('Navigation failed:', e);
              router.replace('/(app)/dashboard');
            }
          }
        }
      );

      return cleanup;
    };

    let cleanupFn: (() => void) | undefined;
    setupNotifications().then(cleanup => { cleanupFn = cleanup; });

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, []);

  useEffect(() => {
    logger.auth('Effect triggered. User:', !!user, 'Segments:', segments, 'Loading:', isLoading);

    if (isLoading) {
      logger.auth('Still loading, skipping redirect check');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    logger.auth('Status:', { user: !!user, inAuthGroup, inAppGroup, segments });

    if (!user && !inAuthGroup) {
      logger.auth('Redirecting to Login');
      router.replace('/(auth)/login');
    } else if (user && !inAppGroup) {
      // Redirect to dashboard if logged in but not in (app) group (e.g. at root or login page)
      logger.auth('Redirecting to Dashboard');
      router.replace('/(app)/dashboard');
    }
  }, [user, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SocketProvider>
        <Slot />
      </SocketProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

