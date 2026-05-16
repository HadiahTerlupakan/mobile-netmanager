import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'

import { checkApkVersion } from '@/services/apkVersionService'
import type {
  ApkContactAdmin,
  ApkLatestVersion,
} from '@/types/appVersion'
import { logger } from '@/utils/logger'

const CACHE_TTL_MS = 5 * 60 * 1000
const IGNORED_VERSION_KEY = '@apkVersion/ignoredVersion'

type State = {
  isChecking: boolean
  apkUpdateAvailable: boolean
  isForceUpdate: boolean
  latestRelease: ApkLatestVersion | null
  contactAdmin: ApkContactAdmin | null
  ignoredVersion: string | null
  error: string | null
}

type Action =
  | { type: 'CHECK_START' }
  | {
      type: 'CHECK_SUCCESS'
      payload: {
        apkUpdateAvailable: boolean
        isForceUpdate: boolean
        latestRelease: ApkLatestVersion | null
        contactAdmin: ApkContactAdmin | null
      }
    }
  | { type: 'CHECK_ERROR'; error: string }
  | { type: 'IGNORE_VERSION'; version: string }
  | { type: 'LOAD_IGNORED'; version: string | null }

const initialState: State = {
  isChecking: false,
  apkUpdateAvailable: false,
  isForceUpdate: false,
  latestRelease: null,
  contactAdmin: null,
  ignoredVersion: null,
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CHECK_START':
      return { ...state, isChecking: true, error: null }
    case 'CHECK_SUCCESS': {
      const { apkUpdateAvailable, isForceUpdate, latestRelease, contactAdmin } = action.payload
      const ignored =
        state.ignoredVersion &&
        latestRelease?.version === state.ignoredVersion &&
        !isForceUpdate
      return {
        ...state,
        isChecking: false,
        apkUpdateAvailable: apkUpdateAvailable && !ignored,
        isForceUpdate,
        latestRelease,
        contactAdmin,
      }
    }
    case 'CHECK_ERROR':
      return { ...state, isChecking: false, error: action.error }
    case 'IGNORE_VERSION':
      return {
        ...state,
        apkUpdateAvailable: false,
        ignoredVersion: action.version,
      }
    case 'LOAD_IGNORED':
      return { ...state, ignoredVersion: action.version }
    default:
      return state
  }
}

export interface UseApkVersionCheckResult extends State {
  checkApkVersion: () => Promise<void>
  ignoreApkUpdate: () => Promise<void>
}

/** Hook untuk cek versi APK terbaru dengan cache 5 menit dan support ignore version. */
export function useApkVersionCheck(): UseApkVersionCheckResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  const lastCheckAtRef = useRef<number>(0)

  // Load ignored version dari storage di mount
  useEffect(() => {
    AsyncStorage.getItem(IGNORED_VERSION_KEY).then((value) => {
      dispatch({ type: 'LOAD_IGNORED', version: value })
    })
  }, [])

  const performCheck = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastCheckAtRef.current < CACHE_TTL_MS) {
      return
    }
    lastCheckAtRef.current = now

    dispatch({ type: 'CHECK_START' })
    const result = await checkApkVersion()

    if (!result) {
      logger.warn('[useApkVersionCheck] Gagal cek versi APK')
      dispatch({ type: 'CHECK_ERROR', error: 'Gagal cek versi APK' })
      return
    }

    dispatch({
      type: 'CHECK_SUCCESS',
      payload: {
        apkUpdateAvailable: result.updateAvailable,
        isForceUpdate: result.isForceUpdate,
        latestRelease: result.latestVersion,
        contactAdmin: result.contactAdmin,
      },
    })
  }, [])

  // Auto-check di mount + AppState 'active'
  useEffect(() => {
    performCheck().catch(() => undefined)

    const handler = (next: AppStateStatus) => {
      if (next === 'active') {
        performCheck().catch(() => undefined)
      }
    }
    const sub = AppState.addEventListener('change', handler)
    return () => sub.remove()
  }, [performCheck])

  /** Persist ignored version ke AsyncStorage dan sembunyikan banner update. */
  const ignoreApkUpdate = useCallback(async () => {
    if (!state.latestRelease) return
    const version = state.latestRelease.version
    await AsyncStorage.setItem(IGNORED_VERSION_KEY, version)
    dispatch({ type: 'IGNORE_VERSION', version })
  }, [state.latestRelease])

  /** Force check bypass cache — untuk manual refresh oleh user. */
  const manualCheck = useCallback(async () => {
    await performCheck(true)
  }, [performCheck])

  return {
    ...state,
    checkApkVersion: manualCheck,
    ignoreApkUpdate,
  }
}
