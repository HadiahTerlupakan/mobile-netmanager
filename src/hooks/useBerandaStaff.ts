import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { useApiQuery } from '@/hooks/queries/useApiQuery';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useStatusAbsenHariIni } from '@/hooks/useStatusAbsenHariIni';
import { queryKeys } from '@/lib/queryClient';
import {
  gabungPengajuan,
  jumlahMenunggu,
  liburBerikutnya,
  liburHariIni,
  type HariLibur,
  type PengajuanIzin,
  type PengajuanLembur,
} from '@/utils/berandaStaff';
import { ambilDaftar } from '@/utils/ambilDaftar';
import { punyaFitur } from '@/utils/persona';

const KOSONG: readonly never[] = [];

/**
 * Data Beranda staff: absen hari ini, jam kerja, pengajuan izin/lembur terbaru,
 * dan libur. Query key sama dengan layar Izin, Lembur, Libur, dan Absensi
 * sehingga cache dipakai bersama; tiap bagian hanya dimuat bila berizin.
 */
export function useBerandaStaff(sekarang: Date) {
  const { user, token } = useAuth();
  const { profileData } = useProfileSync();
  const fitur = {
    absensi: punyaFitur(user, AppFeature.ABSENSI),
    izin: punyaFitur(user, AppFeature.IZIN),
    lembur: punyaFitur(user, AppFeature.LEMBUR),
    libur: punyaFitur(user, AppFeature.HOLIDAYS),
  };

  const absen = useStatusAbsenHariIni();
  const izin = useApiQuery<PengajuanIzin[]>({
    queryKey: queryKeys.leave.list(),
    endpoint: '/api/mobile/leaves',
    enabled: !!token && fitur.izin,
    select: (respons) => ambilDaftar<PengajuanIzin>(respons),
  });
  const lembur = useApiQuery<PengajuanLembur[]>({
    queryKey: queryKeys.overtime.list(),
    endpoint: '/api/mobile/overtime',
    enabled: !!token && fitur.lembur,
    select: (respons) => ambilDaftar<PengajuanLembur>(respons, 'history'),
  });
  const libur = useApiQuery<HariLibur[]>({
    queryKey: queryKeys.holidays.list(sekarang.getFullYear()),
    endpoint: `/api/mobile/holidays?year=${sekarang.getFullYear()}`,
    enabled: !!token && fitur.libur,
    select: (respons) => ambilDaftar<HariLibur>(respons),
  });

  const daftarIzin = izin.data ?? KOSONG;
  const daftarLembur = lembur.data ?? KOSONG;
  const daftarLibur = libur.data ?? KOSONG;
  const awalKerja = profileData?.startWorkTime;
  const akhirKerja = profileData?.endWorkTime;

  return {
    fitur,
    absen: absen.data?.data ?? null,
    jamKerja: awalKerja && akhirKerja ? `${awalKerja} – ${akhirKerja}` : null,
    liburHariIni: liburHariIni(daftarLibur, sekarang),
    liburBerikutnya: liburBerikutnya(daftarLibur, sekarang),
    pengajuan: gabungPengajuan(daftarIzin, daftarLembur),
    jumlahMenunggu: jumlahMenunggu(daftarIzin, daftarLembur),
  };
}

/** Kueri yang disegarkan saat Beranda staff ditarik. */
export const KUNCI_BERANDA_STAFF = [
  queryKeys.attendance.all,
  queryKeys.leave.all,
  queryKeys.overtime.all,
  queryKeys.holidays.all,
] as const;
