import { useEffect, useRef } from 'react';
import EventSource from 'react-native-sse';

import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';
import { logger } from '@/utils/logger';
import type { StatusAkhirPembayaran } from '@/utils/tagihan/pesanStatusPembayaran';

const STATUS_AKHIR = new Set(['PAID', 'EXPIRED', 'FAILED']);
const STATUS_GATEWAY_DIBATALKAN = 'CANCELLED';

interface CuplikanStatus {
  status?: string;
  gatewayStatus?: string | null;
}

/**
 * Server memetakan checkout CANCELLED (diganti metode, transfer manual
 * dibatalkan) ke `status` FAILED juga; `gatewayStatus` mentah membedakannya.
 */
function bacaStatusAkhir({ status, gatewayStatus }: CuplikanStatus): StatusAkhirPembayaran | null {
  if (!status || !STATUS_AKHIR.has(status)) return null;
  if (status === 'FAILED' && gatewayStatus === STATUS_GATEWAY_DIBATALKAN) return 'CANCELLED';
  return status as StatusAkhirPembayaran;
}

/**
 * Dengarkan status checkout dari server dan laporkan status akhirnya sekali.
 * Koneksi yang putus tidak disambung lagi: polling di layar Tagihan menjadi
 * cadangannya.
 */
export function useSseStatusPembayaran(invoiceId: string | undefined, onStatusAkhir: (status: StatusAkhirPembayaran) => void) {
  const onStatusAkhirRef = useRef(onStatusAkhir);
  useEffect(() => {
    onStatusAkhirRef.current = onStatusAkhir;
  });

  useEffect(() => {
    if (!invoiceId) return;

    const url = `${TenantService.getTenantUrl()}/api/customer/payments/sse?invoiceId=${invoiceId}`;
    const sumber = new EventSource(url, { headers: { Authorization: `Bearer ${TokenService.getToken()}` } });

    sumber.addEventListener('message', (event) => {
      if (!event.data) return;
      try {
        const statusAkhir = bacaStatusAkhir(JSON.parse(event.data) as CuplikanStatus);
        if (!statusAkhir) return;
        sumber.close();
        onStatusAkhirRef.current(statusAkhir);
      } catch (error) {
        logger.warn('[CustomerTagihan] Failed to parse payment SSE payload', event.data, error);
      }
    });
    sumber.addEventListener('error', (error) => {
      logger.warn('[CustomerTagihan] Payment SSE connection error', error);
      sumber.close();
    });

    return () => sumber.close();
  }, [invoiceId]);
}
