import { extractApiErrorMessage } from '@/utils/errorHandling';

/** Pesan saat sesi diakhiri tanpa alasan yang layak dibaca pelanggan. */
export const PESAN_SESI_BERAKHIR_BAWAAN = 'Sesi Anda berakhir, silakan masuk lagi.';

/**
 * Penolakan token rutin dari `/api/mobile/auth/refresh` (token kedaluwarsa,
 * dicabut, atau dipakai ulang): hanya bermakna bagi pengembang.
 */
const PESAN_TEKNIS = new Set(['Refresh token tidak valid', 'Refresh token harus diisi']);

let alasanPenolakan: string | null = null;
let pesanTertunda: string | null = null;

/** Alasan server dari badan respons berformat `{ error }` / `{ message }`; selain itu (mis. halaman proxy) diabaikan. */
function alasanDariRespons(badanRespons: unknown): string | null {
  if (badanRespons === null || typeof badanRespons !== 'object') return null;
  const pesan = extractApiErrorMessage(badanRespons)?.trim();
  return pesan && !PESAN_TEKNIS.has(pesan) ? pesan : null;
}

/**
 * Pesan untuk layar login setelah sesi diakhiri paksa. Penolakan refresh
 * terjadi lebih dulu (sering di refresh proaktif), logout-nya baru menyusul
 * saat permintaan berikutnya ditolak 401, jadi alasannya disimpan di antara.
 */
export const PesanSesiBerakhir = {
  /** Simpan alasan server saat refresh ditolak 401/403. */
  catatPenolakan(badanRespons: unknown) {
    alasanPenolakan = alasanDariRespons(badanRespons);
  },
  /** Sesi diakhiri paksa: siapkan pesan untuk layar login. */
  tandaiBerakhir() {
    pesanTertunda = alasanPenolakan ?? PESAN_SESI_BERAKHIR_BAWAAN;
    alasanPenolakan = null;
  },
  /** Pesan yang menunggu dibaca di layar login, bila ada. */
  baca(): string | null {
    return pesanTertunda;
  },
  /** Pelanggan sudah menutup pesan atau mencoba masuk lagi. */
  hapus() {
    pesanTertunda = null;
    alasanPenolakan = null;
  },
};
