import { logger } from '@/utils/logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = __DEV__; // Enabled by default in DEV, can be toggled

  constructor() {
    this.enabled = true; // Force enable for now to verify implementation
  }

  /**
   * Start measuring a metric
   * @param name Unique name for the metric
   * @param metadata Optional metadata
   */
  start(name: string, metadata?: Record<string, any>) {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * Stop measuring and log the duration
   * @param name Unique name for the metric
   * @param additionalMetadata Optional metadata to merge
   */
  stop(name: string, additionalMetadata?: Record<string, any>) {
    if (!this.enabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      // logger.warn(`[Performance] Metric ${name} not found or already stopped`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const finalMetadata = {
      ...metric.metadata,
      ...additionalMetadata
    };

    this.log(name, duration, finalMetadata);
    this.metrics.delete(name);

    return duration;
  }

  /**
   * Log a point-in-time metric (e.g. memory usage, though direct memory access is limited in JS)
   */
  measure(name: string, value: number, unit: string = 'ms') {
    if (!this.enabled) return;
    logger.info(`[Performance] ⚡ ${name}: ${value.toFixed(2)}${unit}`);
  }

  private log(name: string, duration: number, metadata?: Record<string, any>) {
    const metaString = metadata ? JSON.stringify(metadata) : '';

    // Colorize output based on duration thresholds
    let icon = '🟢'; // Fast (< 100ms)
    if (duration > 500) icon = '🔴'; // Slow (> 500ms)
    else if (duration > 100) icon = '🟡'; // Medium (> 100ms)

    logger.info(`[Performance] ${icon} ${name}: ${duration.toFixed(2)}ms ${metaString}`);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const performanceMonitor = new PerformanceMonitor();
