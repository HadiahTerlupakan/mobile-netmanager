export interface ApkVersionCheckResponse {
  updateAvailable: boolean
  isForceUpdate: boolean
  currentVersion: string
  latestVersion: ApkLatestVersion | null
  contactAdmin: ApkContactAdmin | null
}

export interface ApkLatestVersion {
  version: string
  versionCode: number
  releaseNotes: string | null
  downloadUrl: string
  apkSizeBytes: number | null
  releasedAt: string
}

export interface ApkContactAdmin {
  url: string
  label: string | null
}
