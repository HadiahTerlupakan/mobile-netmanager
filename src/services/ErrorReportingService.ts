import { CURRENT_VERSION_CODE, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { Config } from '@/constants/Config';
import { HTTP_TIMEOUTS } from '@/constants/httpTimeouts';
import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';
import { logger } from '@/utils/logger';
import { registerErrorReporter } from '@/utils/errorPresenter';
import { Platform } from 'react-native';

/**
 * Error Reporting Service
 *
 * Unified interface for error logging and debugging.
 *
 * Features:
 * - Safe error handling to prevent crashes
 * - User context management
 * - Breadcrumb tracking for debugging
 */

interface UserContext {
  id: string;
  username?: string;
  email?: string;
  [key: string]: unknown;
}

interface ErrorContext {
  [key: string]: unknown;
}

type LogLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

interface Breadcrumb {
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface BackendErrorReportPayload {
  message: string;
  kind: string;
  source: string;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  route?: string;
  screen?: string;
  appVersion: string;
  platform: string;
  occurredAt: string;
  stack?: string;
  breadcrumbs: Breadcrumb[];
  context: Record<string, unknown>;
}

const REPORT_TIMEOUT_MS = HTTP_TIMEOUTS.short;

class ErrorReportingService {
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;
  private userContext: UserContext | null = null;
  private tags: Record<string, string> = {};
  private contexts: Record<string, Record<string, unknown>> = {};
  private breadcrumbs: Breadcrumb[] = [];

  private getSnapshot() {
    return {
      user: this.userContext,
      tags: this.tags,
      contexts: this.contexts,
      breadcrumbs: this.breadcrumbs.slice(-20),
    };
  }

  private get backendReportingEnabled(): boolean {
    return Boolean(Config.ENABLE_BACKEND_ERROR_REPORTING);
  }

  private buildPayload(
    message: string,
    kind: string,
    severity: BackendErrorReportPayload['severity'],
    context?: ErrorContext,
    stack?: string,
  ): BackendErrorReportPayload {
    const snapshot = this.getSnapshot();

    return {
      message,
      kind,
      source: typeof context?.source === 'string' ? context.source : 'runtime',
      severity,
      route: typeof context?.route === 'string' ? context.route : undefined,
      screen: typeof context?.screen === 'string' ? context.screen : undefined,
      appVersion: `${CURRENT_VERSION_NAME}+${CURRENT_VERSION_CODE}`,
      platform: Platform.OS,
      occurredAt: new Date().toISOString(),
      stack,
      breadcrumbs: snapshot.breadcrumbs,
      context: {
        user: snapshot.user,
        tags: snapshot.tags,
        contexts: snapshot.contexts,
        ...(context ? { extra: context } : {}),
      },
    };
  }

  private async sendToBackend(payload: BackendErrorReportPayload): Promise<void> {
    if (!this.backendReportingEnabled) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = TokenService.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${TenantService.getTenantUrl()}/api/mobile/error-report`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        logger.warn('[ErrorReporting] Backend report rejected', {
          status: response.status,
          kind: payload.kind,
        });
      }
    } catch (error) {
      logger.warn('[ErrorReporting] Backend report failed', {
        kind: payload.kind,
        error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Initialize the error reporting service
   * Call this once during app startup
   */
  init() {
    try {
      this.isInitialized = true;
      this.isEnabled = true;

      // Register this service as the global error reporter for utils
      registerErrorReporter(this);

      logger.info('[ErrorReporting] Initialized and registered as global reporter');
    } catch (error) {
      logger.error('[ErrorReporting] Failed to initialize:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Capture an exception and log it
   * @param error The error object to capture
   * @param context Optional context data to attach
   */
  captureException(error: Error, context?: ErrorContext) {
    try {
      logger.error('[ErrorReporting] Exception:', error);
      logger.error('[ErrorReporting] Context:', {
        ...this.getSnapshot(),
        ...(context ? { context } : {}),
      });
      void this.sendToBackend(
        this.buildPayload(error.message, 'exception', 'error', context, error.stack)
      );
    } catch (err) {
      logger.error('[ErrorReporting] Failed to capture exception:', err);
    }
  }

  /**
   * Capture a message and log it
   * @param message The message to capture
   * @param level The severity level (default: 'info')
   */
  captureMessage(message: string, level: LogLevel = 'info') {
    try {
      if (level === 'fatal' || level === 'error') {
        logger.error(`[ErrorReporting] Message (${level}):`, message);
      } else if (level === 'warning') {
        logger.warn(`[ErrorReporting] Message (${level}):`, message);
      } else if (level === 'debug') {
        logger.debug(`[ErrorReporting] Message (${level}):`, message);
      } else {
        logger.info(`[ErrorReporting] Message (${level}):`, message);
      }

      if (level === 'fatal' || level === 'error' || level === 'warning') {
        void this.sendToBackend(
          this.buildPayload(message, 'message', level === 'warning' ? 'warning' : level, undefined)
        );
      }
    } catch (error) {
      logger.error('[ErrorReporting] Failed to capture message:', error);
    }
  }

  /**
   * Set user context for error reports
   * @param user User information to attach to error reports
   */
  setUser(user: UserContext) {
    try {
      this.userContext = user;
      logger.info('[ErrorReporting] Setting user context:', user.id);
    } catch (error) {
      logger.error('[ErrorReporting] Failed to set user context:', error);
    }
  }

  /**
   * Clear user context (call on logout)
   */
  clearUser() {
    try {
      this.userContext = null;
      logger.info('[ErrorReporting] Clearing user context');
    } catch (error) {
      logger.error('[ErrorReporting] Failed to clear user context:', error);
    }
  }

  /**
   * Add a breadcrumb for tracking user actions and navigation
   * Breadcrumbs help debug issues by showing what led to an error
   *
   * @param category Category of the breadcrumb (e.g., 'navigation', 'user-action', 'api')
   * @param message Description of the action
   * @param data Optional additional data
   */
  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
    try {
      this.breadcrumbs.push({
        category,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
      if (this.breadcrumbs.length > 50) {
        this.breadcrumbs = this.breadcrumbs.slice(-50);
      }
      logger.debug('[ErrorReporting] Breadcrumb:', category, message, data);
    } catch (error) {
      logger.error('[ErrorReporting] Failed to add breadcrumb:', error);
    }
  }

  /**
   * Set custom tags for filtering and grouping errors
   * @param key Tag key
   * @param value Tag value
   */
  setTag(key: string, value: string) {
    try {
      this.tags[key] = value;
      logger.debug('[ErrorReporting] Setting tag:', key, value);
    } catch (error) {
      logger.error('[ErrorReporting] Failed to set tag:', error);
    }
  }

  /**
   * Set custom context for additional debugging information
   * @param name Context name
   * @param context Context data
   */
  setContext(name: string, context: Record<string, unknown>) {
    try {
      this.contexts[name] = context;
      logger.debug('[ErrorReporting] Setting context:', name, context);
    } catch (error) {
      logger.error('[ErrorReporting] Failed to set context:', error);
    }
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if external reporting is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const errorReportingService = new ErrorReportingService();

// Also export the class for testing purposes
export default errorReportingService;
