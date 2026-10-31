import { tampilkanPesanPembayaran } from '@/hooks/tagihan/useCekStatusPembayaran';
import { useSseStatusPembayaran } from '@/hooks/tagihan/useSseStatusPembayaran';
import type { DataTagihanPelanggan, MuatUlangTagihan } from '@/hooks/tagihan/useTagihanPelanggan';
import type { TagihanPelanggan } from '@/types/portalPelanggan';
import { pesanPembayaranBerakhir } from '@/utils/tagihan/pesanStatusPembayaran';

interface OpsiPantauStatus {
  /** Tagihan yang checkout-nya menunggu dibayar. */
  tagihan: TagihanPelanggan | undefined;
  /** Checkout yang lewat batas tidak berubah lagi; koneksi status tidak dibuka. */
  isAktif: boolean;
  muatUlang: MuatUlangTagihan;
}

function cariTagihan(data: DataTagihanPelanggan | undefined, id: string | undefined) {
  return data?.terbuka.find((tagihan) => tagihan.id === id) ?? data?.terbaru.find((tagihan) => tagihan.id === id);
}

/**
 * Status akhir checkout dari SSE: tagihan dimuat ulang, lalu pelanggan diberi
 * tahu menurut metodenya. Alasan penolakan transfer manual baru ada di data
 * yang dimuat ulang, jadi pesannya dibaca dari sana.
 */
export function usePantauStatusPembayaran({ tagihan, isAktif, muatUlang }: OpsiPantauStatus) {
  useSseStatusPembayaran(isAktif ? tagihan?.id : undefined, async (status) => {
    const hasil = await muatUlang();
    const pembayaran = cariTagihan(hasil.data, tagihan?.id)?.lastPayment ?? tagihan?.lastPayment ?? undefined;
    tampilkanPesanPembayaran(pesanPembayaranBerakhir(status, pembayaran));
  });
}
