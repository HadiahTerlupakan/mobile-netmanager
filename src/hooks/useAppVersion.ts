import { AppVersionInfo, appVersionService, CheckUpdateResult, DownloadProgress } from '@/services/AppVersionService'
import { eventManager } from '@/utils/EventManager'
import { logger } from '@/utils/logger'
import { Storage } from '@/utils/storage'
import { useCallback, useEffect, useReducer } from 'react'
import { AppState, AppStateStatus, Platform } from 'react-native'

export type DownloadStatus = 'idle' | 'downloading' | 'installing' | 'error'

const IGNORED_VERSION_KEY = 'ignored_app_version'

interface VersionState {
    isChecking: boolean
    downloadStatus: DownloadStatus
    downloadProgress: DownloadProgress | null
    updateAvailable: boolean
    isForceUpdate: boolean
    latestVersion: AppVersionInfo | null
    error: string | null
}

type VersionAction =
    | { type: 'CHECK_START' }
    | { type: 'CHECK_SUCCESS'; updateAvailable: boolean; isForceUpdate: boolean; latestVersion: AppVersionInfo | null }
    | { type: 'CHECK_IGNORED' }
    | { type: 'CHECK_ERROR'; error: string }
    | { type: 'DOWNLOAD_START' }
    | { type: 'DOWNLOAD_PROGRESS'; progress: DownloadProgress }
    | { type: 'INSTALL_START' }
    | { type: 'UPDATE_ERROR'; error: string }
    | { type: 'RESET_STATUS' }
    | { type: 'APPLY_FORCE_UPDATE'; latestVersion: AppVersionInfo | null; error?: string }
    | { type: 'DISMISS_ERROR' }
    | { type: 'IGNORE_UPDATE' }

const initialState: VersionState = {
    isChecking: false,
    downloadStatus: 'idle',
    downloadProgress: null,
    updateAvailable: false,
    isForceUpdate: false,
    latestVersion: null,
    error: null,
}

function versionReducer(state: VersionState, action: VersionAction): VersionState {
    switch (action.type) {
        case 'CHECK_START':
            return { ...state, isChecking: true, error: null }
        case 'CHECK_SUCCESS':
            return {
                ...state,
                isChecking: false,
                updateAvailable: action.updateAvailable,
                isForceUpdate: action.isForceUpdate,
                latestVersion: action.latestVersion,
            }
        case 'CHECK_IGNORED':
            return {
                ...state,
                isChecking: false,
                updateAvailable: false,
                isForceUpdate: false,
                latestVersion: null,
            }
        case 'CHECK_ERROR':
            return { ...state, isChecking: false, error: action.error }
        case 'DOWNLOAD_START':
            return { ...state, downloadStatus: 'downloading', downloadProgress: null, error: null }
        case 'DOWNLOAD_PROGRESS':
            return { ...state, downloadProgress: action.progress }
        case 'INSTALL_START':
            return { ...state, downloadStatus: 'installing' }
        case 'UPDATE_ERROR':
            return { ...state, downloadStatus: 'error', error: action.error }
        case 'RESET_STATUS':
            return { ...state, downloadStatus: 'idle' }
        case 'APPLY_FORCE_UPDATE':
            return {
                ...state,
                updateAvailable: true,
                isForceUpdate: true,
                latestVersion: action.latestVersion,
                error: action.error || null,
            }
        case 'DISMISS_ERROR':
            return { ...state, error: null, downloadStatus: 'idle' }
        case 'IGNORE_UPDATE':
            return { ...state, updateAvailable: false, latestVersion: null }
        default:
            return state
    }
}

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
    applyVersionRequirement: (versionInfo: AppVersionInfo | null) => void
    dismissError: () => void
    ignoreUpdate: () => void
}

