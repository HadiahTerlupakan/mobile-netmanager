import { useMutation } from '@tanstack/react-query';

import { getHttpStatus } from '@/lib/queryErrorReporting';
import { TagihanPelangganService } from '@/services/TagihanPelangganService';
import { AlertService } from '@/utils/alert';
import { presentAppError, presentErrorMessage, presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';

/** Server lama belum punya POST /api/customer/payments/cancel. */
const STATUS_ENDPOINT_TIDAK_ADA = 404;

function tampilkanGalatBatal(error: unknown) {
  logger.error('[CustomerTagihan] Failed to cancel manual transfer', error);
  if (getHttpStatus(error) === STATUS_ENDPOINT_TIDAK_ADA) {
    presentErrorMessage('Pembatalan transfer manual belum tersedia. Hubungi CS bila ingin mengganti metode pembayaran.', 'Belum Tersedia');
    return;
  }
  presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
}

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
      tampilkanGalatBatal(error);
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
