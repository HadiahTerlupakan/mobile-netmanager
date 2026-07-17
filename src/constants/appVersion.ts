import Constants from 'expo-constants'
import * as Updates from 'expo-updates'

export const FALLBACK_VERSION_CODE = 53
export const FALLBACK_VERSION_NAME = '1.0.0'

type ExpoVersionConfig = {
  version?: string | null
  extra?: {
    versionCode?: number | string | null
  } | null
  android?: {
    versionCode?: number | null
  } | null
}

function pickPositiveInt(...candidates: Array<number | string | null | undefined>): number | null {
  for (const candidate of candidates) {
    const n = Number(candidate)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

export function resolveAppVersion(config?: ExpoVersionConfig) {
  const platformAndroid = (
    Constants as {
      platform?: { android?: { versionCode?: number | null } }
    }
  ).platform?.android?.versionCode

  const versionCode =
    pickPositiveInt(
      platformAndroid,
      config?.android?.versionCode,
      config?.extra?.versionCode,
    ) ?? FALLBACK_VERSION_CODE

  const versionName = config?.version?.trim() || FALLBACK_VERSION_NAME

  return { versionCode, versionName }
}

const currentAppVersion = resolveAppVersion(
  Constants.expoConfig as ExpoVersionConfig | undefined,
)

export const CURRENT_VERSION_CODE = currentAppVersion.versionCode
export const CURRENT_VERSION_NAME = currentAppVersion.versionName
export const CURRENT_VERSION_CODE_LABEL = String(CURRENT_VERSION_CODE)

export function getOtaUpdateIdShort(): string {
  const id = Updates.updateId
  if (!id) return 'embedded'
  return id.replace(/-/g, '').slice(0, 8)
}

export function getAppVersionLabel(): string {
  const ota = getOtaUpdateIdShort()
  return `RADPRO v${CURRENT_VERSION_NAME} (Build ${CURRENT_VERSION_CODE_LABEL} · OTA #${ota})`
}
