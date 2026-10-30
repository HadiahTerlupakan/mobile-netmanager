import { useEffect } from 'react';
import EventSource from 'react-native-sse';

import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';
import { presentErrorMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';

const STATUS_SELESAI = new Set(['PAID', 'EXPIRED', 'FAILED']);

/**
 * Dengarkan status checkout dari server; status akhir memuat ulang daftar
 * tagihan (lembar sukses muncul dari daftar itu). Koneksi yang putus tidak
 * disambung lagi: polling di layar Tagihan menjadi cadangannya.
 */
export function useSseStatusPembayaran(invoiceId: string | undefined, onSelesai: () => void) {
  useEffect(() => {
    if (!invoiceId) return;

    const url = `${TenantService.getTenantUrl()}/api/customer/payments/sse?invoiceId=${invoiceId}`;
    const sumber = new EventSource(url, { headers: { Authorization: `Bearer ${TokenService.getToken()}` } });

    sumber.addEventListener('message', (event) => {
      if (!event.data) return;
      try {
        const { status } = JSON.parse(event.data) as { status?: string };
        if (!status || !STATUS_SELESAI.has(status)) return;
        if (status === 'FAILED') {
          presentErrorMessage('Pembayaran transfer manual Anda ditolak oleh Admin. Silakan periksa kembali dan unggah ulang bukti yang benar.');
        }
        onSelesai();
        sumber.close();
      } catch (error) {
        logger.warn('[CustomerTagihan] Failed to parse payment SSE payload', event.data, error);
      }
    });
    sumber.addEventListener('error', (error) => {
      logger.warn('[CustomerTagihan] Payment SSE connection error', error);
      sumber.close();
    });

    return () => sumber.close();
  }, [invoiceId, onSelesai]);
}
