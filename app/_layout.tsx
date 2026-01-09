import Constants from 'expo-constants';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import tw from 'twrnc';
import { UpdateAvailableModal } from '../components/UpdateAvailableModal';
import { UpdateRequiredScreen } from '../components/UpdateRequiredScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { useAppVersion } from '../hooks/useAppVersion';
import { DatabaseService } from '../services/DatabaseService';
import '../services/LocationTrackingService'; // Register background task
import { SyncService } from '../services/SyncService';
import logger from '../utils/logger';

// Get current version code from app.json
const CURRENT_VERSION_CODE = Constants.expoConfig?.extra?.versionCode || 53; // Default to 53 based on version 1.0.53

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // App Version State
  const {
    isChecking: isCheckingVersion,
    downloadStatus,
    downloadProgress,
    updateAvailable,
    isForceUpdate,
    latestVersion,
    error: versionError,
    checkForUpdate,
    startUpdate,
    dismissError
  } = useAppVersion();

  const [versionChecked, setVersionChecked] = useState(false);
  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);

  // Initialize Offline Services
  useEffect(() => {
    const initServices = async () => {
      await DatabaseService.initDatabase();
      SyncService.startMonitoring();
    };
    initServices();
  }, []);

  // Check for app updates on mount (Android APK only)
  useEffect(() => {
    const checkAppVersion = async () => {
      if (versionChecked) return;
      
      // Skip update check for iOS - APK updates are Android only
      if (Platform.OS === 'ios') {
        setVersionChecked(true);
        return;
      }
      
      try {
        console.log(`[VersionCheck] Checking for updates. Current Code: ${CURRENT_VERSION_CODE}`)
        const result = await checkForUpdate(CURRENT_VERSION_CODE);
        console.log('[VersionCheck] Result:', JSON.stringify(result, null, 2))
        
        if (result.success && result.updateAvailable && !result.isForceUpdate) {
          setShowOptionalUpdate(true);
        }
        
        setVersionChecked(true);
      } catch (error) {
        logger.error('Version check failed:', error);
        setVersionChecked(true);
      }
    };

    checkAppVersion();
  }, [versionChecked, checkForUpdate]);

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

  // Show loading while checking auth or version
  if (isLoading || (isCheckingVersion && !versionChecked)) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Show force update screen if required
  if (updateAvailable && isForceUpdate && latestVersion) {
    return (
      <UpdateRequiredScreen
        latestVersion={latestVersion}
        downloadStatus={downloadStatus}
        downloadProgress={downloadProgress}
        error={versionError}
        onStartUpdate={startUpdate}
        onDismissError={dismissError}
      />
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SocketProvider>
        <Slot />
      </SocketProvider>

      {/* Optional Update Modal */}
      {showOptionalUpdate && latestVersion && (
        <UpdateAvailableModal
          visible={showOptionalUpdate}
          latestVersion={latestVersion}
          downloadStatus={downloadStatus}
          downloadProgress={downloadProgress}
          error={versionError}
          onStartUpdate={startUpdate}
          onLater={() => setShowOptionalUpdate(false)}
          onDismissError={dismissError}
        />
      )}
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
