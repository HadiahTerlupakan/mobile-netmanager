import { DatabaseService } from '@/services/DatabaseService';
import { ensureForegroundNotificationChannel } from '@/services/ForegroundNotificationService';
import { networkStateService } from '@/services/NetworkStateService';
import { performanceMonitor } from '@/services/PerformanceMonitor';
import { sapuFotoOfflineYatim } from '@/services/sapuFotoOffline';
import { SyncService } from '@/services/SyncService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { logger } from '@/utils/logger';
import { useEffect } from 'react';

/**
 * Initialize critical app services on mount
 * - Database initialization
 * - Sweep foto offline yatim (setelah database siap)
 * - Foreground notification channel
 * - Sync monitoring (delayed)
 * - Performance tracking
 */
export function useAppInitialization(isLoading: boolean) {
  useEffect(() => {
    performanceMonitor.start('App Startup');
  }, []);

  useEffect(() => {
    if (!isLoading) {
      performanceMonitor.stop('App Startup');
    }
  }, [isLoading]);

  useEffect(() => {
    let syncTimer: ReturnType<typeof setTimeout> | undefined;

    const initServices = async () => {
      try {
        logger.info('[Init] Phase 1: Database & network initialization');
        networkStateService.initialize();
        await DatabaseService.initDatabase();
        // Tanpa ditunggu: sweep hanya reclaim disk dan tidak boleh menahan startup.
        void sapuFotoOfflineYatim();
        await ensureForegroundNotificationChannel();

        logger.info('[Init] Phase 2: Starting sync monitoring');
        syncTimer = setTimeout(() => {
          try {
            SyncService.startMonitoring();
          } catch (error) {
            logger.error('[Init] Failed to start sync monitoring:', error);
            errorReportingService.captureException(
              error instanceof Error ? error : new Error('Failed to start sync monitoring'),
              { source: 'root.initServices.syncMonitoring' }
            );
          }
        }, 1000);
      } catch (error) {
        logger.error('[Init] Service initialization failed:', error);
        errorReportingService.captureException(
          error instanceof Error ? error : new Error('Service initialization failed'),
          { source: 'root.initServices' }
        );
      }
    };

    void initServices();

    return () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }

      SyncService.stopMonitoring();
      networkStateService.dispose();
    };
  }, []);
}
