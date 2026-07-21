/**
 * Refresh Token Service
 *
 * Handles automatic token refresh to maintain user sessions
 * without requiring re-authentication.
 */

import { Events } from '@/constants/Events';
import {
  CURRENT_VERSION_CODE_LABEL,
  CURRENT_VERSION_NAME,
  getOtaUpdateId,
} from '@/constants/appVersion';
import { HTTP_TIMEOUTS } from '@/constants/httpTimeouts';
import { logger } from '@/utils/logger';
import { SecureStorage } from '@/utils/storage';
import { TokenService } from './TokenService';
import { TenantService } from './TenantService';
import axios, { isAxiosError } from 'axios';
import { DeviceEventEmitter } from 'react-native';

const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_TOKEN_KEY = 'session_token';
const PROACTIVE_REFRESH_MARGIN_MS = 60_000;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

class RefreshTokenServiceClass {
  /**
   * Save refresh token to secure storage
   */
  async saveRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStorage.setItemStrict(REFRESH_TOKEN_KEY, refreshToken);
      logger.auth('Refresh token saved');
    } catch (error) {
      logger.error('Failed to save refresh token:', error);
    }
  }

  /**
   * Get refresh token from secure storage
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Clear refresh token from storage
   */
  async clearRefreshToken(): Promise<void> {
    try {
      await SecureStorage.removeItem(REFRESH_TOKEN_KEY);
      logger.auth('Refresh token cleared');
    } catch (error) {
      logger.error('Failed to clear refresh token:', error);
    }
  }

  /**
   * Attempt to refresh the access token
   * Returns the new access token if successful, null otherwise
   *
   * Uses a singleton pattern to prevent multiple simultaneous refresh requests
   */
  async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, wait for that request to complete
    if (isRefreshing && refreshPromise) {
      logger.auth('Token refresh already in progress, waiting...');
      return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = this.doRefresh();

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      logger.auth('No refresh token available');
      return null;
    }

    logger.auth('Attempting to refresh access token...');

    // Retry untuk 5xx / network error (max 2 attempt total). 401/403/426
    // dianggap final dan tidak di-retry. Tanpa retry, transient backend
    // glitch saat refresh menyebabkan user dipikir kena logout walau
    // sebenarnya hanya server hiccup.
    const MAX_REFRESH_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
      const result = await this.attemptRefresh(refreshToken, attempt, MAX_REFRESH_ATTEMPTS);
      if (result.kind === 'success') return result.token;
      if (result.kind === 'final') return null;
      // result.kind === 'retry' → loop continues
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
    return null;
  }

  private async attemptRefresh(
    refreshToken: string,
    attempt: number,
    maxAttempts: number,
  ): Promise<{ kind: 'success'; token: string } | { kind: 'final' } | { kind: 'retry' }> {
    try {
      // Create a separate axios instance to avoid interceptors
      const otaUpdateId = getOtaUpdateId();
      const response = await axios.post(
        `${TenantService.getTenantUrl()}/api/mobile/auth/refresh`,
        {
          refreshToken,
          versionCode: CURRENT_VERSION_CODE_LABEL,
          versionName: CURRENT_VERSION_NAME,
          otaUpdateId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Version-Code': CURRENT_VERSION_CODE_LABEL,
            'X-App-Version-Name': CURRENT_VERSION_NAME,
            'X-App-Ota-Update-Id': otaUpdateId,
          },
          timeout: HTTP_TIMEOUTS.refresh,
        },
      );

      if (response.data?.token) {
        const newAccessToken = response.data.token;
        const newRefreshToken = response.data.refreshToken;

        TokenService.setToken(newAccessToken);
        await SecureStorage.setItemStrict(SESSION_TOKEN_KEY, newAccessToken);
        if (newRefreshToken) {
          await this.saveRefreshToken(newRefreshToken);
        }

        logger.auth('Token refresh successful');
        return { kind: 'success', token: newAccessToken };
      }

      logger.warn('Token refresh response did not contain a token');
      return { kind: 'final' };
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 426) {
          logger.warn('[RefreshToken] App version unsupported during refresh');
          DeviceEventEmitter.emit(Events.APP_VERSION_UNSUPPORTED, error.response?.data);
          return { kind: 'final' };
        }

        if (status === 401 || status === 403) {
          // Refresh token is invalid/expired - need to re-authenticate.
          // Tidak ada gunanya retry — token memang sudah dicabut.
          logger.auth('Refresh token expired or invalid');
          await this.clearRefreshToken();
          return { kind: 'final' };
        }

        // 5xx / network / timeout — transient, retry kalau masih ada budget.
        const isRetriable =
          (status !== undefined && status >= 500) ||
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED';
        if (isRetriable && attempt < maxAttempts) {
          logger.warn(
            `[RefreshToken] Transient error (${status ?? error.code}), retry ${attempt}/${maxAttempts}`,
          );
          return { kind: 'retry' };
        }

        logger.error('Token refresh failed:', error.message);
        return { kind: 'final' };
      }

      logger.error('Token refresh error:', error);
      return { kind: 'final' };
    }
  }

  /**
   * Check if we have a refresh token stored
   */
  async hasRefreshToken(): Promise<boolean> {
    const token = await this.getRefreshToken();
    return !!token;
  }

  stopProactiveRefresh(): void {
    if (proactiveRefreshTimer !== null) {
      clearTimeout(proactiveRefreshTimer);
      proactiveRefreshTimer = null;
    }
  }

  startProactiveRefresh(token: string): void {
    this.stopProactiveRefresh();
    TokenService.setToken(token);
    const expiryMs = TokenService.getExpiry();
    if (!expiryMs) return;

    const refreshAt = expiryMs - PROACTIVE_REFRESH_MARGIN_MS;
    const delayMs = refreshAt - Date.now();
    if (delayMs <= 0) {
      logger.auth('[RefreshToken] Token already near/past expiry, refreshing now...');
      this.refreshAccessToken().catch((err: unknown) => {
        logger.warn('[RefreshToken] Proactive refresh failed:', err);
      });
      return;
    }

    logger.auth(`[RefreshToken] Proactive refresh scheduled in ${Math.round(delayMs / 1000)}s`);
    proactiveRefreshTimer = setTimeout(async () => {
      proactiveRefreshTimer = null;
      logger.auth('[RefreshToken] Proactive refresh triggered');
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        this.startProactiveRefresh(newToken);
      }
    }, delayMs);
  }
}

export const RefreshTokenService = new RefreshTokenServiceClass();
