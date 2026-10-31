import { useMutation } from '@tanstack/react-query';

import { TagihanPelangganService } from '@/services/TagihanPelangganService';
import { AlertService } from '@/utils/alert';
import { presentAppError, presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';

interface OpsiBatalkanTransfer {
  /** Checkout dibatalkan: buka pilihan metode lalu muat ulang tagihan. */
  onDibatalkan: () => Promise<unknown>;
  /** 409: keadaan checkout sudah berubah (mis. baru diverifikasi), muat ulang. */
  muatUlang: () => void;
}

/**
 * "Batalkan / Ganti Metode" untuk transfer manual yang menunggu. Dikonfirmasi
 * dulu: pelanggan yang sudah mentransfer seharusnya mengunggah bukti, bukan
 * membatalkan.
 */
export function useBatalkanTransferManual({ onDibatalkan, muatUlang }: OpsiBatalkanTransfer) {
  const batal = useMutation({
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: (invoiceId: string) => TagihanPelangganService.batalkanTransferManual(invoiceId),
    onSuccess: async () => {
      await onDibatalkan();
      presentInfoMessage('Transfer manual dibatalkan. Silakan pilih metode pembayaran lain.', 'Dibatalkan');
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to cancel manual transfer', error);
      presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
      muatUlang();
    },
  });

  const minta = (invoiceId: string) =>
    AlertService.custom('Batalkan transfer manual?', 'Bila Anda sudah mentransfer, jangan dibatalkan: unggah bukti transfernya agar segera diverifikasi.', [
      { text: 'Kembali', style: 'cancel' },
      { text: 'Batalkan', style: 'destructive', onPress: () => batal.mutate(invoiceId) },
    ]);

  return { minta, isMembatalkan: batal.isPending };
}
