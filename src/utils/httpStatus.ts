import { getHttpStatus } from '@/lib/queryErrorReporting';

/** Status HTTP 403: server menjawab, tapi izin untuk resource ini tidak ada. */
export const STATUS_AKSES_DITOLAK = 403;

/** Apakah galat adalah respons 403 dari server (izin tidak ada). */
export function isAksesDitolak(error: unknown): boolean {
  return getHttpStatus(error) === STATUS_AKSES_DITOLAK;
}

/** Status HTTP 404: server menjawab, tapi resource-nya memang tidak ada. */
export const STATUS_TIDAK_DITEMUKAN = 404;

/**
 * Apakah galat adalah respons 404 dari server. Dibedakan dari kegagalan
 * jaringan karena konsekuensinya berbeda: memuat ulang 404 tidak akan pernah
 * berhasil, jadi layar tidak boleh menawarkan "Coba lagi" untuk itu.
 */
export function isTidakDitemukan(error: unknown): boolean {
  return getHttpStatus(error) === STATUS_TIDAK_DITEMUKAN;
}
