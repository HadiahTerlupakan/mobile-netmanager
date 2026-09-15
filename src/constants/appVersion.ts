import * as Application from 'expo-application'
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'

/**
 * Dipakai hanya bila versionCode tidak terbaca dari binary maupun app config.
 *
 * Nilainya sengaja 0 — lebih rendah dari build mana pun. Angka ini ikut
 * ditandatangani ke JWT saat login dan dipakai server untuk gerbang
 * MOBILE_MIN_NATIVE_VERSION_CODE, serta dibandingkan dengan `app_releases`.
 * Nilai lama (53) lebih tinggi dari build sungguhan: aplikasi yang jatuh ke
 * cadangan tidak pernah ditawari update dan lolos gerbang versi minimum.
 * Versi yang tidak terbaca diperlakukan sebagai yang tertua; akibat terburuknya
 * diminta update dari Play Store, yang terlihat dan bisa dipulihkan.
 */
export const FALLBACK_VERSION_CODE = 0
export const FALLBACK_VERSION_NAME = '1.0.0'

export type VersionCodeSource = 'native' | 'config' | 'fallback'

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
  nativeApplicationVersion: string | null | undefined = Application.nativeApplicationVersion,
) {
  const dariNative = pickPositiveInt(nativeBuildVersion)
  const dariConfig = pickPositiveInt(config?.android?.versionCode, config?.extra?.versionCode)

  const versionCodeSource: VersionCodeSource =
    dariNative !== null ? 'native' : dariConfig !== null ? 'config' : 'fallback'
  const versionCode = dariNative ?? dariConfig ?? FALLBACK_VERSION_CODE

  // Nama versi mengikuti aturan yang sama: binary dulu, app.json yang dipatok
  // manual hanya sebagai cadangan.
  const versionName =
    nativeApplicationVersion?.trim() || config?.version?.trim() || FALLBACK_VERSION_NAME

  return { versionCode, versionName, versionCodeSource }
}

type ResolvedAppVersion = ReturnType<typeof resolveAppVersion>

/** Label versi untuk layar dan laporan; versi cadangan ditandai jelas. */
export function formatAppVersionLabel(version: ResolvedAppVersion, otaIdShort: string): string {
  const build =
    version.versionCodeSource === 'fallback'
      ? 'Build tidak terbaca'
      : `Build ${version.versionCode}`
  return `RADPRO v${version.versionName} (${build} · OTA #${otaIdShort})`
}

const currentAppVersion = resolveAppVersion(
  Constants.expoConfig as ExpoVersionConfig | undefined,
)

export const CURRENT_VERSION_CODE = currentAppVersion.versionCode
export const CURRENT_VERSION_NAME = currentAppVersion.versionName
export const CURRENT_VERSION_CODE_SOURCE = currentAppVersion.versionCodeSource
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
  return formatAppVersionLabel(currentAppVersion, getOtaUpdateIdShort())
}
