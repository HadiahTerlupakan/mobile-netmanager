import { AppVersionInfo, appVersionService, CheckUpdateResult, DownloadProgress } from '@/services/AppVersionService'
import { eventManager } from '@/utils/EventManager'
import { logger } from '@/utils/logger'
import { Storage } from '@/utils/storage'
import { useCallback, useEffect, useState } from 'react'
import { AppState, AppStateStatus, Platform } from 'react-native'

export type DownloadStatus = 'idle' | 'downloading' | 'installing' | 'error'

const IGNORED_VERSION_KEY = 'ignored_app_version'

export interface UseAppVersionState {
    isChecking: boolean
    downloadStatus: DownloadStatus
    downloadProgress: DownloadProgress | null
    updateAvailable: boolean
    isForceUpdate: boolean
    latestVersion: AppVersionInfo | null
    error: string | null
    checkForUpdate: (currentVersionCode: number) => Promise<CheckUpdateResult>
    startUpdate: () => Promise<void>
    dismissError: () => void
    ignoreUpdate: () => void
}

export function useAppVersion(): UseAppVersionState {
    const [isChecking, setIsChecking] = useState(false)
    const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [isForceUpdate, setIsForceUpdate] = useState(false)
    const [latestVersion, setLatestVersion] = useState<AppVersionInfo | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Listen for app coming to foreground (returning from settings)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // Check if we have a pending install
                const pendingUri = appVersionService.getPendingApkUri()
                if (pendingUri) {
                    logger.info('[Update] Resuming pending install...', pendingUri)
                    setDownloadStatus('installing')
                    // Give a small delay to ensure UI is ready
                    setTimeout(async () => {
                        await appVersionService.retryPendingInstall()
                        // We keep status as installing, if it fails alert will show
                        // StartUpdate will reset status to idle if needed, or user can dismiss
                        setDownloadStatus('idle')
                    }, 1000)
                }
            }
        }

        const subscription = AppState.addEventListener('change', handleAppStateChange)

        // Register with EventManager
        eventManager.addListener('appVersion', handleAppStateChange, () => subscription.remove())

        return () => {
            eventManager.removeListener('appVersion', handleAppStateChange)
        }
    }, [])

    const checkForUpdate = useCallback(async (currentVersionCode: number): Promise<CheckUpdateResult> => {
        setIsChecking(true)
        setError(null)

        try {
            const result = await appVersionService.checkForUpdate(currentVersionCode)

            if (result.success) {
                // Check if this version is ignored
                const ignoredVersion = await Storage.getItem(IGNORED_VERSION_KEY)
                const isIgnored = !result.isForceUpdate &&
                    result.latestVersion?.version &&
                    result.latestVersion.version === ignoredVersion

                if (isIgnored) {
                    logger.info('[Update] Ignoring version:', ignoredVersion)
                    setUpdateAvailable(false)
                    setIsForceUpdate(false)
                    setLatestVersion(null)
                } else {
                    setUpdateAvailable(result.updateAvailable)
                    setIsForceUpdate(result.isForceUpdate)
                    setLatestVersion(result.latestVersion)
                }
            } else {
                setError(result.error || 'Gagal cek update')
            }

            return result
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Gagal cek update'
            setError(errorMsg)
            return {
                success: false,
                updateAvailable: false,
                isForceUpdate: false,
                currentVersion: '',
                latestVersion: null,
                error: errorMsg
            }
        } finally {
            setIsChecking(false)
        }
    }, [])

    // Single button: Download -> Install automatically
    const startUpdate = useCallback(async () => {
        if (!latestVersion || !latestVersion.id) {
            setError('Tidak ada update')
            return
        }

        if (Platform.OS !== 'android') {
            setError('Update APK hanya untuk Android')
            return
        }

        logger.info('[Update] Starting update process...')
        setDownloadStatus('downloading')
        setDownloadProgress(null)
        setError(null)

        try {
            const filename = `netmanager_v${latestVersion.version}.apk`

            logger.info('[Update] Downloading APK...')
            const fileUri = await appVersionService.downloadApk(
                latestVersion.id,
                filename,
                latestVersion.hash,
                latestVersion.downloadUrl,
                (progress) => {
                    setDownloadProgress(progress)
                }
            )

            if (!fileUri) {
                throw new Error('Gagal mengunduh file APK')
            }

            logger.info('[Update] Download complete, installing...')
            setDownloadStatus('installing')

            // Try to install
            const isInstalling = await appVersionService.installApk(fileUri)
            
            // If installApk returns false, it means it's waiting for permission or failed.
            // We should NOT reset to idle if it's waiting for permission (pendingApkUri is set).
            if (isInstalling) {
                // Keep status as installing while the OS package installer takes over
            } else if (!appVersionService.getPendingApkUri()) {
                // If not pending and not installing, it failed.
                setDownloadStatus('idle')
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Gagal update'
            logger.error('[Update] Error:', errorMessage)
            setError(errorMessage)
            setDownloadStatus('error')
            return
        }
    }, [latestVersion])



    const dismissError = useCallback(() => {
        setError(null)
        setDownloadStatus('idle')
    }, [])

    const ignoreUpdate = useCallback(async () => {
        if (latestVersion?.version) {
            await Storage.setItem(IGNORED_VERSION_KEY, latestVersion.version)
            setUpdateAvailable(false)
            setLatestVersion(null)
        }
    }, [latestVersion])

    return {
        isChecking,
        downloadStatus,
        downloadProgress,
        updateAvailable,
        isForceUpdate,
        latestVersion,
        error,
        checkForUpdate,
        startUpdate,
        dismissError,
        ignoreUpdate
    }
}
