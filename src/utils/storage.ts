import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

const STORAGE_PREFIX = 'netmanager_';
const SECURE_STORAGE_PREFIX = 'netmanager_secure_';

/**
 * Check if we're running on web platform
 */
const isWeb = Platform.OS === 'web';

/**
 * Async Storage wrapper with SecureStore fallback for sensitive data
 * Compatible with Expo Go (no native modules required)
 */
export const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_PREFIX + key);
    } catch (error) {
      logger.error('Storage.getItem error:', error);
      return null;
    }
  },

  setItemStrict: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, value);
    } catch (error) {
      logger.error('Storage.setItem error:', error);
      throw error;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Storage.setItemStrict(key, value);
    } catch (error) {
      logger.debug('Storage.setItem swallowed error for legacy caller:', key, error);
    }
  },

  removeItemStrict: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_PREFIX + key);
    } catch (error) {
      logger.error('Storage.removeItem error:', error);
      throw error;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await Storage.removeItemStrict(key);
    } catch (error) {
      logger.debug('Storage.removeItem swallowed error for legacy caller:', key, error);
    }
  },

  clear: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const prefixedKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(prefixedKeys);
    } catch (error) {
      logger.error('Storage.clear error:', error);
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
 * Uses expo-secure-store on native platforms
 * Falls back to localStorage on web (not truly secure, but functional)
 */
export const SecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isWeb) {
        // Web fallback using localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(SECURE_STORAGE_PREFIX + key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.error('SecureStorage.getItem error:', error);
      return null;
    }
  },

  setItemStrict: async (key: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(SECURE_STORAGE_PREFIX + key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error('SecureStorage.setItem error:', error);
      throw error;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStorage.setItemStrict(key, value);
    } catch (error) {
      logger.debug('SecureStorage.setItem swallowed error for legacy caller:', key, error);
    }
  },

  removeItemStrict: async (key: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(SECURE_STORAGE_PREFIX + key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('SecureStorage.removeItem error:', error);
      throw error;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStorage.removeItemStrict(key);
    } catch (error) {
      logger.debug('SecureStorage.removeItem swallowed error for legacy caller:', key, error);
    }
  }
};

// Legacy export for backward compatibility
export const secureStorage = null; // Removed MMKV, use Storage or SecureStorage instead
