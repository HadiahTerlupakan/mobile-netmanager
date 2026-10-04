import { z } from 'zod';

import {
  ALASAN_TOLAK_MAKS,
  ALASAN_TOLAK_MIN,
  AWALAN_DATA_URL_PNG,
  DATA_URL_TANDA_TANGAN_MAKS,
} from '@/constants/pengesahan';

/** Skema form tolak: alasan wajib, 3–500 karakter setelah dipangkas. */
export const skemaTolakPengesahan = z.object({
  alasan: z
    .string()
    .trim()
    .min(ALASAN_TOLAK_MIN, `Alasan minimal ${ALASAN_TOLAK_MIN} karakter.`)
    .max(ALASAN_TOLAK_MAKS, `Alasan maksimal ${ALASAN_TOLAK_MAKS} karakter.`),
});

export type NilaiFormTolakPengesahan = z.infer<typeof skemaTolakPengesahan>;

export const PESAN_TANDA_TANGAN_KOSONG = 'Tanda tangan dulu di kotak yang tersedia.';
export const PESAN_TANDA_TANGAN_TERLALU_BESAR = 'Tanda tangan terlalu rumit. Hapus lalu tanda tangani lebih sederhana.';

/** Periksa data URL tanda tangan sebelum dikirim; mengembalikan pesan galat atau `null` bila sah. */
export function periksaDataUrlTandaTangan(dataUrl: string): string | null {
  if (!dataUrl.startsWith(AWALAN_DATA_URL_PNG) || dataUrl.length <= AWALAN_DATA_URL_PNG.length) return PESAN_TANDA_TANGAN_KOSONG;
  if (dataUrl.length > DATA_URL_TANDA_TANGAN_MAKS) return PESAN_TANDA_TANGAN_TERLALU_BESAR;
  return null;
}
