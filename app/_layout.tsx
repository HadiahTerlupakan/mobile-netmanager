import { EnvironmentIndicator } from "@/components/atoms/EnvironmentIndicator";
import { ErrorBoundary } from "@/components/atoms/ErrorBoundary";
import { UpdateAvailableModal } from "@/components/molecules/UpdateAvailableModal";
import { UpdateRequiredScreen } from "@/components/templates/UpdateRequiredScreen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RealtimeProvider } from "@/context/RealtimeProvider";
import { TenantProvider } from "@/context/TenantContext";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useOtaDevPreview } from "@/hooks/useOtaDevPreview";
import { useNotificationSetup } from "@/hooks/useNotificationSetup";
import { useDeepLink } from "@/hooks/useDeepLink";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { asyncStoragePersister, queryClient } from "@/lib/queryClient";
import { errorReportingService } from "@/services/ErrorReportingService";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Slot, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";
import tw from "twrnc";
import { toastConfig } from "@/config/toastConfig";

// Initialize error reporting as early as possible
errorReportingService.init();

function RootLayoutNav() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();

  const isLoading = isAuthLoading;

  // Initialize app services
  useAppInitialization(isLoading);

  // Handle version checking and updates
  const versionState = useVersionCheck(user, token);

  // Dev-only OTA preview — bypass expo-updates check, force render modal
  // dengan dummy data untuk verifikasi UI tanpa harus build release.
  const devPreview = useOtaDevPreview();

  // Setup push notifications
  useNotificationSetup();

  // Deep link dari WA (netmanager://work-order-detail/<id>)
  useDeepLink();

  // Handle auth-based redirects
  useAuthRedirect(user, segments, isLoading);

  // Show loading while checking auth or version
  if (isLoading || (versionState.isChecking && !versionState.versionChecked)) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Priority 1: APK force update — lock screen
  if (versionState.isApkForceUpdate && versionState.latestApkRelease) {
    return (
      <UpdateRequiredScreen
        mode="apk"
        release={versionState.latestApkRelease}
        contactAdmin={versionState.contactAdmin}
        onRecheck={versionState.onRecheckApk}
      />
    );
  }

  // Priority 2: OTA force update (dev preview override atau real)
  if (devPreview?.isForceUpdate) {
    return (
      <UpdateRequiredScreen
        mode="ota"
        latestVersion={devPreview.latestVersion}
        downloadStatus={devPreview.downloadStatus}
        downloadProgress={devPreview.downloadProgress}
        error={null}
        onStartUpdate={() => {}}
        onDismissError={() => {}}
      />
    );
  }
  if (versionState.isOtaForceUpdate && versionState.latestOtaVersion) {
    return (
      <UpdateRequiredScreen
        mode="ota"
        latestVersion={versionState.latestOtaVersion}
        downloadStatus={versionState.otaDownloadStatus}
        downloadProgress={null}
        error={versionState.otaError}
        onStartUpdate={versionState.onStartOtaUpdate}
        onDismissError={versionState.onDismissOtaError}
      />
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <RealtimeProvider>
        <Slot />
      </RealtimeProvider>

      <EnvironmentIndicator />

      {/* Dev preview: OTA soft modal */}
      {devPreview?.showOptionalUpdate && (
        <UpdateAvailableModal
          mode="ota"
          visible={true}
          latestVersion={devPreview.latestVersion}
          downloadStatus={devPreview.downloadStatus}
          downloadProgress={devPreview.downloadProgress}
          error={null}
          onStartUpdate={() => {}}
          onLater={() => {}}
          onDismissError={() => {}}
        />
      )}

      {/* APK soft modal */}
      {!devPreview && versionState.showApkOptional && versionState.latestApkRelease && (
        <UpdateAvailableModal
          mode="apk"
          visible
          release={versionState.latestApkRelease}
          contactAdmin={versionState.contactAdmin}
          onLater={() => {
            versionState.setShowApkOptional(false);
            versionState.onIgnoreApk();
          }}
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
            <Toast config={toastConfig} position="top" topOffset={50} />
          </PersistQueryClientProvider>
        </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
}
