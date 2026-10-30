import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { getHttpStatus } from '@/lib/queryErrorReporting';
import { TiketPelangganService } from '@/services/TiketPelangganService';
import type { MuatanTutupTiket } from '@/types/portalPelanggan';
import { presentAppError } from '@/utils/errorPresenter';

const LAYAR = 'DetailTiketPelanggan';
// Online saja & tanpa ulang otomatis: onError di sini yang menampilkan pesan server.
const OPSI_MUTASI = { retry: false, meta: { skipGlobalErrorToast: true } } as const;
const STATUS_TIKET_TIDAK_ADA = 404;
const BATAS_ULANG_MUAT = 2;

/** Detail tiket; 404 ditangani layar sendiri sehingga toast global diredam. */
export function useDetailTiketPelanggan(id: string) {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.tiket(id),
    queryFn: () => TiketPelangganService.detail(id),
    enabled: id.length > 0,
    // 404 adalah jawaban final; mengulangnya hanya menunda layar "tidak ditemukan".
    retry: (jumlahGagal, error) => getHttpStatus(error) !== STATUS_TIKET_TIDAK_ADA && jumlahGagal < BATAS_ULANG_MUAT,
    meta: { silentToastStatuses: [STATUS_TIKET_TIDAK_ADA] },
  });
}

/** Detail & daftar tiket dimuat ulang setelah mutasi, berhasil maupun ditolak (status bisa sudah berubah). */
function useSegarkanTiket(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.portalPelanggan.tiket(id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.portalPelanggan.daftarTiket() });
  };
}

/** Kirim balasan teks; `onBerhasil` mengosongkan kotak balas. */
export function useBalasTiketPelanggan(id: string, onBerhasil: () => void) {
  const segarkan = useSegarkanTiket(id);
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (pesan: string) => TiketPelangganService.balas(id, pesan),
    onSuccess: onBerhasil,
    onError: (error) => presentAppError(error, { screen: LAYAR, source: 'mutation' }),
    onSettled: segarkan,
  });
}

/** Tutup tiket dengan rating/feedback opsional. */
export function useTutupTiketPelanggan(id: string, onBerhasil: (pesan: string | undefined) => void) {
  const segarkan = useSegarkanTiket(id);
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: (muatan: MuatanTutupTiket) => TiketPelangganService.tutup(id, muatan),
    onSuccess: onBerhasil,
    onError: (error) => presentAppError(error, { screen: LAYAR, source: 'mutation' }),
    onSettled: segarkan,
  });
}
