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

  if (process.env.EXPO_PUBLIC_APP_VARIANT === 'development') {
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

export const Config = {
  // Automatically switch between Dev, Staging, and Prod based on environment variant
  API_URL: getApiUrl(),
  VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT || 'development',
  IS_PRODUCTION: process.env.EXPO_PUBLIC_APP_VARIANT === 'production',
  CAN_AUTO_CHECK_APP_UPDATES: canCheckAppUpdatesOnCurrentBuild,
  CAN_MANUALLY_CHECK_APP_UPDATES: canCheckAppUpdatesOnCurrentBuild,
  ENABLE_BACKEND_ERROR_REPORTING:
    process.env.EXPO_PUBLIC_ENABLE_ERROR_REPORTING === 'true'
    || process.env.EXPO_PUBLIC_APP_VARIANT === 'production',
};
