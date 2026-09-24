import { isAxiosError } from 'axios';

/**
 * Kode galat backend untuk 409 "kunci idempotensi masih diproses"
 * (netmanager `lib/api-response.ts` ErrorCodes, dibangun di
 * `lib/api/idempotency-route-helpers.ts` buildIdempotencyRejectionResponse).
 * Berbeda dari `IDEMPOTENCY_KEY_REUSED` (payload beda, permanen): kunci ini
 * kedaluwarsa sendiri di server, jadi mengulang dengan kunci sama aman.
 */
export const KODE_IDEMPOTENSI_SEDANG_DIPROSES = 'IDEMPOTENCY_IN_PROGRESS';

/**
 * Kode galat backend untuk 409 "kunci idempotensi sudah dipakai dengan badan
 * berbeda" (sumber sama dengan `KODE_IDEMPOTENSI_SEDANG_DIPROSES`). Permanen:
 * mengulang dengan kunci yang sama akan selalu ditolak.
 */
export const KODE_IDEMPOTENSI_KUNCI_DIPAKAI_ULANG = 'IDEMPOTENCY_KEY_REUSED';

/**
 * Kode galat backend untuk 409 "transisi/status tidak sah": resource sudah
 * berubah di server sejak klien membaca datanya (netmanager
 * `ProspekService.ts:170`, dipakai `useUbahStatusProspek` DAN
 * `useJadikanCanvasing` saat prospek sudah pernah dikonversi pihak lain).
 * Family beda dari dua kode idempotensi di atas (itu soal kunci request,
 * ini soal state bisnis), tapi bentuk deteksinya sama (409 + `data.code`) —
 * dikumpulkan di sini satu sumber, bukan diduplikasi per hook (fix round 1
 * Task 16).
 */
export const KODE_STATUS_TIDAK_SAH = 'INVALID_STATE';

const HTTP_CONFLICT = 409;

/** Kode galat pada balasan 409, atau null bila galat bukan 409 dari server. */
function kodeGalatKonflik(error: unknown): unknown {
  if (!isAxiosError(error) || !error.response) return null;
  const { status, data } = error.response;
  if (status !== HTTP_CONFLICT) return null;
  return (data as { code?: unknown } | null | undefined)?.code ?? null;
}

/**
 * Apakah galat adalah 409 `IDEMPOTENCY_IN_PROGRESS`: server masih memproses
 * (atau menunggu kedaluwarsa) permintaan dengan Idempotency-Key yang sama,
 * sehingga permintaan layak diulang nanti dengan kunci yang sama.
 */
export function isGalatIdempotensiSedangDiproses(error: unknown): boolean {
  return kodeGalatKonflik(error) === KODE_IDEMPOTENSI_SEDANG_DIPROSES;
}

/**
 * Apakah galat adalah 409 `IDEMPOTENCY_KEY_REUSED`: server sudah mencatat
 * permintaan lain dengan Idempotency-Key yang sama tetapi badan berbeda.
 */
export function isGalatIdempotensiKunciDipakaiUlang(error: unknown): boolean {
  return kodeGalatKonflik(error) === KODE_IDEMPOTENSI_KUNCI_DIPAKAI_ULANG;
}

/**
 * Apakah galat berarti transisi/status resource sudah tidak sah karena
 * sudah berubah di server sejak klien membaca datanya (409 `INVALID_STATE`).
 */
export function isGalatStatusTidakSah(error: unknown): boolean {
  return kodeGalatKonflik(error) === KODE_STATUS_TIDAK_SAH;
}
