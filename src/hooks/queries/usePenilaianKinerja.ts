import { useQuery } from '@tanstack/react-query';

import { isBolehUlangRingkasan } from '@/hooks/queries/useRingkasanPresurvei';
import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import type { PeriodePenilaian } from '@/types/penilaian';
import { STATUS_AKSES_DITOLAK } from '@/utils/httpStatus';

/** Skor dihitung ulang server dari kegiatan/rencana; segar beberapa menit sudah cukup. */
const WAKTU_SEGAR_PENILAIAN_MS = 5 * 60_000;

/**
 * Penilaian kinerja satu periode dalam lingkup pemanggil. Berada di bawah
 * `presurvei.all` sehingga ikut tarik-untuk-segarkan Beranda. 403 (izin belum
 * diberikan) tidak diulang dan toast globalnya diredam — pemanggil
 * menyembunyikan kartu, bukan menampilkan galat.
 */
export function usePenilaianKinerja(periode: PeriodePenilaian, isAktif: boolean) {
  return useQuery({
    queryKey: queryKeys.presurvei.penilaian(periode),
    queryFn: () => PresurveiService.penilaian(periode),
    enabled: isAktif,
    staleTime: WAKTU_SEGAR_PENILAIAN_MS,
    retry: isBolehUlangRingkasan,
    meta: { silentToastStatuses: [STATUS_AKSES_DITOLAK] },
  });
}
