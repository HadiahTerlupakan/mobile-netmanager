import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV, type MMKV } from 'react-native-mmkv';

const SECURE_KEY_ALIAS = 'mmkv_encryption_key';

// Lazy-loaded instance
let secureStorage: MMKV | null = null;

/**
 * Helper to get or generate an encryption key securely.
 * Uses expo-secure-store for persistence and expo-crypto for generation.
 */
function getEncryptionKey(): string {
  try {
    let key = SecureStore.getItem(SECURE_KEY_ALIAS);
    if (!key) {
      // Generate a random 32-character hex key if not exists
      const randomBytes = Crypto.getRandomValues(new Uint8Array(16));
      key = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      SecureStore.setItem(SECURE_KEY_ALIAS, key);
    }
    return key;
  } catch (error) {
    console.error('Failed to get/set secure key for MMKV, falling back to unencrypted (WARNING)', error);
    return ''; // Fallback, though ideally we should fail hard or handle UI
  }
}

/**
 * Lazy initializer for MMKV instance.
 * Initializes the instance only when needed to avoid startup race conditions.
 */
function getStorage(): MMKV | null {
  if (secureStorage) return secureStorage;

  try {
    const encryptionKey = getEncryptionKey();
    secureStorage = createMMKV({
      id: 'netmanager-storage',
      encryptionKey: encryptionKey || undefined,
    });
    return secureStorage;
  } catch (error) {
    console.error('Failed to initialize MMKV storage:', error);
    return null;
  }
}

// Export for direct access if strictly necessary (though usage via Storage wrapper is preferred)
export { secureStorage };

/**
 * Wrapper to mimic AsyncStorage-like API for easier migration, but fully synchronous.
 */
export const Storage = {
  getItem: (key: string) => {
    const storage = getStorage();
    if (!storage) return null;
    return storage.getString(key) || null;
  },
  setItem: (key: string, value: string) => {
    const storage = getStorage();
    if (!storage) return;
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    const storage = getStorage();
    if (!storage) return;
    storage.remove(key);
  },
  clear: () => {
    const storage = getStorage();
    if (!storage) return;
    storage.clearAll();
  },
  // JSON helpers
  getItemJson: <T>(key: string): T | null => {
    const value = Storage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
  setItemJson: (key: string, value: any) => {
    Storage.setItem(key, JSON.stringify(value));
  }
};
