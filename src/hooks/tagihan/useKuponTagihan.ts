import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import type { KuponTagihan } from '@/components/organisms/tagihan/PanelRincianPembayaran';
import api from '@/services/api';
import { presentAppError, presentErrorMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';

/** Kode kupon yang diketik, diverifikasi ke server untuk total tagihan saat ini. */
export function useKuponTagihan(totalTagihan: number): KuponTagihan & { reset: () => void } {
  const [kode, setKode] = useState('');
  const [diskon, setDiskon] = useState<KuponTagihan['diskon']>(null);

  // Operasi finansial → plain useMutation (tanpa offline-queue).
  const verifikasi = useMutation({
    mutationFn: () => api.post('/api/coupons/verify', { code: kode, amount: totalTagihan, pelangganId: 'CURRENT_USER' }),
    onSuccess: (res) => {
      if (res.data.valid) {
        setDiskon({ code: res.data.code, amount: res.data.discountAmount });
        presentSuccessMessage('Kupon berhasil digunakan!');
      } else {
        presentErrorMessage(res.data.error || 'Kupon tidak valid');
      }
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to verify coupon', error);
      presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
    },
  });

  const reset = () => {
    setDiskon(null);
    setKode('');
  };

  return {
    kode,
    setKode,
    diskon,
    isMengecek: verifikasi.isPending,
    onCek: () => {
      if (!kode.trim()) return;
      setDiskon(null);
      verifikasi.mutate();
    },
    onHapus: reset,
    reset,
  };
}
