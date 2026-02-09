import * as SecureStore from 'expo-secure-store';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { logger } from '@/utils/logger';

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

// Detect if running in Expo Go (biometric not supported in Expo Go)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy load to prevent crash when native module is not available
let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
let isModuleAvailable = !isExpoGo; // Not available in Expo Go

const loadModule = async () => {
  // Biometric not supported in Expo Go
  if (isExpoGo) {
    logger.info('[BiometricService] Running in Expo Go - biometric requires development build');
    return null;
  }

  if (LocalAuthentication) return LocalAuthentication;
  if (!isModuleAvailable) return null;

  try {
    LocalAuthentication = await import('expo-local-authentication');
    return LocalAuthentication;
  } catch (error) {
    logger.warn('[BiometricService] expo-local-authentication not available:', error);
    isModuleAvailable = false;
    return null;
  }
};

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: number[];
}

class BiometricService {
  /**
   * Memeriksa apakah aplikasi berjalan di Expo Go
   * Biometric tidak didukung di Expo Go, harus menggunakan development build
   */
  isRunningInExpoGo(): boolean {
    return isExpoGo;
  }

  /**
   * Memeriksa apakah perangkat mendukung autentikasi biometrik
   * dan apakah pengguna telah mendaftarkan biometrik
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if running in Expo Go first
      if (isExpoGo) {
        logger.info('[BiometricService] Biometric tidak tersedia di Expo Go - gunakan development build');
        return false;
      }

      const module = await loadModule();
      if (!module) {
        logger.info('[BiometricService] Module not available');
        return false;
      }

      const hasHardware = await module.hasHardwareAsync();
      if (!hasHardware) {
        logger.info('[BiometricService] Perangkat tidak mendukung autentikasi biometrik');
        return false;
      }

      const isEnrolled = await module.isEnrolledAsync();
      if (!isEnrolled) {
        logger.info('[BiometricService] Tidak ada biometrik yang terdaftar di perangkat');
        return false;
      }

      logger.info('[BiometricService] Autentikasi biometrik tersedia');
      return true;
    } catch (error) {
      logger.error('[BiometricService] Error memeriksa ketersediaan biometrik:', error);
      return false;
    }
  }

  /**
   * Mendapatkan informasi lengkap tentang kemampuan biometrik perangkat
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    try {
      const module = await loadModule();
      if (!module) {
        return {
          isAvailable: false,
          isEnrolled: false,
          supportedTypes: [],
        };
      }

      const hasHardware = await module.hasHardwareAsync();
      const isEnrolled = await module.isEnrolledAsync();
      const supportedTypes = await module.supportedAuthenticationTypesAsync();

      return {
        isAvailable: hasHardware && isEnrolled,
        isEnrolled,
        supportedTypes,
      };
    } catch (error) {
      logger.error('[BiometricService] Error mendapatkan capabilities:', error);
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  }

  /**
   * Mendapatkan jenis biometrik yang didukung oleh perangkat
   * (sidik jari, wajah, iris)
   */
  async getSupportedTypes(): Promise<string[]> {
    try {
      const module = await loadModule();
      if (!module) return [];

      const types = await module.supportedAuthenticationTypesAsync();
      const typeNames: string[] = [];

      types.forEach(type => {
        switch (type) {
          case module.AuthenticationType.FINGERPRINT:
            typeNames.push('Sidik Jari');
            break;
          case module.AuthenticationType.FACIAL_RECOGNITION:
            typeNames.push('Pengenalan Wajah');
            break;
          case module.AuthenticationType.IRIS:
            typeNames.push('Pemindai Iris');
            break;
        }
      });

      logger.info('[BiometricService] Jenis biometrik yang didukung:', typeNames);
      return typeNames;
    } catch (error) {
      logger.error('[BiometricService] Error mendapatkan jenis biometrik:', error);
      return [];
    }
  }

  /**
   * Memicu autentikasi biometrik
   * @param promptMessage Pesan yang ditampilkan pada dialog autentikasi
   * @returns Result dengan status sukses/gagal dan pesan error jika ada
   */
  async authenticate(promptMessage?: string): Promise<BiometricAuthResult> {
    try {
      // Check Expo Go first and provide clear message
      if (isExpoGo) {
        return {
          success: false,
          error: 'Autentikasi biometrik tidak tersedia di Expo Go. Silakan gunakan development build untuk menggunakan fitur ini.',
        };
      }

      const module = await loadModule();
      if (!module) {
        return {
          success: false,
          error: 'Autentikasi biometrik tidak tersedia di perangkat ini.',
        };
      }

      // Pastikan biometrik tersedia
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Autentikasi biometrik tidak tersedia. Pastikan Anda telah mengaktifkan dan mendaftarkan biometrik di pengaturan perangkat.',
        };
      }

      // Lakukan autentikasi
      const result = await module.authenticateAsync({
        promptMessage: promptMessage || 'Autentikasi untuk melanjutkan',
        cancelLabel: 'Batal',
        fallbackLabel: 'Gunakan Kata Sandi',
        disableDeviceFallback: false,
      });

