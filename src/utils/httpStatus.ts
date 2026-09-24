import { getHttpStatus } from '@/lib/queryErrorReporting';

/** Status HTTP 403: server menjawab, tapi izin untuk resource ini tidak ada. */
export const STATUS_AKSES_DITOLAK = 403;

/** Apakah galat adalah respons 403 dari server (izin tidak ada). */
export function isAksesDitolak(error: unknown): boolean {
  return getHttpStatus(error) === STATUS_AKSES_DITOLAK;
}
