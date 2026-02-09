import * as Sentry from '@sentry/react-native';
import { logger } from '@/utils/logger';

/**
 * Error Reporting Service using Sentry
 *
 * Features:
 * - Only enabled in production (__DEV__ = false)
 * - Graceful fallback to logger in development
 * - Safe error handling to prevent crashes
 * - User context management
 * - Breadcrumb tracking for debugging
 */

interface UserContext {
  id: string;
  username?: string;
  email?: string;
  [key: string]: any;
}

interface ErrorContext {
  [key: string]: any;
}

type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

class ErrorReportingService {
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;

  /**
   * Initialize Sentry SDK
   * Call this once during app startup
   */
  init() {
    try {
      // Only enable in production
      if (__DEV__) {
        logger.info('[ErrorReporting] Running in development mode - using logger instead of Sentry');
        this.isEnabled = false;
        return;
      }

      // Initialize Sentry with configuration
      Sentry.init({
        // Replace this DSN with your own from https://sentry.io/
        dsn: 'https://your-dsn@sentry.io/your-project-id',

        // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
        // Adjust this value in production to reduce data volume
        tracesSampleRate: 1.0,

        // Enable native crash handling
        enableNative: true,

        // Enable auto session tracking
        enableAutoSessionTracking: true,

        // Session timeout (30 minutes)
        sessionTrackingIntervalMillis: 30000,

        // Capture errors automatically
        enableCaptureFailedRequests: true,

        // Environment
        environment: __DEV__ ? 'development' : 'production',

        // Before send hook - modify or filter events before sending
        beforeSend(event, hint) {
          // You can filter sensitive data here
          // Return null to drop the event
          return event;
        },
      });

      this.isInitialized = true;
      this.isEnabled = true;
      logger.info('[ErrorReporting] Sentry initialized successfully');
    } catch (error) {
      logger.error('[ErrorReporting] Failed to initialize Sentry:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Capture an exception and send it to Sentry
   * @param error The error object to capture
   * @param context Optional context data to attach
   */
  captureException(error: Error, context?: ErrorContext) {
    try {
      if (!this.isEnabled) {
        logger.error('[ErrorReporting] Exception:', error);
        if (context) {
          logger.error('[ErrorReporting] Context:', context);
        }
        return;
      }

      // Add context if provided
      if (context) {
        Sentry.withScope((scope) => {
          Object.keys(context).forEach((key) => {
            scope.setContext(key, context[key]);
          });
          Sentry.captureException(error);
        });
      } else {
        Sentry.captureException(error);
      }

      logger.info('[ErrorReporting] Exception sent to Sentry');
    } catch (err) {
      logger.error('[ErrorReporting] Failed to capture exception:', err);
    }
  }

  /**
   * Capture a message and send it to Sentry
   * @param message The message to capture
   * @param level The severity level (default: 'info')
   */
  captureMessage(message: string, level: SentryLevel = 'info') {
    try {
      if (!this.isEnabled) {
        logger.info(`[ErrorReporting] Message (${level}):`, message);
        return;
      }

      Sentry.captureMessage(message, level);
      logger.info('[ErrorReporting] Message sent to Sentry');
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
      if (!this.isEnabled) {
        logger.info('[ErrorReporting] Setting user context (dev mode):', user.id);
        return;
      }

      const { id, username, email, ...rest } = user;
      Sentry.setUser({
        id,
        username,
        email,
        ...rest,
      });

      logger.info('[ErrorReporting] User context set:', user.id);
    } catch (error) {
      logger.error('[ErrorReporting] Failed to set user context:', error);
    }
  }

  /**
   * Clear user context (call on logout)
   */
  clearUser() {
    try {
      if (!this.isEnabled) {
        logger.info('[ErrorReporting] Clearing user context (dev mode)');
        return;
      }

      Sentry.setUser(null);
      logger.info('[ErrorReporting] User context cleared');
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
  addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
    try {
      if (!this.isEnabled) {
        logger.debug('[ErrorReporting] Breadcrumb:', category, message, data);
        return;
      }

      Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info',
        timestamp: Date.now() / 1000, // Sentry expects seconds
      });
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
      if (!this.isEnabled) {
        logger.debug('[ErrorReporting] Setting tag (dev mode):', key, value);
        return;
      }

      Sentry.setTag(key, value);
    } catch (error) {
      logger.error('[ErrorReporting] Failed to set tag:', error);
    }
  }

  /**
   * Set custom context for additional debugging information
   * @param name Context name
   * @param context Context data
   */
  setContext(name: string, context: Record<string, any>) {
    try {
      if (!this.isEnabled) {
        logger.debug('[ErrorReporting] Setting context (dev mode):', name, context);
        return;
      }

      Sentry.setContext(name, context);
    } catch (error) {
      logger.error('[ErrorReporting] Failed to set context:', error);
    }
  }

  /**
   * Check if Sentry is initialized and enabled
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if Sentry is enabled (production mode)
   */
  get enabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const errorReportingService = new ErrorReportingService();

// Also export the class for testing purposes
export default errorReportingService;
