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

export const Config = {
  // Automatically switch between Dev and Prod based on environment
  API_URL: __DEV__
    ? getDevApiUrl()
    : "https://radpro.id",
};
