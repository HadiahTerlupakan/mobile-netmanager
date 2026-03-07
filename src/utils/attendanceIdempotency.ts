export interface AttendanceIdempotentPayload {
  [key: string]: unknown;
  requestId?: string;
}

export function createAttendanceRequestId(now: number = Date.now()): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `att-${now}-${randomPart}`;
}

export function ensureAttendanceRequestId<T extends AttendanceIdempotentPayload>(
  payload: T,
): T & { requestId: string } {
  if (typeof payload.requestId === "string" && payload.requestId.length > 0) {
    return payload as T & { requestId: string };
  }

  return {
    ...payload,
    requestId: createAttendanceRequestId(),
  };
}

export function buildAttendanceIdempotencyHeaders(requestId?: string): Record<string, string> | undefined {
  if (!requestId) {
    return undefined;
  }

  return {
    "Idempotency-Key": requestId,
  };
}

export function isAttendanceEndpoint(endpoint: string): boolean {
  return endpoint.includes("/attendance/");
}
