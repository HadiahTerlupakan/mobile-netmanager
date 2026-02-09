import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STORAGE_PREFIX = 'netmanager_';

/**
 * Async Storage wrapper with SecureStore fallback for sensitive data
 * Compatible with Expo Go (no native modules required)
 */
export const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_PREFIX + key);
    } catch (error) {
      console.error('Storage.getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, value);
    } catch (error) {
      console.error('Storage.setItem error:', error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_PREFIX + key);
    } catch (error) {
      console.error('Storage.removeItem error:', error);
    }
  },

  clear: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const prefixedKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(prefixedKeys);
    } catch (error) {
      console.error('Storage.clear error:', error);
    }
  },

  // JSON helpers - async versions
  getItemJson: async <T>(key: string): Promise<T | null> => {
    const value = await Storage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },

  setItemJson: async (key: string, value: any): Promise<void> => {
    await Storage.setItem(key, JSON.stringify(value));
  }
};

/**
 * Secure Storage for sensitive data (tokens, credentials)
 * Uses expo-secure-store which is available in Expo Go
 */
export const SecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStorage.getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStorage.setItem error:', error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStorage.removeItem error:', error);
    }
  }
};

// Legacy export for backward compatibility
export const secureStorage = null; // Removed MMKV, use Storage or SecureStorage instead
