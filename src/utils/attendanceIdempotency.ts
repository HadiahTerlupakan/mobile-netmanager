import { createRequestId, ensureRequestId, buildIdempotencyHeaders } from "./requestId";

/**
 * Attendance-specific helpers — wrapper di atas `requestId.ts` generic.
 * Dipertahankan untuk backward compat pada caller existing
 * (`useAttendanceSubmission`, `useApiMutation`, `SyncService`).
 */

export interface AttendanceIdempotentPayload {
  [key: string]: unknown;
  requestId?: string;
}

export function createAttendanceRequestId(): string {
  return createRequestId("att");
}

export function ensureAttendanceRequestId<T extends AttendanceIdempotentPayload>(
  payload: T,
): T & { requestId: string } {
  return ensureRequestId(payload, "att");
}

export function buildAttendanceIdempotencyHeaders(
  requestId?: string,
): Record<string, string> | undefined {
  return buildIdempotencyHeaders(requestId);
}

export function isAttendanceEndpoint(endpoint: string): boolean {
  return endpoint.includes("/attendance/");
}
