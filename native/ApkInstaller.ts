import { NativeModules, Platform } from 'react-native';

interface ApkInstallerInterface {
    installApk(filePath: string): Promise<boolean>;
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
