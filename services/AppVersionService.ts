import { Config } from '@/constants/Config';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, NativeModules, Platform } from 'react-native';

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

export interface DownloadProgress {
    totalBytes: number
    downloadedBytes: number
    percentage: number
}

class AppVersionService {
    private baseUrl: string
    private pendingApkUri: string | null = null

    constructor() {
        this.baseUrl = Config.API_URL
    }

    async checkForUpdate(currentVersionCode: number): Promise<CheckUpdateResult> {
        try {
            const platform = Platform.OS === 'ios' ? 'ios' : 'android'
            const response = await fetch(
                `${this.baseUrl}/api/mobile/app-version/check?versionCode=${currentVersionCode}&platform=${platform}`
            )
            
            const data = await response.json()
            
            if (!data.success) {
                return {
                    success: false,
                    updateAvailable: false,
                    isForceUpdate: false,
                    currentVersion: '',
                    latestVersion: null,
                    error: data.error
                }
            }

            return {
                success: true,
                updateAvailable: data.updateAvailable,
                isForceUpdate: data.isForceUpdate,
                currentVersion: data.currentVersion,
                latestVersion: data.latestVersion
            }
        } catch (error: any) {
            return {
                success: false,
                updateAvailable: false,
                isForceUpdate: false,
                currentVersion: '',
                latestVersion: null,
                error: error.message || 'Failed to check for updates'
            }
        }
    }

    async downloadApk(
        versionId: string,
        filename: string,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<string | null> {
        if (Platform.OS !== 'android') {
            return null
        }

        try {
            const downloadUrl = `${this.baseUrl}/api/mobile/app-version/download/${versionId}`
            const fileUri = `${FileSystem.cacheDirectory}${filename}`
            
            await FileSystem.deleteAsync(fileUri, { idempotent: true })

            console.log('[APK] Downloading to:', fileUri)

            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                fileUri,
                {},
                (downloadProgress) => {
                    if (onProgress) {
                        const percentage = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite * 100
                        onProgress({
                            totalBytes: downloadProgress.totalBytesExpectedToWrite,
                            downloadedBytes: downloadProgress.totalBytesWritten,
                            percentage
                        })
                    }
                }
            )

            const result = await downloadResumable.downloadAsync()
            
            if (result && result.uri) {
                const fileInfo = await FileSystem.getInfoAsync(result.uri)
                
                if (fileInfo.exists) {
                    console.log('[APK] Download complete:', result.uri)
                    return result.uri
                }
            }
            return null
        } catch (error: any) {
            console.error('[APK] Download error:', error)
            throw new Error('Download gagal: ' + error.message)
        }
    }

    /**
     * Check if the app has permission to install APKs
     */
    async canInstallPackages(): Promise<boolean> {
        if (Platform.OS !== 'android') return false
        
        try {
            // For Android 8.0+ (API 26+), we need to check if the app can request package installs
            // We'll try to use a native module if available, otherwise assume we need to check
            const PackageManager = NativeModules.PackageManager
            if (PackageManager && PackageManager.canRequestPackageInstalls) {
                return await PackageManager.canRequestPackageInstalls()
            }
            // If no native module, we'll find out when we try to install
            return true
        } catch {
            return true // Assume true and let the install fail if needed
        }
    }

    /**
     * Open settings to allow installing from unknown sources
     */
    async openInstallPermissionSettings(): Promise<void> {
        if (Platform.OS !== 'android') return

        try {
            // Open the "Install unknown apps" settings for this app
            await IntentLauncher.startActivityAsync(
                'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
                {
                    data: 'package:com.netmanager.mobile'
                }
            )
        } catch (error) {
            console.error('[APK] Failed to open settings:', error)
            // Fallback: open general app settings
            await Linking.openSettings()
        }
    }

    /**
     * Install APK with permission check
     */
    async installApk(fileUri: string): Promise<boolean> {
        if (Platform.OS !== 'android') return false

        try {
            // Get content URI from file URI
            const contentUri = await FileSystem.getContentUriAsync(fileUri)
            console.log('[APK] Content URI:', contentUri)

            // Store the pending APK URI for retry after permission is granted
            this.pendingApkUri = fileUri

            // Try to launch package installer
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                type: 'application/vnd.android.package-archive',
                flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
            })

            console.log('[APK] Intent launched successfully')
            return true
            
        } catch (error: any) {
            console.error('[APK] Install error:', error.message)
            
            // Check if the error is about install permission
            if (error.message?.includes('permission') || error.message?.includes('REQUEST_INSTALL_PACKAGES')) {
                // Show dialog to request permission
                Alert.alert(
                    'Izin Diperlukan',
                    'Untuk menginstall update, Anda perlu mengizinkan aplikasi ini untuk menginstall dari sumber tidak dikenal.\n\nKetuk "Buka Pengaturan" lalu aktifkan izin.',
                    [
                        { text: 'Batal', style: 'cancel' },
                        { 
                            text: 'Buka Pengaturan', 
                            onPress: () => this.openInstallPermissionSettings()
                        }
                    ]
                )
            } else {
                Alert.alert(
                    'Gagal Install',
                    'Tidak dapat membuka installer. Coba gunakan "Download via Browser".',
                    [{ text: 'OK' }]
                )
            }
            
            return false
        }
    }

    /**
     * Retry install with pending APK (call after user returns from settings)
     */
    async retryPendingInstall(): Promise<boolean> {
        if (this.pendingApkUri) {
            const uri = this.pendingApkUri
            this.pendingApkUri = null
            return this.installApk(uri)
        }
        return false
    }

    /**
     * Get pending APK URI
     */
    getPendingApkUri(): string | null {
        return this.pendingApkUri
    }

    async openBrowserDownload(versionId: string): Promise<void> {
        const downloadUrl = `${this.baseUrl}/api/mobile/app-version/download/${versionId}`
        await WebBrowser.openBrowserAsync(downloadUrl)
    }
}

export const appVersionService = new AppVersionService()
