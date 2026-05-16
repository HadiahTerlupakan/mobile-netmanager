import * as Updates from 'expo-updates'
import { useCallback, useEffect, useReducer } from 'react'
import { AppState, AppStateStatus } from 'react-native'

import { logger } from '@/utils/logger'

export type DownloadStatus = 'idle' | 'downloading' | 'installing' | 'error'

/** Legacy shape — Expo Updates tidak melaporkan progress download per-bytes,
 * jadi field ini selalu null. Disimpan agar consumer lama tidak break. */
export interface DownloadProgress {
    totalBytes: number
    downloadedBytes: number
    percentage: number
}

/**
 * Versi info yang ditampilkan ke user. Karena Expo Updates sebenarnya hanya
 * push JS bundle (tidak ada APK), beberapa field shape lama
 * (`version`, `buildNumber`, `apkSize`) sekarang turunan dari Updates API.
 */
export interface AppVersionInfo {
    id: string
    version: string
    buildNumber: number
    versionCode: number
    releaseNotes: string | null
    downloadUrl: string | null
    apkSize: number | null
}

export interface CheckUpdateResult {
    success: boolean
    updateAvailable: boolean
    isForceUpdate: boolean
    currentVersion: string
    latestVersion: AppVersionInfo | null
    error?: string
}

interface VersionState {
    isChecking: boolean
    downloadStatus: DownloadStatus
    updateAvailable: boolean
    isForceUpdate: boolean
    latestVersion: AppVersionInfo | null
    error: string | null
}

type VersionAction =
    | { type: 'CHECK_START' }
    | { type: 'CHECK_NO_UPDATE' }
    | { type: 'CHECK_AVAILABLE'; latestVersion: AppVersionInfo; isForceUpdate: boolean }
    | { type: 'CHECK_ERROR'; error: string }
    | { type: 'DOWNLOAD_START' }
    | { type: 'INSTALL_START' }
    | { type: 'UPDATE_ERROR'; error: string }
    | { type: 'RESET_STATUS' }
    | { type: 'DISMISS_ERROR' }
    | { type: 'IGNORE_UPDATE' }

const initialState: VersionState = {
    isChecking: false,
    downloadStatus: 'idle',
    updateAvailable: false,
    isForceUpdate: false,
    latestVersion: null,
    error: null,
}

