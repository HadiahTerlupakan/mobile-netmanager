import { logger } from '@/utils/logger';

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
  [key: string]: any;
}

interface ErrorContext {
  [key: string]: any;
}

type LogLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

class ErrorReportingService {
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;

  /**
   * Initialize the error reporting service
   * Call this once during app startup
   */
  init() {
    try {
      this.isInitialized = true;
      this.isEnabled = false;
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
      if (context) {
        logger.error('[ErrorReporting] Context:', context);
      }
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
      logger.info(`[ErrorReporting] Message (${level}):`, message);
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
  addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
    try {
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
  setContext(name: string, context: Record<string, any>) {
    try {
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
