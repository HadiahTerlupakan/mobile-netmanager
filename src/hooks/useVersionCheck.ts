import { User } from '@/context/AuthContext';
import { CURRENT_VERSION_CODE, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { Config } from '@/constants/Config';
import { Events } from '@/constants/Events';
import { useAppVersion } from '@/hooks/useAppVersion';
import { appVersionService } from '@/services/AppVersionService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

/**
 * Handle app version checking and update flow
 * - Auto check for updates on mount
 * - Report version to backend after login
 * - Listen for unsupported version events
 * - Manage optional update modal state
 */
export function useVersionCheck(user: User | null, token: string | null) {
  const {
    isChecking,
    downloadStatus,
    downloadProgress,
    updateAvailable,
    isForceUpdate,
    latestVersion,
    error,
    checkForUpdate,
    startUpdate,
    applyVersionRequirement,
    dismissError,
    ignoreUpdate,
  } = useAppVersion();

  const [versionChecked, setVersionChecked] = useState(false);
  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);

  // Check for app updates on mount (Android APK only)
  useEffect(() => {
    if (!Config.CAN_AUTO_CHECK_APP_UPDATES) {
      setVersionChecked(true);
      logger.info('[Update] Auto check skipped for current build');
      return;
    }

    const checkUpdate = async () => {
      try {
        await checkForUpdate(CURRENT_VERSION_CODE);
      } catch (e) {
        logger.error('Failed to check for updates:', e);
        errorReportingService.captureException(
          e instanceof Error ? e : new Error('Failed to check for updates'),
          {
            source: 'root.checkUpdate',
          }
        );
      } finally {
        setVersionChecked(true);
      }
    };
    checkUpdate();
  }, [checkForUpdate]);

  // Report App Version after login
  useEffect(() => {
    let reportTimer: ReturnType<typeof setTimeout>;

    if (user && token) {
      // Throttle version reporting to avoid congestion on startup
      reportTimer = setTimeout(() => {
        appVersionService
          .reportVersion(CURRENT_VERSION_CODE, CURRENT_VERSION_NAME, token)
          .catch((e) => {
            logger.error('Failed to report version:', e);
          });
      }, 5000);
    }

    return () => {
      if (reportTimer) clearTimeout(reportTimer);
    };
  }, [user, token]);

  // Listen for unsupported version events
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      Events.APP_VERSION_UNSUPPORTED,
      (payload?: {
        details?: { latestVersion?: typeof latestVersion };
        latestVersion?: typeof latestVersion;
      }) => {
        const forcedVersion =
          payload?.details?.latestVersion ?? payload?.latestVersion ?? null;
        applyVersionRequirement(forcedVersion ?? null);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [applyVersionRequirement]);

  // Show update modal when available (and not forced)
  useEffect(() => {
    if (updateAvailable && !isForceUpdate) {
      setShowOptionalUpdate(true);
    }
  }, [updateAvailable, isForceUpdate]);

  return {
    isChecking,
    versionChecked,
    showOptionalUpdate,
    setShowOptionalUpdate,
    downloadStatus,
    downloadProgress,
    updateAvailable,
    isForceUpdate,
    latestVersion,
    error,
    startUpdate,
    dismissError,
    ignoreUpdate,
  };
}
