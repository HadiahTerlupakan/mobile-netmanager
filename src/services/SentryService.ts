import * as Sentry from '@sentry/react-native';

import { CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { logger } from '@/utils/logger';

/**
 * Sentry initialization untuk crash + error reporting.
 *
 * Sebelum perubahan ini, mobile tidak punya Sentry/Crashlytics — native
 * crash dan unhandled JS rejection LOLOS, hanya `presentAppError` yang
 * report manual via `/api/mobile/error-report`. TelemetryService sudah
 * disiapkan dengan placeholder; di sini kita aktifkan pipe ke Sentry.
 *
 * DSN dibaca dari `EXPO_PUBLIC_SENTRY_DSN`. Bila DSN kosong (dev tanpa
 * config), Sentry tidak diinit — tidak crash app.
 */

let initialized = false;

export function initializeSentry(): void {
  if (initialized) {
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || dsn.trim().length === 0) {
    logger.info('[Sentry] EXPO_PUBLIC_SENTRY_DSN tidak diset — Sentry disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      release: CURRENT_VERSION_NAME,
      enableNative: true,
      enableNativeCrashHandling: true,
      enableAutoSessionTracking: true,
      tracesSampleRate: process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
        ? Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
        : 0.1,
      // PII filter — strip token & password dari payload sebelum kirim.
      // Tanpa filter, Authorization header masuk ke Sentry dashboard,
      // dan engineer dengan akses dashboard punya akses ke token user.
      beforeSend(event) {
        const headers = event.request?.headers;
        if (headers) {
          delete headers['Authorization'];
          delete headers['authorization'];
          delete headers['Cookie'];
          delete headers['cookie'];
        }
        if (event.contexts?.state) {
          // Strip apa pun yang punya field nama 'password' atau 'token'.
          // Sentry serialize React state — bila ada form login state,
          // password bisa bocor.
          stripSensitiveKeys(event.contexts.state as Record<string, unknown>);
        }
        return event;
      },
    });
    initialized = true;
    logger.info('[Sentry] Initialized');
  } catch (error) {
    logger.warn('[Sentry] Initialization failed (non-fatal):', error);
  }
}

function stripSensitiveKeys(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('secret')
    ) {
      obj[key] = '[REDACTED]';
    } else if (obj[key] && typeof obj[key] === 'object') {
      stripSensitiveKeys(obj[key] as Record<string, unknown>);
    }
  }
}

export { Sentry };
