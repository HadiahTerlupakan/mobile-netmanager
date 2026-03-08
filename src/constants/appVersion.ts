import Constants from 'expo-constants'

export const FALLBACK_VERSION_CODE = 53
export const FALLBACK_VERSION_NAME = '1.0.0'

type ExpoVersionConfig = {
  version?: string | null
  extra?: {
    versionCode?: number | string | null
  } | null
}

export function resolveAppVersion(config?: ExpoVersionConfig) {
  const rawVersionCode = Number(config?.extra?.versionCode)
  const versionCode = Number.isFinite(rawVersionCode) && rawVersionCode > 0
    ? rawVersionCode
    : FALLBACK_VERSION_CODE

  const versionName = config?.version?.trim() || FALLBACK_VERSION_NAME

  return {
    versionCode,
    versionName
  }
}

const currentAppVersion = resolveAppVersion(Constants.expoConfig as ExpoVersionConfig | undefined)

export const CURRENT_VERSION_CODE = currentAppVersion.versionCode
export const CURRENT_VERSION_NAME = currentAppVersion.versionName
export const CURRENT_VERSION_CODE_LABEL = String(CURRENT_VERSION_CODE)
