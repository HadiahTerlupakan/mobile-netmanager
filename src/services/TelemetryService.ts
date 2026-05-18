import { logger } from "@/utils/logger";

/**
 * Generic telemetry service untuk semua modul mobile.
 *
 * Sebelumnya hanya `AttendanceTelemetryService` yang ter-track —
 * work-order, inventory, chat, payment dst tidak ada observability sama
 * sekali. Service ini menyediakan API uniform sehingga modul lain bisa
 * track tanpa harus duplikasi pattern.
 *
 * Pipe ke logger lokal saja. Untuk crash + error reporting backend,
 * `ErrorReportingService` mengirim ke `/api/mobile/error-report`.
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

/** Track event ke logger lokal. */
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
}

/** Track error event dengan severity tinggi. */
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
