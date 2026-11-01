import type { AxiosRequestConfig } from 'axios';
import { DeviceEventEmitter } from 'react-native';

import { Events } from '@/constants/Events';
import { logger } from '@/utils/logger';

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

/** Akhiri sesi atas 401 yang tidak terpulihkan, kecuali permintaannya melarang. */
export function akhiriSesiAtas401(config: AxiosRequestConfig): void {
  if (config.skipSignOutOnUnauthorized) {
    logger.warn(`[API] Sesi tidak diakhiri: ${config.url} memakai skipSignOutOnUnauthorized.`);
    return;
  }
  logger.warn('[API] Emitting AUTH_UNAUTHORIZED.');
  emitAuthUnauthorizedThrottled();
}
