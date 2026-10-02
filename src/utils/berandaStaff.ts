/**
 * Logika murni Beranda staff: libur terdekat, gabungan pengajuan izin/lembur
 * terbaru, dan aksi absen hari ini. Tanggal dibandingkan sebagai "YYYY-MM-DD"
 * kalender perangkat agar zona waktu tidak menggeser hari.
 */

import { keTanggalKalender, MS_SEHARI } from '@/utils/date';
import type { AttendanceUiStatus } from './attendanceStatus';

export type NadaPengajuan = 'berhasil' | 'menunggu' | 'gagal' | 'netral';

/** Hari libur dari `/api/mobile/holidays`. */
export interface HariLibur {
  name: string;
  date: string;
  isNational: boolean;
}

/** Izin/cuti dari `/api/mobile/leaves`. */
export interface PengajuanIzin {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
}

/** Lembur dari `/api/mobile/overtime` (`history`). */
export interface PengajuanLembur {
  id: string;
  status: string;
  createdAt: string;
  reason?: string;
}

/** Satu baris "Pengajuan saya". */
export interface BarisPengajuan {
  id: string;
  jenis: 'IZIN' | 'LEMBUR';
  judul: string;
  tanggalMulai: string;
  /** Null bila satu hari saja. */
  tanggalSelesai: string | null;
  status: { label: string; nada: NadaPengajuan };
}

export const JUMLAH_PENGAJUAN_BERANDA = 3;

const LABEL_JENIS_IZIN: Readonly<Record<string, string>> = {
  SAKIT: 'Sakit',
  IZIN: 'Izin',
  CUTI: 'Cuti',
  TUKAR_LIBUR: 'Tukar libur',
};

const STATUS_PENGAJUAN: Readonly<Record<string, { label: string; nada: NadaPengajuan }>> = {
  PENDING: { label: 'Menunggu', nada: 'menunggu' },
  APPROVED: { label: 'Disetujui', nada: 'berhasil' },
  IN_PROGRESS: { label: 'Berjalan', nada: 'menunggu' },
  COMPLETED: { label: 'Selesai', nada: 'berhasil' },
  REJECTED: { label: 'Ditolak', nada: 'gagal' },
};


function hariSaja(tanggal: string): string {
  return tanggal.slice(0, 10);
}

/** Libur hari ini, atau null. */
export function liburHariIni(daftar: readonly HariLibur[], sekarang: Date): HariLibur | null {
  const hariIni = keTanggalKalender(sekarang);
  return daftar.find((libur) => hariSaja(libur.date) === hariIni) ?? null;
}

/** Libur terdekat sesudah hari ini beserta selisih harinya, atau null. */
export function liburBerikutnya(
  daftar: readonly HariLibur[],
  sekarang: Date,
): { libur: HariLibur; sisaHari: number } | null {
  const hariIni = keTanggalKalender(sekarang);
  const berikut = [...daftar]
    .filter((libur) => hariSaja(libur.date) > hariIni)
    .sort((a, b) => hariSaja(a.date).localeCompare(hariSaja(b.date)))[0];
  if (!berikut) return null;
  const selisih = Date.parse(`${hariSaja(berikut.date)}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`);
  return { libur: berikut, sisaHari: Math.round(selisih / MS_SEHARI) };
}

/** Status pengajuan; status baru yang belum dikenal tampil apa adanya. */
export function statusPengajuan(status: string): { label: string; nada: NadaPengajuan } {
  return STATUS_PENGAJUAN[status] ?? { label: status, nada: 'netral' };
}

/** Izin & lembur terbaru (dibuat paling akhir dulu), maksimal `batas`. */
export function gabungPengajuan(
  izin: readonly PengajuanIzin[],
  lembur: readonly PengajuanLembur[],
  batas: number = JUMLAH_PENGAJUAN_BERANDA,
): BarisPengajuan[] {
  const daftar: (BarisPengajuan & { dibuat: string })[] = [
    ...izin.map((item) => ({
      id: item.id,
      jenis: 'IZIN' as const,
      judul: LABEL_JENIS_IZIN[item.type] ?? item.type,
      tanggalMulai: item.startDate,
      tanggalSelesai: hariSaja(item.startDate) === hariSaja(item.endDate) ? null : item.endDate,
      status: statusPengajuan(item.status),
      dibuat: item.createdAt,
    })),
    ...lembur.map((item) => ({
      id: item.id,
      jenis: 'LEMBUR' as const,
      judul: 'Lembur',
      tanggalMulai: item.createdAt,
      tanggalSelesai: null,
      status: statusPengajuan(item.status),
      dibuat: item.createdAt,
    })),
  ];
  return daftar
    .sort((a, b) => b.dibuat.localeCompare(a.dibuat))
    .slice(0, batas)
    .map(({ dibuat: _dibuat, ...baris }) => baris);
}

/** Jumlah pengajuan yang masih menunggu keputusan. */
export function jumlahMenunggu(izin: readonly PengajuanIzin[], lembur: readonly PengajuanLembur[]): number {
  return [...izin, ...lembur].filter((item) => item.status === 'PENDING').length;
}

/** Label tombol aksi absen di kartu Hari ini. */
export function labelAksiAbsen(status: AttendanceUiStatus | undefined): string {
  if (status === 'checked-in') return 'Check-out sekarang';
  if (status === 'checked-out') return 'Lihat absensi';
  return 'Check-in sekarang';
}
