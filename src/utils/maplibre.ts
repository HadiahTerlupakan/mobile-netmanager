/**
 * MapLibre wrapper with Expo Go fallback
 * MapLibre requires native modules and doesn't work in Expo Go
 */

import Constants from 'expo-constants';

// Check if running in Expo Go (managed workflow)
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Lazy load MapLibre only in development builds
let MapLibreGL: any = null;

export function getMapLibre(): any {
  if (isExpoGo) {
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
