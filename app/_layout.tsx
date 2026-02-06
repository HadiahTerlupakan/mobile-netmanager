import { ErrorBoundary } from "@/components/atoms/ErrorBoundary";
import { UpdateAvailableModal } from "@/components/molecules/UpdateAvailableModal";
import { UpdateRequiredScreen } from "@/components/templates/UpdateRequiredScreen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { useAppVersion } from "@/hooks/useAppVersion";
import { asyncStoragePersister, queryClient } from "@/lib/queryClient";
import { appVersionService } from "@/services/AppVersionService";
import { DatabaseService } from "@/services/DatabaseService"; // Import DatabaseService
import { SyncService } from "@/services/SyncService";
import { eventManager } from "@/utils/EventManager";
import { logger } from "@/utils/logger";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Href, Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import tw from "twrnc";

// Get current version from app.json
const CURRENT_VERSION_CODE = Constants.expoConfig?.extra?.versionCode || 53;
const CURRENT_VERSION_NAME = Constants.expoConfig?.version || "1.0.0";

function RootLayoutNav() {
  const { user, token, isLoading } = useAuth();
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
    dismissError,
  } = useAppVersion();

  const [versionChecked, setVersionChecked] = useState(false);
  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);

  // Initialize Offline Services
  useEffect(() => {
    const initServices = async () => {
      try {
        // Phase 1: Critical services
        logger.info("[Init] Phase 1: Database initialization");
        await DatabaseService.initDatabase();

        // Phase 2: Non-critical services (delayed)
        logger.info("[Init] Phase 2: Starting sync monitoring");
        setTimeout(() => {
          SyncService.startMonitoring();
        }, 1000);
      } catch (error) {
        logger.error("[Init] Service initialization failed:", error);
      }
    };
    initServices();
  }, []);

  // Check for app updates on mount (Android APK only)
  useEffect(() => {
    const checkAppVersion = async () => {
      if (versionChecked) return;

      // Skip update check for iOS - APK updates are Android only
      if (Platform.OS === "ios") {
        setVersionChecked(true);
        return;
      }

      try {
        logger.info(
          `[VersionCheck] Checking for updates. Current Code: ${CURRENT_VERSION_CODE}`,
        );
        const result = await checkForUpdate(CURRENT_VERSION_CODE);
        logger.info("[VersionCheck] Result:", JSON.stringify(result, null, 2));

        if (result.success && result.updateAvailable && !result.isForceUpdate) {
          setShowOptionalUpdate(true);
        }

        setVersionChecked(true);
      } catch (error) {
        logger.error("Version check failed:", error);
        setVersionChecked(true);
      }
    };

    // Delay check slightly to prioritize UI rendering
    const timer = setTimeout(() => {
      checkAppVersion();
    }, 2000);

    return () => clearTimeout(timer);
  }, [versionChecked, checkForUpdate]);

  // Report App Version
  useEffect(() => {
    let reportTimer: ReturnType<typeof setTimeout>;

    if (user && token) {
      // Throttle version reporting to avoid congestion on startup
      reportTimer = setTimeout(() => {
        appVersionService
          .reportVersion(CURRENT_VERSION_CODE, CURRENT_VERSION_NAME, token)
          .catch((e) => {
            logger.error("Failed to report version:", e);
          });
      }, 5000);
    }

    return () => {
      if (reportTimer) clearTimeout(reportTimer);
    };
  }, [user, token]);

  // Handle Push Notifications
  useEffect(() => {
    // Import dynamically to avoid circular dependencies if any
    const setupNotifications = async () => {
      const { addNotificationListeners } =
        await import("@/services/PushNotificationService");

      const cleanup = addNotificationListeners(
        (notification: Notifications.Notification) => {
          // Handle foreground notification received
          logger.info("Foreground notification:", notification);
        },
        (response: Notifications.NotificationResponse) => {
          // Handle notification tap
          const data = response.notification.request.content.data as { url?: string };
          logger.info("Notification tapped, data:", data);

          if (data?.url) {
            try {
              // Map known routes - skip invalid ones
              const validRoutes = [
                "/dashboard",
                "/work-order",
                "/barang",
                "/absensi",
                "/profile",
                "/notifications",
                "/lembur",
                "/izin",
                "/chat",
                "/holidays",
              ];

              const url = data.url;

              // Check if it's a valid route or starts with a valid route prefix
              const isValidRoute =
                validRoutes.some(
                  (r) =>
                    url === r ||
                    url.startsWith(r + "/") ||
                    url.startsWith("/(app)" + r),
                ) ||
                url.startsWith("/work-order-detail/") ||
                url.startsWith("/chat/");

              if (isValidRoute) {
                router.push(url as Href);
              } else {
                // Invalid route like /announcement - just go to dashboard
                logger.warn(
                  "Invalid notification route, redirecting to dashboard:",
                  url,
                );
                router.replace("/(app)/dashboard");
              }
            } catch (e) {
              logger.error("Navigation failed:", e);
              router.replace("/(app)/dashboard");
            }
          }
        },
      );

      // Register listener with EventManager for tracking and cleanup
      eventManager.addListener("root_notifications", null, cleanup);
    };

    setupNotifications();

    return () => {
      // Cleanup using EventManager
      eventManager.removeAllListeners("root_notifications");
    };
  }, [router]);

  useEffect(() => {
    logger.auth(
      "Effect triggered. User:",
      !!user,
      "Segments:",
      segments,
      "Loading:",
      isLoading,
    );

    if (isLoading) {
      logger.auth("Still loading, skipping redirect check");
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(app)";

    logger.auth("Status:", { user: !!user, inAuthGroup, inAppGroup, segments });

    // Debounce redirects to prevent loops during initialization
    const redirectTimer = setTimeout(() => {
        if (!user && !inAuthGroup) {
          logger.auth("Redirecting to Login");
          router.replace("/(auth)/login");
        } else if (user && !inAppGroup) {
          // Redirect to dashboard if logged in but not in (app) group (e.g. at root or login page)
          logger.auth("Redirecting to Dashboard");
          router.replace("/(app)/dashboard");
        }
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [user, segments, isLoading, router]);

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
    <ErrorBoundary>
      <AuthProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <RootLayoutNav />
        </PersistQueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
