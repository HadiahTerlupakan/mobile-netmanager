import { useEffect, useState } from 'react'

import { User } from '@/context/AuthContext'
import { useAppVersion } from '@/hooks/useAppVersion'
import { useApkVersionCheck } from '@/hooks/useApkVersionCheck'

/**
 * Orchestrator untuk APK + OTA update flow.
 *
 * Priority:
 * 1. APK force update → block app dengan UpdateRequiredScreen
 * 2. APK soft update → tampilkan UpdateAvailableModal (skippable),
 *    OTA tetap jalan di background
 * 3. No APK update → OTA flow normal
 */
export function useVersionCheck(_user: User | null, _token: string | null) {
  const apk = useApkVersionCheck()
  const ota = useAppVersion()

  const [versionChecked, setVersionChecked] = useState(false)
  const [showApkOptional, setShowApkOptional] = useState(false)
  const [showOtaOptional, setShowOtaOptional] = useState(false)

  // OTA cek hanya kalau APK tidak force update
  useEffect(() => {
    let cancelled = false
    if (apk.isForceUpdate) {
      setVersionChecked(true)
      return
    }
    const run = async () => {
      try {
        await ota.checkForUpdate()
      } finally {
        if (!cancelled) setVersionChecked(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // Sengaja depend pada `ota.checkForUpdate` (function ref stable
    // dari useCallback di hook), bukan object `ota` yang re-create
    // tiap render → infinite re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apk.isForceUpdate, ota.checkForUpdate])

  // Tampilkan modal APK soft kalau available
  useEffect(() => {
    if (apk.apkUpdateAvailable && !apk.isForceUpdate) {
      setShowApkOptional(true)
    } else {
      setShowApkOptional(false)
    }
  }, [apk.apkUpdateAvailable, apk.isForceUpdate])

  useEffect(() => {
    setShowOtaOptional(false)
  }, [])

  return {
    versionChecked,
    isChecking: apk.isChecking || ota.isChecking,

    // APK fields
    isApkForceUpdate: apk.isForceUpdate,
    apkUpdateAvailable: apk.apkUpdateAvailable,
    showApkOptional,
    setShowApkOptional,
    latestApkRelease: apk.latestRelease,
    contactAdmin: apk.contactAdmin,
    onIgnoreApk: apk.ignoreApkUpdate,
    onRecheckApk: apk.checkApkVersion,

    // OTA fields
    isOtaForceUpdate: ota.isForceUpdate,
    showOtaOptional,
    setShowOtaOptional,
    latestOtaVersion: ota.latestVersion,
    otaDownloadStatus: ota.downloadStatus,
    otaError: ota.error,
    onStartOtaUpdate: ota.startUpdate,
    onDismissOtaError: ota.dismissError,
    onIgnoreOta: ota.ignoreUpdate,
  }
}
