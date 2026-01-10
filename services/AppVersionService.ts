import { Config } from '@/constants/Config';
import { checkInstallPermission, installApkNative, openInstallSettings } from '@/native/ApkInstaller';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

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
                currentVersion: '', // Not used by caller usually
                latestVersion: data.latestVersion
            }
        } catch (error: any) {
            console.error('Check update error:', error)
            return {
                success: false,
                updateAvailable: false,
                isForceUpdate: false,
                currentVersion: '',
                latestVersion: null,
                error: error.message || 'Gagal memeriksa update'
            }
        }
    }

    async reportVersion(versionCode: number, versionName: string | null = null, token?: string): Promise<void> {
        try {
            const headers: any = {
                'Content-Type': 'application/json'
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            await fetch(`${this.baseUrl}/api/mobile/app-version/report`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ versionCode: versionCode.toString(), versionName })
            })
        } catch (error) {
            console.error('Report version error:', error)
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
        return await checkInstallPermission();
    }

    /**
     * Open settings to allow installing from unknown sources
     */
    async openInstallPermissionSettings(): Promise<void> {
        try {
            // Use native module which directs to specific app settings
            await openInstallSettings();
        } catch (error) {
            console.error('[APK] Failed to open native settings, fallback to general:', error);
            // Fallback: open general app settings
            await Linking.openSettings();
        }
    }

    /**
     * Install APK with permission check
     */
    async installApk(fileUri: string): Promise<boolean> {
        if (Platform.OS !== 'android') return false

        try {
            // 1. Cek Permission Dulu!
            const hasPermission = await this.canInstallPackages();
            console.log('[APK] Has install permission:', hasPermission);

            if (!hasPermission) {
                 // Store pending URI
                this.pendingApkUri = fileUri

                // Show friendly alert
                Alert.alert(
                    'Izin Diperlukan',
                    'Untuk melakukan update otomatis, aplikasi memerlukan izin instalasi.\n\nMohon aktifkan "Izinkan dari sumber ini" pada halaman pengaturan berikut.',
                    [
                        { text: 'Nanti Saja', style: 'cancel' },
                        { 
                            text: 'Buka Pengaturan', 
                            onPress: () => this.openInstallPermissionSettings()
                        }
                    ]
                )
                return false; // Stop here, wait for resume
            }

            // 2. Jika punya permission, langsung install
            // Try native module first
            try {
                // Konversi file:// ke path biasa jika perlu, tapi native module handle itu
                await installApkNative(fileUri)
                console.log('[APK] Native install launch success')
                return true
            } catch (e) {
                console.warn('[APK] Native install failed, trying IntentLauncher', e)
                
                // Fallback to IntentLauncher
                const contentUri = await FileSystem.getContentUriAsync(fileUri)
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    type: 'application/vnd.android.package-archive',
                    flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
                })
                return true
            }
            
        } catch (error: any) {
            console.error('[APK] Install error:', error.message)
            
            Alert.alert(
                'Gagal Install',
                'Tidak dapat membuka installer. Mohon hubungi admin IT jika masalah berlanjut.',
                [{ text: 'OK' }]
            )
            
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
            // Check permission again just to be sure
            const hasPermission = await this.canInstallPackages();
            if (hasPermission) {
                return this.installApk(uri)
            }
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
