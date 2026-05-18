import { initializeAppCheck } from '@react-native-firebase/app-check';
import { getApp } from '@react-native-firebase/app';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

/**
 * App Check init — verify request datang dari app asli, bukan attacker
 * yang menyalin Firebase API key.
 *
 * Provider per environment:
 * - production: Play Integrity (Android) — attestation by Google Play
 * - staging/development: debug provider — token statis, harus di-allowlist
 *   di Firebase Console > App Check > Apps > Manage debug tokens
 *
 * Init idempotent. Bila gagal (misal native module belum link), log warning
 * tapi tidak throw — Firebase services masih bisa dipanggil tanpa App Check
 * token (akan di-block hanya kalau service di-set ke Enforce mode).
 */

let initialized = false;

export async function initializeAppCheckService(): Promise<void> {
  if (initialized) {
    return;
  }

  if (Platform.OS !== 'android') {
    logger.info('[AppCheck] Skip init — hanya Android yang di-support saat ini');
    return;
  }

  const variant = process.env.EXPO_PUBLIC_APP_VARIANT?.trim().toLowerCase();
  const isProduction = variant === 'production';
  const debugToken = process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN;

  try {
    await initializeAppCheck(getApp(), {
      provider: {
        providerOptions: {
          android: {
            provider: isProduction ? 'playIntegrity' : 'debug',
            debugToken,
          },
        },
      },
      isTokenAutoRefreshEnabled: true,
    });

    initialized = true;
    logger.info(`[AppCheck] Initialized — provider: ${isProduction ? 'playIntegrity' : 'debug'}`);
  } catch (error) {
    logger.warn('[AppCheck] Init gagal — Firebase services tetap jalan tanpa App Check token', error);
  }
}
