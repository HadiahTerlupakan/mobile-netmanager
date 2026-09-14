import * as Application from 'expo-application'
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

function pickPositiveInt(...candidates: (number | string | null | undefined)[]): number | null {
  for (const candidate of candidates) {
    const n = Number(candidate)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

/**
 * Versi yang dilaporkan aplikasi ke `/api/mobile/app-version/check`.
 *
 * `Application.nativeBuildVersion` dibaca dari binary yang benar-benar
 * terpasang, jadi ia satu-satunya sumber yang selalu benar. Nilai di `app.json`
 * dipatok manual dan tidak pernah ikut naik — EAS memakai
 * `appVersionSource: "remote"` dengan autoIncrement, sehingga build 45 tetap
 * melaporkan dirinya 42 dan setiap aplikasi akan mengira dirinya usang selamanya
 * begitu `app_releases` dinaikkan, termasuk yang baru saja update.
 *
 * `Constants.platform` sebelumnya dicoba lebih dulu, tetapi ia bagian manifest
 * klasik yang tidak ada lagi di build Expo SDK 54 — selalu undefined, sehingga
 * resolusinya selalu jatuh ke `app.json`.
 */
export function resolveAppVersion(
  config?: ExpoVersionConfig,
  nativeBuildVersion: string | null | undefined = Application.nativeBuildVersion,
) {
  const versionCode =
    pickPositiveInt(
      nativeBuildVersion,
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

export function getOtaUpdateId(): string {
  return Updates.updateId || 'embedded'
}

export function getOtaUpdateIdShort(): string {
  const id = getOtaUpdateId()
  if (id === 'embedded') return 'embedded'
  return id.replace(/-/g, '').slice(0, 8)
}

export function getAppVersionLabel(): string {
  const ota = getOtaUpdateIdShort()
  return `RADPRO v${CURRENT_VERSION_NAME} (Build ${CURRENT_VERSION_CODE_LABEL} · OTA #${ota})`
}
