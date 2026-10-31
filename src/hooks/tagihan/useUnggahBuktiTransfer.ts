import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { TagihanPelangganService } from '@/services/TagihanPelangganService';
import { AlertService } from '@/utils/alert';
import { extractApiErrorMessage } from '@/utils/errorHandling';
import { presentAppError, presentErrorMessage, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { ambilFotoBukti, type FotoBukti, type SumberFotoBukti } from '@/utils/tagihan/fotoBuktiTransfer';

interface UnggahanBukti {
  invoiceId: string;
  foto: FotoBukti;
}

function tampilkanGalatUnggah(error: unknown) {
  logger.error('[CustomerTagihan] Failed to upload receipt', error);
  const pesanServer = isAxiosError(error) ? extractApiErrorMessage(error.response?.data) : undefined;
  if (pesanServer) presentErrorMessage(pesanServer);
  else presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
}

/**
 * Foto bukti transfer dari kamera atau galeri lalu unggah untuk tagihan yang
 * menunggu verifikasi; memanggilnya lagi mengganti bukti yang belum diverifikasi.
 */
export function useUnggahBuktiTransfer(onTerunggah: () => void) {
  const unggah = useMutation({
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: ({ invoiceId, foto }: UnggahanBukti) => TagihanPelangganService.unggahBuktiTransfer(invoiceId, foto),
    onSuccess: () => {
      presentSuccessMessage('Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.');
      onTerunggah();
    },
    onError: tampilkanGalatUnggah,
  });

  const unggahDari = async (invoiceId: string, sumber: SumberFotoBukti) => {
    try {
      const hasil = await ambilFotoBukti(sumber);
      if (hasil.status === 'ok') unggah.mutate({ invoiceId, foto: hasil.foto });
      if (hasil.status === 'izin-ditolak') presentInfoMessage('Izinkan akses kamera di pengaturan HP untuk memotret bukti transfer.', 'Izin Ditolak');
    } catch (error) {
      logger.error('[CustomerTagihan] Failed to take receipt photo', error);
      presentErrorMessage('Foto bukti transfer gagal diambil.');
    }
  };

  const pilihDanUnggah = (invoiceId: string) =>
    AlertService.custom('Bukti Transfer', 'Foto struk/bukti transfer, atau pilih tangkapan layar dari galeri.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Pilih dari Galeri', onPress: () => void unggahDari(invoiceId, 'galeri') },
      { text: 'Ambil Foto', onPress: () => void unggahDari(invoiceId, 'kamera') },
    ]);

  return { pilihDanUnggah, isMengunggah: unggah.isPending };
}
