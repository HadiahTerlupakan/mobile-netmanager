import { EnvironmentIndicator } from "@/components/atoms/EnvironmentIndicator";
import { ErrorBoundary } from "@/components/atoms/ErrorBoundary";
import { UpdateAvailableModal } from "@/components/molecules/UpdateAvailableModal";
import { UpdateRequiredScreen } from "@/components/templates/UpdateRequiredScreen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { TenantProvider } from "@/context/TenantContext";
import { useAppVersion } from "@/hooks/useAppVersion";
import { asyncStoragePersister, queryClient } from "@/lib/queryClient";
import { appVersionService } from "@/services/AppVersionService";
import { DatabaseService } from "@/services/DatabaseService"; // Import DatabaseService
import { errorReportingService } from "@/services/ErrorReportingService"; // Import ErrorReportingService
import { performanceMonitor } from "@/services/PerformanceMonitor"; // Import PerformanceMonitor
import { SyncService } from "@/services/SyncService";
import { CURRENT_VERSION_CODE, CURRENT_VERSION_NAME } from "@/constants/appVersion";
import { eventManager } from "@/utils/EventManager";
import { logger } from "@/utils/logger";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as Notifications from "expo-notifications";
import { Href, Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, DeviceEventEmitter, Platform, View } from "react-native";
import Toast from "react-native-toast-message";
import { Events } from "@/constants/Events";
import tw from "twrnc";

// Initialize error reporting as early as possible
errorReportingService.init();

