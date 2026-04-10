import React, { ReactNode, useEffect } from 'react';

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

    try {
      realtimeService.connect({
        token,
        userId,
        userRole,
        tenantUrl,
      });

      stopPresence = presenceService.startPresence(userId, { role: userRole });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Realtime connection failed';

      if (message !== 'Firebase mobile config is incomplete') {
        logger.error('[Realtime] Connection error:', message);
      } else {
        logger.warn('[Realtime] Realtime disabled:', message);
      }

      return;
    }

    return () => {
      stopPresence?.();
      realtimeService.disconnect();
    };
  }, [connectionState.canConnect, tenantUrl, token, userId, userRole]);

  return <>{children}</>;
}
