/**
 * Periode tagihan pelanggan: satu bulan sebelum jatuh tempo sampai jatuh tempo.
 *
 * Bulan tanggal awal wajib ikut ditulis. Sebelumnya hanya harinya yang
 * ditampilkan, padahal awal periode SELALU berada di bulan sebelumnya —
 * hasilnya "20 - 20 Okt 2026", yang terbaca sebagai periode nol hari di
 * tanggal yang sama alih-alih 20 Sep – 20 Okt.
 */
export function periodeTagihan(jatuhTempo: string | null | undefined): string {
  if (!jatuhTempo) return '-';
  const akhir = new Date(jatuhTempo);
  if (Number.isNaN(akhir.getTime())) return '-';
  const awal = new Date(akhir);
  awal.setMonth(awal.getMonth() - 1);
  const teksAwal = awal.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const teksAkhir = akhir.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${teksAwal} - ${teksAkhir}`;
}
