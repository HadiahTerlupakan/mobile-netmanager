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

  // Show force update screen if required
  if (devPreview?.isForceUpdate) {
    return (
      <UpdateRequiredScreen
        latestVersion={devPreview.latestVersion}
        downloadStatus={devPreview.downloadStatus}
        downloadProgress={devPreview.downloadProgress}
        error={null}
        onStartUpdate={() => {}}
        onDismissError={() => {}}
      />
    );
  }
  if (versionState.updateAvailable && versionState.isForceUpdate && versionState.latestVersion) {
    return (
      <UpdateRequiredScreen
        latestVersion={versionState.latestVersion}
        downloadStatus={versionState.downloadStatus}
        downloadProgress={versionState.downloadProgress}
        error={versionState.error}
        onStartUpdate={versionState.startUpdate}
        onDismissError={versionState.dismissError}
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

      {/* Optional Update Modal */}
      {devPreview?.showOptionalUpdate && (
        <UpdateAvailableModal
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
      {!devPreview && versionState.showOptionalUpdate && versionState.latestVersion && (
        <UpdateAvailableModal
          visible={versionState.showOptionalUpdate}
          latestVersion={versionState.latestVersion}
          downloadStatus={versionState.downloadStatus}
          downloadProgress={versionState.downloadProgress}
          error={versionState.error}
          onStartUpdate={versionState.startUpdate}
          onLater={() => {
            versionState.ignoreUpdate();
            versionState.setShowOptionalUpdate(false);
          }}
          onDismissError={versionState.dismissError}
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
