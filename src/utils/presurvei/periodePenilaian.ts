import type { PeriodePenilaian } from '@/types/penilaian';

/** Aturan periode bulanan layar penilaian kinerja. */

const JUMLAH_BULAN_SETAHUN = 12;
/** `Date#getMonth` berbasis 0, periode server berbasis 1. */
const SELISIH_INDEKS_BULAN = 1;

export const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/** Pola "YYYY-MM-DD" dari server. */
const POLA_TANGGAL_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Periode (tahun, bulan 1–12) tempat `tanggal` berada, menurut zona waktu perangkat. */
export function periodeDariTanggal(tanggal: Date): PeriodePenilaian {
  return { tahun: tanggal.getFullYear(), bulan: tanggal.getMonth() + SELISIH_INDEKS_BULAN };
}

/** Indeks bulan absolut supaya perbandingan & pergeseran lintas tahun sederhana. */
const indeksBulan = (periode: PeriodePenilaian): number =>
  periode.tahun * JUMLAH_BULAN_SETAHUN + (periode.bulan - SELISIH_INDEKS_BULAN);

/** Geser periode sejumlah bulan (negatif = mundur), melewati batas tahun dengan benar. */
export function geserBulan(periode: PeriodePenilaian, jumlahBulan: number): PeriodePenilaian {
  const indeks = indeksBulan(periode) + jumlahBulan;
  return {
    tahun: Math.floor(indeks / JUMLAH_BULAN_SETAHUN),
    bulan: (indeks % JUMLAH_BULAN_SETAHUN) + SELISIH_INDEKS_BULAN,
  };
}

/** Boleh maju ke bulan berikutnya selama periode masih sebelum bulan berjalan. */
export function isBolehMajuPeriode(periode: PeriodePenilaian, sekarang: Date): boolean {
  return indeksBulan(periode) < indeksBulan(periodeDariTanggal(sekarang));
}

/** Label periode, mis. "September 2026". */
export function labelPeriode(periode: PeriodePenilaian): string {
  return `${NAMA_BULAN[periode.bulan - SELISIH_INDEKS_BULAN]} ${periode.tahun}`;
}

/** "Dihitung sampai 26 September 2026" dari "YYYY-MM-DD"; teks asli bila formatnya tak dikenal. */
export function teksDihitungSampai(tanggalIso: string): string {
  const cocok = POLA_TANGGAL_ISO.exec(tanggalIso);
  const namaBulan = cocok ? NAMA_BULAN[Number(cocok[2]) - SELISIH_INDEKS_BULAN] : undefined;
  if (!cocok || namaBulan === undefined) return `Dihitung sampai ${tanggalIso}`;
  return `Dihitung sampai ${Number(cocok[3])} ${namaBulan} ${cocok[1]}`;
}
