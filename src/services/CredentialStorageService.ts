import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils/logger';

const STORED_EMAIL_KEY = 'biometric_stored_email';
const STORED_PASSWORD_KEY = 'biometric_stored_password';

class CredentialStorageServiceImpl {
  async saveCredentials(email: string, password: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(STORED_EMAIL_KEY, email);
      await SecureStore.setItemAsync(STORED_PASSWORD_KEY, password);
      return true;
    } catch (error) {
      logger.error('[CredentialStorage] Failed to save credentials:', error);
      return false;
    }
  }

  async getCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(STORED_PASSWORD_KEY);
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
      const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY);
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
