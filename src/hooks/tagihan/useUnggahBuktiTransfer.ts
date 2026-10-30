import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';

import api from '@/services/api';
import { extractApiErrorMessage } from '@/utils/errorHandling';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';

/** Pilih foto bukti transfer dari galeri lalu unggah untuk tagihan yang menunggu verifikasi. */
export function useUnggahBuktiTransfer(onTerunggah: () => void) {
  const unggah = useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/api/customer/payments/upload-receipt', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      if (res.data?.success || res.status === 200 || res.status === 201) {
        presentSuccessMessage('Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.');
        onTerunggah();
      } else {
        presentErrorMessage(res.data?.error || 'Gagal mengunggah bukti pembayaran.');
      }
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to upload receipt', error);
      const pesanServer = isAxiosError(error) ? extractApiErrorMessage(error.response?.data) : undefined;
      if (pesanServer) {
        presentErrorMessage(pesanServer);
      } else {
        presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
      }
    },
  });

  const pilihDanUnggah = async (invoiceId: string) => {
    const hasil = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    const foto = hasil.canceled ? undefined : hasil.assets?.[0];
    if (!foto) return;

    const namaBerkas = foto.uri.split('/').pop() || 'receipt.jpg';
    const ekstensi = /\.(\w+)$/.exec(namaBerkas);
    const formData = new FormData();
    formData.append('invoiceId', invoiceId);
    formData.append('file', { uri: foto.uri, name: namaBerkas, type: ekstensi ? `image/${ekstensi[1]}` : 'image' } as never);
    unggah.mutate(formData);
  };

  return { pilihDanUnggah, isMengunggah: unggah.isPending };
}
