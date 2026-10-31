import { presentErrorMessage } from '@/utils/errorPresenter';

/**
 * Pesan per item antrean offline, diringkas per drain.
 *
 * Drain berjalan saat aplikasi dibuka, kembali ke depan, dan kembali online,
 * dan bisa memproses banyak item sekaligus. Satu toast per item yang gagal
 * atau kedaluwarsa menjadi rentetan toast yang saling menimpa; yang terbaca
 * hanya yang terakhir. Selama drain, pesan dikumpulkan lalu ditampilkan
 * sebagai satu toast di akhir.
 */

/** Galat berarti data tidak sampai ke server; info hanya kabar baik. */
export type JenisPesanSinkron = 'galat' | 'info';

interface PesanSinkron {
  jenis: JenisPesanSinkron;
  tampilkan: () => void;
}

let kumpulanDrain: PesanSinkron[] | null = null;

function tampilkanRingkasan(daftar: PesanSinkron[]): void {
  const galat = daftar.filter((pesan) => pesan.jenis === 'galat');
  if (galat.length > 1) {
    presentErrorMessage(
      `${galat.length} data offline tidak terkirim. Silakan periksa dan kirim ulang.`,
      'Sinkronisasi Gagal',
    );
    return;
  }
  // Kabar baik tidak menimpa satu-satunya galat; info yang sama cukup sekali.
  (galat[0] ?? daftar[0])?.tampilkan();
}

/** Tampilkan pesan satu item: langsung, atau dikumpulkan bila sedang drain. */
export function laporkanPesanSinkron(jenis: JenisPesanSinkron, tampilkan: () => void): void {
  if (kumpulanDrain) {
    kumpulanDrain.push({ jenis, tampilkan });
    return;
  }
  tampilkan();
}

/** Jalankan satu drain; pesan item selama drain menjadi satu toast di akhirnya. */
export async function ringkasPesanSelama<T>(drain: () => Promise<T>): Promise<T> {
  kumpulanDrain = [];
  try {
    return await drain();
  } finally {
    const daftar = kumpulanDrain;
    kumpulanDrain = null;
    tampilkanRingkasan(daftar);
  }
}
