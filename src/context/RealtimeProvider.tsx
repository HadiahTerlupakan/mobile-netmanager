import React, { ReactNode, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { getSocketConnectionState } from '@/context/socketConnection';
import { useTenant } from '@/context/TenantContext';
import { presenceService } from '@/services/PresenceService';
import { realtimeService } from '@/services/RealtimeService';
import { logger } from '@/utils/logger';

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { token, user } = useAuth();
  const { tenantUrl } = useTenant();
  const userId = user?.id ?? null;
  const userRole = user?.role || 'USER';
  const connectionState = getSocketConnectionState({
    token,
    tenantUrl,
    user: userId ? { id: userId, role: userRole } : null,
  });

  useEffect(() => {
    if (!connectionState.canConnect || !token || !userId) {
      return;
    }

    let stopPresence: (() => void) | null = null;
    let isCancelled = false;

    const startRealtime = async () => {
      try {
        await realtimeService.connect({
          token,
          userId,
          userRole,
          tenantUrl,
        });

        if (isCancelled) {
          return;
        }

        stopPresence = presenceService.startPresence(userId, { role: userRole });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Realtime connection failed';

        if (message !== 'Firebase mobile config is incomplete') {
          logger.error('[Realtime] Connection error:', message);
        } else {
          logger.warn('[Realtime] Realtime disabled:', message);
        }
      }
    };

    void startRealtime();

    // Re-connect saat app kembali ke foreground setelah lama background.
    // Tanpa ini, listener Firestore yang mati selama background tidak
    // ke-restore secara otomatis — user lihat data frozen sampai kill app.
    let prevState: AppStateStatus = AppState.currentState;
    const onAppStateChange = (next: AppStateStatus) => {
      if (
        (prevState === 'background' || prevState === 'inactive') &&
        next === 'active' &&
        !isCancelled
      ) {
        logger.info('[Realtime] App active — re-validating realtime connection');
        void realtimeService.connect({
          token,
          userId,
          userRole,
          tenantUrl,
        }).catch((error) => {
          logger.warn('[Realtime] Re-connect on AppState active failed:', error);
        });
      }
      prevState = next;
    };
    const sub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      isCancelled = true;
      sub.remove();
      stopPresence?.();
      void realtimeService.disconnect();
    };
  }, [connectionState.canConnect, tenantUrl, token, userId, userRole]);

  return <>{children}</>;
}
