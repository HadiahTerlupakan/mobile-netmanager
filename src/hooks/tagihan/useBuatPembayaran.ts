import { useMutation } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import api from '@/services/api';
import { presentAppError, presentErrorMessage, presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { ambilMuatan } from '@/utils/responsPelanggan';

/** teal-600 */
const WARNA_KONTROL_BROWSER = '#0d9488';

const isTransferManual = (kode: string) => kode.startsWith('MANUAL_') || kode === 'MOOTA_MANUAL';

interface PermintaanPembayaran {
  invoiceIds: string[];
  kodeKupon: string | null;
  kodeMetode: string;
}

/** Halaman bayar gateway, untuk metode tanpa nomor VA atau QRIS. */
export function bukaHalamanBayar(url: string) {
  return WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: WARNA_KONTROL_BROWSER,
    toolbarColor: '#ffffff',
  });
}

/** Buat checkout (atau ganti checkout yang menunggu) untuk tagihan terutang. */
export function useBuatPembayaran(onDibuat: () => void) {
  return useMutation({
    // Gateway bisa sudah membuat checkout sebelum 5xx atau timeout sampai ke
    // aplikasi; mengulang POST berarti checkout kedua untuk satu ketukan.
    retry: false,
    mutationFn: ({ invoiceIds, kodeKupon, kodeMetode }: PermintaanPembayaran) =>
      api.post('/api/customer/payments', {
        invoiceIds,
        couponCode: kodeKupon,
        paymentMethod: kodeMetode,
        notes: 'Payment via Mobile App',
      }),
    onSuccess: async (res, { kodeMetode }) => {
      if (!res.data.success && res.status !== 200) {
        presentErrorMessage(res.data.error || 'Gagal membuat pembayaran');
        return;
      }
      onDibuat();
      // Nomor VA dan QRIS ditampilkan di kartu menunggu pembayaran; hanya
      // metode tanpa instruksi (kartu kredit, e-wallet login) dialihkan.
      const urlBayar = ambilMuatan<string>(res.data, 'paymentUrl');
      const adaInstruksi = Boolean(ambilMuatan<string>(res.data, 'vaNumber') || ambilMuatan<string>(res.data, 'qrString'));
      if (isTransferManual(kodeMetode)) {
        presentInfoMessage('Silakan lanjutkan transfer manual Anda.', 'Menunggu');
      } else if (urlBayar && !adaInstruksi) {
        await bukaHalamanBayar(urlBayar);
        onDibuat();
      }
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to create payment', error);
      presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
    },
  });
}
