/**
 * Batas aman satu sesi pelacakan lokasi. Server menghentikan tracking lewat
 * `shouldStopTracking` saat karyawan check-out (termasuk check-out otomatis di
 * akhir shift), tetapi perintah itu tidak sampai bila HP offline. Batas ini
 * memastikan tracking tetap berhenti walau server tak bisa dihubungi.
 * Fungsi murni — mudah diuji.
 */

/** Shift terpanjang + lembur wajar; lewat dari ini pasti sudah bukan jam kerja. */
export const DURASI_SESI_TRACKING_MAKS_MS = 16 * 60 * 60 * 1000;

/**
 * Apakah sesi tracking yang dimulai pada `mulaiIso` sudah melewati batas.
 * Waktu mulai tak terbaca dianggap belum lewat batas (pemanggil mencatat
 * waktu mulai baru agar batas tetap berlaku).
 */
export function isSesiTrackingKedaluwarsa(mulaiIso: string | null, sekarang: Date): boolean {
  if (!mulaiIso) return false;
  const mulai = new Date(mulaiIso).getTime();
  if (!Number.isFinite(mulai)) return false;
  return sekarang.getTime() - mulai > DURASI_SESI_TRACKING_MAKS_MS;
}
