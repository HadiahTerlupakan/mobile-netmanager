import Constants from 'expo-constants';

// Get the host IP dynamically for development
const getDevApiUrl = () => {
  // Check if we have a hostUri (available in Expo Go/Dev Client)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }

  // Fallback for Android Emulator (10.0.2.2) or iOS Simulator (localhost)
  // or use the hardcoded IP if needed
  return 'http://192.168.18.41:3000';
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
};
