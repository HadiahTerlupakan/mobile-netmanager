import { TenantService } from '@/services/TenantService';
import { checkInstallPermission, installApkNative, openInstallSettings } from '@/native/ApkInstaller';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';
import { logger } from '@/utils/logger';

export interface AppVersionInfo {
    id: string
    version: string
    buildNumber: number
    versionCode: number
    releaseNotes: string | null
    downloadUrl: string | null
    apkSize: number | null
    hash?: string | null
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

type ResponsePayload = Record<string, unknown>

const VERSION_REQUEST_TIMEOUT_MS = 15000

const isObject = (value: unknown): value is ResponsePayload => {
    return typeof value === 'object' && value !== null
}

const isAppVersionInfo = (value: unknown): value is AppVersionInfo => {
    if (!isObject(value)) {
        return false
    }

    return typeof value.id === 'string'
        && typeof value.version === 'string'
        && typeof value.buildNumber === 'number'
        && typeof value.versionCode === 'number'
        && (typeof value.downloadUrl === 'string' || value.downloadUrl === null)
        && (typeof value.releaseNotes === 'string' || value.releaseNotes === null)
        && (typeof value.apkSize === 'number' || value.apkSize === null)
}

const getErrorMessage = (value: unknown): string | null => {
    if (!isObject(value)) {
        return null
    }

    const message = value.message
    if (typeof message === 'string' && message.trim()) {
        return message
    }

    const error = value.error
    if (typeof error === 'string' && error.trim()) {
        return error
    }

    return null
}

class AppVersionService {
    private baseUrl: string
    private pendingApkUri: string | null = null

    constructor() {
        this.baseUrl = TenantService.getTenantUrl()
    }

    private async fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), VERSION_REQUEST_TIMEOUT_MS)

        try {
            return await fetch(input, {
                ...init,
                signal: controller.signal,
            })
        } finally {
            clearTimeout(timeout)
        }
    }

    private async readResponsePayload(response: Response): Promise<{ data: ResponsePayload | null; rawText: string | null }> {
        if (typeof response.text === 'function') {
            const rawText = await response.text()

            if (!rawText) {
                return { data: null, rawText: null }
            }

            try {
                return { data: JSON.parse(rawText) as ResponsePayload, rawText }
            } catch {
                return { data: null, rawText }
            }
        }

        if (typeof response.json === 'function') {
            try {
                const json = await response.json()
                return { data: isObject(json) ? json : null, rawText: null }
            } catch {
                return { data: null, rawText: null }
            }
        }

        return { data: null, rawText: null }
    }

    private getResponseError(response: Response, data: ResponsePayload | null, rawText: string | null): string {
        return getErrorMessage(data)
            ?? rawText?.trim()
            ?? `HTTP ${response.status}`
    }

    async checkForUpdate(currentVersionCode: number): Promise<CheckUpdateResult> {
        try {
            // Update baseUrl in case it changed
            this.baseUrl = TenantService.getTenantUrl()
            const platform = Platform.OS === 'ios' ? 'ios' : 'android'
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/api/mobile/app-version/check?versionCode=${currentVersionCode}&platform=${platform}`
            )

            const { data, rawText } = await this.readResponsePayload(response)

            if (!response.ok) {
                return {
                    success: false,
                    updateAvailable: false,
                    isForceUpdate: false,
                    currentVersion: '',
                    latestVersion: null,
                    error: this.getResponseError(response, data, rawText)
                }
            }

            if (!data) {
                return {
                    success: false,
                    updateAvailable: false,
                    isForceUpdate: false,
                    currentVersion: '',
                    latestVersion: null,
                    error: 'Respons server tidak valid'
                }
            }

            if (data.success !== true) {
                return {
                    success: false,
                    updateAvailable: false,
                    isForceUpdate: false,
                    currentVersion: '',
                    latestVersion: null,
                    error: getErrorMessage(data) ?? 'Gagal memeriksa update'
                }
            }

            return {
                success: true,
                updateAvailable: data.updateAvailable === true,
                isForceUpdate: data.isForceUpdate === true,
                currentVersion: '', // Not used by caller usually
                latestVersion: isAppVersionInfo(data.latestVersion) ? data.latestVersion : null
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Gagal memeriksa update';
            logger.error('Check update error:', error)
            return {
                success: false,
                updateAvailable: false,
                isForceUpdate: false,
                currentVersion: '',
                latestVersion: null,
                error: errorMessage
            }
        }
    }

    async reportVersion(versionCode: number, versionName: string | null = null, token?: string): Promise<void> {
        try {
            // Ensure we use the latest tenant URL
            const baseUrl = TenantService.getTenantUrl()
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await this.fetchWithTimeout(`${baseUrl}/api/mobile/app-version/report`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ versionCode: versionCode.toString(), versionName })
            })

            if (!response.ok) {
                const { data, rawText } = await this.readResponsePayload(response)
                logger.error('Report version error:', this.getResponseError(response, data, rawText))
            }
        } catch (error) {
            logger.error('Report version error:', error)
        }
    }


    async downloadApk(
        versionId: string,
        filename: string,
        expectedHash?: string | null,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<string | null> {
        if (Platform.OS !== 'android') {
            return null
        }

        try {
            const baseUrl = TenantService.getTenantUrl()
            const downloadUrl = `${baseUrl}/api/mobile/app-version/download/${versionId}`
            const fileUri = `${FileSystem.cacheDirectory}${filename}`

            await FileSystem.deleteAsync(fileUri, { idempotent: true })

            logger.info('[APK] Downloading to:', fileUri)

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
                    // Verify hash if provided
                    if (expectedHash) {
                        logger.info('[APK] Verifying hash...');
                        const fileContent = await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });
                        const hash = await Crypto.digestStringAsync(
                            Crypto.CryptoDigestAlgorithm.SHA256,
                            fileContent
                        );

                        if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
                            logger.error('[APK] Hash mismatch!', { got: hash, expected: expectedHash });
                            await FileSystem.deleteAsync(result.uri, { idempotent: true });
                            throw new Error('Verifikasi file gagal: Hash tidak cocok. Unduhan mungkin korup atau tidak aman.');
                        }
                        logger.info('[APK] Hash verified successfully');
                    }

                    logger.info('[APK] Download complete:', result.uri)
                    return result.uri
                }
            }
            return null
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[APK] Download error:', error)
            throw new Error('Download gagal: ' + errorMessage)
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
            logger.error('[APK] Failed to open native settings, fallback to general:', error);
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
            logger.info('[APK] Has install permission:', hasPermission);

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
                logger.info('[APK] Native install launch success')
                return true
            } catch (e) {
                logger.warn('[APK] Native install failed, trying IntentLauncher', e)
                
                // Fallback to IntentLauncher
                const contentUri = await FileSystem.getContentUriAsync(fileUri)
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    type: 'application/vnd.android.package-archive',
                    flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
                })
                return true
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[APK] Install error:', errorMessage)

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
        const baseUrl = TenantService.getTenantUrl()
        const downloadUrl = `${baseUrl}/api/mobile/app-version/download/${versionId}`
        await WebBrowser.openBrowserAsync(downloadUrl)
    }
}

export const appVersionService = new AppVersionService()
