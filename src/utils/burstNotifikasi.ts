/**
 * Kebijakan bunyi dan toast untuk push yang datang saat aplikasi terbuka.
 *
 * FCM menahan push selama perangkat offline atau tertidur, lalu mengirim
 * semuanya sekaligus begitu aplikasi dibuka, kembali ke depan, atau kembali
 * online. Tanpa peredam, setiap push tumpukan itu berbunyi dan memunculkan
 * toast sendiri-sendiri. Aturannya: pembukaan aplikasi senyap, dan paling
 * banyak satu bunyi untuk setiap burst.
 */

/** Lama aplikasi senyap setelah dibuka, kembali ke depan, atau kembali online. */
export const MASA_TENANG_MS = 5000;

/** Push yang tiba kurang dari jeda ini setelah push sebelumnya termasuk burst yang sama. */
export const JEDA_BURST_MS = 3000;

/** Toast dan penyegaran data menunggu sampai push berhenti datang selama jeda ini. */
export const JEDA_RINGKAS_MS = 1000;

const JUDUL_BAWAAN = 'Notifikasi Baru';
const PESAN_BAWAAN = 'Anda menerima notifikasi baru.';

/** Cara menampilkan satu push. */
export interface KeputusanPush {
  isBersuara: boolean;
  isBolehToast: boolean;
  /** Push ini membuka burst baru; toast burst sebelumnya selesai. */
  isAwalBurst: boolean;
}

/** Isi push yang dipakai untuk toast. */
export interface IsiPush {
  title?: string | null;
  body?: string | null;
}

/** Penentu bunyi dan toast per push; waktu diberikan pemanggil dalam ms. */
export class PenjagaBurstNotifikasi {
  private tenangSampai = 0;

  private pushTerakhirPada: number | null = null;

  private isBurstTenang = false;

  /** Mulai masa tenang sejak `sekarang`. */
  mulaiMasaTenang(sekarang: number): void {
    this.tenangSampai = sekarang + MASA_TENANG_MS;
  }

  /** Apakah `sekarang` masih di dalam masa tenang. */
  isMasaTenang(sekarang: number): boolean {
    return sekarang < this.tenangSampai;
  }

  /** Putuskan cara menampilkan push yang tiba pada `sekarang`. */
  putuskan(sekarang: number): KeputusanPush {
    const isLanjutanBurst =
      this.pushTerakhirPada !== null && sekarang - this.pushTerakhirPada < JEDA_BURST_MS;
    const isTenang = this.isMasaTenang(sekarang);
    // Burst yang dimulai dalam masa tenang adalah tumpukan saat aplikasi
    // dibuka; ia tetap tanpa toast walau berlanjut melewati masa tenang.
    this.isBurstTenang = isTenang || (isLanjutanBurst && this.isBurstTenang);
    this.pushTerakhirPada = sekarang;
    return {
      isBersuara: !isTenang && !isLanjutanBurst,
      isBolehToast: !this.isBurstTenang,
      isAwalBurst: !isLanjutanBurst,
    };
  }
}

/** Satu toast untuk sekumpulan push: push tunggal tampil apa adanya, beberapa push diringkas. */
export function susunToastRingkasan(daftar: IsiPush[]): { judul: string; pesan: string } {
  if (daftar.length === 1) {
    const [push] = daftar;
    return { judul: push.title ?? JUDUL_BAWAAN, pesan: push.body ?? PESAN_BAWAAN };
  }
  return { judul: `${daftar.length} Notifikasi Baru`, pesan: 'Lihat semuanya di panel notifikasi.' };
}