export function useAppVersion(): UseAppVersionState {
    const [state, dispatch] = useReducer(versionReducer, initialState)

    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                const pendingUri = appVersionService.getPendingApkUri()
                if (pendingUri) {
                    logger.info('[Update] Resuming pending install...', pendingUri)
                    dispatch({ type: 'INSTALL_START' })
                    setTimeout(async () => {
                        await appVersionService.retryPendingInstall()
                        dispatch({ type: 'RESET_STATUS' })
                    }, 1000)
                }
            }
        }

        const subscription = AppState.addEventListener('change', handleAppStateChange)
        eventManager.addListener('appVersion', handleAppStateChange, () => subscription.remove())

        return () => {
            eventManager.removeListener('appVersion', handleAppStateChange)
        }
    }, [])

    const checkForUpdate = useCallback(async (currentVersionCode: number): Promise<CheckUpdateResult> => {
        dispatch({ type: 'CHECK_START' })

        try {
            const result = await appVersionService.checkForUpdate(currentVersionCode)

            if (result.success) {
                const ignoredVersion = await Storage.getItem(IGNORED_VERSION_KEY)
                const isIgnored = !result.isForceUpdate &&
                    result.latestVersion?.version &&
                    result.latestVersion.version === ignoredVersion

                if (isIgnored) {
                    logger.info('[Update] Ignoring version:', ignoredVersion)
                    dispatch({ type: 'CHECK_IGNORED' })
                } else {
                    dispatch({
                        type: 'CHECK_SUCCESS',
                        updateAvailable: result.updateAvailable,
                        isForceUpdate: result.isForceUpdate,
                        latestVersion: result.latestVersion,
                    })
                }
            } else {
                dispatch({ type: 'CHECK_ERROR', error: result.error || 'Gagal cek update' })
            }

            return result
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Gagal cek update'
            dispatch({ type: 'CHECK_ERROR', error: errorMsg })
            return {
                success: false,
                updateAvailable: false,
                isForceUpdate: false,
                currentVersion: '',
                latestVersion: null,
                error: errorMsg
            }
        }
    }, [])

    const startUpdate = useCallback(async () => {
        if (!state.latestVersion || !state.latestVersion.id) {
            dispatch({ type: 'UPDATE_ERROR', error: 'Tidak ada update' })
            return
        }

        if (Platform.OS !== 'android') {
            dispatch({ type: 'UPDATE_ERROR', error: 'Update APK hanya untuk Android' })
            return
        }

        logger.info('[Update] Starting update process...')
        dispatch({ type: 'DOWNLOAD_START' })

        try {
            const filename = `netmanager_v${state.latestVersion.version}.apk`

            logger.info('[Update] Downloading APK...')
            const fileUri = await appVersionService.downloadApk(
                state.latestVersion.id,
                filename,
                state.latestVersion.hash,
                (progress) => {
                    dispatch({ type: 'DOWNLOAD_PROGRESS', progress })
                }
            )

            if (!fileUri) {
                throw new Error('Gagal mengunduh file APK')
            }

            logger.info('[Update] Download complete, installing...')
            dispatch({ type: 'INSTALL_START' })

            await appVersionService.installApk(fileUri)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Gagal update'
            logger.error('[Update] Error:', errorMessage)
            dispatch({ type: 'UPDATE_ERROR', error: errorMessage })
            return
        }

        dispatch({ type: 'RESET_STATUS' })
    }, [state.latestVersion])

    const applyVersionRequirement = useCallback((versionInfo: AppVersionInfo | null) => {
        if (!versionInfo) {
            dispatch({
                type: 'APPLY_FORCE_UPDATE',
                latestVersion: null,
                error: 'Versi aplikasi tidak didukung. Silakan unduh APK terbaru.',
            })
            return
        }
        dispatch({ type: 'APPLY_FORCE_UPDATE', latestVersion: versionInfo })
    }, [])

    const dismissError = useCallback(() => {
        dispatch({ type: 'DISMISS_ERROR' })
    }, [])

    const ignoreUpdate = useCallback(async () => {
        if (state.latestVersion?.version) {
            await Storage.setItem(IGNORED_VERSION_KEY, state.latestVersion.version)
            dispatch({ type: 'IGNORE_UPDATE' })
        }
    }, [state.latestVersion])

    return {
        ...state,
        checkForUpdate,
        startUpdate,
        applyVersionRequirement,
        dismissError,
        ignoreUpdate
    }
}