function RootLayoutNav() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  // const { tenantUrl, isLoading: isTenantLoading } = useTenant(); // Multi-tenant disabled
  const segments = useSegments();
  const router = useRouter();

  const isLoading = isAuthLoading; // || isTenantLoading;

  // Track App Startup
  useEffect(() => {
    performanceMonitor.start('App Startup');
  }, []);

  useEffect(() => {
    if (!isLoading) {
      performanceMonitor.stop('App Startup');
    }
  }, [isLoading]);

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
    applyVersionRequirement,
    dismissError,
    ignoreUpdate,
  } = useAppVersion();

  const [versionChecked, setVersionChecked] = useState(false);
  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);

  // Initialize Offline Services
  useEffect(() => {
    let syncTimer: ReturnType<typeof setTimeout> | undefined;

    const initServices = async () => {
      try {
        // Phase 1: Critical services
        logger.info("[Init] Phase 1: Database initialization");
        await DatabaseService.initDatabase();

        // Phase 2: Non-critical services (delayed)
        logger.info("[Init] Phase 2: Starting sync monitoring");
        syncTimer = setTimeout(() => {
          try {
            SyncService.startMonitoring();
          } catch (error) {
            logger.error('[Init] Failed to start sync monitoring:', error);
            errorReportingService.captureException(error instanceof Error ? error : new Error('Failed to start sync monitoring'), {
              source: 'root.initServices.syncMonitoring',
            });
          }
        }, 1000);
      } catch (error) {
        logger.error("[Init] Service initialization failed:", error);
        errorReportingService.captureException(error instanceof Error ? error : new Error('Service initialization failed'), {
          source: 'root.initServices',
        });
      }
    };
    initServices();

    return () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
    };
  }, []);

  // Check for app updates on mount (Android APK only)
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        await checkForUpdate(CURRENT_VERSION_CODE);
      } catch (e) {
        logger.error('Failed to check for updates:', e);
        errorReportingService.captureException(e instanceof Error ? e : new Error('Failed to check for updates'), {
          source: 'root.checkUpdate',
        });
      } finally {
        setVersionChecked(true);
      }
    };
    checkUpdate();
  }, [checkForUpdate]);

  // Report App Version
  useEffect(() => {
    let reportTimer: ReturnType<typeof setTimeout>;

    if (user && token) {
      // Set user context for error reporting
      errorReportingService.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });

      // Throttle version reporting to avoid congestion on startup
      reportTimer = setTimeout(() => {
        appVersionService
          .reportVersion(CURRENT_VERSION_CODE, CURRENT_VERSION_NAME, token)
          .catch((e) => {
            logger.error("Failed to report version:", e);
          });
      }, 5000);
    } else {
      // Clear user context when logged out
      errorReportingService.clearUser();
    }

    return () => {
      if (reportTimer) clearTimeout(reportTimer);
    };
  }, [user, token]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(Events.APP_VERSION_UNSUPPORTED, (payload?: {
      details?: { latestVersion?: typeof latestVersion }
      latestVersion?: typeof latestVersion
    }) => {
      const forcedVersion = payload?.details?.latestVersion ?? payload?.latestVersion ?? null;
      applyVersionRequirement(forcedVersion ?? null);
    });

    return () => {
      subscription.remove();
    };
  }, [applyVersionRequirement]);

  // Handle Push Notifications
  useEffect(() => {
    let notificationNavigationTimer: ReturnType<typeof setTimeout> | undefined;

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

    const handleNotificationNavigation = (data: { url?: string }) => {
      if (!data?.url) return;

      try {
        const url = data.url;
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
          logger.warn(
            "Invalid notification route, redirecting to dashboard:",
            url,
          );
          router.replace("/(app)/dashboard");
        }
      } catch (e) {
        logger.error("Navigation failed:", e);
        errorReportingService.captureException(e instanceof Error ? e : new Error('Notification navigation failed'), {
          source: 'root.notificationNavigation',
          route: data.url,
        });
        router.replace("/(app)/dashboard");
      }
    };

    // Import dynamically to avoid circular dependencies if any
    const setupNotifications = async () => {
      if (Platform.OS === "web") return;

      try {
        const { addNotificationListeners } =
          await import("@/services/PushNotificationService");

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          const data = lastResponse.notification.request.content.data as { url?: string };
          logger.info("App opened from notification (killed state):", data);
          notificationNavigationTimer = setTimeout(() => handleNotificationNavigation(data), 500);
        }

        const cleanup = addNotificationListeners(
          (notification: Notifications.Notification) => {
            logger.info("Foreground notification:", notification.request.content.title);
            queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
          },
          (response: Notifications.NotificationResponse) => {
            const data = response.notification.request.content.data as { url?: string };
            logger.info("Notification tapped, data:", data);
            handleNotificationNavigation(data);
          },
        );

        eventManager.addListener("root_notifications", null, cleanup);
      } catch (error) {
        logger.error('Failed to setup notifications:', error);
        errorReportingService.captureException(error instanceof Error ? error : new Error('Failed to setup notifications'), {
          source: 'root.setupNotifications',
        });
      }
    };

    void setupNotifications();

    return () => {
      if (notificationNavigationTimer) {
        clearTimeout(notificationNavigationTimer);
      }

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
    const inCustomerGroup = segments[0] === "(customer)";

    logger.auth("Status:", { user: !!user, inAuthGroup, inAppGroup, inCustomerGroup, role: user?.role, segments });

    // Debounce redirects to prevent loops during initialization
    const redirectTimer = setTimeout(() => {
      // Multi-tenant disabled, skip tenant check
      /*
      if (!tenantUrl && !inAuthGroup && segments[0] !== 'tenant-selection') {
        logger.auth("No tenant, redirecting to Tenant Selection");
        router.replace("/tenant-selection");
        return;
      }
      */

      if (!user && !inAuthGroup) {
        logger.auth("Redirecting to Login");
        router.replace("/(auth)/login");
      } else if (user) {
        // If User is Customer
        if (user.role === 'CUSTOMER') {
          if (!inCustomerGroup) {
            logger.auth("Redirecting to Customer Dashboard");
            router.replace("/(customer)/dashboard");
          }
        }
        // If User is Employee (Admin, Teknisi, Sales, etc)
        else {
          if (!inAppGroup) {
            logger.auth("Redirecting to Employee Dashboard");
            router.replace("/(app)/dashboard");
          }
        }
      }
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [user, segments, isLoading, router]);

  // Show update modal when available (and not forced)
  useEffect(() => {
    if (updateAvailable && !isForceUpdate) {
      setShowOptionalUpdate(true);
    }
  }, [updateAvailable, isForceUpdate]);

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

      <EnvironmentIndicator />

      {/* Optional Update Modal */}
      {showOptionalUpdate && latestVersion && (
        <UpdateAvailableModal
          visible={showOptionalUpdate}
          latestVersion={latestVersion}
          downloadStatus={downloadStatus}
          downloadProgress={downloadProgress}
          error={versionError}
          onStartUpdate={startUpdate}
          onLater={() => {
            ignoreUpdate();
            setShowOptionalUpdate(false);
          }}
          onDismissError={dismissError}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <AuthProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
          >
            <RootLayoutNav />
            <Toast />
          </PersistQueryClientProvider>
        </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
}
