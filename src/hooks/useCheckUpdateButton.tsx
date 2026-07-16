import { useState } from 'react'

import { UpdateAvailableModal } from '@/components/molecules/UpdateAvailableModal'
import { CURRENT_VERSION_CODE } from '@/constants/appVersion'
import { useAppVersion } from '@/hooks/useAppVersion'
import { checkApkVersion } from '@/services/apkVersionService'
import type { ApkContactAdmin, ApkLatestVersion } from '@/types/appVersion'
import { logger } from '@/utils/logger'
import { Alert, Platform } from 'react-native'

type UpdateMode = 'ota' | 'apk' | null

interface UseCheckUpdateButtonResult {
  isChecking: boolean
  showUpdateModal: boolean
  updateMode: UpdateMode
  latestOtaVersion: ReturnType<typeof useAppVersion>['latestVersion']
  latestApkRelease: ApkLatestVersion | null
  contactAdmin: ApkContactAdmin | null
  otaDownloadStatus: ReturnType<typeof useAppVersion>['downloadStatus']
  otaDownloadProgress: ReturnType<typeof useAppVersion>['downloadProgress']
  otaError: ReturnType<typeof useAppVersion>['error']
  startOtaUpdate: () => Promise<void>
  dismissOtaError: () => void
  handleCheckUpdate: () => Promise<void>
  closeUpdateModal: () => void
}

export function useCheckUpdateButton(): UseCheckUpdateButtonResult {
  const ota = useAppVersion()

  const [isChecking, setIsChecking] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateMode, setUpdateMode] = useState<UpdateMode>(null)
  const [latestApkRelease, setLatestApkRelease] =
    useState<ApkLatestVersion | null>(null)
  const [contactAdmin, setContactAdmin] = useState<ApkContactAdmin | null>(
    null,
  )

  const handleCheckUpdate = async () => {
    if (Platform.OS === 'ios') {
      Alert.alert('Info', 'Cek update hanya tersedia untuk Android.')
      return
    }

    setIsChecking(true)
    try {
      const [otaResult, apkResult] = await Promise.all([
        ota.checkForUpdate(CURRENT_VERSION_CODE),
        checkApkVersion(),
      ])

      const otaAvailable = otaResult.success && otaResult.updateAvailable
      const apkAvailable = Boolean(apkResult?.updateAvailable)

      if (apkAvailable && apkResult?.latestVersion) {
        setLatestApkRelease(apkResult.latestVersion)
        setContactAdmin(apkResult.contactAdmin)
        setUpdateMode('apk')
        setShowUpdateModal(true)
        return
      }

      if (otaAvailable) {
        setUpdateMode('ota')
        setShowUpdateModal(true)
        return
      }

      Alert.alert('Info', 'Aplikasi Anda sudah versi terbaru.')
    } catch (error) {
      logger.error('Manual update check failed:', error)
      Alert.alert('Error', 'Gagal cek update. Coba lagi nanti.')
    } finally {
      setIsChecking(false)
    }
  }

  const closeUpdateModal = () => {
    setShowUpdateModal(false)
    setUpdateMode(null)
  }

  return {
    isChecking,
    showUpdateModal,
    updateMode,
    latestOtaVersion: ota.latestVersion,
    latestApkRelease,
    contactAdmin,
    otaDownloadStatus: ota.downloadStatus,
    otaDownloadProgress: ota.downloadProgress,
    otaError: ota.error,
    startOtaUpdate: ota.startUpdate,
    dismissOtaError: ota.dismissError,
    handleCheckUpdate,
    closeUpdateModal,
  }
}

export function renderUpdateModal(
  state: UseCheckUpdateButtonResult,
): React.ReactNode {
  if (!state.showUpdateModal || !state.updateMode) return null

  if (state.updateMode === 'apk' && state.latestApkRelease) {
    return (
      <UpdateAvailableModal
        mode="apk"
        visible={state.showUpdateModal}
        release={state.latestApkRelease}
        contactAdmin={state.contactAdmin}
        onLater={state.closeUpdateModal}
      />
    )
  }

  if (state.updateMode === 'ota' && state.latestOtaVersion) {
    return (
      <UpdateAvailableModal
        mode="ota"
        visible={state.showUpdateModal}
        latestVersion={state.latestOtaVersion}
        downloadStatus={state.otaDownloadStatus}
        downloadProgress={state.otaDownloadProgress}
        error={state.otaError}
        onStartUpdate={state.startOtaUpdate}
        onLater={state.closeUpdateModal}
        onDismissError={state.dismissOtaError}
      />
    )
  }

  return null
}