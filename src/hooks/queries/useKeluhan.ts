import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { KUNCI_PELANGGAN_SAYA } from '@/hooks/queries/usePelangganSaya';
import { KeluhanService } from '@/services/KeluhanService';
import { uploadService } from '@/services/UploadService';
import type { KelompokStatusKeluhan } from '@/types/keluhan';
import { keMuatanLaporKeluhan, type NilaiFormKeluhan } from '@/utils/keluhan/formKeluhan';
import { presentAppError } from '@/utils/errorPresenter';

/** Awalan kunci cache keluhan (daftar & detail). */
export const KUNCI_KELUHAN = ['keluhan'] as const;
const UKURAN_HALAMAN = 20;
const HALAMAN_PERTAMA = 1;
const WAKTU_SEGAR_MS = 30_000;
const TIPE_UNGGAH_KELUHAN = 'tickets';
// Online saja & tanpa ulang otomatis: onError di sini yang menampilkan pesan.
const OPSI_MUTASI = { retry: false, meta: { skipGlobalErrorToast: true } } as const;

/** Keluhan terbuka / selesai dalam lingkup sales, dimuat per halaman. */
export function useDaftarKeluhan(status: KelompokStatusKeluhan, salesId?: string) {
  return useInfiniteQuery({
    queryKey: [...KUNCI_KELUHAN, 'daftar', status, salesId ?? ''],
    queryFn: ({ pageParam }) => KeluhanService.daftar({ status, salesId, page: pageParam, limit: UKURAN_HALAMAN }),
    initialPageParam: HALAMAN_PERTAMA,
    getNextPageParam: (halaman) => (halaman.page * halaman.limit < halaman.total ? halaman.page + 1 : undefined),
    staleTime: WAKTU_SEGAR_MS,
  });
}

/** Detail satu keluhan. */
export function useDetailKeluhan(id: string | undefined) {
  return useQuery({
    queryKey: [...KUNCI_KELUHAN, 'detail', id],
    queryFn: () => KeluhanService.detail(id as string),
    enabled: Boolean(id),
    staleTime: WAKTU_SEGAR_MS,
  });
}

/** Unggah foto lalu catat keluhan baru; segarkan daftar keluhan & pelanggan saya setelah berhasil. */
export function useLaporKeluhan(onBerhasil: (hasil: { id: string; nomor: string }) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...OPSI_MUTASI,
    // Foto diunggah dulu (tipe tickets), baru keluhan dikirim dengan URL-nya.
    mutationFn: async ({ pelangganId, nilai }: { pelangganId: string; nilai: NilaiFormKeluhan }) => {
      const foto = await Promise.all(nilai.fotoLokal.map((uri) => uploadService.uploadFile(uri, TIPE_UNGGAH_KELUHAN)));
      return KeluhanService.lapor(keMuatanLaporKeluhan(pelangganId, nilai, foto));
    },
    onSuccess: (hasil) => {
      void queryClient.invalidateQueries({ queryKey: KUNCI_KELUHAN });
      void queryClient.invalidateQueries({ queryKey: KUNCI_PELANGGAN_SAYA });
      onBerhasil(hasil);
    },
    onError: (error) => presentAppError(error, { screen: 'LaporKeluhan', source: 'mutation' }),
  });
}

/** Balas helpdesk; detail & daftar dimuat ulang setelah berhasil. */
export function useBalasKeluhan(id: string, onBerhasil: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (pesan: string) => KeluhanService.balas(id, pesan),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KUNCI_KELUHAN });
      onBerhasil();
    },
    onError: (error) => presentAppError(error, { screen: 'DetailKeluhan', source: 'mutation' }),
  });
}
