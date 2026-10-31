import { useMutation } from '@tanstack/react-query';

import type { MuatUlangTagihan } from '@/hooks/tagihan/useTagihanPelanggan';
import { TagihanPelangganService } from '@/services/TagihanPelangganService';
import type { TagihanPelanggan } from '@/types/portalPelanggan';
import { presentAppError, presentErrorMessage, presentInfoMessage } from '@/utils/errorPresenter';
import { adalahKegagalanJaringan } from '@/utils/kegagalanJaringan';
import { logger } from '@/utils/logger';
import { pesanHasilCekStatus, type PesanStatusPembayaran } from '@/utils/tagihan/pesanStatusPembayaran';

const PESAN_TANPA_KONEKSI = 'Tidak ada koneksi internet. Periksa koneksi Anda lalu cek lagi.';

/** Tampilkan pesan hasil checkout sebagai toast galat atau info. */
export function tampilkanPesanPembayaran(pesan: PesanStatusPembayaran | null) {
  if (!pesan) return;
  if (pesan.isGalat) presentErrorMessage(pesan.pesan, pesan.judul);
  else presentInfoMessage(pesan.pesan, pesan.judul);
}

function tampilkanGalatCekStatus(error: unknown) {
  logger.error('[CustomerTagihan] Failed to check payment status', error);
  if (adalahKegagalanJaringan(error)) {
    presentErrorMessage(PESAN_TANPA_KONEKSI, 'Tidak Ada Koneksi');
    return;
  }
  presentAppError(error, { screen: 'CustomerTagihanScreen', route: '/(customer)/tagihan' });
}

interface OpsiCekStatus {
  /** Tagihan yang checkout-nya menunggu, dibaca saat pengecekan berjalan. */
  ambilTagihanMenunggu: () => TagihanPelanggan | undefined;
  muatUlang: MuatUlangTagihan;
}

/**
 * "Saya Sudah Bayar, Cek Status": tanyakan checkout ke gateway (server
 * melunasinya bila sudah dibayar), lalu muat ulang tagihan; lembar sukses
 * muncul dari daftar yang baru. `cek(false)` dipakai setelah pelanggan menutup
 * halaman bayar sendiri: checkout yang masih menunggu tidak perlu disebut.
 */
export function useCekStatusPembayaran({ ambilTagihanMenunggu, muatUlang }: OpsiCekStatus) {
  const cek = useMutation({
    retry: false,
    meta: { skipGlobalErrorToast: true },
    mutationFn: async (isLaporkanBelumDiterima: boolean) => {
      const invoiceId = ambilTagihanMenunggu()?.id;
      const status = invoiceId ? await TagihanPelangganService.cekStatusPembayaran(invoiceId) : null;
      const hasil = await muatUlang();
      if (hasil.error) throw hasil.error;
      const isMasihTerbuka = Boolean(hasil.data?.terbuka.some((tagihan) => tagihan.id === invoiceId));
      return pesanHasilCekStatus(status, { isMasihTerbuka, isLaporkanBelumDiterima });
    },
    onSuccess: tampilkanPesanPembayaran,
    onError: tampilkanGalatCekStatus,
  });

  return { cek: (isLaporkanBelumDiterima = true) => cek.mutate(isLaporkanBelumDiterima), isMengecek: cek.isPending };
}
