import { NativeModules, Platform } from 'react-native';
import { logger } from '@/utils/logger';

interface ApkInstallerInterface {
    installApk(filePath: string): Promise<boolean>;
    canRequestPackageInstalls(): Promise<boolean>;
    openInstallSettings(): Promise<boolean>;
}

const { ApkInstaller } = NativeModules;

/**
 * Native module untuk install APK di Android
 * Menggunakan FileProvider untuk Android 7+ (API 24+)
 */
export const NativeApkInstaller: ApkInstallerInterface | null = 
    Platform.OS === 'android' ? ApkInstaller : null;

/**
 * Install APK dari file path
 * @param filePath Path ke file APK (file:// atau absolute path)
 * @returns Promise<boolean> - true jika berhasil launch installer
 */
export async function installApkNative(filePath: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
        throw new Error('APK install hanya tersedia di Android');
    }

    if (!NativeApkInstaller) {
        throw new Error('Native module ApkInstaller tidak tersedia');
    }

    return NativeApkInstaller.installApk(filePath);
}

/**
 * Cek apakah aplikasi memiliki izin untuk menginstall paket
 */
export async function checkInstallPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!NativeApkInstaller) return true; // Fallback jika module belum load
    
    try {
        return await NativeApkInstaller.canRequestPackageInstalls();
    } catch {
        return true;
    }
}

/**
 * Buka settings untuk mengizinkan instalasi dari sumber tidak dikenal
 */
export async function openInstallSettings(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!NativeApkInstaller) return;

    try {
        await NativeApkInstaller.openInstallSettings();
    } catch (error) {
        logger.error('Failed to open install settings:', error);
    }
}
