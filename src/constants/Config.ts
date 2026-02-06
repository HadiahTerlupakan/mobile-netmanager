import { Platform } from 'react-native';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const Config = {
  // Production Server
  //API_URL: "https://radpro.id",
  // Development Server
  API_URL: `http://${DEV_HOST}:3000`,
};
