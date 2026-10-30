import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { PaketPelangganService } from '@/services/PaketPelangganService';
import { presentAppError, presentSuccessMessage } from '@/utils/errorPresenter';

const LAYAR = 'UpgradePaketPelanggan';
const OPSI_MUTASI = { retry: false, meta: { skipGlobalErrorToast: true } } as const;
const STATUS_PAKET_TIDAK_ADA = 404;

/**
 * Paket aktif, pengajuan upgrade yang menunggu, dan pilihan upgrade.
 * 404 (pelanggan belum punya paket) ditampilkan layar dengan pesan server.
 */
export function usePaketPelanggan() {
  return useQuery({
    queryKey: queryKeys.portalPelanggan.paket(),
    queryFn: PaketPelangganService.paket,
    meta: { silentToastStatuses: [STATUS_PAKET_TIDAK_ADA] },
  });
}

/**
 * Mutasi pengajuan upgrade. Data paket dimuat ulang juga saat ditolak:
 * 409 berarti pengajuan sudah ada / sudah hilang di server, layar basi.
 */
function useMutasiUpgrade<T>(kirim: (masukan: T) => Promise<string | undefined>, pesanBawaan: string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...OPSI_MUTASI,
    mutationFn: kirim,
    onSuccess: (pesan) => presentSuccessMessage(pesan ?? pesanBawaan),
    onError: (error) => presentAppError(error, { screen: LAYAR, source: 'mutation' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.portalPelanggan.paket() }),
  });
}

/** Ajukan upgrade ke paket terpilih. */
export function useAjukanUpgradePaket() {
  return useMutasiUpgrade((packageId: string) => PaketPelangganService.ajukanUpgrade(packageId), 'Pengajuan upgrade terkirim');
}

/** Batalkan pengajuan upgrade yang menunggu. */
export function useBatalkanUpgradePaket() {
  return useMutasiUpgrade<void>(() => PaketPelangganService.batalkanUpgrade(), 'Pengajuan upgrade dibatalkan');
}
