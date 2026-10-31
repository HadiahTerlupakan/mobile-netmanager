import { useMutation } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import { TagihanPelangganService, type PermintaanPembayaran } from '@/services/TagihanPelangganService';
import { presentAppError, presentInfoMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';

/** teal-600 */
const WARNA_KONTROL_BROWSER = '#0d9488';

const isKodeTransferManual = (kode: string) => kode.startsWith('MANUAL_') || kode === 'MOOTA_MANUAL';

/** Halaman bayar gateway, untuk metode tanpa nomor VA atau QRIS. */
export function bukaHalamanBayar(url: string) {
  return WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: WARNA_KONTROL_BROWSER,
    toolbarColor: '#ffffff',
  });
}

interface OpsiBuatPembayaran {
  /**
   * Checkout dibuat: tutup panel bayar dan muat ulang tagihan. Mutasi tetap
   * berjalan (tombol bayar nonaktif) sampai janji ini selesai, supaya ketukan
   * kedua tidak mengganti checkout yang baru dibuat.
   */
  onDibuat: () => Promise<unknown>;
}

/** Buat checkout (atau ganti checkout yang menunggu) untuk tagihan terutang. */
export function useBuatPembayaran({ onDibuat }: OpsiBuatPembayaran) {
  return useMutation({
    // Gateway bisa sudah membuat checkout sebelum 5xx atau timeout sampai ke
    // aplikasi; mengulang POST berarti checkout kedua untuk satu ketukan.
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: (permintaan: PermintaanPembayaran) => TagihanPelangganService.buatPembayaran(permintaan),
    onSuccess: async (checkout, { kodeMetode }) => {
      await onDibuat();
      // Nomor VA dan QRIS ditampilkan di kartu menunggu pembayaran; hanya
      // metode tanpa instruksi (kartu kredit, e-wallet login) dialihkan.
      if (isKodeTransferManual(kodeMetode)) {
        presentInfoMessage('Silakan lanjutkan transfer manual Anda.', 'Menunggu');
      } else if (checkout.paymentUrl && !checkout.vaNumber && !checkout.qrString) {
        await bukaHalamanBayar(checkout.paymentUrl);
        await onDibuat();
      }
    },
    onError: (error) => {
      logger.error('[CustomerTagihan] Failed to create payment', error);
      presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
    },
  });
}
