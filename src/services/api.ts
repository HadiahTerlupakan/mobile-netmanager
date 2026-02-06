import { Config } from '@/constants/Config';
import { Events } from '@/constants/Events';
import { logger } from '@/utils/logger';
import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalAuthHandler?: boolean;
    _retryCount?: number;
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const api = axios.create({
  baseURL: Config.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Default timeout 30s
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper to check if request should be retried
const shouldRetry = (error: any): boolean => {
  // Retry on network errors
  if (!error.response && error.code === 'ERR_NETWORK') {
    return true;
  }
  // Retry on timeout
  if (error.code === 'ECONNABORTED') {
    return true;
  }
  // Retry on 5xx server errors
  if (error.response && error.response.status >= 500) {
    return true;
  }
  // Retry on 408 Request Timeout
  if (error.response && error.response.status === 408) {
    return true;
  }
  return false;
};

// Response interceptor to handle retries and errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    if (!config) {
      return Promise.reject(error);
    }

    // Initialize retry count
    config._retryCount = config._retryCount || 0;

    // Check if we should retry
    if (config._retryCount < MAX_RETRIES && shouldRetry(error)) {
      config._retryCount += 1;
      const delay = RETRY_DELAY * Math.pow(2, config._retryCount - 1);
      logger.info(`[API] Retrying ${config.method?.toUpperCase()} ${config.url} (Attempt ${config._retryCount}/${MAX_RETRIES}) in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // Allow requests to skip global 401 handling - LOG THIS
    if (config.skipGlobalAuthHandler) {
      logger.warn(`[API] 401 from ${config.url} ignored due to skipGlobalAuthHandler`);
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      // Prevent logout loop caused by announcement checks
      if (config.url?.includes('announcements')) {
        logger.warn(`[API] 401 from ${config.url} ignored to prevent logout loop.`);
        return Promise.reject(error);
      }

      logger.warn(`[API] 401 Unauthorized from ${config.url}. Emitting AUTH_UNAUTHORIZED.`);
      // Emit event to be handled by AuthContext
      DeviceEventEmitter.emit(Events.AUTH_UNAUTHORIZED);
    }
    return Promise.reject(error);
  }
);

export default api;
