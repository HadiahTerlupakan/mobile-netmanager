import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

const STORED_EMAIL_KEY = 'biometric_stored_email';
const STORED_PASSWORD_KEY = 'biometric_stored_password';

/**
 * Opsi untuk PASSWORD: dilindungi biometric/PIN (requireAuthentication=true)
 * dan tidak ikut iCloud Keychain backup (WHEN_UNLOCKED_THIS_DEVICE_ONLY).
 *
 * Tanpa proteksi ini, password plaintext dapat dibaca dari Keystore (Android
 * rooted) atau ikut backup ke device lain (iOS iCloud Keychain). Stop-gap ini
 * mengikat password ke autentikasi user fisik di device yang sama.
 *
 * Catatan: opsi `requireAuthentication` butuh dukungan device — gunakan
 * `canUseBiometricAuthentication()` di sisi caller sebelum saveCredentials.
 */
const SECURE_PASSWORD_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Buka brankas kredensial',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Email TIDAK dilindungi requireAuthentication — `hasStoredCredentials`
 * harus bisa dipanggil tanpa memunculkan prompt biometric setiap kali
 * splash screen dimuat. Email sendiri bukan secret.
 */
const SECURE_EMAIL_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

class CredentialStorageServiceImpl {
  async saveCredentials(email: string, password: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(STORED_EMAIL_KEY, email, SECURE_EMAIL_OPTIONS);
      await SecureStore.setItemAsync(STORED_PASSWORD_KEY, password, SECURE_PASSWORD_OPTIONS);
      return true;
    } catch (error) {
      logger.error('[CredentialStorage] Failed to save credentials:', error);
      return false;
    }
  }

  async getCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY, SECURE_EMAIL_OPTIONS);
      const password = await SecureStore.getItemAsync(STORED_PASSWORD_KEY, SECURE_PASSWORD_OPTIONS);
      if (email && password) {
        return { email, password };
      }
      return null;
    } catch (error) {
      logger.error('[CredentialStorage] Failed to get credentials:', error);
      return null;
    }
  }

  async hasStoredCredentials(): Promise<boolean> {
    try {
      const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY, SECURE_EMAIL_OPTIONS);
      return !!email;
    } catch {
      return false;
    }
  }

  async clearCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORED_EMAIL_KEY);
      await SecureStore.deleteItemAsync(STORED_PASSWORD_KEY);
    } catch (error) {
      logger.error('[CredentialStorage] Failed to clear credentials:', error);
    }
  }
}

export const credentialStorageService = new CredentialStorageServiceImpl();
