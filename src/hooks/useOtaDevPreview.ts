import type {
  AppVersionInfo,
  DownloadProgress,
  DownloadStatus,
} from '@/hooks/useAppVersion'

type PreviewMode = 'optional' | 'force' | 'busy-download' | 'busy-install' | null

/**
 * Dev-only OTA preview. Aktif hanya saat __DEV__ dan env
 * EXPO_PUBLIC_OTA_DEV_PREVIEW di-set ke salah satu mode di atas.
 *
 * Tidak menyentuh expo-updates native module — purely mock state buat
 * verifikasi UI flow (modal & required screen + banner busy).
 */
export interface OtaDevPreview {
  active: boolean
  isForceUpdate: boolean
  showOptionalUpdate: boolean
  downloadStatus: DownloadStatus
  downloadProgress: DownloadProgress | null
  latestVersion: AppVersionInfo
}

const DUMMY_VERSION: AppVersionInfo = {
  id: 'dev-preview-update',
  version: '1.0.8',
  buildNumber: 99,
  versionCode: 99,
  releaseNotes:
    '• Perbaikan stabilitas modal update\n• Banner peringatan saat download/install\n• Optimisasi sync FCM token',
  downloadUrl: null,
  apkSize: 6 * 1024 * 1024,
}

function resolveMode(): PreviewMode {
  if (!__DEV__) return null
  const raw = process.env.EXPO_PUBLIC_OTA_DEV_PREVIEW?.trim().toLowerCase()
  if (
    raw === 'optional' ||
    raw === 'force' ||
    raw === 'busy-download' ||
    raw === 'busy-install'
  ) {
    return raw
  }
  return null
}

export function useOtaDevPreview(): OtaDevPreview | null {
  const mode = resolveMode()
  if (!mode) return null

  const downloadStatus: DownloadStatus =
    mode === 'busy-download'
      ? 'downloading'
      : mode === 'busy-install'
        ? 'installing'
        : 'idle'

  const downloadProgress: DownloadProgress | null =
    mode === 'busy-download'
      ? { totalBytes: 6 * 1024 * 1024, downloadedBytes: 2 * 1024 * 1024, percentage: 33 }
      : null

  return {
    active: true,
    isForceUpdate: mode === 'force',
    showOptionalUpdate: mode !== 'force',
    downloadStatus,
    downloadProgress,
    latestVersion: DUMMY_VERSION,
  }
}
