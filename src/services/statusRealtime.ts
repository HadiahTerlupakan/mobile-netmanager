/**
 * Keadaan langganan realtime yang sebenarnya.
 *
 * Indikator "Live" pada layar Work Order dulu dihitung `!!token` — yaitu
 * "sudah login", bukan "realtime tersambung". Akibatnya ia tidak pernah bisa
 * menunjukkan masalah: ketika langganan Firestore ditolak berulang dan akhirnya
 * menyerah, layar tetap menampilkan titik hijau "Live" sementara tidak ada satu
 * pun pembaruan yang akan datang.
 *
 * Indikator yang tidak pernah merah lebih buruk daripada tidak ada indikator:
 * ia membuat orang menunggu sesuatu yang tidak akan terjadi, lalu menyalahkan
 * dirinya sendiri karena "lupa menyegarkan".
 */

export type StatusRealtime = 'terhubung' | 'mencoba' | 'terputus';

type Pendengar = (status: StatusRealtime) => void;

let status: StatusRealtime = 'mencoba';
const pendengar = new Set<Pendengar>();

/** Status langganan saat ini. */
export function statusRealtimeSaatIni(): StatusRealtime {
  return status;
}

/**
 * Catat status baru dan beri tahu pendengar.
 *
 * Perubahan ke nilai yang sama sengaja tidak menyiarkan apa pun: langganan
 * Firestore mengirim snapshot berkali-kali, dan menyiarkan setiap kali akan
 * memaksa render ulang tanpa ada yang berubah di layar.
 */
export function setStatusRealtime(berikutnya: StatusRealtime): void {
  if (status === berikutnya) return;
  status = berikutnya;
  for (const dengar of pendengar) dengar(status);
}

/** Berlangganan perubahan status; mengembalikan fungsi pembatalan. */
export function dengarkanStatusRealtime(dengar: Pendengar): () => void {
  pendengar.add(dengar);
  return () => {
    pendengar.delete(dengar);
  };
}

/** Hanya untuk pengujian: kembalikan ke keadaan awal. */
export function resetStatusRealtime(): void {
  status = 'mencoba';
  pendengar.clear();
}
