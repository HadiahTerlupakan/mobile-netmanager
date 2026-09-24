import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { PresurveiService } from '@/services/PresurveiService';
import { isAksesDitolak, STATUS_AKSES_DITOLAK } from '@/utils/httpStatus';

const BATAS_ULANG_RINGKASAN = 2;

/** 403 tidak diulang: izin tidak akan muncul sendiri di tengah percobaan ulang. */
export function isBolehUlangRingkasan(jumlahGagal: number, error: unknown): boolean {
  return !isAksesDitolak(error) && jumlahGagal < BATAS_ULANG_RINGKASAN;
}

/**
 * Ringkasan Beranda sales; tidak dipanggil selama presurvei belum aktif.
 *
 * `meta.silentToastStatuses` meredam toast galat global (`src/lib/queryClient.ts`)
 * khusus untuk 403: sales yang belum diberi izin harus melihat status
 * "belum aktif" di layar (spec §9.3, Review Focus #4), bukan toast "Gagal
 * Memuat Data" yang menyiratkan ini kerusakan.
 */
export function useRingkasanPresurvei(isAktif: boolean) {
  return useQuery({
    queryKey: queryKeys.presurvei.ringkasan(),
    queryFn: () => PresurveiService.ringkasan(),
    enabled: isAktif,
    retry: isBolehUlangRingkasan,
    meta: { silentToastStatuses: [STATUS_AKSES_DITOLAK] },
  });
}
