import { useEffect, useState } from 'react'

import { User } from '@/context/AuthContext'
import { useAppVersion } from '@/hooks/useAppVersion'

/**
 * Trigger expo-updates check saat app start dan saat user login.
 * Update download/install lewat expo-updates native API; tidak ada lagi
 * report version ke server (server hanya gating native version via env).
 */
export function useVersionCheck(_user: User | null, _token: string | null) {
    const {
        isChecking,
        downloadStatus,
        updateAvailable,
        isForceUpdate,
        latestVersion,
        error,
        checkForUpdate,
        startUpdate,
        dismissError,
        ignoreUpdate,
    } = useAppVersion()

    const [versionChecked, setVersionChecked] = useState(false)
    const [showOptionalUpdate, setShowOptionalUpdate] = useState(false)

    useEffect(() => {
        let cancelled = false
        const run = async () => {
            try {
                await checkForUpdate()
            } finally {
                if (!cancelled) {
                    setVersionChecked(true)
                }
            }
        }
        run()
        return () => {
            cancelled = true
        }
    }, [checkForUpdate])

    useEffect(() => {
        if (updateAvailable && !isForceUpdate) {
            setShowOptionalUpdate(true)
        }
    }, [updateAvailable, isForceUpdate])

    return {
        isChecking,
        versionChecked,
        showOptionalUpdate,
        setShowOptionalUpdate,
        downloadStatus,
        downloadProgress: null,
        updateAvailable,
        isForceUpdate,
        latestVersion,
        error,
        startUpdate,
        dismissError,
        ignoreUpdate,
    }
}
