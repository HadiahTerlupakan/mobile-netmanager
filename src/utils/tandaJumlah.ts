/**
 * Angka pergerakan stok beserta tandanya.
 *
 * Tanda dulu ditempel sebagai teks (`+{n}` dan `-{n}`), sehingga nol ikut
 * bertanda: layar menampilkan "+0" dan "-0". "-0" terbaca seperti nilai negatif
 * dan membuat orang mengira ada yang salah hitung, padahal artinya "belum ada
 * barang keluar hari ini".
 *
 * Tanda hanya berguna ketika ada yang bergerak.
 */
export function jumlahBertanda(nilai: number | null | undefined, tanda: '+' | '-'): string {
  const angka = Number(nilai ?? 0);
  if (!Number.isFinite(angka) || angka === 0) return '0';
  return `${tanda}${Math.abs(angka)}`;
}
