/**
 * Refresh Token Service
 *
 * Handles automatic token refresh to maintain user sessions
 * without requiring re-authentication.
 */

import * as SecureStore from 'expo-secure-store';
import { CURRENT_VERSION_CODE_LABEL, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { logger } from '@/utils/logger';
import { TokenService } from './TokenService';
import { TenantService } from './TenantService';
import axios, { isAxiosError } from 'axios';

const REFRESH_TOKEN_KEY = 'refresh_token';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

class RefreshTokenServiceClass {
  /**
   * Save refresh token to secure storage
   */
  async saveRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
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
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
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
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
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
    try {
      const refreshToken = await this.getRefreshToken();

      if (!refreshToken) {
        logger.auth('No refresh token available');
        return null;
      }

      logger.auth('Attempting to refresh access token...');

      // Create a separate axios instance to avoid interceptors
      const response = await axios.post(
        `${TenantService.getTenantUrl()}/api/mobile/auth/refresh`,
        { refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Version-Code': CURRENT_VERSION_CODE_LABEL,
            'X-App-Version-Name': CURRENT_VERSION_NAME,
          },
          timeout: 10000,
        }
      );

      if (response.data?.token) {
        const newAccessToken = response.data.token;
        const newRefreshToken = response.data.refreshToken;

        // Update access token in memory
        TokenService.setToken(newAccessToken);

        // Save new access token to secure storage
        await SecureStore.setItemAsync('session_token', newAccessToken);

        // Update refresh token if a new one was provided (token rotation)
        if (newRefreshToken) {
          await this.saveRefreshToken(newRefreshToken);
        }

        logger.auth('Token refresh successful');
        return newAccessToken;
      }

      logger.warn('Token refresh response did not contain a token');
      return null;
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Refresh token is invalid/expired - need to re-authenticate
          logger.auth('Refresh token expired or invalid');
          await this.clearRefreshToken();
        } else {
          logger.error('Token refresh failed:', error.message);
        }
      } else {
        logger.error('Token refresh error:', error);
      }
      return null;
    }
  }

  /**
   * Check if we have a refresh token stored
   */
  async hasRefreshToken(): Promise<boolean> {
    const token = await this.getRefreshToken();
    return !!token;
  }
}

export const RefreshTokenService = new RefreshTokenServiceClass();
