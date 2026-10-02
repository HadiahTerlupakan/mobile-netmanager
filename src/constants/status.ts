/** Warna makna sebuah status: hijau selesai, kuning menunggu, merah gagal, abu lain-lain. */
export type NadaStatus = 'berhasil' | 'menunggu' | 'gagal' | 'netral';

export interface TampilanStatus {
  label: string;
  nada: NadaStatus;
}
