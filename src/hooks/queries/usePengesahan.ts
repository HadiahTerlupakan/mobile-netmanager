import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { PengesahanService } from '@/services/PengesahanService';
import type { HasilTandaTanganPengesahan, KelompokPengesahan } from '@/types/pengesahan';
import { presentAppError } from '@/utils/errorPresenter';

const UKURAN_HALAMAN = 20;
const HALAMAN_PERTAMA = 1;
const WAKTU_SEGAR_MS = 30_000;
const WAKTU_SEGAR_RINGKASAN_MS = 60_000;
/** Server lama (endpoint belum ada) / akun tanpa akses: menu cukup tersembunyi, tanpa toast. */
const STATUS_RINGKASAN_DIREDAM = [403, 404];
// Online saja & tanpa ulang otomatis: onError di sini yang menampilkan pesan.
const OPSI_MUTASI = { retry: false, meta: { skipGlobalErrorToast: true } } as const;

/** Jumlah surat menunggu tanda tangan saya & total surat; dasar tampil/lencana menu cepat. */
export function useRingkasanPengesahan() {
  return useQuery({
    queryKey: queryKeys.pengesahan.ringkasan(),
    queryFn: () => PengesahanService.ringkasan(),
    staleTime: WAKTU_SEGAR_RINGKASAN_MS,
    meta: { silentToastStatuses: STATUS_RINGKASAN_DIREDAM },
  });
}

/** Surat menunggu / selesai, dimuat per halaman. */
export function useDaftarPengesahan(status: KelompokPengesahan) {
  return useInfiniteQuery({
    queryKey: queryKeys.pengesahan.daftar(status),
    queryFn: ({ pageParam }) => PengesahanService.daftar({ status, page: pageParam, limit: UKURAN_HALAMAN }),
    initialPageParam: HALAMAN_PERTAMA,
    getNextPageParam: (halaman) => (halaman.page * halaman.limit < halaman.total ? halaman.page + 1 : undefined),
    staleTime: WAKTU_SEGAR_MS,
  });
}

/** Detail satu surat; server mencatat saya sudah membukanya. */
export function useDetailPengesahan(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pengesahan.detail(id ?? ''),
    queryFn: () => PengesahanService.detail(id as string),
    enabled: Boolean(id),
    staleTime: WAKTU_SEGAR_MS,
  });
}

/** Kirim tanda tangan; seluruh cache pengesahan (ringkasan, daftar, detail) dimuat ulang. */
export function useTandaTanganPengesahan(id: string, onBerhasil: (hasil: HasilTandaTanganPengesahan) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (signatureDataUrl: string) => PengesahanService.tandaTangan(id, signatureDataUrl),
    onSuccess: (hasil) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pengesahan.all });
      onBerhasil(hasil);
    },
    onError: (error) => presentAppError(error, { screen: 'TandaTanganPengesahan', source: 'mutation' }),
  });
}

/** Tolak menandatangani; seluruh cache pengesahan dimuat ulang. */
export function useTolakPengesahan(id: string, onBerhasil: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (alasan: string) => PengesahanService.tolak(id, alasan),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pengesahan.all });
      onBerhasil();
    },
    onError: (error) => presentAppError(error, { screen: 'TolakPengesahan', source: 'mutation' }),
  });
}
