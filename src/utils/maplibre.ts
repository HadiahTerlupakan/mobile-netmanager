/**
 * MapLibre wrapper with Expo Go and Web fallback
 * MapLibre React Native requires native modules and doesn't work in Expo Go or Web
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Check if running in Expo Go (managed workflow)
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Check if running on web platform
export const isWeb = Platform.OS === 'web';

// MapLibre React Native is not available on web or in Expo Go
export const isMapLibreAvailable = !isExpoGo && !isWeb;

// Lazy load MapLibre only in development builds (not Expo Go, not Web)
let MapLibreGL: any = null;

export function getMapLibre(): any {
  if (!isMapLibreAvailable) {
    return null;
  }

  if (!MapLibreGL) {
    try {
      // Dynamic import to prevent crash in Expo Go
      MapLibreGL = require('@maplibre/maplibre-react-native');
      MapLibreGL.setAccessToken(null);
    } catch (e) {
      console.warn('[MapLibre] Native module not available:', e);
      return null;
    }
  }

  return MapLibreGL;
}