function versionReducer(state: VersionState, action: VersionAction): VersionState {
    switch (action.type) {
        case 'CHECK_START':
            return { ...state, isChecking: true, error: null }
        case 'CHECK_NO_UPDATE':
            return {
                ...state,
                isChecking: false,
                updateAvailable: false,
                isForceUpdate: false,
                latestVersion: null,
            }
        case 'CHECK_AVAILABLE':
            return {
                ...state,
                isChecking: false,
                updateAvailable: true,
                isForceUpdate: action.isForceUpdate,
                latestVersion: action.latestVersion,
            }
        case 'CHECK_ERROR':
            return { ...state, isChecking: false, error: action.error }
        case 'DOWNLOAD_START':
            return { ...state, downloadStatus: 'downloading', error: null }
        case 'INSTALL_START':
            return { ...state, downloadStatus: 'installing' }
        case 'UPDATE_ERROR':
            return { ...state, downloadStatus: 'error', error: action.error }
        case 'RESET_STATUS':
            return { ...state, downloadStatus: 'idle' }
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
    /** Trigger manual check. Argument legacy (versionCode) sekarang diabaikan. */
    checkForUpdate: (currentVersionCode?: number) => Promise<CheckUpdateResult>
    startUpdate: () => Promise<void>
    dismissError: () => void
    ignoreUpdate: () => void
}

function buildLatestVersionFromManifest(
    manifest: Updates.Manifest | null,
): AppVersionInfo {
    const id = manifest?.id ?? 'pending-update'
    const runtimeVersion =
        manifest && 'runtimeVersion' in manifest && typeof manifest.runtimeVersion === 'string'
            ? manifest.runtimeVersion
            : Updates.runtimeVersion ?? '0.0.0'
    const extra =
        manifest && 'extra' in manifest && typeof manifest.extra === 'object'
            ? (manifest.extra as Record<string, unknown>)
            : null
    const releaseNotesRaw = extra?.releaseNotes
    const releaseNotes = typeof releaseNotesRaw === 'string' ? releaseNotesRaw : null

    return {
        id,
        version: runtimeVersion,
        buildNumber: 0,
        versionCode: 0,
        releaseNotes,
        downloadUrl: null,
        apkSize: null,
    }
}

export function useAppVersion(): UseAppVersionState {
    const [state, dispatch] = useReducer(versionReducer, initialState)

    const checkForUpdate = useCallback(async (): Promise<CheckUpdateResult> => {
        if (__DEV__ || !Updates.isEnabled) {
            dispatch({ type: 'CHECK_NO_UPDATE' })
            return {
                success: true,
                updateAvailable: false,
                isForceUpdate: false,
                currentVersion: Updates.runtimeVersion ?? '',
                latestVersion: null,
            }
        }

        dispatch({ type: 'CHECK_START' })
        try {
            const result = await Updates.checkForUpdateAsync()
            if (!result.isAvailable) {
                dispatch({ type: 'CHECK_NO_UPDATE' })
                return {
                    success: true,
                    updateAvailable: false,
                    isForceUpdate: false,
                    currentVersion: Updates.runtimeVersion ?? '',
                    latestVersion: null,
                }
            }
            const latestVersion = buildLatestVersionFromManifest(result.manifest ?? null)
            dispatch({
                type: 'CHECK_AVAILABLE',
                latestVersion,
                // Expo Updates tidak expose force flag native — diturunkan dari extra metadata.
                isForceUpdate: Boolean(
                    result.manifest && 'extra' in result.manifest && (result.manifest.extra as Record<string, unknown>)?.forceUpdate === true,
                ),
            })
            return {
                success: true,
                updateAvailable: true,
                isForceUpdate: false,
                currentVersion: Updates.runtimeVersion ?? '',
                latestVersion,
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Gagal cek update'
            logger.error('[Update] Check failed:', err)
            dispatch({ type: 'CHECK_ERROR', error: errorMsg })
            return {
                success: false,
                updateAvailable: false,
                isForceUpdate: false,
                currentVersion: Updates.runtimeVersion ?? '',
                latestVersion: null,
                error: errorMsg,
            }
        }
    }, [])

    const startUpdate = useCallback(async () => {
        if (__DEV__ || !Updates.isEnabled) {
            dispatch({ type: 'UPDATE_ERROR', error: 'Update tidak diaktifkan untuk build ini' })
            return
        }

        dispatch({ type: 'DOWNLOAD_START' })
        try {
            const fetched = await Updates.fetchUpdateAsync()
            if (!fetched.isNew) {
                dispatch({ type: 'RESET_STATUS' })
                return
            }
            dispatch({ type: 'INSTALL_START' })
            await Updates.reloadAsync()
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Gagal apply update'
            logger.error('[Update] Apply failed:', err)
            dispatch({ type: 'UPDATE_ERROR', error: errorMsg })
        }
    }, [])

    // Recheck saat app kembali aktif (pull-to-refresh implicit).
    useEffect(() => {
        const handler = (next: AppStateStatus) => {
            if (next === 'active') {
                checkForUpdate().catch(() => undefined)
            }
        }
        const subscription = AppState.addEventListener('change', handler)
        return () => subscription.remove()
    }, [checkForUpdate])

    const dismissError = useCallback(() => {
        dispatch({ type: 'DISMISS_ERROR' })
    }, [])

    const ignoreUpdate = useCallback(() => {
        dispatch({ type: 'IGNORE_UPDATE' })
    }, [])

    return {
        ...state,
        downloadProgress: null,
        checkForUpdate,
        startUpdate,
        dismissError,
        ignoreUpdate,
    }
}
