import { AppVersionInfo, appVersionService, CheckUpdateResult, DownloadProgress } from '@/services/AppVersionService'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'

export type DownloadStatus = 'idle' | 'downloading' | 'installing' | 'error'

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
    openBrowserDownload: () => Promise<void>
    dismissError: () => void
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
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                // Check if we have a pending install
                const pendingUri = appVersionService.getPendingApkUri()
                if (pendingUri) {
                    console.log('[Update] Resuming pending install...', pendingUri)
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
        })

        return () => {
            subscription.remove()
        }
    }, [])

    const checkForUpdate = useCallback(async (currentVersionCode: number): Promise<CheckUpdateResult> => {
        setIsChecking(true)
        setError(null)

        try {
            const result = await appVersionService.checkForUpdate(currentVersionCode)
            
            if (result.success) {
                setUpdateAvailable(result.updateAvailable)
                setIsForceUpdate(result.isForceUpdate)
                setLatestVersion(result.latestVersion)
            } else {
                setError(result.error || 'Gagal cek update')
            }

            return result
        } catch (err: any) {
            const errorMsg = err.message || 'Gagal cek update'
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

        console.log('[Update] Starting update process...')
        setDownloadStatus('downloading')
        setDownloadProgress(null)
        setError(null)

        try {
            const filename = `netmanager_v${latestVersion.version}.apk`
            
            console.log('[Update] Downloading APK...')
            const fileUri = await appVersionService.downloadApk(
                latestVersion.id,
                filename,
                (progress) => {
                    setDownloadProgress(progress)
                }
            )

            if (!fileUri) {
                throw new Error('Gagal mengunduh file APK')
            }

            console.log('[Update] Download complete, installing...')
            setDownloadStatus('installing')
            
            // Try to install
            await appVersionService.installApk(fileUri)
            // Note: installApk checks permissions internally and might open settings.
            // If it opens settings, the AppState listener above will catch the return.

        } catch (err: any) {
            console.error('[Update] Error:', err.message)
            setError(err.message || 'Gagal update')
            setDownloadStatus('error')
            return
        }

        // Reset to idle so user can retry
        setDownloadStatus('idle')
    }, [latestVersion])

    const openBrowserDownload = useCallback(async () => {
        if (!latestVersion || !latestVersion.id) {
            setError('Tidak ada update')
            return
        }

        console.log('[Update] Opening browser download...')
        try {
            await appVersionService.openBrowserDownload(latestVersion.id)
        } catch (err: any) {
            setError(err.message || 'Gagal buka browser')
        }
    }, [latestVersion])

    const dismissError = useCallback(() => {
        setError(null)
        setDownloadStatus('idle')
    }, [])

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
        openBrowserDownload,
        dismissError
    }
}