      if (result.success) {
        logger.info('[BiometricService] Autentikasi biometrik berhasil');
        return { success: true };
      } else {
        logger.warn('[BiometricService] Autentikasi biometrik gagal:', result.error);

        // Berikan pesan error yang user-friendly
        let errorMessage = 'Autentikasi gagal. Silakan coba lagi.';

        // Handle error types from expo-local-authentication
        const errorType = result.error as string;
        if (errorType === 'user_cancel') {
          errorMessage = 'Autentikasi dibatalkan.';
        } else if (errorType === 'system_cancel') {
          errorMessage = 'Autentikasi dibatalkan oleh sistem.';
        } else if (errorType === 'authentication_failed') {
          errorMessage = 'Autentikasi gagal. Biometrik tidak cocok.';
        } else if (errorType === 'lockout') {
          errorMessage = 'Terlalu banyak percobaan gagal. Coba lagi nanti.';
        } else if (errorType === 'lockout_permanent') {
          errorMessage = 'Autentikasi biometrik dinonaktifkan. Silakan gunakan kata sandi perangkat.';
        } else if (errorType === 'not_enrolled') {
          errorMessage = 'Tidak ada biometrik yang terdaftar. Silakan daftarkan biometrik di pengaturan perangkat.';
        } else if (errorType === 'not_available') {
          errorMessage = 'Autentikasi biometrik tidak tersedia di perangkat ini.';
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      logger.error('[BiometricService] Error saat autentikasi:', error);
      return {
        success: false,
        error: 'Terjadi kesalahan saat melakukan autentikasi. Silakan coba lagi.',
      };
    }
  }

  /**
   * Memeriksa apakah pengguna telah mengaktifkan biometrik untuk login
   * Preferensi ini disimpan di SecureStore
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const isEnabled = enabled === 'true';
      logger.info('[BiometricService] Status biometrik:', isEnabled ? 'Aktif' : 'Nonaktif');
      return isEnabled;
    } catch (error) {
      logger.error('[BiometricService] Error memeriksa status biometrik:', error);
      return false;
    }
  }

  /**
   * Mengaktifkan autentikasi biometrik untuk login
   * Menyimpan preferensi ke SecureStore
   */
  async enableBiometric(): Promise<boolean> {
    try {
      // Pastikan biometrik tersedia sebelum mengaktifkan
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[BiometricService] Tidak bisa mengaktifkan biometrik - tidak tersedia');
        return false;
      }

      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      logger.info('[BiometricService] Biometrik berhasil diaktifkan');
      return true;
    } catch (error) {
      logger.error('[BiometricService] Error mengaktifkan biometrik:', error);
      return false;
    }
  }

  /**
   * Menonaktifkan autentikasi biometrik untuk login
   * Menghapus preferensi dari SecureStore
   */
  async disableBiometric(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      logger.info('[BiometricService] Biometrik berhasil dinonaktifkan');
      return true;
    } catch (error) {
      logger.error('[BiometricService] Error menonaktifkan biometrik:', error);
      return false;
    }
  }

  /**
   * Melakukan autentikasi biometrik hanya jika fitur diaktifkan oleh pengguna
   * Berguna untuk flow login otomatis
   */
  async authenticateIfEnabled(promptMessage?: string): Promise<BiometricAuthResult> {
    try {
      const isEnabled = await this.isBiometricEnabled();

      if (!isEnabled) {
        logger.info('[BiometricService] Biometrik tidak diaktifkan, skip autentikasi');
        return {
          success: false,
          error: 'Autentikasi biometrik tidak diaktifkan.',
        };
      }

      return await this.authenticate(promptMessage);
    } catch (error) {
      logger.error('[BiometricService] Error pada authenticateIfEnabled:', error);
      return {
        success: false,
        error: 'Terjadi kesalahan saat melakukan autentikasi.',
      };
    }
  }

  /**
   * Validasi dan setup biometrik untuk pertama kali
   * Akan memeriksa ketersediaan dan melakukan test autentikasi
   * @returns true jika berhasil setup, false jika gagal
   */
  async setupBiometric(promptMessage?: string): Promise<BiometricAuthResult> {
    try {
      // Cek ketersediaan
      const capabilities = await this.getCapabilities();

      if (!capabilities.isAvailable) {
        if (!capabilities.isEnrolled) {
          return {
            success: false,
            error: 'Tidak ada biometrik yang terdaftar. Silakan daftarkan biometrik di pengaturan perangkat Anda terlebih dahulu.',
          };
        }
        return {
          success: false,
          error: 'Perangkat Anda tidak mendukung autentikasi biometrik.',
        };
      }

      // Lakukan test autentikasi
      const authResult = await this.authenticate(
        promptMessage || 'Verifikasi identitas untuk mengaktifkan login biometrik'
      );

      if (authResult.success) {
        // Aktifkan biometrik jika autentikasi berhasil
        await this.enableBiometric();
        logger.info('[BiometricService] Setup biometrik berhasil');
      }

      return authResult;
    } catch (error) {
      logger.error('[BiometricService] Error pada setup biometrik:', error);
      return {
        success: false,
        error: 'Terjadi kesalahan saat mengatur biometrik. Silakan coba lagi.',
      };
    }
  }
}

export const biometricService = new BiometricService();
