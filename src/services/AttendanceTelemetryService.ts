import { logger } from "@/utils/logger";

export type AttendanceTelemetryEvent =
  | "attendance_submit_started"
  | "attendance_photo_upload_started"
  | "attendance_photo_upload_succeeded"
  | "attendance_photo_upload_failed"
  | "attendance_queued_offline"
  | "attendance_api_succeeded"
  | "attendance_api_failed"
  | "attendance_replay_succeeded"
  | "attendance_replay_failed"
  | "attendance_duplicate_blocked";

export interface AttendanceTelemetryPayload {
  requestId?: string;
  userId?: string;
  networkState?: "online" | "offline";
  queueDepth?: number;
  endpoint?: string;
  action?: "check-in" | "check-out";
  latencyMs?: number;
  reason?: string;
  retryCount?: number;
}

export const AttendanceTelemetryService = {
  track(event: AttendanceTelemetryEvent, payload: AttendanceTelemetryPayload = {}) {
    logger.info("[AttendanceTelemetry]", {
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  },
};
