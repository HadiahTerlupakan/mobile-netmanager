import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGoRuntime = () => {
  return isRunningInExpoGo() || Constants.executionEnvironment === 'storeClient';
};

const canCheckAppUpdates = () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  const variant = process.env.EXPO_PUBLIC_APP_VARIANT;
  if (variant === 'development') {
    return false;
  }

  return !isExpoGoRuntime();
};

const canCheckAppUpdatesOnCurrentBuild = canCheckAppUpdates();

// Get the backend URL for development
const getDevApiUrl = () => {
  const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitApiUrl) {
    return explicitApiUrl;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  if (Platform.OS === 'ios') {
    return 'http://localhost:3000';
  }

  // Check if we have a hostUri (available in Expo Go/Dev Client)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }

  // Fallback for local development when no explicit API URL is configured
  return 'http://localhost:3000';
};

const getApiUrl = () => {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT;

  if (variant === 'production') {
    return "https://radpro.id";
  }

  if (variant === 'staging') {
    return "https://staging.radpro.id";
  }

  // Default to development logic if no variant is specified
  return getDevApiUrl();
};

/**
 * Tentukan apakah laporan error dikirim ke backend.
 *
 * Arahnya sengaja gagal-terbuka. Sebelumnya pelaporan hanya menyala kalau
 * varian bernilai persis `production`, sehingga bundle rilis yang dibangun
 * dengan profil lain — `preview` menyetelnya `staging` — mematikan pemantauan
 * tanpa suara. Nilai `EXPO_PUBLIC_*` dibekukan ke dalam bundle saat build,
 * jadi satu build dengan profil keliru cukup untuk membutakan pemantauan
 * sampai ada yang sadar berhari-hari kemudian.
 *
 * Sekarang bundle rilis melapor kecuali dimatikan eksplisit, dan bundle
 * pengembangan tetap diam kecuali diminta.
 */
export function resolveBackendErrorReporting(
  env: Record<string, string | undefined> = process.env,
  isDevBundle: boolean = typeof __DEV__ !== 'undefined' && __DEV__,
): boolean {
  const flag = env.EXPO_PUBLIC_ENABLE_ERROR_REPORTING;

  if (flag === 'true') return true;
  if (flag === 'false') return false;

  return !isDevBundle;
}

export const Config = {
  // Automatically switch between Dev, Staging, and Prod based on environment variant
  API_URL: getApiUrl(),
  VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT || 'development',
  IS_PRODUCTION: process.env.EXPO_PUBLIC_APP_VARIANT === 'production',
  CAN_AUTO_CHECK_APP_UPDATES: canCheckAppUpdatesOnCurrentBuild,
  CAN_MANUALLY_CHECK_APP_UPDATES: canCheckAppUpdatesOnCurrentBuild,
  ENABLE_BACKEND_ERROR_REPORTING: resolveBackendErrorReporting(),
};
