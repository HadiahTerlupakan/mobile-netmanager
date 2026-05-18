import { logger } from "@/utils/logger";
import { Sentry } from "@/services/SentryService";

/**
 * Generic telemetry service untuk semua modul mobile.
 *
 * Sebelumnya hanya `AttendanceTelemetryService` yang ter-track —
 * work-order, inventory, chat, payment dst tidak ada observability sama
 * sekali. Service ini menyediakan API uniform sehingga modul lain bisa
 * track tanpa harus duplikasi pattern.
 *
 * Pipe ke Sentry breadcrumb (untuk crash context) + logger.info (lokal).
 * Bila DSN tidak diset, breadcrumb no-op (Sentry tidak init).
 */

export type TelemetryNamespace =
  | "attendance"
  | "wo"
  | "inventory"
  | "chat"
  | "payment"
  | "sync"
  | "auth"
  | "realtime"
  | "fcm"
  | "upload"
  | "app";

export interface TelemetryPayload {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  networkState?: "online" | "offline";
  queueDepth?: number;
  latencyMs?: number;
  reason?: string;
  retryCount?: number;
  [key: string]: unknown;
}

/** Track event ke logger lokal + Sentry breadcrumb. */
export function trackEvent(
  namespace: TelemetryNamespace,
  event: string,
  payload: TelemetryPayload = {},
): void {
  const fullEvent = `${namespace}.${event}`;
  logger.info("[Telemetry]", {
    event: fullEvent,
    timestamp: new Date().toISOString(),
    ...payload,
  });

  try {
    Sentry.addBreadcrumb({
      category: namespace,
      message: event,
      data: payload as Record<string, unknown>,
      level: "info",
    });
  } catch {
    // Sentry not initialized — silently ignore.
  }
}

/** Track error event dengan severity tinggi + capture exception ke Sentry. */
export function trackError(
  namespace: TelemetryNamespace,
  event: string,
  error: unknown,
  payload: TelemetryPayload = {},
): void {
  const fullEvent = `${namespace}.${event}`;
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error("[Telemetry:Error]", {
    event: fullEvent,
    timestamp: new Date().toISOString(),
    error: errorMessage,
    ...payload,
  });

  try {
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: { telemetry_event: fullEvent, namespace },
        extra: payload as Record<string, unknown>,
      });
    } else {
      Sentry.captureMessage(`${fullEvent}: ${errorMessage}`, {
        level: "error",
        tags: { telemetry_event: fullEvent, namespace },
        extra: payload as Record<string, unknown>,
      });
    }
  } catch {
    // Sentry not initialized — silently ignore.
  }
}

/**
 * Convenience untuk track event sukses sync. Dipakai oleh SyncService
 * agar work-order, inventory, leave juga ter-track (sebelumnya hanya
 * attendance).
 */
export function trackSyncResult(input: {
  endpoint: string;
  outcome: "succeeded" | "permanent_failed" | "expired_ttl" | "queued" | "attempt";
  payload?: TelemetryPayload;
}): void {
  trackEvent("sync", input.outcome, {
    endpoint: input.endpoint,
    ...input.payload,
  });
}

export const TelemetryService = {
  track: trackEvent,
  trackError,
  trackSyncResult,
};
