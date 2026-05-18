import * as Crypto from "expo-crypto";

/**
 * Generic request ID untuk idempotency lintas modul (work-order, inventory,
 * leave, dst). Sebelumnya hanya `createAttendanceRequestId` yang ada — fix
 * Sprint 1 (C1) butuh request ID untuk semua mutation yang offline-able.
 *
 * Pakai `Crypto.randomUUID()` daripada `Math.random()` untuk:
 *   - Hindari clock-rollback collision (dua submit di ms yang sama setelah
 *     device clock di-reset bisa menghasilkan ID identik dengan
 *     `att-${Date.now()}-${rand}`).
 *   - Entropy lebih besar (128 bit vs ~30 bit di base36 6 char).
 *
 * Format: `<scope>-<uuid>` agar logger/grep mudah filter per modul.
 */
export function createRequestId(scope: string): string {
  return `${scope}-${Crypto.randomUUID()}`;
}

export interface IdempotentPayload {
  [key: string]: unknown;
  requestId?: string;
}

export function ensureRequestId<T extends IdempotentPayload>(
  payload: T,
  scope: string,
): T & { requestId: string } {
  if (typeof payload.requestId === "string" && payload.requestId.length > 0) {
    return payload as T & { requestId: string };
  }

  return {
    ...payload,
    requestId: createRequestId(scope),
  };
}

export function buildIdempotencyHeaders(
  requestId?: string,
): Record<string, string> | undefined {
  if (!requestId) return undefined;
  return { "Idempotency-Key": requestId };
}
