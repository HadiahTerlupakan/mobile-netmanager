import type { KegiatanJenis } from '@/constants/presurvei';
import type { BarisPencapaian, TargetBulanIni } from '@/types/presurvei';
import type { AttendanceUiStatus } from '@/utils/attendanceStatus';
import { isAksesDitolak } from '@/utils/httpStatus';

/** Rekap kegiatan hari ini untuk Beranda; Iklan bukan pekerjaan sales. */
export interface RekapKegiatanHariIni {
  kunjungan: number;
  survei: number;
  teleponChat: number;
}

/** Rekap dari hitungan per jenis ringkasan server. */
export function rekapKegiatanHariIni(hitungan: Record<KegiatanJenis, number>): RekapKegiatanHariIni {
  return {
    kunjungan: hitungan.KUNJUNGAN,
    survei: hitungan.SURVEI_LOKASI,
    teleponChat: hitungan.TELEPON + hitungan.CHAT,
  };
}

/** Teks bila target bulan ini belum ada — bukan 0% (spec §5.3). */
export const TEKS_TARGET_BELUM_DITETAPKAN = 'Target belum ditetapkan';

/** Satu baris target di Beranda. */
export interface BarisTargetBeranda {
  label: string;
  teks: string;
  persen: number;
}

const baris = (label: string, pencapaian: BarisPencapaian): BarisTargetBeranda => ({
  label,
  teks: `${pencapaian.tercapai} / ${pencapaian.target}`,
  persen: pencapaian.persen,
});

/** Baris target, atau null bila target belum ditetapkan. */
export function barisTargetBeranda(target: TargetBulanIni | null): BarisTargetBeranda[] | null {
  if (target === null) return null;
  return [
    baris('Kunjungan', target.kunjungan),
    baris('Prospek', target.prospek),
    baris('Konversi', target.konversi),
  ];
}

/** Bagian respons `/api/mobile/attendance/status` yang dibaca Beranda. */
export interface StatusAbsenRingkas {
  status: AttendanceUiStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
}

/** Teks kartu absen hari ini. */
export function teksStatusAbsen(status: StatusAbsenRingkas | null): string {
  if (status === null) return 'Status absen belum dimuat';
  if (status.status === 'checked-in') return status.checkInTime ? `Check-in ${status.checkInTime}` : 'Sudah check-in';
  if (status.status === 'checked-out') return `Selesai ${status.checkInTime ?? '-'}–${status.checkOutTime ?? '-'}`;
  return 'Belum check-in';
}

/** Keadaan tampilan bagian presurvei Beranda. */
export type KeadaanRingkasan = 'belum-aktif' | 'memuat' | 'galat' | 'siap';

/**
 * Keadaan bagian presurvei Beranda. 403 diperlakukan sama dengan belum
 * berizin: sebelum migration izin SALES (Task 20), server menolak dengan 403
 * dan itu bukan galat yang perlu dicoba ulang oleh sales (spec §9.3).
 */
export function keadaanRingkasan(masukan: {
  isPresurveiAktif: boolean;
  hasData: boolean;
  error: unknown;
}): KeadaanRingkasan {
  if (!masukan.isPresurveiAktif || isAksesDitolak(masukan.error)) return 'belum-aktif';
  if (masukan.hasData) return 'siap';
  if (masukan.error) return 'galat';
  return 'memuat';
}
