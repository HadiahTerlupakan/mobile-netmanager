import { Platform } from 'react-native'

import { CURRENT_VERSION_CODE, CURRENT_VERSION_NAME } from '@/constants/appVersion'
import api from '@/services/api'
import { logger } from '@/utils/logger'
import type { ApkVersionCheckResponse } from '@/types/appVersion'

/** Returns the current app version and version code from expo-constants. */
export function getCurrentNativeVersion(): {
  version: string
  versionCode: number
} {
  return {
    version: CURRENT_VERSION_NAME,
    versionCode: CURRENT_VERSION_CODE,
  }
}

/** Checks APK version against the server. Returns null on failure (graceful degrade). */
export async function checkApkVersion(): Promise<ApkVersionCheckResponse | null> {
  try {
    const { version, versionCode } = getCurrentNativeVersion()
    const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android'

    const response = await api.get<ApkVersionCheckResponse>(
      '/api/mobile/app-version/check',
      {
        params: {
          platform,
          currentVersion: version,
          currentVersionCode: versionCode,
        },
        skipErrorToast: true,
      },
    )

    return response.data
  } catch (error) {
    logger.warn('[ApkVersion] Check failed (graceful degrade):', error)
    return null
  }
}
