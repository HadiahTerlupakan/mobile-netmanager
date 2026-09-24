import { isAxiosError } from 'axios';

/**
 * Kode galat backend untuk 409 "kunci idempotensi masih diproses"
 * (netmanager `lib/api-response.ts` ErrorCodes, dibangun di
 * `lib/api/idempotency-route-helpers.ts` buildIdempotencyRejectionResponse).
 * Berbeda dari `IDEMPOTENCY_KEY_REUSED` (payload beda, permanen): kunci ini
 * kedaluwarsa sendiri di server, jadi mengulang dengan kunci sama aman.
 */
export const KODE_IDEMPOTENSI_SEDANG_DIPROSES = 'IDEMPOTENCY_IN_PROGRESS';

const HTTP_CONFLICT = 409;

/**
 * Apakah galat adalah 409 `IDEMPOTENCY_IN_PROGRESS`: server masih memproses
 * (atau menunggu kedaluwarsa) permintaan dengan Idempotency-Key yang sama,
 * sehingga permintaan layak diulang nanti dengan kunci yang sama.
 */
export function isGalatIdempotensiSedangDiproses(error: unknown): boolean {
  if (!isAxiosError(error) || !error.response) return false;
  const { status, data } = error.response;
  const kode = (data as { code?: unknown } | null | undefined)?.code;
  return status === HTTP_CONFLICT && kode === KODE_IDEMPOTENSI_SEDANG_DIPROSES;
}
