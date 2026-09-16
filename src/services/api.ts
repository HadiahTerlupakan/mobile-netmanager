import { Events } from '@/constants/Events';
import { CURRENT_VERSION_CODE_LABEL, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { HTTP_TIMEOUTS } from '@/constants/httpTimeouts';
import { performanceMonitor } from '@/services/PerformanceMonitor'; // Import PerformanceMonitor
import { RefreshTokenService } from '@/services/RefreshTokenService';
import { TelemetryService } from '@/services/TelemetryService';
import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';
import { logger } from '@/utils/logger';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as Crypto from 'expo-crypto';
import { DeviceEventEmitter } from 'react-native';
import { networkStateService } from '@/services/NetworkStateService';
import { showToast } from '@/utils/errorPresenter';

declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalAuthHandler?: boolean;
    skipRetry?: boolean;
    _retryCount?: number;
    _isRetryAfterRefresh?: boolean;
    metadata?: { startTime: number }; // Add metadata for tracking
    skipErrorToast?: boolean; // New option to skip automatic error toast
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);

/**
 * Throttle untuk Events.AUTH_UNAUTHORIZED. Tanpa throttle, 5 paralel request
 * yang gagal refresh token akan emit event 5x → AuthContext.signOut dijalankan
 * 5x cepat berturut-turut → race antara setIsLoading, queryClient.clear,
 * router navigation → blank screen / flicker. Throttle 1 detik cukup untuk
 * coalesce burst yang berasal dari 1 sebab (token expired).
 */
const AUTH_UNAUTHORIZED_THROTTLE_MS = 1000;
let lastAuthUnauthorizedEmittedAt = 0;
const emitAuthUnauthorizedThrottled = () => {
  const now = Date.now();
  if (now - lastAuthUnauthorizedEmittedAt < AUTH_UNAUTHORIZED_THROTTLE_MS) {
    return;
  }
  lastAuthUnauthorizedEmittedAt = now;
  DeviceEventEmitter.emit(Events.AUTH_UNAUTHORIZED);
};

const getHeaderValue = (headers: AxiosRequestConfig['headers'], headerName: string): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const normalizedName = headerName.toLowerCase();

  if ('get' in headers && typeof headers.get === 'function') {
    const value = headers.get(headerName);
    return typeof value === 'string' ? value : undefined;
  }

  const entries = Object.entries(headers as Record<string, unknown>);
  const match = entries.find(([key]) => key.toLowerCase() === normalizedName);
  return typeof match?.[1] === 'string' ? match[1] : undefined;
};

const isIdempotentRequest = (config?: AxiosRequestConfig): boolean => {
  if (!config) {
    return false;
  }

  const method = config.method?.toLowerCase();
  if (!method) {
    return false;
  }

  if (IDEMPOTENT_METHODS.has(method)) {
    return true;
  }

  return Boolean(getHeaderValue(config.headers, 'Idempotency-Key'));
};

// `axios.create` adalah pemakaian yang didokumentasikan axios; named export
// `create` hanya alias, dan mock axios di tes memakai bentuk default ini.
// eslint-disable-next-line import/no-named-as-default-member
const api = axios.create({
  baseURL: TenantService.getTenantUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Default timeout untuk axios global. Hook (useApiMutation/useApiQuery)
  // bisa override per-call lewat HTTP_TIMEOUTS.long untuk endpoint berat.
  timeout: HTTP_TIMEOUTS.long,
});

// Request interceptor to add token and handle dynamic base URL
api.interceptors.request.use(
  (config) => {
    // Start performance tracking
    config.metadata = { startTime: performance.now() };
    const metricName = `API ${config.method?.toUpperCase()} ${config.url}`;
    performanceMonitor.start(metricName);

    // Inject dynamic base URL
    config.baseURL = TenantService.getTenantUrl();

    // Check internet connection (cached, no async overhead)
    if (!networkStateService.getIsConnected() && !config.url?.includes('localhost')) {
      return Promise.reject(new Error('No Internet connection'));
    }

    // Optimization: Use in-memory token first
    const token = TokenService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-App-Version-Code'] = CURRENT_VERSION_CODE_LABEL;
    config.headers['X-App-Version-Name'] = CURRENT_VERSION_NAME;

    // Correlation ID untuk korelasi log mobile ↔ backend. Saat user lapor
    // bug, request ID di log mobile bisa di-search di backend log.
    if (!config.headers['X-Request-Id']) {
      config.headers['X-Request-Id'] = Crypto.randomUUID();
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Helper to check if request should be retried
const shouldRetry = (error: AxiosError): boolean => {
  if (error.config?.skipRetry) {
    return false;
  }

  if (!isIdempotentRequest(error.config)) {
    return false;
  }

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

      // Telemetry — track sukses untuk observability lintas modul (bukan
      // hanya attendance). Tanpa ini, ketika user lapor "kenapa lambat",
      // tidak ada data pengukuran p95 latency per endpoint.
      const startTime = config.metadata?.startTime;
      if (startTime !== undefined) {
        TelemetryService.track('app', 'api.succeeded', {
          endpoint: config.url,
          latencyMs: Math.round(performance.now() - startTime),
          requestId: typeof config.headers?.['Idempotency-Key'] === 'string'
            ? config.headers['Idempotency-Key']
            : undefined,
        });
      }
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

      const startTime = config.metadata?.startTime;
      TelemetryService.track('app', 'api.failed', {
        endpoint: config.url,
        latencyMs: startTime !== undefined ? Math.round(performance.now() - startTime) : undefined,
        reason: error.code ?? `status_${error.response?.status ?? 'network'}`,
      });
    }

    // Initialize retry count
    config._retryCount = config._retryCount || 0;

    if (error.response?.status === 426) {
      logger.warn(`[API] 426 from ${config.url}. Emitting APP_VERSION_UNSUPPORTED.`);
      DeviceEventEmitter.emit(Events.APP_VERSION_UNSUPPORTED, error.response.data);
      return Promise.reject(error);
    }

    // Check if we should retry
    if (config._retryCount < MAX_RETRIES && shouldRetry(error)) {
      config._retryCount += 1;
      const delay = RETRY_DELAY * Math.pow(2, config._retryCount - 1);
      logger.info(`[API] Retrying ${config.method?.toUpperCase()} ${config.url} (Attempt ${config._retryCount}/${MAX_RETRIES}) in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // Toast feedback diemit SETELAH retry decision selesai. Bila request
    // 5xx eventually sukses via retry, user tidak akan lihat toast error
    // yang menyesatkan. Toast hanya tampil saat retry budget habis dan
    // request truly gagal.
    if (!config.skipErrorToast) {
      if (!error.response) {
        showToast('error', 'Masalah Koneksi', 'Mohon periksa koneksi internet Anda.');
      } else if (error.response.status >= 500) {
        showToast('error', 'Masalah Server', 'Terjadi gangguan pada server. Tim kami sedang menanganinya.');
      }
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
        emitAuthUnauthorizedThrottled();
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
      emitAuthUnauthorizedThrottled();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
