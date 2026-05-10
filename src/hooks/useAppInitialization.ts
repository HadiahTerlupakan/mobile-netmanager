import { DatabaseService } from '@/services/DatabaseService';
import { ensureForegroundNotificationChannel } from '@/services/ForegroundNotificationService';
import { performanceMonitor } from '@/services/PerformanceMonitor';
import { SyncService } from '@/services/SyncService';
import { errorReportingService } from '@/services/ErrorReportingService';
import { logger } from '@/utils/logger';
import { useEffect } from 'react';

/**
 * Initialize critical app services on mount
 * - Database initialization
 * - Foreground notification channel
 * - Sync monitoring (delayed)
 * - Performance tracking
 */
export function useAppInitialization() {
  useEffect(() => {
    let syncTimer: ReturnType<typeof setTimeout> | undefined;

    const initServices = async () => {
      try {
        // Phase 1: Critical services
        logger.info('[Init] Phase 1: Database initialization');
        await DatabaseService.initDatabase();

        await ensureForegroundNotificationChannel();

        // Phase 2: Non-critical services (delayed)
        logger.info('[Init] Phase 2: Starting sync monitoring');
        syncTimer = setTimeout(() => {
          try {
            SyncService.startMonitoring();
          } catch (error) {
            logger.error('[Init] Failed to start sync monitoring:', error);
            errorReportingService.captureException(
              error instanceof Error ? error : new Error('Failed to start sync monitoring'),
              {
                source: 'root.initServices.syncMonitoring',
              }
            );
          }
        }, 1000);
      } catch (error) {
        logger.error('[Init] Service initialization failed:', error);
        errorReportingService.captureException(
          error instanceof Error ? error : new Error('Service initialization failed'),
          {
            source: 'root.initServices',
          }
        );
      }
    };

    performanceMonitor.start('App Startup');
    initServices();

    return () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
      SyncService.stopMonitoring();
      performanceMonitor.stop('App Startup');
    };
  }, []);
}
