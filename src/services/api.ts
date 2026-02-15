import { Events } from '@/constants/Events';
import { performanceMonitor } from '@/services/PerformanceMonitor'; // Import PerformanceMonitor
import { RefreshTokenService } from '@/services/RefreshTokenService';
import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';
import { logger } from '@/utils/logger';
import axios, { AxiosError } from 'axios';
import { DeviceEventEmitter } from 'react-native';

declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalAuthHandler?: boolean;
    _retryCount?: number;
    _isRetryAfterRefresh?: boolean;
    metadata?: { startTime: number }; // Add metadata for tracking
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const api = axios.create({
  baseURL: TenantService.getTenantUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased to 60s to match backend long-running tasks
});

// Request interceptor to add token and handle dynamic base URL
api.interceptors.request.use(
  async (config) => {
    // Start performance tracking
    config.metadata = { startTime: performance.now() };
    const metricName = `API ${config.method?.toUpperCase()} ${config.url}`;
    performanceMonitor.start(metricName);

    // Inject dynamic base URL
    config.baseURL = TenantService.getTenantUrl();

    // Optimization: Use in-memory token first
    const token = TokenService.getToken();
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
  (response) => {
    // Stop performance tracking
    const config = response.config;
    if (config && config.url) {
      const metricName = `API ${config.method?.toUpperCase()} ${config.url}`;
      performanceMonitor.stop(metricName, { status: response.status });
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;

    if (!config) {
      return Promise.reject(error);
    }

    // Stop performance tracking on error
    if (config.url) {
      const metricName = `API ${config.method?.toUpperCase()} ${config.url}`;
      performanceMonitor.stop(metricName, { status: error.response?.status || 'network_error' });
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

      // Don't retry refresh if this is already a retry after refresh
      if (config._isRetryAfterRefresh) {
        logger.warn(`[API] 401 after token refresh from ${config.url}. Emitting AUTH_UNAUTHORIZED.`);
        DeviceEventEmitter.emit(Events.AUTH_UNAUTHORIZED);
        return Promise.reject(error);
      }

      // Try to refresh the token before logging out
      logger.auth(`[API] 401 from ${config.url}. Attempting token refresh...`);

      try {
        const newToken = await RefreshTokenService.refreshAccessToken();

        if (newToken) {
          // Retry the original request with the new token
          logger.auth('[API] Token refreshed successfully, retrying request...');
          config.headers.Authorization = `Bearer ${newToken}`;
          config._isRetryAfterRefresh = true;
          return api(config);
        }
      } catch (refreshError) {
        logger.error('[API] Token refresh failed:', refreshError);
      }

      logger.warn(`[API] Token refresh failed or no refresh token. Emitting AUTH_UNAUTHORIZED.`);
      // Emit event to be handled by AuthContext
      DeviceEventEmitter.emit(Events.AUTH_UNAUTHORIZED);

      // Prevent unhandled promise rejection by returning a pending promise.
      // The app is checking out (logging out), so we don't need to resolve/reject this.
      return new Promise(() => { });
    }
    return Promise.reject(error);
  }
);

export default api;
