import type { Rencana } from '@/types/presurvei';
import { keTanggalKalender } from '@/utils/date';
import type { KegiatanMenunggu } from './antreanKegiatan';

/**
 * Aturan tampilan rencana kunjungan. Server tetap penentu; ini hanya
 * menyembunyikan aksi yang pasti ditolak (netmanager `RencanaService`).
 */

const PANJANG_DUA_DIGIT = 2;
/** Jumlah rencana tertunda yang ditampilkan di kartu Beranda. */
export const JUMLAH_RENCANA_BERIKUTNYA = 3;

/** Angka dua digit berawalan nol, mis. 7 → "07" (tanggal dan jam). */
export const duaDigit = (angka: number): string => String(angka).padStart(PANJANG_DUA_DIGIT, '0');

/** Dipertahankan agar impor lama dari modul ini tetap jalan. */
export { keTanggalKalender };

/** Tanggal rencana (format `pola`) disertai jam bila ada, mis. "27 Sep · 13:30". */
export function labelWaktuRencana(
  rencana: Pick<Rencana, 'tanggal' | 'jam'>,
  format: (tanggal: string) => string,
): string {
  const tanggal = format(rencana.tanggal);
  return rencana.jam ? `${tanggal} · ${rencana.jam}` : tanggal;
}

/** Filter daftar rencana satu hari kalender. */
export function filterRencanaHarian(tanggal: Date): { dari: string; sampai: string } {
  const hari = keTanggalKalender(tanggal);
  return { dari: hari, sampai: hari };
}

/** Filter rencana yang tanggalnya lewat tetapi belum dilaporkan. */
export const FILTER_RENCANA_TERLEWAT = Object.freeze({ status: 'TERLEWAT' as const });

/** Rencana masih bisa dilaporkan: direncanakan atau terlewat (laporan terlambat tetap diterima). */
export function isRencanaTerbuka(rencana: Pick<Rencana, 'statusTampil'>): boolean {
  return rencana.statusTampil === 'DIRENCANAKAN' || rencana.statusTampil === 'TERLEWAT';
}

/**
 * Sales hanya boleh mengubah/membatalkan rencana MANDIRI yang masih terbuka;
 * penugasan diatur pemberinya (server menjawab 403).
 */
export function isBolehAturRencana(rencana: Pick<Rencana, 'sumber' | 'status'>): boolean {
  return rencana.sumber === 'MANDIRI' && rencana.status === 'DIRENCANAKAN';
}

/** Id rencana yang laporannya masih di antrean offline dan akan dikirim (bukan FAILED). */
export function idRencanaMenungguKirim(antrean: readonly KegiatanMenunggu[]): Set<string> {
  return new Set(
    antrean.flatMap((kegiatan) =>
      kegiatan.rencanaId !== null && kegiatan.status !== 'FAILED' ? [kegiatan.rencanaId] : [],
    ),
  );
}

/** Rekap rencana hari ini untuk Beranda; rencana batal tidak dihitung. */
export interface RekapRencanaHariIni {
  jumlah: number;
  selesai: number;
  tertunda: Rencana[];
}

/** Hitung rencana hari ini: total aktif, selesai, dan yang masih menunggu dikunjungi. */
export function rekapRencanaHariIni(daftar: readonly Rencana[]): RekapRencanaHariIni {
  const aktif = daftar.filter((rencana) => rencana.statusTampil !== 'BATAL');
  return {
    jumlah: aktif.length,
    selesai: aktif.filter((rencana) => rencana.statusTampil === 'SELESAI').length,
    tertunda: aktif.filter(isRencanaTerbuka),
  };
}
